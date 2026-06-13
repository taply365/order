import http from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import jwt from "jsonwebtoken";
import log from "minhluanlu-color-log";
import dotenv from "dotenv";
import Subscriber from "../queue/sub/subscriber.js";

import { config, origins } from "../config.js";
import { emitEvent } from "./events.js";

dotenv.config();

let ioInstance = null;
let lastSocketInstance = null;
let subscriberInstance = null;
let pubClientInstance = null;

export function getIO() {
  if (!ioInstance) throw new Error("Socket.IO not initialized yet");
  return ioInstance;
}

export function getLastSocket() {
  return lastSocketInstance;
}

export function getPubClient() {
  if (!pubClientInstance) throw new Error("Redis pubClient not initialized yet");
  return pubClientInstance;
}

export default async function createSocketServer(app) {
  const server = http.createServer(app);

  const io = new Server(server, {
    path: "/order-socket/socket.io",
    cors: {
      origin: origins,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    },
  });

  ioInstance = io;

  const redisPassword = process.env.REDIS_PASSWORD;
  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT;

  const redisReconnectStrategy = (retries) => {
    if (retries >= 10) {
      log.err(`Redis connection stopped after ${retries} failed attempts`);
      return false;
    }

    return Math.min(retries * 200, 1000);
  };

  const pubClient = createClient({
    url: `redis://:${redisPassword}@${redisHost}:${redisPort}`,
    socket: {
      reconnectStrategy: redisReconnectStrategy,
    },
  });

  const subClient = pubClient.duplicate(); // Socket.IO only
  const subscriber = pubClient.duplicate(); // app subscribe only
  
  pubClient.on("error", (err) => log.err("Redis pubClient error:", err));
  subClient.on("error", (err) => log.err("Redis subClient error:", err));
  subscriber.on("error", (err) => log.err("Redis appSubClient error:", err));

  await pubClient.connect();
  await subClient.connect();
  await subscriber.connect();
  Subscriber(subscriber).catch((err) => log.err("Queue subscriber crashed:", err));

  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    try {
      const { token } = socket.handshake.auth || {};
      if (!token) return next(new Error("missing auth"));

      const decoded = jwt.verify(token, process.env.SECRET_KEY, {
        algorithms: ["HS256"],
      });

      socket.user = decoded;
      next();
    } catch (err) {
      log.err("JWT verify failed:", err.name, err.message);
      return next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    lastSocketInstance = socket;
    
    log.debug(`🔌 Connection accepted socketID=(${socket.id})`);
    const businessId = socket?.user?.businessId || null;
    const isBusiness = socket?.user?.isBusiness || false;
    const { guestId } = socket.user || null;


    if (businessId && isBusiness) {
      socket.join(`business:${businessId}`);
      log.info(`🤝 Joined business🏛️ room: ${businessId}`);
    }

   
    if (guestId && !isBusiness) {
      socket.join(`guest:${socket.user.guestId}`);
      log.info(`🤝 Joined guest🤵🏻 room: ${socket.user.guestId}`);
    }

    socket.on("disconnect", (reason) => {
      log.debug(`🔌❌ socket ${socket.id} disconnected: ${reason}`);
    });

    socket.on("ping", (data, ack) => {
      log.debug("ping received:", data);
      if (typeof ack === "function") {
        ack({ success: true, ts: Date.now() });
      }
    });

    emitEvent(io, socket);
  });

  const PORT = config.SOCKET_PORT;

  server.listen(PORT, "0.0.0.0", () => {
    log.info(`[Socket 📡🔌] running on 🌐 - http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    log.err("HTTP server error:", err);
  });

  return { server, io };
}