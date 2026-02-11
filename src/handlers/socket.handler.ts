import { Server, Socket } from 'socket.io';
import { PlayerService } from '../services/player.service';
import { RoomService } from '../services/room.service';
import { VoiceService } from '../services/voice.service';
import { UserService } from '../services/user.service';
import { eventRoomRealtimeService } from '../services/event-room-realtime.service';
import { eventEconomyService } from '../services/event-economy.service';
import { VoiceOffer, VoiceAnswer, VoiceIceCandidate, VoiceToggleMute } from '../types/voice/types';

export class SocketHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public handleConnection(socket: Socket): void {
    console.log('Client connected:', socket.id);

    // Send current players to newly connected client
    // socket.emit('players:all', PlayerService.getAllPlayers());

    // Player events
    this.handlePlayerEvents(socket);

    // Room events
    this.handleRoomEvents(socket);

    // Event room events
    this.handleEventRoomEvents(socket);

    // Event economy events
    this.handleEventEconomyEvents(socket);

    // RPC events
    this.handleRpcEvents(socket);

    // Voice chat events
    this.handleVoiceChatEvents(socket);

    // Hello event
    this.handleHelloEvent(socket);

    // Disconnect event
    this.handleDisconnectEvent(socket);
  }

  private handlePlayerEvents(socket: Socket): void {
    socket.on('player:create', async (data: {
      userId: string, online: boolean, avatarId: string
    }) => {
      const invitations = await UserService.getUserFriendInvitations(data.userId);
      console.log("player:create", data.userId, data.online, "avatarId:", data.avatarId)
      console.log("invitations for created:", invitations);
      const player = PlayerService.createPlayer({ userId: data.userId, avatarId: data.avatarId, socketId: socket.id, online: data.online, timestamp: Date.now() });
      const playerFriends = await UserService.getUserFriends(data.userId);


      const invitationsExcludeFriend = invitations.filter(invite => {
        return !playerFriends.find(friend => friend.userId === invite.userId);
      });

      console.log("invitationsExcludeFriend", invitationsExcludeFriend);

      const friendsWithStatus = playerFriends.map(friend => {
        const playerData = PlayerService.getPlayer(friend.userId);
        return {
          userId: friend.userId,
          nameSurname: friend.nameSurname,
          email: friend.email,
          online: playerData?.online || false,
          avatarId: playerData?.avatarId || null
        };
      });

      // console.log("player friendsWithStatus", friendsWithStatus);
      socket.emit('player:created', {
        userId: player.userId, friends: friendsWithStatus, invitations: invitationsExcludeFriend.map(invite => {
          return {
            inviterId: invite.userId,
            inviterName: invite.nameSurname,
            message: `${invite.nameSurname} sizi arkadaş olarak ekledi!`,
          };
        })
      });
      if (player.online) {
        friendsWithStatus.forEach(friend => {
          this.io.to(PlayerService.getPlayer(friend.userId)?.socketId || '').emit('friend:status-changed', {
            userId: player.userId,
            online: player.online,
          });
        });
      }
    });

    socket.on("player:animTrigger", (data: { userId: string; roomId: string; triggerName: string }) => {
      // Broadcast to other players in the room
      socket.to(data.roomId).emit("player:animTrigger", {
        userId: data.userId,
        triggerName: data.triggerName
      });
    });

    socket.on('player:update', (data: {
      userId: string;
      roomId: string;
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number, w: number };
      isGrounded: boolean;
    }) => {
      const parsed = this.parsePlayerUpdatePayload(data);
      if (!parsed) {
        console.log("[socket] player:update parse failed", {
          socketId: socket.id,
          payloadType: typeof data,
          isBuffer: Buffer.isBuffer(data),
          hasTypeBuffer: (data as any)?.type === "Buffer"
        });
        return;
      }

      
      PlayerService.updatePlayerPosition(
        parsed.userId,
        parsed.roomId,
        socket.id,
        parsed.position,
        parsed.rotation,
        parsed.isGrounded
      );

      const eventRoomChannel = `eventroom:${parsed.roomId}`;

      // console.log("player moved:", socket.id, { userId: data.userId, position: data.position, rotation: data.rotation });
      // Send to all other clients in the same room
      socket.to(parsed.roomId).emit('player:moved', {
        userId: parsed.userId,
        position: parsed.position,
        rotation: parsed.rotation,
        isGrounded: parsed.isGrounded
      });
      socket.to(eventRoomChannel).emit('player:moved', {
        userId: parsed.userId,
        position: parsed.position,
        rotation: parsed.rotation,
        isGrounded: parsed.isGrounded
      });
    });

    socket.on('player:disconnect', (data: { userId: string, roomId: string }) => {
      console.log("player disconnect:", data.userId);
      RoomService.removePlayerFromRoom(data.roomId, data.userId);
      PlayerService.removePlayer(data.userId);

      socket.to(data.roomId).emit('player:disconnected', {
        userId: data.userId
      });
    });
  }

  private handleRoomEvents(socket: Socket): void {
    socket.on('room:create', (data: { userId: string, nameSurname: string }) => {
      console.log("room:create by user:", data.userId);
      const player = PlayerService.getPlayer(data.userId);
      if (!player) {
        console.error("User not found for room creation:", data.userId);
        return;
      }
      const room = RoomService.createRoom(data.userId, socket.id, data.nameSurname, player.avatarId || "");
      socket.join(room.roomId);
      console.log("[socket] room:create joined", { roomId: room.roomId, socketId: socket.id, userId: data.userId });
      console.log("room", room);
      socket.emit('room:created', { roomId: room.roomId });
    });

    socket.on('room:left', (data: { userId: string, roomId: string }) => {
      console.log("room:left by user:", data.userId, data.roomId);
      RoomService.removePlayerFromRoom(data.userId, data.roomId);
      VoiceService.removePeer(socket.id);
      socket.leave(data.roomId);
      console.log("[socket] room:left left", { roomId: data.roomId, socketId: socket.id, userId: data.userId });

      socket.to(data.roomId).emit('room:lefted', {
        userId: data.userId
      });
    });

    socket.on('room:join', (data: { roomId: string; userId: string, nameSurname: string }) => {
      console.log("room join:", data.roomId, " by user:", data.userId);
      const player = PlayerService.getPlayer(data.userId);
      if (!player) {
        console.error("User not found for room join:", data.userId);
        return;
      }
      RoomService.addPlayerToRoom(data.roomId, socket.id, data.userId, data.nameSurname, player.avatarId || "");
      socket.join(data.roomId);
      console.log("[socket] room:join joined", { roomId: data.roomId, socketId: socket.id, userId: data.userId });

      socket.emit('room:joined', { roomId: data.roomId });
      // Notify other users in the room
      socket.to(data.roomId).emit('room:joined', { userId: data.userId, nameSurname: data.nameSurname, avatarId: player.avatarId });
    });

    socket.on('room:getusers', (data: { roomId: string; }) => {
      const roomObj = RoomService.getRoom(data.roomId);
      const roomResponse = {
        roomId: roomObj?.roomId,
        timestamp: roomObj?.timestamp,
        players: roomObj ? Array.from(roomObj.players.entries()).map(([userId, { socketId, nameSurname, avatarId }]) => ({ userId, socketId, nameSurname, avatarId })) : []
      };
      console.log("room:getusers:", roomResponse);
      const ioRoom = this.io.sockets.adapter.rooms.get(data.roomId);
      console.log("[socket] room:getusers io room", {
        roomId: data.roomId,
        roomSize: ioRoom?.size ?? 0,
        roomSocketIds: ioRoom ? Array.from(ioRoom.values()) : []
      });

      socket.emit('room:users', { room: roomResponse });
    });
  }

  private handleRpcEvents(socket: Socket): void {
    socket.on("rpc:callback", (data: { target: "all" | "others" | "me", method: string, value: string, roomId: string, userId: string, nameSurname: string }) => {
      console.log(`RPC Callback received for event: ${data.target}`);
      if (data.target === "all") {
        this.io.to(data.roomId).emit("rpc:callback", { method: data.method, value: data.value, userId: data.userId, nameSurname: data.nameSurname });
      } else if (data.target === "others") {
        socket.broadcast.to(data.roomId).emit("rpc:callback", { method: data.method, value: data.value, userId: data.userId, nameSurname: data.nameSurname });
      } else if (data.target === "me") {
        socket.emit("rpc:callback", { method: data.method, value: data.value });
      }
    });
  }

  private handleEventRoomEvents(socket: Socket): void {
    socket.on('eventroom:join', (data: { roomId: string; userId: string }) => {
      if (!data?.roomId || !data?.userId) {
        socket.emit('eventroom:error', { message: 'roomId and userId are required' });
        return;
      }

      const channel = `eventroom:${data.roomId}`;
      socket.join(channel);

      const memberUserIds = eventRoomRealtimeService.join(data.roomId, data.userId, socket.id);

      socket.emit('eventroom:members', {
        roomId: data.roomId,
        userIds: memberUserIds
      });

      socket.to(channel).emit('eventroom:user-joined', {
        roomId: data.roomId,
        userId: data.userId
      });
    });

    socket.on('eventroom:leave', (data: { roomId: string; userId: string }) => {
      if (!data?.roomId || !data?.userId) {
        socket.emit('eventroom:error', { message: 'roomId and userId are required' });
        return;
      }

      const channel = `eventroom:${data.roomId}`;
      const removed = eventRoomRealtimeService.leave(data.roomId, data.userId);
      socket.leave(channel);

      if (removed) {
        socket.to(channel).emit('eventroom:user-left', {
          roomId: data.roomId,
          userId: data.userId
        });
      }
    });
  }

  private handleEventEconomyEvents(socket: Socket): void {
    socket.on('event:preview', (data: { roomId: string; userId: string; catalogId: string; sellerId: string; price: number }) => {
      if (!data?.roomId || !data?.userId || !data?.catalogId || !data?.sellerId || typeof data.price !== 'number') {
        socket.emit('event:preview:reject', { reason: 'INVALID_PAYLOAD' });
        return;
      }
      const result = eventEconomyService.preview(data.roomId, data.userId, data.catalogId, data.sellerId, data.price);
      if (!result.ok) {
        socket.emit('event:preview:reject', { reason: result.reason });
        return;
      }
      socket.emit('event:preview:ok', { catalogId: data.catalogId });
    });


  }

  private handleVoiceChatEvents(socket: Socket): void {
    socket.on('voice:join', (data: { roomId: string; userId: string, isMuted: boolean }) => {
      console.log(`User ${data.userId} joining voice chat in room: ${data.roomId}`);

      // Get existing peers in the room before adding new peer
      const existingPeers = VoiceService.getPeersInRoom(data.roomId);

      // Add new peer to voice chat
      VoiceService.addPeer(socket.id, data.userId, data.roomId);
      socket.join(data.roomId);
      // Send existing peers list to the newly joined user
      socket.emit('voice:existing-peers', {
        peers: existingPeers.map(peer => ({
          userId: peer.userId,
          socketId: peer.socketId,
          isMuted: peer.isMuted
        }))
      });

      // Notify other peers in the room about the new user
      socket.to(data.roomId).emit('voice:user-joined', {
        userId: data.userId,
        socketId: socket.id,
        isMuted: data.isMuted
      });
    });

    socket.on('voice:offer', (data: VoiceOffer) => {
      console.log(`Voice offer from ${data.userId} to ${data.targetUserId}`);
      const targetPeer = VoiceService.getPeerByUserId(data.targetUserId);

      if (targetPeer) {
        this.io.to(targetPeer.socketId).emit('voice:offer', {
          userId: data.userId,
          offer: data.offer
        });
      }
    });

    socket.on('voice:answer', (data: VoiceAnswer) => {
      console.log(`Voice answer from ${data.userId} to ${data.targetUserId}`);
      const targetPeer = VoiceService.getPeerByUserId(data.targetUserId);

      if (targetPeer) {
        this.io.to(targetPeer.socketId).emit('voice:answer', {
          userId: data.userId,
          answer: data.answer
        });
      }
    });

    socket.on('voice:ice-candidate', (data: VoiceIceCandidate) => {
      const targetPeer = VoiceService.getPeerByUserId(data.targetUserId);

      if (targetPeer) {
        this.io.to(targetPeer.socketId).emit('voice:ice-candidate', {
          userId: data.userId,
          candidate: data.candidate
        });
      }
    });

    socket.on('voice:toggle-mute', (data: VoiceToggleMute) => {
      console.log(`User ${data.userId} ${data.isMuted ? 'muted' : 'unmuted'} microphone`);
      VoiceService.toggleMute(socket.id, data.isMuted);

      // Notify other users in the room
      socket.to(data.roomId).emit('voice:user-muted', {
        userId: data.userId,
        isMuted: data.isMuted
      });
    });

    socket.on('voice:leave', (data: { roomId: string; userId: string }) => {
      console.log(`User ${data.userId} leaving voice chat in room: ${data.roomId}`);
      VoiceService.removePeer(socket.id);

      // Notify other peers in the room
      socket.to(data.roomId).emit('voice:user-left', {
        userId: data.userId
      });
    });
  }

  private handleHelloEvent(socket: Socket): void {
    socket.on('hello', (data: { value: string }) => {
      console.log('Hello event received with data:', data);
      socket.broadcast.emit('hello', { message: `Hello from server! Received: ${data.value}` });
    });
  }

  private handleDisconnectEvent(socket: Socket): void {
    socket.on('disconnect', (reason: string) => {
      console.log('Client disconnected:', socket.id, 'Reason:', reason);
      const eventRoomMembership = eventRoomRealtimeService.leaveBySocket(socket.id);
      if (eventRoomMembership) {
        this.io.to(`eventroom:${eventRoomMembership.roomId}`).emit('eventroom:user-left', {
          roomId: eventRoomMembership.roomId,
          userId: eventRoomMembership.userId
        });
      }

      // Remove player from state
      const player = PlayerService.getPlayer(socket.id);
      const voicePeer = VoiceService.getPeer(socket.id);

      // Remove from voice chat and notify others
      if (voicePeer) {
        socket.to(voicePeer.roomId).emit('voice:user-left', {
          userId: voicePeer.userId
        });
        VoiceService.removePeer(socket.id);
      }

      if (player) {
        PlayerService.removePlayer(socket.id);
        this.io.emit('player:disconnected', {
          socketId: socket.id,
          userId: player.userId
        });
      }
    });
  }

  private parsePlayerUpdatePayload(payload: any): {
    userId: string;
    roomId: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    isGrounded: boolean;
    source: "json" | "binary";
  } | null {
    if (!payload) return null;

    // JSON payload
    if (typeof payload === "object" && !Buffer.isBuffer(payload) && payload.userId && payload.roomId) {
      return {
        userId: payload.userId,
        roomId: payload.roomId,
        position: payload.position,
        rotation: payload.rotation,
        isGrounded: !!payload.isGrounded,
        source: "json"
      };
    }

    // Binary payload (Buffer / ArrayBuffer / Uint8Array / {type:"Buffer",data:number[]})
    let buf: Buffer | null = null;
    if (Buffer.isBuffer(payload)) {
      buf = payload;
    } else if (payload instanceof ArrayBuffer) {
      buf = Buffer.from(payload);
    } else if (payload instanceof Uint8Array) {
      buf = Buffer.from(payload);
    } else if (payload?.type === "Buffer" && Array.isArray(payload.data)) {
      buf = Buffer.from(payload.data);
    }

    if (!buf) return null;

    try {
      let offset = 0;
      const readU8 = () => buf.readUInt8(offset++);
      const readBytes = (len: number) => {
        const start = offset;
        const end = offset + len;
        offset = end;
        return buf.subarray(start, end);
      };
      const readString = () => {
        const len = readU8();
        if (len <= 0) return "";
        const bytes = readBytes(len);
        return bytes.toString("utf8");
      };
      const readBool = () => readU8() === 1;
      const readFloat = () => {
        const val = buf.readFloatLE(offset);
        offset += 4;
        return val;
      };

      const userId = readString();
      const roomId = readString();
      const isGrounded = readBool();
      const position = { x: readFloat(), y: readFloat(), z: readFloat() };
      const rotation = { x: readFloat(), y: readFloat(), z: readFloat(), w: readFloat() };

      if (!userId || !roomId) return null;

      return { userId, roomId, position, rotation, isGrounded, source: "binary" };
    } catch (err) {
      console.error("[socket] player:update binary parse error", err);
      return null;
    }
  }
}
