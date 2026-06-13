import log from "minhluanlu-color-log";
import { getIO } from "../../socketIO/socket.js";

const handlePaymentSuccessEvent = async (data) => {
    log.info("[Queue event handler 🔗] Handling payment success event with data");
    const io = getIO();

    const { id, businessId, paymentIntentId } = data;
    if (!id || !paymentIntentId) {
        return log.warn("[❌]Missing id or paymentIntentId in request parameters");
    }

    const room = `business:${businessId}`;

    io.local.to(room)
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
  const io = getIO();

  const { id, businessId, paymentIntentId } = data;

  log.info(
    `[Queue Handler 🔗] Received self-service payment success event | orderId=${id} | businessId=${businessId} | paymentIntentId=${paymentIntentId}`
  );

  if (!id || !paymentIntentId) {
    return log.warn(
      `[Queue Handler ⚠️] Missing required parameters | orderId=${id} | paymentIntentId=${paymentIntentId}`
    );
  }

  // Notify business about new order
  log.debug(
    `[Socket 📤] Emitting "new_order" event to business room | businessId=${businessId}`
  );

  io.to(`business:${businessId}`)
    .timeout(5000)
    .emit("new_order", data, (err, responses) => {
      if (err) {
        log.warn(
          `[Socket ⚠️] Ack timeout for "new_order" event | businessId=${businessId}`
        );
      }

      const confirmed = responses?.some((res) => res?.success);

      if (confirmed) {
        log.info(
          `[Socket ✅] "new_order" event acknowledged by at least one client | businessId=${businessId}`
        );
      } else {
        log.warn(
          `[Socket ⚠️] No client acknowledged "new_order" event | businessId=${businessId}`
        );
      }
    });

  // Notify payment success status
  log.debug(
    `[Socket 📤] Emitting self-service payment success status | orderId=${id} | businessId=${businessId}`
  );

  io.to(`business:${businessId}`)
    .timeout(5000)
    .emit(`checkout_self_service_success_status_${id}`, data, (err, responses) => {
      if (err) {
        log.warn(
          `[Socket ⚠️] Ack timeout for self-service payment success status event | orderId=${id} | businessId=${businessId}`
        );
      }

      const confirmed = responses?.some((res) => res?.success);

      if (confirmed) {
        log.info(
          `[Socket ✅] Self-service payment success acknowledged by at least one client | orderId=${id} | businessId=${businessId}`
        );
      } else {
        log.warn(
          `[Socket ⚠️] No client acknowledged self-service payment success event | orderId=${id} | businessId=${businessId}`
        );
      }
    });

  return log.info(
    `[Queue Handler ✅] Finished processing self-service payment success event | orderId=${id} | businessId=${businessId} | paymentIntentId=${paymentIntentId}`
  );
};


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