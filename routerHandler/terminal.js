import { RunQuery } from '../db/db.js';
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";


async function HandleOpenCheckoutSessionToAppEvent(req, res) {
    try{
        const data = req.body;
        const { businessId } = data;

        const io = getIO();

        log.info(`Received request to send checkout session to app for businessId: ${businessId}`);
        console.log('Data payload:', data);
        io.to(`business:${businessId}`)
        .timeout(5000)
        .emit("checkout-session-open", data , (err, responses) => {
            log.debug("...");
            const confirmed = responses?.some((res) => res?.success);
            if (confirmed) {
                log.info(`[socket ✅📦] Sending checkout session event to terminal room: ${businessId}`);
            } else {
                log.warn(`[socket ⚠️📤] No client confirmed checkout session for business with uid: ${businessId}`);
            }
            
        });

        res.status(200).json({success: true, message: 'Checkout session event sent to app' });
    }
    catch(error){
        log.err('Error sending checkout session to app:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

function HandleCloseCheckoutSessionToAppEvent(req, res) {
   try{
        const data = req.body;
        const { businessId } = data;

        const io = getIO();

        log.info(`Received request to send close checkout session to app for businessId: ${businessId}`);
        console.log('Data payload:', data);
        io.to(`business:${businessId}`)
        .timeout(5000)
        .emit("checkout-session-close", data , (err, responses) => {
            log.debug("...");
            const confirmed = responses?.some((res) => res?.success);
            if (confirmed) {
                log.info(`[socket ✅📦] sending close checkout session event to terminal room: ${businessId}`);
            } else {
                log.warn(`[socket ⚠️📤] No client confirmed close checkout session for business with uid: ${businessId}`);
            }
        });

        res.status(200).json({success: true, message: 'Close checkout session event sent to app' });
    }
    catch(error){
        log.err('Error sending close checkout session to app:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export { HandleOpenCheckoutSessionToAppEvent , HandleCloseCheckoutSessionToAppEvent};