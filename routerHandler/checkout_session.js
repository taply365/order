import { pool, RunQuery } from "../db/db.js";
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";
import dotenv from "dotenv";
dotenv.config();
import { 
  getOrderById
} from "../order/index.js";



async function HandleCheckoutSessionSuccess(req, res) {
    const { orderId, paymentIntentId, sessionId } = req.params;
    const io = getIO();
    log.debug(`[💸✅]Handling order payment success for order ID: ${orderId} and paymentIntentId: ${paymentIntentId}`);

    if (!orderId || !paymentIntentId) {
        log.warn("[❌]Missing orderId or paymentIntentId in request parameters");
        return res.status(400).json({ message: "Missing orderId or paymentIntentId" });
    }

    log.debug(`[⏳📦]Handling order payment success for order ID: ${orderId} and paymentIntentId: ${paymentIntentId}`);

    await RunQuery(`UPDATE payments SET status = ? WHERE paymentIntentId = ?`, ["succeeded", paymentIntentId]);
    const order = await getOrderById(orderId);
    if(!order){
        log.warn(`[❌]Order with ID ${orderId} not found after payment success`);
        return res.status(404).json({ message: "Order not found" });
    }

    // send order details to business room with ack to confirm receipt
    const businessId = order?.businessId;

    
    log.info("This is checkout session payment, emitting checkout session success status to business room");
    await RunQuery(`UPDATE orders SET status = ? WHERE id = ?`,["PAID", orderId]);
    await RunQuery(`DELETE FROM checkoutSessions WHERE id = ? OR businessId = ?`, [sessionId, businessId]);


    // Emit checkout session success status to business room with acknowledgment
    io.to(`business:${businessId}`)
    .timeout(5000)
    .emit(`checkout_session_success_status_${String(order?.id)}`, { success: true }, (err, responses) => {
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
    


    log.info(`💾 Saved order and emitted to business room: ${businessId} successfully`);

    return res.status(200).json({
        success: true,
        message: "Checkout session payment processed and business notified successfully",
        data: order,
    });

}


export { HandleCheckoutSessionSuccess };