import "dotenv/config";
import express, { json}  from "express";
import cors from 'cors';
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";

import { config } from "./config.js";
import { jwtMiddleware } from './jwtToken/jwtToken.js';
import createSocketServer from "./socketIO/socket.js"; // adjust path
import log from "minhluanlu-color-log";
import router from "./routers/routers.js";
import { origins } from "./config.js";

import { handleSendSupportEmail } from "./routerHandler/email.js";
import { HandleGetReceiptSession } from "./routerHandler/receipts.js";


const app = express();
app.set("trust proxy", 1);
const homePagePath = fileURLToPath(new URL("./templates/index.html", import.meta.url));
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
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

app.use(apiRateLimit);

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication requests, please try again later.",
  },
});

const receiptRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many receipt requests, please try again later.",
  },
});

app.use("/production/authenticate", authRateLimit);
app.use("/gen-guest-token", authRateLimit);
app.use("/send-support-email", authRateLimit);
app.use("/order", receiptRateLimit);

app.post('/send-support-email', handleSendSupportEmail); // 👈 new route for support emails
app.get('/order/receipt-session/business/:businessId/code/:code', receiptRateLimit, HandleGetReceiptSession); // 👈 apply rate limit to receipt session route

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
