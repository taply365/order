import dotenv from "dotenv";
import { expressjwt } from 'express-jwt';
import { jwtConfig } from "../config.js";
dotenv.config()

const SECRET_KEY = jwtConfig.secret;


export const jwtMiddleware = expressjwt({
    secret: SECRET_KEY,           // Secret key to verify the token
    algorithms: [jwtConfig.algorithm],       // Specify the algorithm used to sign the token
}).unless({
    path: [/^\/gen-guest-token\/.*/, "/gen-guest-token"]// Exclude these routes from JWT verification (public routes)
});