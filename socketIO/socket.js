import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import log from "minhluanlu-color-log";
import { config } from "../config.js";
import {emitEvent} from "./events.js";


let ioInstance = null;
let lastSocketInstance = null;

export function getIO() {
  if (!ioInstance) throw new Error("Socket.IO not initialized yet");
  return ioInstance;
}

export function getLastSocket() {
  return lastSocketInstance;
}

/**
 * @param {import("express").Express} app
 * @returns {{ server: http.Server, io: Server }}
 */
export default function createSocketServer(app) {
  const server = http.createServer(app);

  const io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: ["http://localhost:5173", "https://tryonapp.tech", "https://dev.tryonapp.tech"], //  origin: ["https://yourdomain.com"], // only your site
      methods: ["GET", "POST"],
      allowedHeaders: "*",
      credentials: true,
    },
  });

  ioInstance = io;

  // Auth middleware
  io.use((socket, next) => {
    console.log("AUTH TOKEN PRESENT?", !!socket.handshake.auth?.token);
    try {
      const decoded = jwt.verify(socket.handshake.auth.token, process.env.SECRET_KEY);
      console.log("DECODED:", decoded);
      socket.user = decoded;
      next();
    } catch (e) {
      console.log("VERIFY FAIL:", e.message);
      next(new Error("unauthorized"));
    }
  });

  // ✅ server-side event is "connection"
  io.on("connection", (socket) => {
    lastSocketInstance = socket;

    log.debug(`connection accepted socketID=(${socket.id})`);

    socket.on("disconnect", (reason) => {
      log.debug(`socket ${socket.id} disconnected: ${reason}`);
    });

    // Example event
    socket.on("ping", (data, ack) => {
      log.debug("ping received:", data);
      console.log("ping received:", data);
      if (typeof ack === "function") ack({ success: true, ts: Date.now() });
    });

    emitEvent(socket);
  });

  const PORT = config.SOCKET_PORT;

  server.listen(PORT, "0.0.0.0", () => {
    log.info(`Connected to SocketIO Server running on http://localhost:${PORT}`);
  });

  // Helpful server error logging
  server.on("error", (err) => {
    log.err("HTTP server error:", err);
  });

  return { server, io };
}