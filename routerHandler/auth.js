import { Authentication } from "../auth/index.js";
import log from "minhluanlu-color-log";

const HandleAuth = async (req, res) => {
    try {
        await Authentication(req, res);
    }
    catch (error) {
        log.err("Error in HandleAuth:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export { HandleAuth };