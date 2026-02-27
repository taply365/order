import log from "minhluanlu-color-log";
import RunQuery from "../db/db.js";


async function sendOrderToBusiness(io, data) {
    try {
        log.debug(`Sending order to business with ID: ${data.receiver}`);
        io.to(`business:${data.receiver}`).emit("new_order", data, (response) => {
            if(response && response.success){
                log.info(`Order sent successfully to business with ID: ${data.receiver}`);
                return true;
            }
        });
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