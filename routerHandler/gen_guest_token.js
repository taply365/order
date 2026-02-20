import log from "minhluanlu-color-log";
import jwt from "jsonwebtoken";

async function genGuestToken(req, res) {
    try {
        log.debug(`Generating guest token for public code: ${req.params.publicCode}`);
        const publicCode = req.params.publicCode;
        if (!process.env.SECRET_KEY) {
            log.err("SECRET_KEY not configured");
            return res.status(500).json({
                success: false,
                message: "SECRET_KEY not configured"
            });
        }

        const token = jwt.sign(
            { storeId: publicCode },
            process.env.SECRET_KEY,
            { expiresIn: "5m" }
        );
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