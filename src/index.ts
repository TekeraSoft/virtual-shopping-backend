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
import { UserService } from '@services/user.service';

const PORT = process.env.PORT || 3021;

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: '/socket.io/',
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

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
  return;
});

app.post('/user/invite-friend', async (req, res) => {
  const { email, userId } = req.body;

  const metaUser = UserService.getUserInfoWithId(userId);
  if (!metaUser) {
    res.status(404).json({ status: 404, message: 'Kullanıcı bulunamadı.' });
    return;
  }
  const myFriends = UserService.getUserInfoWithId(userId)?.friends || [];

  if (myFriends.find(friend => friend.email === email)) {
    res.status(403).json({ status: 403, message: 'User is already your friend' });
    return;
  }
  const invitedUser = UserService.getUserInfoWithEmail(email);
  if (!invitedUser) {
    res.status(404).json({ status: 404, message: 'Davet edilen kullanıcı bulunamadı.' });
    return;
  }
  const invitedUserInviteMe = await UserService.hasUserInvited(metaUser.userId, invitedUser.email);
  if (invitedUserInviteMe) {
    await UserService.addUserToFriendList(userId, invitedUser);
    await UserService.addUserToFriendList(invitedUser.userId, metaUser);
    const inviterPlayer = PlayerService.getPlayer(invitedUser.userId);
    const invitedPlayer = PlayerService.getPlayer(userId);
    if (inviterPlayer) {
      console.log("inviterPlayer.socketId", inviterPlayer.socketId)
      const playerFriends = UserService.getUserInfoWithId(inviterPlayer.userId)?.friends || [];
      const playerFriendList = playerFriends.map((friend) => {
        const player = {
          userId: friend.userId,
          email: friend.email,
          nameSurname: friend.nameSurname,
          online: PlayerService.getPlayer(friend.userId)?.online || false
        };
        return player;
      });

      console.log("playerFriendList invitedPlayer", playerFriendList)
      io.to(inviterPlayer.socketId || '').emit('friend:added', playerFriendList);
    }
    if (invitedPlayer) {
      console.log("invitedPlayer.socketId", invitedPlayer.socketId)
      const playerFriends = UserService.getUserInfoWithId(invitedPlayer.userId)?.friends || [];
      const playerFriendList = playerFriends.map((friend) => {
        const player = {
          userId: friend.userId,
          email: friend.email,
          nameSurname: friend.nameSurname,
          online: PlayerService.getPlayer(friend.userId)?.online || false
        };
        return player;
      });

      console.log("playerFriendList invitedPlayer", playerFriendList)
      io.to(invitedPlayer.socketId || '').emit('friend:added', playerFriendList);
    }


    res.status(201).json({ status: 201, message: 'Bu kullanıcı sizi zaten davet etti. Davet otomatik olarak kabul edildi.', });
    return;
  }
  const hasInvited = await UserService.hasUserInvited(userId, email);
  if (hasInvited) {
    res.status(403).json({ status: 403, message: 'You have already invited this user' });
    return;
  }

  const userInvited = UserService.getUserInfoWithEmail(email)
  const userInviter = UserService.getUserInfoWithId(userId);
  if (userInvited && userInviter) {
    console.log("userInvited ve inviter var")
    UserService.inviteUserFriend(userInvited.userId, userInviter);

    // Check if invited user is online and send socket notification
    const invitedPlayer = PlayerService.getPlayer(userInvited.userId);
    console.log("invitedPlayer", invitedPlayer)
    if (invitedPlayer && invitedPlayer.online) {
      console.log("invited player var ve online")
      const invitedSocketId = invitedPlayer.socketId;
      if (invitedSocketId) {
        io.to(invitedSocketId).emit('friend:invitation-received', {
          inviterId: userInviter.userId,
          inviterName: userInviter.nameSurname,
          inviterEmail: userInviter.email,
          message: `${userInviter.nameSurname} sizi arkadaş olarak ekledi!`,
          timestamp: Date.now()
        });
      }

    }

    res.status(200).json({ status: 200, message: 'Invitation sent' });
  } else {
    res.status(404).json({ status: 404, message: 'User not found' });
  }
});

app.post("/user/reject-friend", (req, res) => {
  const { inviterId, userId } = req.body;
  UserService.removeUserFriendInvitation(userId, inviterId);
  res.status(200).json({ status: 200, message: 'Invitation rejected successfully' });
});

app.post('/room/invite-friend', async (req, res) => {
  const { email, roomId, userId } = req.body;
  console.log("email, roomId", email, roomId)
  const invitedUser = UserService.getUserInfoWithEmail(email);
  if (invitedUser) {
    const room = RoomService.getRoom(roomId);
    if (room) {
      room.invitedPlayers.set(invitedUser.userId, { nameSurname: invitedUser.nameSurname });
      const isPlayerOnline = PlayerService.getPlayer(invitedUser.userId);
      if (isPlayerOnline && isPlayerOnline.socketId) {
        io.to(isPlayerOnline.socketId).emit('room:invitation-received', {
          roomId: roomId,
          inviterName: UserService.getUserInfoWithId(userId)?.nameSurname,
          message: `${UserService.getUserInfoWithId(userId)?.nameSurname} sizi odaya davet etti!`,
          timestamp: Date.now()
        });
      }
      res.status(200).json({ status: 200, message: 'User invited to room' });
      return;
    } else {
      res.status(404).json({ status: 404, message: 'Room not found' });
      return;
    }
  } else {
    res.status(404).json({ status: 404, message: 'User not found' });
    return;
  }
});

