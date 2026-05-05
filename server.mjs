/**
 * @module Custom Server
 * @description Node HTTP server that wraps Next.js and embeds Socket.IO
 * on the SAME port. This works on Railway (single port constraint).
 *
 * Both regular HTTP requests (Next.js pages, API routes, server actions)
 * and WebSocket upgrades (Socket.IO) are handled by this single server.
 *
 * Usage:
 *   Development: node server.mjs
 *   Production:  node server.mjs (via Procfile / railway.json)
 */

import { createServer } from "node:http";
import next from "next";
import { Server as SocketIO } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// ─── Next.js app ───────────────────────────────────────────────────
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

await app.prepare();

// ─── HTTP server ───────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  // Internal emit endpoint — called by server actions to broadcast events
  if (req.method === "POST" && req.url === "/_internal/emit") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { event, data } = JSON.parse(body);
        if (event) {
          io.emit(event, data);
          if (dev) {
            console.log(`[Socket.IO] Emitted: ${event}`);
          }
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error("[Socket.IO] Emit error:", err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid payload" }));
      }
    });
    return;
  }

  // Everything else → Next.js
  handler(req, res);
});

// ─── Socket.IO server ─────────────────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: {
    origin: dev
      ? ["http://localhost:3000", "http://127.0.0.1:3000"]
      : [process.env.NEXT_PUBLIC_APP_URL || "*"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Performance tuning
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
});

// ─── Connection handling ───────────────────────────────────────────
io.on("connection", (socket) => {
  if (dev) {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
  }

  // Allow clients to join role-based rooms for targeted broadcasts
  socket.on("join:role", (role) => {
    if (["student", "faculty", "hod"].includes(role)) {
      socket.join(`role:${role}`);
      if (dev) console.log(`[Socket.IO] ${socket.id} joined role:${role}`);
    }
  });

  // Allow clients to join user-specific room
  socket.on("join:user", (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      if (dev) console.log(`[Socket.IO] ${socket.id} joined user:${userId}`);
    }
  });

  socket.on("disconnect", (reason) => {
    if (dev) {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    }
  });
});

// ─── Start ─────────────────────────────────────────────────────────
httpServer.listen(port, hostname, () => {
  console.log(`
  ┌──────────────────────────────────────────────┐
  │  🚀 Server ready                             │
  │  Next.js: http://${hostname}:${port}              │
  │  Socket.IO: ws://${hostname}:${port}              │
  │  Mode: ${dev ? "development" : "production"}                        │
  └──────────────────────────────────────────────┘
  `);
});
