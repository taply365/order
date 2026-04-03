import "dotenv/config";
import express, { json}  from "express";
import cors from 'cors';
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";

import { config } from "./config.js";
import { jwtMiddleware } from './jwtToken/jwtToken.js';
import createSocketServer from "./socketIO/socket.js"; // adjust path
import log from "minhluanlu-color-log";
import router from "./routers/routers.js";
import { origins } from "./config.js";


const app = express();
const homePagePath = fileURLToPath(new URL("./templates/index.html", import.meta.url));
app.use(json({ limit: '10mb' })) // limit payload it 10MB
app.use(express.static('upload/images')); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());

// important for cookies from frontend
app.use(cors({
  origin: origins,
  credentials: true,
  methods: [ "GET" , "POST" , "PUT" , "DELETE" , "PATCH" , "OPTIONS" ]
}));

app.get('/', (req, res) => {
  res.status(200).sendFile(homePagePath);
});

app.use('/', jwtMiddleware, router);

app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      success: false,
      message: "Missing or invalid authorization token",
    });
  }

  return next(err);
});

createSocketServer(app);

const PORT = config.SERVER_PORT;
app.listen(
    PORT, '0.0.0.0',
    () => log.info(`[API Server 🖥️🔌] running on 🌐 - http://localhost:${PORT}`)
);
