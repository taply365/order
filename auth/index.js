import jwt from "jsonwebtoken";
import log from "minhluanlu-color-log";
import { jwtConfig } from "../config.js";


export async function getJwtTokenData(req){
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        log.warn("Missing authorization token in request headers");
        return null;
    }

    try {
        const decoded = jwt.verify(token, jwtConfig.secret, { algorithm: jwtConfig.algorithm });
        return decoded;
    } catch (error) {
        log.warn("Invalid authorization token");
        return null;
    }
}