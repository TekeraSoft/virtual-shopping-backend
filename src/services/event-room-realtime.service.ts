interface EventRoomMember {
  userId: string;
  socketId: string;
}

class EventRoomRealtimeService {
  private rooms: Map<string, Map<string, EventRoomMember>> = new Map();
  private socketToMembership: Map<string, { roomId: string; userId: string }> = new Map();

  join(roomId: string, userId: string, socketId: string) {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Map();
      this.rooms.set(roomId, room);
    }

    room.set(userId, { userId, socketId });
    this.socketToMembership.set(socketId, { roomId, userId });

    return this.getMemberUserIds(roomId);
  }

  leave(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const member = room.get(userId);
    if (member) {
      this.socketToMembership.delete(member.socketId);
    }
    const removed = room.delete(userId);
    if (room.size === 0) {
      this.rooms.delete(roomId);
    }
    return removed;
  }

  leaveBySocket(socketId: string): { roomId: string; userId: string } | null {
    const membership = this.socketToMembership.get(socketId);
    if (!membership) return null;

    this.leave(membership.roomId, membership.userId);
    return membership;
  }

  getMemberUserIds(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.keys());
  }
}

export const eventRoomRealtimeService = new EventRoomRealtimeService();
