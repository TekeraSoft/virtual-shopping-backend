import { Router } from "express";
import { eventService, EventPhase } from "@services/event.service";
import { PlayerService } from "@services/player.service";
import { eventEconomyService } from "@services/event-economy.service";
import { UserService } from "@services/user.service";

const eventRouter = Router();

// Admin: start event schedule
eventRouter.post("/admin/start", (req, res) => {
  const { startAt, lobbyMinutes, gameMinutes, breakMinutes } = req.body || {};
  if (!startAt || !lobbyMinutes || !gameMinutes || breakMinutes === undefined) {
    res.status(400).json({ error: "startAt, lobbyMinutes, gameMinutes, breakMinutes are required" });
    return;
  }
  const startAtMs = new Date(startAt).getTime();
  if (Number.isNaN(startAtMs)) {
    res.status(400).json({ error: "startAt is invalid date/time" });
    return;
  }
  if (startAtMs <= Date.now()) {
    res.status(400).json({ error: "startAt is in the past" });
    return;
  }

  eventService.start({
    startAt: startAtMs,
    lobbyMinutes: Number(lobbyMinutes),
    gameMinutes: Number(gameMinutes),
    breakMinutes: Number(breakMinutes)
  });
  res.json({ success: true, state: eventService.getState() });
});

// Admin: stop event
eventRouter.post("/admin/stop", (req, res) => {
  eventService.stop();
  res.json({ success: true });
});

// Admin: force phase (manual testing)
eventRouter.post("/admin/force-phase", (req, res) => {
  const { phase } = req.body || {};
  const allowed: EventPhase[] = ["LOBBY", "ACTIVE", "BREAK", "STOPPED"];
  if (!allowed.includes(phase)) {
    res.status(400).json({ error: "phase must be LOBBY | ACTIVE | BREAK | STOPPED" });
    return;
  }
  eventService.forcePhase(phase);
  res.json({ success: true, state: eventService.getState() });
});

// Client: get state
eventRouter.get("/state", (req, res) => {
  res.json({ success: true, state: eventService.getState() });
});

// Client: list rooms
eventRouter.get("/rooms", (req, res) => {
  res.json({ success: true, rooms: eventService.getRooms() });
});

// Client: get target price for a room
eventRouter.get("/target-price/:roomId", (req, res) => {
  const { roomId } = req.params || {};
  if (!roomId) {
    res.status(400).json({ error: "roomId is required" });
    return;
  }
  const room = eventEconomyService.getRoom(roomId);
  if (!room) {
    res.status(404).json({ error: "ROOM_NOT_FOUND" });
    return;
  }
  res.json({ success: true, roomId, targetBalance: room.targetBalance });
});

// Client: preview item (HTTP)
eventRouter.post("/preview", (req, res) => {
  const { roomId, userId, catalogId, sellerId, price } = req.body || {};
  if (!roomId || !userId || !catalogId || !sellerId || typeof price !== "number") {
    res.status(400).json({ error: "roomId, userId, catalogId, sellerId, price are required" });
    return;
  }
  const result = eventEconomyService.preview(roomId, userId, catalogId, sellerId, price);
  if (!result.ok) {
    res.status(409).json({ error: result.reason });
    return;
  }
  res.json({ success: true, catalogId });
});

// Client: join lobby
eventRouter.post("/join", (req, res) => {
  const { userId } = req.body || {};
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const result = eventService.join(userId);
  if (!result.ok || !result.roomId) {
    res.status(409).json(result);
    return;
  }
  eventEconomyService.joinUser(result.roomId, userId);

  const io = req.io;
  const roomChannel = `eventroom:${result.roomId}`;
  const socketId = PlayerService.getPlayer(userId)?.socketId;
  const existingUsers = (result.existingUserIds || []).map((id: string) => {
    const player = PlayerService.getPlayer(id);
    return { userId: id, avatarId: player?.avatarId || null };
  });
  if (io && socketId) {
    const sock = io.sockets.sockets.get(socketId);
    sock?.join(roomChannel);
    sock?.to(roomChannel).emit("eventroom:user-joined", {
      roomId: result.roomId,
      userId,
      avatarId: PlayerService.getPlayer(userId)?.avatarId || null
    });
  }

  res.json({
    ok: result.ok,
    roomId: result.roomId,
    lobbyIndex: result.lobbyIndex,
    count: result.count,
    capacity: result.capacity,
    avatarId: PlayerService.getPlayer(userId)?.avatarId || null,
    existingUsers
  });
});

// Client: leave lobby
eventRouter.post("/leave", (req, res) => {
  const { userId } = req.body || {};
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const result = eventService.leave(userId);

  if (result.ok && result.roomId) {
    eventEconomyService.leaveUser(result.roomId, userId);
    const io = req.io;
    const roomChannel = `eventroom:${result.roomId}`;
    const socketId = PlayerService.getPlayer(userId)?.socketId;
    if (io && socketId) {
      const sock = io.sockets.sockets.get(socketId);
      sock?.leave(roomChannel);
      sock?.to(roomChannel).emit("eventroom:user-left", {
        roomId: result.roomId,
        userId
      });
    }
  }

  res.json(result);
});