app.post('/user/accept-friend', async (req, res) => {
  const { inviterId, userId } = req.body;

  console.log("inviterId, userId", inviterId, userId)
  const myInvitations = UserService.getUserFriendInvitations(userId);

  console.log("myInvitations:", myInvitations);
  const inviter = myInvitations.find(invite => invite.userId === inviterId);
  if (inviter) {
    console.log("inviter:", inviter);

    const inviterPlayer = PlayerService.getPlayer(inviterId);
    const invitedPlayer = PlayerService.getPlayer(userId);

    const user = UserService.getUserInfoWithId(userId);

    if (!user) {
      res.status(404).json({ status: 404, message: 'User not found' });
      return;
    }


    await UserService.addUserToFriendList(userId, inviter);
    await UserService.addUserToFriendList(inviterId, user);

    if (inviterPlayer) {
      console.log("inviterPlayer.socketId", inviterPlayer.socketId)
      const playerFriends = UserService.getUserInfoWithId(inviterId)?.friends || [];
      io.to(inviterPlayer.socketId || '').emit('friend:added', playerFriends.map((friend) => {
        const player = {
          userId: friend.userId,
          email: friend.email,
          nameSurname: friend.nameSurname,
          online: PlayerService.getPlayer(friend.userId)?.online || false
        };
        return player;
      }));
    }
    if (invitedPlayer) {
      console.log("invitedPlayer.socketId", invitedPlayer.socketId)
      const playerFriends = UserService.getUserInfoWithId(invitedPlayer.userId)?.friends || [];
      
      io.to(invitedPlayer.socketId || '').emit('friend:added', playerFriends.map((friend) => {
        const player = {
          userId: friend.userId,
          email: friend.email,
          nameSurname: friend.nameSurname,
          online: PlayerService.getPlayer(friend.userId)?.online || false
        };
        return player;
      }));
    }

    res.status(200).json({ status: 200, message: 'Friend added successfully' });
  } else {
    res.status(403).json({ status: 403, message: 'Invitation not found' });
  }
});

app.post('/user/change-online-status', async (req, res) => {
  const { userId, online } = req.body;
  console.log("userId, online", userId, online)
  PlayerService.setPlayerOnlineStatus(userId, online);


  // Notify friends about status change
  const userFriends = UserService.getUserInfoWithId(userId)?.friends || [];
  userFriends.forEach(friend => {
    const friendPlayer = PlayerService.getPlayer(friend.userId);
    if (friendPlayer && friendPlayer.socketId) {
      io.to(friendPlayer.socketId).emit('friend:status-changed', {
        userId: userId,
        online: online,
      });
    }
  });


  res.status(200).json({ status: 200, message: 'Online status changed successfully' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current players to newly connected client
  socket.emit('players:all', PlayerService.getAllPlayers());

  socket.on('player:create', (data: {
    userId: string, userName: string, online: boolean
  }) => {
    const invitations = UserService.getUserFriendInvitations(data.userId);
    console.log("player:create", data.userId, data.userName, data.online)
    console.log("invitations for created:", invitations);
    const player = PlayerService.createPlayer({ userId: data.userId, socketId: socket.id, timestamp: Date.now(), online: data.online || true });
    const playerFriends = UserService.getUserInfoWithId(data.userId)?.friends || [];

    const invitationsExcludeFriend = invitations.filter(invite => {
      return playerFriends.find(friend => friend.userId !== invite.userId);
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
          userId: invite.userId,
          nameSurname: invite.nameSurname,
          email: invite.email,
          online: PlayerService.getPlayer(invite.userId)?.online || false,
        };
      })
    });
    if (player.online) {
      friendsWithStatus.forEach(friend => {
        io.to(PlayerService.getPlayer(friend.userId)?.socketId || '').emit('friend:status-changed', {
          userId: player.userId,
          online: player.online,
        });
      });
    }
  });

  // Listen for player position updates
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

  socket.on("rpc:callback", (data: { target: "all" | "others" | "me", method: string, value: string, roomId: string, userId: string, nameSurname: string }) => {
    console.log(`RPC Callback received for event: ${data.target}`);
    if (data.target === "all") {
      io.to(data.roomId).emit("rpc:callback", { method: data.method, value: data.value, userId: data.userId, nameSurname: data.nameSurname });
    } else if (data.target === "others") {
      socket.broadcast.to(data.roomId).emit("rpc:callback", { method: data.method, value: data.value, userId: data.userId, nameSurname: data.nameSurname });
    } else if (data.target === "me") {
      socket.emit("rpc:callback", { method: data.method, value: data.value });
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

  socket.on('disconnect', (reason: string) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);

    // Remove player from state
    const player = PlayerService.getPlayer(socket.id);
    const voicePeer = VoiceService.getPeer(socket.id);

    // RoomService.removePlayerFromRoom(player?.userId || '');


    // Remove from voice chat and notify others
    if (voicePeer) {
      socket.to(voicePeer.roomId).emit('voice:user-left', {
        userId: voicePeer.userId
      });
      VoiceService.removePeer(socket.id);
    }

    if (player) {
      PlayerService.removePlayer(socket.id);
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
