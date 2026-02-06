import { Server } from "socket.io";

export type EventPhase = "LOBBY" | "ACTIVE" | "BREAK" | "STOPPED";

export interface EventConfig {
  startAt: number; // epoch ms
  lobbyMinutes: number;
  gameMinutes: number;
  breakMinutes: number;
}

export interface EventRoom {
  roomId: string;
  capacity: number;
  players: Set<string>;
  createdAt: number;
}

export interface EventState {
  status: "RUNNING" | "STOPPED";
  phase: EventPhase;
  startAt: number;
  lobbyMinutes: number;
  gameMinutes: number;
  breakMinutes: number;
  cycleIndex: number;
  timeLeftMs: number;
}

class EventService {
  private io: Server | null = null;
  private status: "RUNNING" | "STOPPED" = "STOPPED";
  private phase: EventPhase = "STOPPED";
  private startAt = 0;
  private lobbyMinutes = 5;
  private gameMinutes = 15;
  private breakMinutes = 10;
  private cycleIndex = 0;
  private timeLeftMs = 0;
  private rooms: EventRoom[] = [];
  private forcedPhase: EventPhase | null = null;
  private transitionTimer: NodeJS.Timeout | null = null;

  setIo(io: Server) {
    this.io = io;
  }

  start(config: EventConfig) {
    this.startAt = config.startAt;
    this.lobbyMinutes = config.lobbyMinutes;
    this.gameMinutes = config.gameMinutes;
    this.breakMinutes = config.breakMinutes;
    this.status = "RUNNING";
    this.forcedPhase = null;
    this.sync(Date.now());
    this.scheduleNextTransition();
  }

  stop() {
    const prevPhase = this.phase;
    this.status = "STOPPED";
    this.phase = "STOPPED";
    this.forcedPhase = null;
    this.rooms = [];
    this.cycleIndex = 0;
    this.timeLeftMs = 0;
    this.clearTransitionTimer();
    if (prevPhase !== this.phase) {
      this.emitState();
    }
  }

  forcePhase(phase: EventPhase) {
    const prevPhase = this.phase;
    this.forcedPhase = phase;
    this.phase = phase;
    if (phase === "LOBBY") {
      this.rooms = [];
    }
    if (phase === "BREAK" && prevPhase !== "BREAK") {
      this.rooms = [];
      this.io?.emit("event:lobbies-cleared", { at: Date.now(), phase: this.phase });
    }
    if (prevPhase !== this.phase) {
      this.emitState();
    }
    this.scheduleNextTransition();
  }

  getState(): EventState {
    this.sync(Date.now());
    return {
      status: this.status,
      phase: this.phase,
      startAt: this.startAt,
      lobbyMinutes: this.lobbyMinutes,
      gameMinutes: this.gameMinutes,
      breakMinutes: this.breakMinutes,
      cycleIndex: this.cycleIndex,
      timeLeftMs: this.timeLeftMs
    };
  }

  getRooms() {
    return this.rooms.map((r, idx) => ({
      roomId: r.roomId,
      lobbyIndex: idx + 1,
      capacity: r.capacity,
      count: r.players.size
    }));
  }

  join(userId: string) {
    this.sync(Date.now());
    if (this.status !== "RUNNING") {
      return { ok: false, reason: "EVENT_STOPPED" };
    }
    if (this.phase !== "LOBBY") {
      return { ok: false, reason: "LOBBY_CLOSED" };
    }

    let room = this.rooms.find(r => r.players.size < r.capacity);
    if (!room) {
      room = this.createRoom();
    }

    const existingUserIds = Array.from(room.players.values());
    room.players.add(userId);
    const lobbyIndex = this.rooms.indexOf(room) + 1;

    return {
      ok: true,
      roomId: room.roomId,
      lobbyIndex,
      count: room.players.size,
      capacity: room.capacity,
      existingUserIds
    };
  }

  leave(userId: string) {
    for (const room of this.rooms) {
      if (room.players.delete(userId)) {
        return { ok: true, roomId: room.roomId };
      }
    }
    return { ok: false, reason: "NOT_IN_ROOM" };
  }

