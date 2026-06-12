import log from "minhluanlu-color-log";
import { getIO } from "../../socketIO/socket.js";

const handlePaymentSuccessEvent = async (data) => {
    log.info("[Queue event handler 🔗] Handling payment success event with data");
    const io = getIO();

    const { id, businessId, paymentIntentId } = data;
    if (!id || !paymentIntentId) {
        return log.warn("[❌]Missing id or paymentIntentId in request parameters");
    }

    io.to(`business:${businessId}`)
    .timeout(5000)
    .emit("new_order", data, (err, responses) => {
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

    return;
}


const handleSelfServicePaymentSuccessEvent = async (data) => {
    log.info("[Queue event handler 🔗] Handling self-service payment success event with data");
    const io = getIO();

    const { id, businessId, paymentIntentId } = data;
    if (!id || !paymentIntentId) {
        return log.warn("[❌]Missing id or paymentIntentId in request parameters");
    }

    io.to(`business:${businessId}`)
    .timeout(5000)
    .emit("new_order", data, (err, responses) => {
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

    log.debug(`[💳🛒] Processing self-service payment success for order ID: ${id}`);
    io.to(`business:${businessId}`)
    .timeout(5000)
    .emit(`checkout_self_service_success_status_${id}`, data, (err, responses) => {
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

    return log.info(`[Queue event handler 🔗] Finished handling self-service payment success event for id: ${id}, paymentIntentId: ${paymentIntentId}`);
}


const handlePOSPaymentSuccessEvent = async (data) => {
    log.info("[Queue event handler 🔗] Handling payment success event with data");
    const io = getIO();

    const { id, businessId, paymentIntentId } = data;
    if (!id || !paymentIntentId) {
        return log.warn("[❌]Missing id or paymentIntentId in request parameters");
    }

    // Emit checkout session success status to business room with acknowledgment
    io.to(`business:${businessId}`)
    .timeout(5000)
    .emit(`checkout_session_success_status_${String(id)}`, { success: true }, (err, responses) => {
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

    return log.info(`[Queue event handler 🔗] Finished handling payment success event for id: ${id}, paymentIntentId: ${paymentIntentId}`);
}

export {
    handlePaymentSuccessEvent, 
    handleSelfServicePaymentSuccessEvent,
    handlePOSPaymentSuccessEvent
};