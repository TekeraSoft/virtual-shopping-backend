export interface PlayerPosition {
  userId: string;
  roomId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number, w: number };
  timestamp: number;
}

// Global state: socketId -> player data
const playerPositions: Map<string, PlayerPosition> = new Map();

export class PlayerService {
  // Update player position
  static updatePlayerPosition(
    socketId: string,
    userId: string,
    roomId: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number, w: number }
  ): void {
    console.log("player updated:", { socketId, userId, roomId, position, rotation });
    playerPositions.set(socketId, {
      userId,
      roomId,
      position,
      rotation,
      timestamp: Date.now()
    });
  }

  // Get all active players
  static getAllPlayers(): PlayerPosition[] {
    return Array.from(playerPositions.values());
  }

  // Get player by socket ID
  static getPlayer(socketId: string): PlayerPosition | undefined {
    return playerPositions.get(socketId);
  }

  // Remove player (on disconnect)
  static removePlayer(socketId: string): void {
    playerPositions.delete(socketId);
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
