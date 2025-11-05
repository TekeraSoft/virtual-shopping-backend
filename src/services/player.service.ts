export interface IPlayer {
  userId: string;
  socketId: string;
  roomId: string;
  online?: boolean;
  avatarId?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number, w: number };
  timestamp: number;
}

interface ICreatePlayer {
  userId: string;
  socketId: string;
  timestamp: number;
  online: boolean;
  avatarId: string;
}

// Global state: userId -> player data
const players: Map<string, IPlayer> = new Map();
// Socket ID to User ID mapping
const socketToUserId: Map<string, string> = new Map();

export class PlayerService {
  // Update player position
  static updatePlayerPosition(
    userId: string,
    roomId: string,
    socketId: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number, w: number }
  ): void {
    // console.log("player updated:", { socketId, userId, roomId, position, rotation });
    players.set(userId, {
      userId,
      roomId,
      socketId,
      position,
      rotation,
      timestamp: Date.now()
    });
  }

  static createPlayer({ userId, socketId, online, avatarId }: ICreatePlayer): ICreatePlayer {
    const newPlayer: ICreatePlayer = {
      userId,
      socketId,
      timestamp: Date.now(),
      online,
      avatarId
    };

    // Store socket ID mapping
    socketToUserId.set(socketId, userId);

    players.set(userId, {
      userId,
      socketId,
      roomId: "",
      avatarId,
      online: online,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      timestamp: Date.now()
    });
    return newPlayer;
  }
  // Get all active players
  static getAllPlayers(): IPlayer[] {
    return Array.from(players.values());
  }

  // Get player by socket ID
  static getPlayer(userId: string): IPlayer | undefined {
    return players.get(userId);
  }

  // Get player's socket ID
  static getPlayerSocketId(userId: string): string | undefined {
    const player = players.get(userId);
    return player?.socketId;
  }

  // Get user ID by socket ID
  static getUserIdBySocketId(socketId: string): string | undefined {
    return socketToUserId.get(socketId);
  }

  // Remove player (on disconnect)
  static removePlayer(userId: string): void {
    const player = players.get(userId);
    if (player?.socketId) {
      socketToUserId.delete(player.socketId);
    }
    players.delete(userId);
  }

  // Get total player count
  static getPlayerCount(): number {
    return players.size;
  }

  // Clear inactive players (optional cleanup)
  static clearInactivePlayers(timeoutMs: number = 60000): number {
    const now = Date.now();
    let removed = 0;

    for (const [socketId, player] of players.entries()) {
      if (now - player.timestamp > timeoutMs) {
        players.delete(socketId);
        removed++;
      }
    }

    return removed;
  }

  static setPlayerOnlineStatus(userId: string, online: boolean): void {
    const player = players.get(userId);
    if (player) {
      player.online = online;
      player.timestamp = Date.now();
      players.set(userId, player);
    }
  }
  static setAvatarId(userId: string, avatarId: string): void {
    const player = players.get(userId);
    if (player) {
      player.avatarId = avatarId;
    }
  }
}
