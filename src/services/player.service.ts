export interface PlayerPosition {
  userId: string;
  socketId?: string;
  roomId: string;
  online?: boolean;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number, w: number };
  timestamp: number;
}

interface ICreatePlayer {
  userId: string;
  socketId: string;
  timestamp: number;
  online: boolean;
}

// Global state: userId -> player data
const playerPositions: Map<string, PlayerPosition> = new Map();
// Socket ID to User ID mapping
const socketToUserId: Map<string, string> = new Map();

export class PlayerService {
  // Update player position
  static updatePlayerPosition(
    userId: string,
    roomId: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number, w: number }
  ): void {
    // console.log("player updated:", { socketId, userId, roomId, position, rotation });
    playerPositions.set(userId, {
      userId,
      roomId,
      position,
      rotation,
      timestamp: Date.now()
    });
  }

  static createPlayer({ userId, socketId, online }: ICreatePlayer): ICreatePlayer {
    const newPlayer: ICreatePlayer = {
      userId,
      socketId,
      timestamp: Date.now(),
      online,
    };
    
    // Store socket ID mapping
    socketToUserId.set(socketId, userId);
    
    playerPositions.set(userId, {
      userId,
      socketId,
      roomId: "",
      online: online,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      timestamp: Date.now()
    });
    return newPlayer;
  }
  // Get all active players
  static getAllPlayers(): PlayerPosition[] {
    return Array.from(playerPositions.values());
  }

  // Get player by socket ID
  static getPlayer(userId: string): PlayerPosition | undefined {
    return playerPositions.get(userId);
  }

  // Get player's socket ID
  static getPlayerSocketId(userId: string): string | undefined {
    const player = playerPositions.get(userId);
    return player?.socketId;
  }

  // Get user ID by socket ID
  static getUserIdBySocketId(socketId: string): string | undefined {
    return socketToUserId.get(socketId);
  }

  // Remove player (on disconnect)
  static removePlayer(userId: string): void {
    const player = playerPositions.get(userId);
    if (player?.socketId) {
      socketToUserId.delete(player.socketId);
    }
    playerPositions.delete(userId);
  }

  // Get total player count
  static getPlayerCount(): number {
    return playerPositions.size;
  }

  // Clear inactive players (optional cleanup)
  static clearInactivePlayers(timeoutMs: number = 60000): number {
    const now = Date.now();
    let removed = 0;

    for (const [socketId, player] of playerPositions.entries()) {
      if (now - player.timestamp > timeoutMs) {
        playerPositions.delete(socketId);
        removed++;
      }
    }

    return removed;
  }
}
