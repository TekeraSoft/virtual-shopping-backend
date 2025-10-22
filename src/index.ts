import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import wishlistRouter from './routes/wishlist.router';
import userRouter from '@routes/user.router';
import roomRouter from '@routes/room.router';
import invitationRouter from './routes/invitation.router';
import { SocketHandler } from './handlers/socket.handler';
import connectDB from './config/database';

const PORT = process.env.PORT || 3021;

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: '/socket.io/',
  pingInterval: 25000,   // 25 saniyede bir ping at
  pingTimeout: 30000,   // 30 saniye cevap gelmezse bağlantıyı kes
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});


app.use(cors());
app.use(express.json());

app.use('/wishlist', wishlistRouter);

app.use("/user", (req, res, next) => {
  req.io = io;
  next();
}, userRouter);

app.use("/room", (req, res, next) => {
  req.io = io;
  next();
}, roomRouter);

app.use("/invitation", invitationRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
  return;
});

// Initialize Socket Handler
const socketHandler = new SocketHandler(io);

// Handle Socket.IO connections
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket);
});

// Start Server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
