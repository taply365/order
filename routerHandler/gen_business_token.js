import log from "minhluanlu-color-log";
import jwt from "jsonwebtoken";

async function genBusinessToken(req, res) {
    try {
        const businessId = req.params.id;
        if (!process.env.SECRET_KEY) {
            log.err("SECRET_KEY not configured");
            return res.status(500).json({
                success: false,
                message: "SECRET_KEY not configured"
            });
        }

        const payload = { businessId: businessId, isBusiness: true };
        const token = jwt.sign(payload, process.env.SECRET_KEY, { algorithm: "HS256" });
        log.info(`Generating business token successfully.`);
        return res.status(200).json({
            success: true,
            message: `Business token generated for businessId: ${businessId}`,
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
    genBusinessToken
}