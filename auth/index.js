import jwt from "jsonwebtoken";
import log from "minhluanlu-color-log";


export function getGuestIdFromToken(req){
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        log.warn("Missing authorization token in request headers");
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY, { algorithm: "HS256" }); 
        return decoded.guestId;
    } catch (error) {
        log.warn("Invalid authorization token");
        return null;
    }
}