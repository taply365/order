import "dotenv/config";
import express, { json}  from "express";
import cors from 'cors';
import { config } from "./config.js";
import { jwtMiddleware } from './jwtToken/jwtToken.js';
import createSocketServer from "./socketIO/socket.js"; // adjust path
import log from "minhluanlu-color-log";
import router from "./routers/routers.js";


const app = express();
app.use(json({ limit: '10mb' })) // limit payload it 10MB
app.use(cors())
app.use(express.static('upload/images')); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use('/', jwtMiddleware, router);
createSocketServer(app);

const PORT = config.SERVER_PORT;
app.listen(
    PORT, '0.0.0.0',
    () => log.info(`Connected to API Server running On http://localhost:${PORT}`)
);
