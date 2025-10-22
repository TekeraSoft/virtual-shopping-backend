import { Server, Socket } from 'socket.io';
import { PlayerService } from '../services/player.service';
import { RoomService } from '../services/room.service';
import { VoiceService } from '../services/voice.service';
import { UserService } from '../services/user.service';
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
      userId: string, online: boolean
    }) => {
      const invitations = await UserService.getUserFriendInvitations(data.userId);
      console.log("player:create", data.userId, data.online)
      console.log("invitations for created:", invitations);
      const player = PlayerService.createPlayer({ userId: data.userId, socketId: socket.id, online: data.online, timestamp: Date.now() });
  const playerFriends = await UserService.getUserFriends(data.userId);

      console.log("playerFriends", playerFriends);
      const invitationsExcludeFriend = invitations.filter(invite => {
        return !playerFriends.find(friend => friend.userId === invite.userId);
      });

      console.log("invitationsExcludeFriend", invitationsExcludeFriend);

      const friendsWithStatus = playerFriends.map(friend => {
        return {
          userId: friend.userId,
          nameSurname: friend.nameSurname,
          email: friend.email,
          online: PlayerService.getPlayer(friend.userId)?.online || false,
        };
      });

      console.log("player friendsWithStatus", friendsWithStatus);
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

    socket.on('player:update', (data: {
      userId: string;
      roomId: string;
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number, w: number };
    }) => {
      PlayerService.updatePlayerPosition(
        data.userId,
        data.roomId,
        socket.id,
        data.position,
        data.rotation
      );

      console.log("player moved:", socket.id, { userId: data.userId, position: data.position, rotation: data.rotation });
      // Send to all other clients in the same room
      socket.to(data.roomId).emit('player:moved', {
        userId: data.userId,
        position: data.position,
        rotation: data.rotation
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
      const room = RoomService.createRoom(data.userId, socket.id, data.nameSurname);
      socket.join(room.roomId);
      console.log("room", room);
      socket.emit('room:created', { roomId: room.roomId });
    });

    socket.on('room:left', (data: { userId: string, roomId: string }) => {
      console.log("room:left by user:", data.userId, data.roomId);
      RoomService.removePlayerFromRoom(data.userId, data.roomId);
      VoiceService.removePeer(socket.id);
      socket.leave(data.roomId);

      socket.to(data.roomId).emit('room:lefted', {
        userId: data.userId
      });
    });

    socket.on('room:join', (data: { roomId: string; userId: string, nameSurname: string }) => {
      console.log("room join:", data.roomId, " by user:", data.userId);
      RoomService.addPlayerToRoom(data.roomId, socket.id, data.userId, data.nameSurname);
      socket.join(data.roomId);

      socket.emit('room:joined', { roomId: data.roomId });
      // Notify other users in the room
      socket.to(data.roomId).emit('room:joined', { userId: data.userId, nameSurname: data.nameSurname });
    });

    socket.on('room:getusers', (data: { roomId: string; }) => {
      const roomObj = RoomService.getRoom(data.roomId);
      const roomResponse = {
        roomId: roomObj?.roomId,
        timestamp: roomObj?.timestamp,
        players: roomObj ? Array.from(roomObj.players.entries()).map(([userId, { socketId, nameSurname }]) => ({ userId, socketId, nameSurname })) : []
      };
      console.log("room:getusers:", roomResponse);

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
}