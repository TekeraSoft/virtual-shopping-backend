export interface IRoom {
    roomId: string;
    timestamp: number;
    players: Map<string, { socketId: string; nameSurname: string }>;
    invitedPlayers: Map<string, { nameSurname: string }>;
}

// Global state: socketId -> player data
const rooms: Map<string, IRoom> = new Map();

export class RoomService {

    static createRoom(userId: string, socketId: string, nameSurname: string): IRoom {
        const roomId = crypto.randomUUID();
        const newRoom: IRoom = {
            roomId: roomId,
            timestamp: Date.now(),
            players: new Map([[userId, { socketId, nameSurname }]]),
            invitedPlayers: new Map(),
        };
        rooms.set(roomId, newRoom);
        return newRoom;
    }
    // Get room by ID
    static getRoom(roomId: string): IRoom | undefined {

        const room = rooms.get(roomId);

        return room;
    }
    // Add player to room
    static addPlayerToRoom(roomId: string, socketId: string, userId: string, nameSurname: string): boolean {
        const room = rooms.get(roomId);
        if (room) {
            console.log("first player:", userId)
            room.players.set(userId, { socketId, nameSurname });
            return true;
        }

        return false;
    }

    // Remove player from room
    static removePlayerFromRoom(roomId: string, userId: string): boolean {
        const room = rooms.get(roomId);
        if (room) {
            room.players.delete(userId);
            return true;
        }
        return false;
    }
    // static removePlayerFromRoom(userId: string): boolean {
    //     const room = Array.from(rooms.values()).find(r => r.players.has(userId));
    //     if (room) {
    //         room.players.delete(userId);
    //         return true;
    //     }
    //     return false;
    // }
    // Delete room
    static deleteRoom(roomId: string): boolean {
        return rooms.delete(roomId);
    }
}
