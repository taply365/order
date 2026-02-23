import dotenv from "dotenv";
import { expressjwt } from 'express-jwt';
dotenv.config()

const SECRET_KEY = process.env.SECRET_KEY;


export const jwtMiddleware = expressjwt({
    secret: SECRET_KEY,           // Secret key to verify the token
    algorithms: ['HS256'],       // Specify the algorithm used to sign the token
}).unless({
    path: [/^\/gen-guest-token\/.*/, /^\/gen-business-token\/.*/]// Exclude these routes from JWT verification (public routes)
});