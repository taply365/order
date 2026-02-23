import log from "minhluanlu-color-log";
import RunQuery from "../db/db.js";
import { response } from "express";


async function saveSocketIdForBusiness(user, socketID) {
    try{
        const existing = await RunQuery(`SELECT * FROM sockets WHERE uid = ?`, [user.uid]);
        if(existing.length > 0){
            await RunQuery(`UPDATE sockets SET socketID = ? WHERE uid = ?`, [socketID, user.uid]);
        } else {
            await RunQuery(`INSERT INTO sockets (uid, socketID) VALUES (?, ?)`, [user.uid, socketID]);
        }
        return true;
    } catch(err){
        log.err(err);
        return false;
    }
}


async function getSocketIdForBusiness(uid) {
    try {
        const query = `SELECT socketID FROM sockets WHERE uid = ?`;
        const result = await RunQuery(query, [uid]);
        if (result.length > 0) {
            return result[0].socketID;
        }        return null;
    } catch (err) {
        log.err(err);
        return null;
    }
};

async function sendOrderToBusiness(socket, data) {
    try {
        const socketID = await getSocketIdForBusiness(data.receiver);
        log.debug(`Found socketID: ${socketID}`);
        if(socketID){
            socket.to(socketID).emit("new-order", data, (response) => {
                if(response && response.success){
                    log.info(`Order sent successfully to business with socketID: ${socketID}`);
                    return true;
                }
            });
        }
        return false;
    }
    catch(err){
        log.err(err);
        return false;
    }   
}

export {
    saveSocketIdForBusiness,
    sendOrderToBusiness
}