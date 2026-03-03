import { RunQuery } from "../db/db.js";
import log from "minhluanlu-color-log";


import { checkBusinessOpenHours } from "../order/index.js";


async function HandleCheckBusinessOpenHours(req, res) {
    try{
        const uid = req.params.uid;
        log.info("Checking open hours for business");
        const business = await RunQuery(`
            SELECT openHours
            FROM businesses
            WHERE uid = ? LIMIT 1
        `, [uid]);
        if(business.length === 0) {
            return res.status(404).json({success: false, message: "Business not found" });
        }

        console.log("Business open hours:", business[0].openHours);
        const openHours = business[0].openHours;
        const { isOpen, reason } = await checkBusinessOpenHours(openHours);
        log.info(`Business is currently ${isOpen ? "open" : "closed"}: ${reason}`);
        res.status(200).json({ 
            success: true,
            message: reason,
            data: isOpen
         });
    }
    catch(err){
        res.status(500).json({success: false,message:"Internal server error", error: err.message });
    }
}


export {
    HandleCheckBusinessOpenHours
}