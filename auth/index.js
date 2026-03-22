import jwt from "jsonwebtoken";
import log from "minhluanlu-color-log";


export async function getJwtTokenData(req){
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        log.warn("Missing authorization token in request headers");
        return null;
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY, { algorithm: "HS256" });
        return decoded;
    } catch (error) {
        log.warn("Invalid authorization token");
        return null;
    }
}

export async function Authentication(req, res) {
    try{
        
        getJwtTokenData(req).then(decoded => {
            if (!decoded) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            req.user = decoded;
            res.status(200).json({ message: "Authenticated", user: decoded });
        }).catch(error => {
            log.err("Error in Authentication middleware:", error);
            res.status(401).json({ message: "Unauthorized" });
        });

    }
    catch(error){
        log.err("Error in Authentication middleware:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}