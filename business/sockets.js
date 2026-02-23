import log from "minhluanlu-color-log";
import RunQuery from "../db/db.js";


async function saveSocketIdForBusiness(user, socketID) {
    try{
        const query = `
            INSERT INTO sockets (uid, socketID)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
            socketID = VALUES(socketID),
            updatedAt = CURRENT_TIMESTAMP
        `;
        await RunQuery(query, [user.uid, socketID]);
        return true;
    } catch(err){
        log.err(err);
        return false;
    }
}

async function sendOrderToBusiness(data) {
    try {}
    catch(err){
        log.err(err);
    }   
}

export {
    saveSocketIdForBusiness,
    sendOrderToBusiness
}