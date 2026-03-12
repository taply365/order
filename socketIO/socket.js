import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import log from "minhluanlu-color-log";
import { config } from "../config.js";
import dotenv from "dotenv";
dotenv.config();
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
      origin: ["http://localhost:5173", "https://tryonapp.tech", "https://dev.tryonapp.tech", "https://www.tryonapp.tech"], //  origin: ["https://yourdomain.com"], // only your site
      methods: ["GET", "POST"],
      allowedHeaders: "*",
      credentials: true,
    },
  });

  ioInstance = io;

  // Auth middleware
  io.use((socket, next) => {
    try {
      const { token } = socket.handshake.auth || {};
      if (!token) return next(new Error("missing auth"));
      
      const decoded = jwt.verify(token, process.env.SECRET_KEY, { algorithm: "HS256" }); // same key you sign with
      socket.user = decoded; // attach user info for later use
      
      if(socket?.user?.businessId != undefined && socket?.user?.businessId != null){ 
        socket.join(`business:${socket.user?.businessId}`);
        log.debug(`🤝 Joined business room: ${socket.user?.businessId}`);
      } 

      if(socket?.user?.guestId != undefined && socket?.user?.guestId != null){
        socket.join(`guest:${socket.user?.guestId}`);
        log.debug(`🤝 Joined guest room: ${socket.user?.guestId}`);
      }

      next();
    } catch (err) {
      log.err("JWT verify failed:", err.name, err.message);
      return next(new Error("unauthorized"));
    }
  });

  // ✅ server-side event is "connection"
  io.on("connection", (socket) => {
    lastSocketInstance = socket;

    log.debug(`🔌Connection accepted socketID=(${socket.id})`);

    socket.on("disconnect", (reason) => {
      log.debug(`🔌❌ socket ${socket.id} disconnected: ${reason}`);
    });

    // Example event
    socket.on("ping", (data, ack) => {
      log.debug("ping received:", data);
      console.log("ping received:", data);
      if (typeof ack === "function") ack({ success: true, ts: Date.now() });
    });

    emitEvent(io,socket);
  });

  const PORT = config.SOCKET_PORT;

  server.listen(PORT, "0.0.0.0", () => {
    log.info(`[Socket 📡🔌]running on 🌐 - http://localhost:${PORT}`);
  });

  // Helpful server error logging
  server.on("error", (err) => {
    log.err("HTTP server error:", err);
  });

  return { server, io };
}