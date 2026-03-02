import log from "minhluanlu-color-log";
import jwt from "jsonwebtoken";


async function genGuestToken(req, res) {
    try {
        log.info("🔑 Generating guest token...");
        const publicCode = req.params.publicCode;
        if (!process.env.SECRET_KEY) {
            log.err("SECRET_KEY not configured");
            return res.status(500).json({
                success: false,
                message: "SECRET_KEY not configured"
            });
        }

        const token = jwt.sign(
            { guestId: publicCode , isBusiness: false},
            process.env.SECRET_KEY,
            { expiresIn: "45m" }
        );

        log.debug(`🔑✅ Guest token generated successfully.`);
        return res.status(200).json({
            success: true,
            message: `Guest token generated for public code: ${token}`,
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