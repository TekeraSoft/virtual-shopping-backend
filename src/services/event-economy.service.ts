import { Server } from "socket.io";
import { EventPhase } from "./event.service";

export interface EventProduct {
  catalogId: string;
  sellerId: string;
  price: number;
  initialStock: number;
}

export interface EventRoomEconomy {
  roomId: string;
  targetBalance: number;
  status: "ACTIVE" | "ENDED";
  productStock: Map<string, number>;
  productSeller: Map<string, string>;
  productPrice: Map<string, number>;
  userBalances: Map<string, number>;
  userPurchasedProducts: Map<string, Map<string, { catalogId: string; sellerId: string; price: number }>>;
  userSellerCounts: Map<string, Map<string, number>>;
  userPickups: Map<string, { id: string; amount: number }[]>;
  pickupSeq: number;
  winnerUserId: string | null;
}

const DEFAULT_TARGET = 100;
const DEFAULT_VARIATIONS = [0.03, 0.05, 0.1];
const DEFAULT_STOCK = 5;

function pickVariation(): number {
  return DEFAULT_VARIATIONS[Math.floor(Math.random() * DEFAULT_VARIATIONS.length)];
}

function randomSign(): number {
  return Math.random() < 0.5 ? -1 : 1;
}

function roundTo10(n: number): number {
  return Math.round(n / 10) * 10;
}

export class EventEconomyService {
  private io: Server | null = null;
  private rooms: Map<string, EventRoomEconomy> = new Map();
  private globalPhase: EventPhase = "STOPPED";
  private activeStartedAt = 0;

  setIo(io: Server) {
    this.io = io;
  }

  setGlobalPhase(phase: EventPhase) {
    this.globalPhase = phase;
    if (phase === "ACTIVE") {
      this.activeStartedAt = Date.now();
    }
  }

  getActiveDelayMs(): number {
    if (this.globalPhase !== "ACTIVE" || !this.activeStartedAt) return 0;
    const elapsed = Date.now() - this.activeStartedAt;
    return Math.max(0, 2000 - elapsed);
  }

  ensureRoom(roomId: string, products: EventProduct[] = []): EventRoomEconomy {
    let room = this.rooms.get(roomId);
    if (room) return room;

    const variation = pickVariation();
    const targetBalance = roundTo10(DEFAULT_TARGET * (1 + randomSign() * variation));

    room = {
      roomId,
      targetBalance,
      status: "ACTIVE",
      productStock: new Map(),
      productSeller: new Map(),
      productPrice: new Map(),
      userBalances: new Map(),
      userPurchasedProducts: new Map(),
      userSellerCounts: new Map(),
      userPickups: new Map(),
      pickupSeq: 0,
      winnerUserId: null
    };

    for (const p of products) {
      room.productStock.set(p.catalogId, p.initialStock);
      room.productSeller.set(p.catalogId, p.sellerId);
      room.productPrice.set(p.catalogId, p.price);
    }

    this.rooms.set(roomId, room);
    return room;
  }

  clearAll() {
    this.rooms.clear();
  }

  removeRoom(roomId: string) {
    this.rooms.delete(roomId);
  }

  getRoom(roomId: string) {
    return this.rooms.get(roomId);
  }

  getTargetBalance(roomId: string): number | null {
    const room = this.rooms.get(roomId);
    return room ? room.targetBalance : null;
  }

  getTargetPricePayload(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return { roomId, targetBalance: room.targetBalance };
  }

  private ensureProduct(room: EventRoomEconomy, catalogId: string, sellerId: string, price: number) {
    if (!room.productStock.has(catalogId)) {
      room.productStock.set(catalogId, DEFAULT_STOCK);
    }
    if (!room.productSeller.has(catalogId)) {
      room.productSeller.set(catalogId, sellerId);
    }
    if (!room.productPrice.has(catalogId)) {
      room.productPrice.set(catalogId, price);
    }
  }

  private getUserState(room: EventRoomEconomy, userId: string) {
    if (!room.userBalances.has(userId)) room.userBalances.set(userId, 0);
    if (!room.userPurchasedProducts.has(userId)) room.userPurchasedProducts.set(userId, new Map());
    if (!room.userSellerCounts.has(userId)) room.userSellerCounts.set(userId, new Map());
    if (!room.userPickups.has(userId)) room.userPickups.set(userId, []);
  }

  joinUser(roomId: string, userId: string): { targetBalance: number } {
    const room = this.ensureRoom(roomId);
    this.getUserState(room, userId);
    return { targetBalance: room.targetBalance };
  }

  leaveUser(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.userBalances.delete(userId);
    room.userPurchasedProducts.delete(userId);
    room.userSellerCounts.delete(userId);
    room.userPickups.delete(userId);
  }

