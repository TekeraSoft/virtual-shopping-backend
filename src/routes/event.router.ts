import { Router } from "express";
import { eventService, EventPhase } from "@services/event.service";
import { PlayerService } from "@services/player.service";

const eventRouter = Router();

// Admin: start event schedule
eventRouter.post("/admin/start", (req, res) => {
  const { startAt, lobbyMinutes, gameMinutes, breakMinutes } = req.body || {};
  if (!startAt || !lobbyMinutes || !gameMinutes || breakMinutes === undefined) {
    res.status(400).json({ error: "startAt, lobbyMinutes, gameMinutes, breakMinutes are required" });
    return;
  }
  const startAtMs = new Date(startAt).getTime();
  if (Number.isNaN(startAtMs)) {
    res.status(400).json({ error: "startAt is invalid date/time" });
    return;
  }
  if (startAtMs <= Date.now()) {
    res.status(400).json({ error: "startAt is in the past" });
    return;
  }

  eventService.start({
    startAt: startAtMs,
    lobbyMinutes: Number(lobbyMinutes),
    gameMinutes: Number(gameMinutes),
    breakMinutes: Number(breakMinutes)
  });
  res.json({ success: true, state: eventService.getState() });
});

// Admin: stop event
eventRouter.post("/admin/stop", (req, res) => {
  eventService.stop();
  res.json({ success: true });
});

// Admin: force phase (manual testing)
eventRouter.post("/admin/force-phase", (req, res) => {
  const { phase } = req.body || {};
  const allowed: EventPhase[] = ["LOBBY", "ACTIVE", "BREAK", "STOPPED"];
  if (!allowed.includes(phase)) {
    res.status(400).json({ error: "phase must be LOBBY | ACTIVE | BREAK | STOPPED" });
    return;
  }
  eventService.forcePhase(phase);
  res.json({ success: true, state: eventService.getState() });
});

// Client: get state
eventRouter.get("/state", (req, res) => {
  res.json({ success: true, state: eventService.getState() });
});

// Client: list rooms
eventRouter.get("/rooms", (req, res) => {
  res.json({ success: true, rooms: eventService.getRooms() });
});

// Client: join lobby
eventRouter.post("/join", (req, res) => {
  const { userId } = req.body || {};
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const result = eventService.join(userId);
  if (!result.ok) {
    res.status(409).json(result);
    return;
  }

  const io = req.io;
  const roomChannel = `eventroom:${result.roomId}`;
  const socketId = PlayerService.getPlayer(userId)?.socketId;
  if (io && socketId) {
    const sock = io.sockets.sockets.get(socketId);
    sock?.join(roomChannel);
    sock?.to(roomChannel).emit("eventroom:user-joined", {
      roomId: result.roomId,
      userId
    });
  }

  res.json(result);
});

// Client: leave lobby
eventRouter.post("/leave", (req, res) => {
  const { userId } = req.body || {};
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const result = eventService.leave(userId);

  if (result.ok) {
    const io = req.io;
    const roomChannel = `eventroom:${result.roomId}`;
    const socketId = PlayerService.getPlayer(userId)?.socketId;
    if (io && socketId) {
      const sock = io.sockets.sockets.get(socketId);
      sock?.leave(roomChannel);
      sock?.to(roomChannel).emit("eventroom:user-left", {
        roomId: result.roomId,
        userId
      });
    }
  }

  res.json(result);
});

export default eventRouter;