// Client: buy item (HTTP)
eventRouter.post("/buy", async (req, res) => {
  const { roomId, userId, catalogId, sellerId, price, name, imageUrl } = req.body || {};
  if (!roomId || !userId || !catalogId || !sellerId || typeof price !== "number" || !name || !imageUrl) {
    res.status(400).json({ error: "roomId, userId, catalogId, sellerId, price, name, imageUrl are required" });
    return;
  }
  const result = eventEconomyService.buy(roomId, userId, catalogId, sellerId, price, name, imageUrl);
  if (!result.ok) {
    res.status(409).json({ error: result.reason });
    return;
  }

  if (result.winnerUserId) {
    const winnerUser = await UserService.getUserInfoWithId(result.winnerUserId);
    const winnerName = winnerUser?.nameSurname || result.winnerUserId;
    const targetBalance = eventEconomyService.getTargetBalance(roomId) ?? 0;
    const io = req.io;
    if (io) {
      io.to(`eventroom:${roomId}`).emit("event:winner", {
        roomId,
        userId: result.winnerUserId,
        nameSurname: winnerName,
        targetBalance
      });
    }
  }

  res.json({
    success: true,
    newBalance: result.newBalance,
    catalogId,
    remainingStock: result.remainingStock,
    sellerCount: result.sellerCount
  });
});

// Client: pickup money (HTTP)
eventRouter.post("/pickup-money", async (req, res) => {
  const { roomId, userId, amount } = req.body || {};
  if (!roomId || !userId || typeof amount !== "number") {
    res.status(400).json({ error: "roomId, userId, amount are required" });
    return;
  }
  const result = eventEconomyService.pickupMoney(roomId, userId, amount);
  if (!result.ok) {
    res.status(409).json({ error: result.reason });
    return;
  }
  if (result.winnerUserId) {
    const winnerUser = await UserService.getUserInfoWithId(result.winnerUserId);
    const winnerName = winnerUser?.nameSurname || result.winnerUserId;
    const targetBalance = eventEconomyService.getTargetBalance(roomId) ?? 0;
    const io = req.io;
    if (io) {
      io.to(`eventroom:${roomId}`).emit("event:winner", {
        roomId,
        userId: result.winnerUserId,
        nameSurname: winnerName,
        targetBalance
      });
    }
  }
  res.json({ success: true, newBalance: result.newBalance, pickupId: result.pickupId });
});

// Client: refund item (HTTP)
eventRouter.post("/refund", async (req, res) => {
  const { roomId, userId, catalogId, sellerId, price } = req.body || {};
  if (!roomId || !userId || !catalogId || !sellerId || typeof price !== "number") {
    res.status(400).json({ error: "roomId, userId, catalogId, sellerId, price are required" });
    return;
  }
  const result = eventEconomyService.refund(roomId, userId, catalogId, sellerId, price);
  if (!result.ok) {
    res.status(409).json({ error: result.reason });
    return;
  }
  if (result.winnerUserId) {
    const winnerUser = await UserService.getUserInfoWithId(result.winnerUserId);
    const winnerName = winnerUser?.nameSurname || result.winnerUserId;
    const targetBalance = eventEconomyService.getTargetBalance(roomId) ?? 0;
    const io = req.io;
    if (io) {
      io.to(`eventroom:${roomId}`).emit("event:winner", {
        roomId,
        userId: result.winnerUserId,
        nameSurname: winnerName,
        targetBalance
      });
    }
  }
  res.json({
    success: true,
    newBalance: result.newBalance,
    catalogId,
    remainingStock: result.remainingStock,
    sellerCount: result.sellerCount
  });
});

// Client: remove picked up money (HTTP)
eventRouter.post("/pickup-remove", async (req, res) => {
  const { roomId, userId, pickupId } = req.body || {};
  if (!roomId || !userId || !pickupId) {
    res.status(400).json({ error: "roomId, userId, pickupId are required" });
    return;
  }
  const result = eventEconomyService.removePickup(roomId, userId, pickupId);
  if (!result.ok) {
    res.status(409).json({ error: result.reason });
    return;
  }
  if (result.winnerUserId) {
    const winnerUser = await UserService.getUserInfoWithId(result.winnerUserId);
    const winnerName = winnerUser?.nameSurname || result.winnerUserId;
    const targetBalance = eventEconomyService.getTargetBalance(roomId) ?? 0;
    const io = req.io;
    if (io) {
      io.to(`eventroom:${roomId}`).emit("event:winner", {
        roomId,
        userId: result.winnerUserId,
        nameSurname: winnerName,
        targetBalance
      });
    }
  }
  res.json({ success: true, newBalance: result.newBalance });
});

// Client: get inventory (HTTP)
eventRouter.get("/inventory/:roomId/:userId", (req, res) => {
  const { roomId, userId } = req.params || {};
  if (!roomId || !userId) {
    res.status(400).json({ error: "roomId and userId are required" });
    return;
  }
  const result = eventEconomyService.getInventory(roomId, userId);
  if (!result.ok) {
    res.status(404).json({ error: result.reason });
    return;
  }
  res.json({
    success: true,
    roomId,
    userId,
    balance: result.balance,
    purchasedItems: result.purchasedCatalogIds,
    sellerCounts: result.sellerCounts,
    pickups: result.pickups
  });
});

// Client: steal random item (HTTP)
eventRouter.post("/steal", (req, res) => {
  const { roomId, userId } = req.body || {};
  if (!roomId || !userId) {
    res.status(400).json({ error: "roomId and userId are required" });
    return;
  }
  const result = eventEconomyService.stealRandom(roomId, userId);
  if (!result.ok) {
    res.status(409).json({ error: result.reason });
    return;
  }
  res.json({ success: true, catalogId: result.catalogId, newBalance: result.newBalance });
});

export default eventRouter;