  getInventory(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "ROOM_NOT_FOUND" };
    this.getUserState(room, userId);
    const balance = room.userBalances.get(userId) ?? 0;
    const purchasedMap = room.userPurchasedProducts.get(userId) ?? new Map();
    const purchased = Array.from(purchasedMap.values());
    const sellerCountsMap = room.userSellerCounts.get(userId) ?? new Map();
    const sellerCounts: Record<string, number> = {};
    for (const [sellerId, count] of sellerCountsMap.entries()) {
      sellerCounts[sellerId] = count;
    }
    const pickups = room.userPickups.get(userId) ?? [];
    return { ok: true, balance, purchasedCatalogIds: purchased, sellerCounts, pickups };
  }

  getProductSnapshot(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const snapshot: { catalogId: string; sellerId: string; price: number; stock: number }[] = [];
    for (const [catalogId, stock] of room.productStock.entries()) {
      snapshot.push({
        catalogId,
        sellerId: room.productSeller.get(catalogId) || "",
        price: room.productPrice.get(catalogId) || 0,
        stock
      });
    }
    return snapshot;
  }

  preview(roomId: string, userId: string, catalogId: string, sellerId: string, price: number) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "ROOM_NOT_FOUND" };
    if (room.status === "ENDED") return { ok: false, reason: "ROOM_ENDED" };
    if (this.globalPhase !== "ACTIVE") return { ok: false, reason: "PHASE_NOT_ACTIVE" };

    this.ensureProduct(room, catalogId, sellerId, price);
    this.getUserState(room, userId);

    const stock = room.productStock.get(catalogId) ?? 0;
    if (stock <= 0) return { ok: false, reason: "OUT_OF_STOCK" };

    const purchased = room.userPurchasedProducts.get(userId) || new Map();
    if (purchased.has(catalogId)) return { ok: false, reason: "ALREADY_BOUGHT" };

    const sellerCounts = room.userSellerCounts.get(userId) || new Map<string, number>();
    const currentSellerCount = sellerCounts.get(sellerId) ?? 0;
    if (currentSellerCount >= 2) return { ok: false, reason: "SELLER_LIMIT" };

    return { ok: true };
  }

  buy(roomId: string, userId: string, catalogId: string, sellerId: string, price: number) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "ROOM_NOT_FOUND" };
    if (room.status === "ENDED") return { ok: false, reason: "ROOM_ENDED" };
    if (this.globalPhase !== "ACTIVE") return { ok: false, reason: "PHASE_NOT_ACTIVE" };

    this.ensureProduct(room, catalogId, sellerId, price);
    this.getUserState(room, userId);

    const storedSeller = room.productSeller.get(catalogId);
    if (storedSeller && storedSeller !== sellerId) return { ok: false, reason: "SELLER_MISMATCH" };

    const stock = room.productStock.get(catalogId) ?? 0;
    if (stock <= 0) return { ok: false, reason: "OUT_OF_STOCK" };

    const purchased = room.userPurchasedProducts.get(userId) || new Map();
    if (purchased.has(catalogId)) return { ok: false, reason: "ALREADY_BOUGHT" };

    const sellerCounts = room.userSellerCounts.get(userId) || new Map<string, number>();
    const currentSellerCount = sellerCounts.get(sellerId) ?? 0;
    if (currentSellerCount >= 2) return { ok: false, reason: "SELLER_LIMIT" };

    room.productStock.set(catalogId, stock - 1);
    const effectivePrice = room.productPrice.get(catalogId) ?? price;
    purchased.set(catalogId, { catalogId, sellerId, price: effectivePrice });
    room.userPurchasedProducts.set(userId, purchased);
    sellerCounts.set(sellerId, currentSellerCount + 1);
    room.userSellerCounts.set(userId, sellerCounts);

    const newBalance = (room.userBalances.get(userId) ?? 0) + effectivePrice;
    room.userBalances.set(userId, newBalance);

    this.io?.to(`eventroom:${roomId}`).emit("event:stock-updated", {
      roomId,
      catalogId,
      remainingStock: stock - 1
    });

    let winnerUserId: string | null = null;
    if (room.winnerUserId === null && newBalance === room.targetBalance) {
      room.winnerUserId = userId;
      room.status = "ENDED";
      winnerUserId = userId;
    }

    return {
      ok: true,
      newBalance,
      remainingStock: stock - 1,
      sellerCount: currentSellerCount + 1,
      winnerUserId
    };
  }

  refund(roomId: string, userId: string, catalogId: string, sellerId: string, price: number) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "ROOM_NOT_FOUND" };
    if (room.status === "ENDED") return { ok: false, reason: "ROOM_ENDED" };
    if (this.globalPhase !== "ACTIVE") return { ok: false, reason: "PHASE_NOT_ACTIVE" };

    const purchased = room.userPurchasedProducts.get(userId);
    if (!purchased || !purchased.has(catalogId)) return { ok: false, reason: "NOT_OWNED" };
    const item = purchased.get(catalogId);
    purchased.delete(catalogId);

    const sellerCounts = room.userSellerCounts.get(userId) || new Map<string, number>();
    const currentSellerCount = sellerCounts.get(sellerId) ?? 0;
    sellerCounts.set(sellerId, Math.max(0, currentSellerCount - 1));
    room.userSellerCounts.set(userId, sellerCounts);

    const stock = room.productStock.get(catalogId) ?? 0;
    room.productStock.set(catalogId, stock + 1);

    const effectivePrice = item?.price ?? room.productPrice.get(catalogId) ?? price;
    const newBalance = (room.userBalances.get(userId) ?? 0) - effectivePrice;
    room.userBalances.set(userId, newBalance);

    this.io?.to(`eventroom:${roomId}`).emit("event:stock-updated", {
      roomId,
      catalogId,
      remainingStock: stock + 1
    });

    let winnerUserId: string | null = null;
    if (room.winnerUserId === null && newBalance === room.targetBalance) {
      room.winnerUserId = userId;
      room.status = "ENDED";
      winnerUserId = userId;
    }

    return {
      ok: true,
      newBalance,
      remainingStock: stock + 1,
      sellerCount: Math.max(0, currentSellerCount - 1),
      winnerUserId
    };
  }

  stealRandom(roomId: string, userId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "ROOM_NOT_FOUND" };
    if (room.status === "ENDED") return { ok: false, reason: "ROOM_ENDED" };
    if (this.globalPhase !== "ACTIVE") return { ok: false, reason: "PHASE_NOT_ACTIVE" };

    const purchased = room.userPurchasedProducts.get(userId);
    if (!purchased || purchased.size === 0) return { ok: false, reason: "NO_PRODUCTS" };

    const items = Array.from(purchased.values());
    const picked = items[Math.floor(Math.random() * items.length)];
    const catalogId = picked.catalogId;
    const sellerId = picked.sellerId || room.productSeller.get(catalogId) || "";
    const effectivePrice = picked.price ?? room.productPrice.get(catalogId) ?? 0;
    purchased.delete(catalogId);

    const sellerCounts = room.userSellerCounts.get(userId) || new Map<string, number>();
    const currentSellerCount = sellerCounts.get(sellerId) ?? 0;
    sellerCounts.set(sellerId, Math.max(0, currentSellerCount - 1));
    room.userSellerCounts.set(userId, sellerCounts);

    const newBalance = (room.userBalances.get(userId) ?? 0) - effectivePrice;
    room.userBalances.set(userId, newBalance);

    return { ok: true, catalogId, newBalance };
  }

  pickupMoney(roomId: string, userId: string, amount: number) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "ROOM_NOT_FOUND" };
    if (room.status === "ENDED") return { ok: false, reason: "ROOM_ENDED" };
    if (this.globalPhase !== "ACTIVE") return { ok: false, reason: "PHASE_NOT_ACTIVE" };
    this.getUserState(room, userId);
    const newBalance = (room.userBalances.get(userId) ?? 0) + amount;
    room.userBalances.set(userId, newBalance);
    const pickupId = `${room.roomId}-${++room.pickupSeq}`;
    const list = room.userPickups.get(userId) ?? [];
    list.push({ id: pickupId, amount });
    room.userPickups.set(userId, list);
    let winnerUserId: string | null = null;
    if (room.winnerUserId === null && newBalance === room.targetBalance) {
      room.winnerUserId = userId;
      room.status = "ENDED";
      winnerUserId = userId;
    }
    return { ok: true, newBalance, winnerUserId, pickupId };
  }

  removePickup(roomId: string, userId: string, pickupId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "ROOM_NOT_FOUND" };
    if (room.status === "ENDED") return { ok: false, reason: "ROOM_ENDED" };
    if (this.globalPhase !== "ACTIVE") return { ok: false, reason: "PHASE_NOT_ACTIVE" };
    this.getUserState(room, userId);
    const list = room.userPickups.get(userId) ?? [];
    const idx = list.findIndex(p => p.id === pickupId);
    if (idx === -1) return { ok: false, reason: "PICKUP_NOT_FOUND" };
    const amount = list[idx].amount;
    list.splice(idx, 1);
    room.userPickups.set(userId, list);
    const newBalance = (room.userBalances.get(userId) ?? 0) - amount;
    room.userBalances.set(userId, newBalance);
    let winnerUserId: string | null = null;
    if (room.winnerUserId === null && newBalance === room.targetBalance) {
      room.winnerUserId = userId;
      room.status = "ENDED";
      winnerUserId = userId;
    }
    return { ok: true, newBalance, winnerUserId };
  }
}

export const eventEconomyService = new EventEconomyService();
