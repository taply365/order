import "dotenv/config";
import express, { json}  from "express";
import cors from 'cors';
import cookieParser from "cookie-parser";

import { config } from "./config.js";
import { jwtMiddleware } from './jwtToken/jwtToken.js';
import createSocketServer from "./socketIO/socket.js"; // adjust path
import log from "minhluanlu-color-log";
import router from "./routers/routers.js";
import { origins } from "./config.js";


const app = express();
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

app.get('/connection', (req, res) => {
    res.status(200).json({ message: 'Connection successful' });
});

app.use('/', jwtMiddleware, router);
createSocketServer(app);

const PORT = config.SERVER_PORT;
app.listen(
    PORT, '0.0.0.0',
    () => log.info(`[API Server 🖥️🔌] running on 🌐 - http://localhost:${PORT}`)
);
