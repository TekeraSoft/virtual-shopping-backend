import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PlayerService } from './services/player.service';
import wishlistRouter from './routes/wishlist.router';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3021;


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
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  }) => {
    // Update player position in state
    PlayerService.updatePlayerPosition(
      socket.id,
      data.userId,
      data.position,
      data.rotation
    );

    // Broadcast to all other clients
    socket.broadcast.emit('player:moved', {
      socketId: socket.id,
      userId: data.userId,
      position: data.position,
      rotation: data.rotation
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove player from state
    const player = PlayerService.getPlayer(socket.id);
    PlayerService.removePlayer(socket.id);

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
