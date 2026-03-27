import { RunQuery } from "../db/db.js";
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";
import { getOrderById } from "../order/index.js";


async function handleCheckoutSessionSuccess(req, res) {
    const orderID = req.params.orderId;
    const paymentIntentId = req.params.paymentIntentId;
    const sessionId = req.params.sessionId;

    log.info(`[Checkout Session Success] Received checkout session success for order ID: ${orderID}, paymentIntentId: ${paymentIntentId}, sessionId: ${sessionId}`);
    try{
        const io = getIO();

        const order = await getOrderById(orderID);
        if(!order){
            log.warn(`[❌]Order with ID ${orderID} not found after payment success`);
            return res.status(404).json({ message: "Order not found" });
        }
        const businessId = order?.businessId;

    
        await RunQuery(`DELETE FROM checkoutSessions WHERE id = ? AND businessId = ?`, [sessionId, businessId]);
        // emit checkout session success status to business room with ack to confirm receipt
        io.to(`business:${businessId}`)
        .timeout(5000)
        .emit(`checkout_session_success_status_${String(orderID)}`, { success: true }, (err, responses) => {
            log.debug(`sending checkout session to business room: ${businessId}`);

            if (err) {
            log.warn(`[socket ⚠️📤] Failed to receive ack from one or more clients in business room: ${businessId}`);
            }

            const confirmed = responses?.some((res) => res?.success);

            if (confirmed) {
            log.info(`[socket ✅📦] Checkout session confirmed for business with uid: ${businessId}`);
            } else {
            log.warn(`[socket ⚠️📤] No client confirmed checkout session for business with uid: ${businessId}`);
            }
        });

        return res.status(200).json({success: true, message: "Checkout session success status sent to business" });
    }
    catch(error){
        log.err("Error in handleCheckoutSessionSuccess:", error);
        console.log(error)
        return res.status(500).json({ message: "Internal server error" });
    }
}


export { handleCheckoutSessionSuccess}