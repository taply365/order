import log from "minhluanlu-color-log";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();



async function genGuestToken(req, res) {
    try {
        log.info("🔑 Generating guest token...");
        const guestId = req.query.guestId;
        if (!process.env.SECRET_KEY) {
            log.err("SECRET_KEY not configured");
            return res.status(500).json({
                success: false,
                message: "SECRET_KEY not configured"
            });
        }

        const token = jwt.sign(
            { guestId: guestId , isBusiness: false},
            process.env.SECRET_KEY,
            { expiresIn: "24h" }
        );

        log.debug(`🔑✅ Guest token generated successfully.`);
        return res.status(200).json({
            success: true,
            message: `Guest token generated for guest ID: ${guestId}`,
            token: token
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