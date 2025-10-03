import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PlayerService } from './services/player.service';
import wishlistRouter from './routes/wishlist.router';
import { RoomService } from '@services/room.service';
import { VoiceService } from './services/voice.service';
import { VoiceOffer, VoiceAnswer, VoiceIceCandidate, VoiceToggleMute } from './types/voice/types';

const PORT = process.env.PORT || 3021;


dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});



app.use(cors());
app.use(express.json());


app.use('/api/wishlist', wishlistRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});


io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current players to newly connected client
  socket.emit('players:all', PlayerService.getAllPlayers());

  // Listen for player position updates
  socket.on('player:update', (data: {
    userId: string;
    roomId: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number, w: number };
  }) => {


    PlayerService.updatePlayerPosition(
      socket.id,
      data.userId,
      data.roomId,
      data.position,
      data.rotation
    );
    socket.join(data.roomId);


    // Send to all other clients in the same room
    socket.to(data.roomId).emit('player:moved', {
      socketId: socket.id,
      userId: data.userId,
      roomId: data.roomId,
      position: data.position,
      rotation: data.rotation
    });


  });

  socket.on('room:create', (data: { userId: string }) => {
    const room = RoomService.createRoom(data.userId, socket.id);
    socket.join(room.roomId);
    socket.emit('room:created', { roomId: room.roomId, userId: data.userId });
  });

  socket.on('room:join', (data: { roomId: string; userId: string }) => {
    RoomService.addPlayerToRoom(data.roomId, socket.id, data.userId);
    socket.join(data.roomId);
    socket.emit('room:joined', { roomId: data.roomId });
    socket.to(data.roomId).emit('room:joined', { userId: data.userId });
  });

  socket.on('room:getusers', (data: { roomId: string; }) => {

    const roomObj = RoomService.getRoom(data.roomId);
    const roomResponse = {
      roomId: roomObj?.roomId,
      timestamp: roomObj?.timestamp,
      players: roomObj ? Array.from(roomObj.players.entries()).map(([userId, socketId]) => ({ userId, socketId })) : []
    };
    console.log("room:getusers:", roomResponse);

    socket.emit('room:users', { room: roomResponse });
  });

  socket.on("rpc:callback", (data: { target: "all" | "others" | "me", method: string, value: string }) => {
    console.log(`RPC Callback received for event: ${data.target}`);
    if (data.target === "all") {
      io.emit("rpc:callback", { message: "RPC callback to all clients", method: data.method, value: data.value });
    } else if (data.target === "others") {
      socket.broadcast.emit("rpc:callback", { message: "RPC callback to other clients", method: data.method, value: data.value });
    } else if (data.target === "me") {
      socket.emit("rpc:callback", { message: "RPC callback to self", method: data.method, value: data.value });
    }
  });

  socket.on('hello', (data: { value: string }) => {
    console.log('Hello event received with data:', data);
    socket.broadcast.emit('hello', { message: `Hello from server! Received: ${data.value}` });
  });

  // WebRTC Voice Chat Events
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
      io.to(targetPeer.socketId).emit('voice:offer', {
        userId: data.userId,
        offer: data.offer
      });
    }
  });

  socket.on('voice:answer', (data: VoiceAnswer) => {
    console.log(`Voice answer from ${data.userId} to ${data.targetUserId}`);
    const targetPeer = VoiceService.getPeerByUserId(data.targetUserId);

    if (targetPeer) {
      io.to(targetPeer.socketId).emit('voice:answer', {
        userId: data.userId,
        answer: data.answer
      });
    }
  });

  socket.on('voice:ice-candidate', (data: VoiceIceCandidate) => {
    const targetPeer = VoiceService.getPeerByUserId(data.targetUserId);

    if (targetPeer) {
      io.to(targetPeer.socketId).emit('voice:ice-candidate', {
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

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove player from state
    const player = PlayerService.getPlayer(socket.id);
    const voicePeer = VoiceService.getPeer(socket.id);

    RoomService.removePlayerFromRoom(player?.userId || '');
    PlayerService.removePlayer(socket.id);

    // Remove from voice chat and notify others
    if (voicePeer) {
      socket.to(voicePeer.roomId).emit('voice:user-left', {
        userId: voicePeer.userId
      });
      VoiceService.removePeer(socket.id);
    }

    // Notify all clients that player disconnected
    if (player) {
      io.emit('player:disconnected', {
        socketId: socket.id,
        userId: player.userId
      });
    }
  });
});

// Start Server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