  emitState() {
    if (!this.io) return;
    this.io.emit("event:state", this.getState());
    this.io.emit("room:list", { rooms: this.getRooms() });
  }

  private sync(now: number) {
    if (this.status !== "RUNNING") {
      this.phase = "STOPPED";
      this.timeLeftMs = 0;
      return;
    }

    if (this.forcedPhase) {
      this.phase = this.forcedPhase;
      this.timeLeftMs = 0;
      return;
    }

    const lobbyMs = this.lobbyMinutes * 60 * 1000;
    const gameMs = this.gameMinutes * 60 * 1000;
    const breakMs = this.breakMinutes * 60 * 1000;
    const cycleMs = lobbyMs + gameMs + breakMs;

    const elapsedRaw = now - this.startAt;
    if (elapsedRaw < 0) {
      this.phase = "STOPPED";
      this.timeLeftMs = Math.abs(elapsedRaw);
      this.cycleIndex = 0;
      this.rooms = [];
      return;
    }

    const elapsed = elapsedRaw;
    const cycleIndex = Math.floor(elapsed / cycleMs);
    const cycleOffset = elapsed % cycleMs;

    const previousPhase = this.phase;
    if (cycleOffset < lobbyMs) {
      this.phase = "LOBBY";
      this.timeLeftMs = lobbyMs - cycleOffset;
    } else if (cycleOffset < lobbyMs + gameMs) {
      this.phase = "ACTIVE";
      this.timeLeftMs = lobbyMs + gameMs - cycleOffset;
    } else {
      this.phase = "BREAK";
      this.timeLeftMs = cycleMs - cycleOffset;
    }

    // Reset lobbies when ACTIVE ends and BREAK starts.
    if (previousPhase === "ACTIVE" && this.phase === "BREAK") {
      this.rooms = [];
      this.io?.emit("event:lobbies-cleared", { at: now, phase: this.phase });
    }

    // New cycle always starts with a fresh lobby.
    if (cycleIndex !== this.cycleIndex) {
      this.cycleIndex = cycleIndex;
      this.rooms = [];
    }
  }

  private createRoom(): EventRoom {
    const room: EventRoom = {
      roomId: crypto.randomUUID(),
      capacity: 50,
      players: new Set(),
      createdAt: Date.now()
    };
    this.rooms.push(room);
    return room;
  }

  private scheduleNextTransition() {
    this.clearTransitionTimer();
    if (this.status !== "RUNNING" || this.forcedPhase) {
      return;
    }

    const now = Date.now();
    const lobbyMs = this.lobbyMinutes * 60 * 1000;
    const gameMs = this.gameMinutes * 60 * 1000;
    const breakMs = this.breakMinutes * 60 * 1000;
    const cycleMs = lobbyMs + gameMs + breakMs;

    const elapsedRaw = now - this.startAt;

    // No phase progression before configured start time.
    if (elapsedRaw < 0) {
      this.transitionTimer = setTimeout(() => {
        const prevPhase = this.phase;
        this.sync(Date.now());
        if (prevPhase !== this.phase) {
          this.emitState();
        }
        this.scheduleNextTransition();
      }, Math.max(10, Math.abs(elapsedRaw)));
      return;
    }

    const elapsed = elapsedRaw;
    const cycleOffset = elapsed % cycleMs;

    let msToNext = 0;
    if (cycleOffset < lobbyMs) {
      msToNext = lobbyMs - cycleOffset;
    } else if (cycleOffset < lobbyMs + gameMs) {
      msToNext = lobbyMs + gameMs - cycleOffset;
    } else {
      msToNext = cycleMs - cycleOffset;
    }

    this.transitionTimer = setTimeout(() => {
      const prevPhase = this.phase;
      this.sync(Date.now());
      if (prevPhase !== this.phase) {
        this.emitState();
      }
      this.scheduleNextTransition();
    }, Math.max(10, msToNext));
  }

  private clearTransitionTimer() {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
  }
}

export const eventService = new EventService();
