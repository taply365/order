import log from "minhluanlu-color-log";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import setCookie from "../cookies/cookie.js";

const HTTPS_SECURE = process.env.ENV !== "local";
const DOMAIN = process.env.APP_URL;

async function genGuestToken(req, res) {
    try {
        const guestId = req.query.guestId;
        log.info("🔑 Generating guest token...", { guestId });
        if (!process.env.SECRET_KEY) {
            log.err("SECRET_KEY not configured");
            return res.status(500).json({
                success: false,
                message: "SECRET_KEY not configured"
            });
        }

        const accessToken = jwt.sign(
            { guestId: guestId , isBusiness: false},
            process.env.SECRET_KEY,
            { expiresIn: "24h" }
        );

        const refreshToken = jwt.sign(
            { guestId: guestId, type: "refresh" },
            process.env.SECRET_KEY,
            { expiresIn: "24h" }
        );

        setCookie(res, refreshToken, {
            httpOnly: true,
            secure: HTTPS_SECURE,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            domain: DOMAIN
        });

        log.debug(`🔑✅ Guest token generated successfully.`);
        return res.status(200).json({
            success: true,
            message: `Guest token generated for guest ID: ${guestId}`,
            token: accessToken,
            refreshToken: refreshToken
        });

    } catch (err) {
        log.err(err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }

}


export {
    genGuestToken
}