/* eslint-disable no-console */
const { io } = require("socket.io-client");

const BASE_HTTP = process.env.BOT_BASE_HTTP || "http://192.168.1.175:3021";
const BASE_SOCKET = process.env.BOT_BASE_SOCKET || BASE_HTTP;
const BOT_COUNT = Number(process.env.BOT_COUNT || 48);
const START_INDEX = Number(process.env.BOT_START_INDEX || 1);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function joinWithBot(i) {
  const userId = `bot-${START_INDEX + i}`;
  const avatarId = `avatar-${(i % 8) + 1}`;
  const nameSurname = `Bot ${START_INDEX + i}`;

  const socket = io(BASE_SOCKET, {
    path: "/socket.io/",
    transports: ["websocket", "polling"],
    reconnection: false,
    timeout: 10000
  });

  const joined = {
    userId,
    socketId: "",
    roomId: "",
    ok: false,
    error: ""
  };

  return new Promise((resolve) => {
    socket.on("connect", async () => {
      joined.socketId = socket.id;
      const createAckTimeout = setTimeout(() => {
        joined.error = "player:create ack timeout";
        socket.disconnect();
        resolve(joined);
      }, 10000);

      socket.once("player:created", async () => {
        clearTimeout(createAckTimeout);
        try {
          const resp = await fetch(`${BASE_HTTP}/event/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, nameSurname })
          });
          const body = await resp.json().catch(() => ({}));

          if (!resp.ok || !body?.ok) {
            joined.error = `join failed status=${resp.status} body=${JSON.stringify(body)}`;
            socket.disconnect();
            resolve(joined);
            return;
          }

          joined.ok = true;
          joined.roomId = body.roomId || "";
          resolve({ ...joined, existingUserIds: body.existingUserIds || [] });
        } catch (err) {
          joined.error = `join request error: ${err?.message || String(err)}`;
          socket.disconnect();
          resolve(joined);
        }
      });

      socket.emit("player:create", { userId, online: true, avatarId });
    });

    socket.on("connect_error", (err) => {
      joined.error = `connect_error: ${err?.message || String(err)}`;
      resolve(joined);
    });
  });
}

async function main() {
  console.log(`[bots] starting ${BOT_COUNT} bots`);
  console.log(`[bots] http=${BASE_HTTP} socket=${BASE_SOCKET}`);

  const tasks = Array.from({ length: BOT_COUNT }, (_, i) => joinWithBot(i));
  const results = await Promise.all(tasks);

  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);

  const roomCounts = new Map();
  for (const r of ok) {
    roomCounts.set(r.roomId, (roomCounts.get(r.roomId) || 0) + 1);
  }

  console.log(`[bots] joined=${ok.length} failed=${fail.length}`);
  for (const [roomId, count] of roomCounts.entries()) {
    console.log(`[bots] room ${roomId} -> ${count} bots`);
  }

  if (fail.length) {
    console.log("[bots] failures:");
    fail.slice(0, 10).forEach((f) => console.log(`- ${f.userId}: ${f.error}`));
  }

  console.log("[bots] bots stay connected. Press Ctrl+C to stop.");
  while (true) {
    await sleep(60000);
  }
}

main().catch((err) => {
  console.error("[bots] fatal error", err);
  process.exit(1);
});
