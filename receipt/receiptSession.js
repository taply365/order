import { RunQuery } from "../db/db.js";
import log from "minhluanlu-color-log";




async function ClearSession(businessId) {
    try{
        const clear = await RunQuery("DELETE FROM receiptSessions WHERE businessId = ?", [businessId]);
        if(clear.affectedRows > 0){
            log.debug(`Cleared existing receipt session for businessId: ${businessId}`);
        }
        return true;
    }
    catch(err){
        log.error(err);
        return false;
    }
};

async function CreateReceiptSession(orderId, businessId) {
    try{
        await ClearSession(businessId);
        const business = await RunQuery(`SELECT internalId FROM businesses WHERE id = ?`, [businessId]);
        if(business.length === 0){
            log.error(`Business with id ${businessId} not found`);
            return false;
        }
        const internalId = business[0].internalId;
        const insert = await RunQuery("INSERT INTO receiptSessions (orderId, businessId, internalId) VALUES (?, ?, ?)", [orderId, businessId, internalId]);
        return insert.affectedRows > 0;
    }
    catch(err){
        log.error(err);
        return false;
    }
}


async function GetReceiptSession(businessId, code) {
    try{
        const session = await RunQuery("SELECT * FROM receiptSessions WHERE businessId = ? AND internalId = ?", [businessId, code]);
        if(session.length > 0){
            log.debug(`Found receipt session for businessId: ${businessId}`);
            await ClearSession(businessId); // Clear session after retrieval to prevent reuse
        }
        return session.length > 0 ? session[0] : null;
    }
    catch(err){
        log.err(err);
        return null;
    }
}

export { ClearSession, CreateReceiptSession, GetReceiptSession };