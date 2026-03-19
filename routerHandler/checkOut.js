import { pool, RunQuery } from "../db/db.js";




async function HandleCheckOut(req, res) {
    const { userId } = req.body;

    return res.status(200).json({success: true, message: "Checkout successful" });
}


export { HandleCheckOut };