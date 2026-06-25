import log from "minhluanlu-color-log";
import { getIO } from "../../socketIO/socket.js";
import { PushOneNotification } from "../../expoNotification/pushNotification.js";

const handlePaymentSuccessEvent = async (data) => {
    log.info("[Queue event handler 🔗] Handling payment success event with data");
    const io = getIO();
    const { id, businessId } = data;
    if (!id || !businessId) {
        return log.warn("[❌]Missing id or businessId in request parameters");
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

    log.debug("SEND notification to business app");
    const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: data.currency,
    }).format(data.totalPrice);

    const payload = {
        businessId: businessId,
        title: "🎉 New Sale",
        body: `New order received! Total: ${amount}`,
        data: { id: id },
    };

    await PushOneNotification(payload);
    return log.info(`[Queue event handler 🔗] Finished handling payment success event for id: ${id}, businessId: ${businessId}`);
}


const handleSelfServicePaymentSuccessEvent = async (data) => {
  const io = getIO();

  const { id, businessId } = data;

  if (!id || !businessId) {
    return log.warn(
      `[Queue Handler ⚠️] Missing required parameters | orderId=${id} | businessId=${businessId}`
    );
  }

  // Notify business about new order
  log.debug(
    `[Socket 📤] Emitting "new_order" event to business room | businessId=${businessId}`
  );

  const room = `business:${businessId}`;

  io.local.to(room)
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

    io.local.to(room)
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

    log.debug("SEND notification to business app");
    const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: data.currency,
    }).format(data.totalPrice);

    const payload = {
        businessId: businessId,
        title: "🎉 New Sale",
        body: `New order received! Total: ${amount}`,
        data: { id: id },
    };

    await PushOneNotification(payload);
    return log.info(
        `[Queue Handler ✅] Finished processing self-service payment success event | orderId=${id} | businessId=${businessId}`
    );
};


const handlePOSPaymentSuccessEvent = async (data) => {
    log.info("[Queue event handler 🔗] Handling payment success event with data");
    const io = getIO();

    const { id, businessId } = data;
    if (!id || !businessId) {
        return log.warn("[❌]Missing id or businessId in request parameters");
    }

    // Emit checkout session success status to business room with acknowledgment
    const room = `business:${businessId}`;
    io.local.to(room)
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

    return log.info(`[Queue event handler 🔗] Finished handling payment success event for id: ${id}, businessId: ${businessId}`);
}



// for terminal event //
const handleTerminalFullPaymentSuccessEvent = async (data) => {
    log.info("------------------- 🔗 [Queue Handler] Processing full payment success event... -------------------");

    const io = getIO();

    const { id, businessId } = data;

    if (!id || !businessId) {
        return log.warn("❌ Missing required fields: id or businessId");
    }

    const room = `business:${businessId}`;

    // Notify checkout session success
    io.local
        .to(room)
        .timeout(5000)
        .emit(
            `checkout_session_success_status_${String(id)}`,
            { success: true },
            (err, responses) => {
                log.debug(
                    `📤 Sending checkout success notification to business room: ${businessId}`
                );

                if (err) {
                    log.warn(
                        `⚠️ Some clients in business room ${businessId} did not acknowledge the checkout notification`
                    );
                }

                const confirmed = responses?.some((res) => res?.success);

                if (confirmed) {
                    log.info(
                        `✅ Checkout success acknowledged by at least one client (Business ID: ${businessId})`
                    );
                } else {
                    log.warn(
                        `📭 No clients acknowledged the checkout success notification (Business ID: ${businessId})`
                    );
                }
            }
        );

    // Notify new order
    io.local
        .to(room)
        .timeout(5000)
        .emit("new_order", data, (err, responses) => {
            log.debug(
                `📤 Sending new order notification to business room: ${businessId}`
            );

            if (err) {
                log.warn(
                    `⚠️ Some clients in business room ${businessId} did not acknowledge the new order notification`
                );
            }

            const confirmed = responses?.some((res) => res?.success);

            if (confirmed) {
                log.info(
                    `🛒 New order acknowledged by at least one client (Business ID: ${businessId})`
                );
            } else {
                log.warn(
                    `📭 No clients acknowledged the new order notification (Business ID: ${businessId})`
                );
            }
        });

    log.debug("SEND notification to business app");
    const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: data.currency,
    }).format(data.totalPrice);

    const payload = {
        businessId: businessId,
        title: "🎉 New Sale",
        body: `New order received! Total: ${amount}`,
        data: { id: id },
    };

    await PushOneNotification(payload);
    return log.info(
        `------------------- 🎉 Full payment success event processed successfully (Session ID: ${id}, Business ID: ${businessId}) -------------------`
    );
};

const handleTerminalSplitPaymentSuccessEvent = async (data) => {
    log.info("------------------- 🔗 [Queue Handler] Processing split payment success event... -------------------");

    const io = getIO();

    const { id, businessId } = data;

    if (!id || !businessId) {
        return log.warn("❌ Missing required fields: id or businessId");
    }

    // Emit checkout session success status to business room with acknowledgment
    const room = `business:${businessId}`;

    io.local
        .to(room)
        .timeout(5000)
        .emit(
            `checkout_session_success_status_${String(id)}`,
            { success: true },
            (err, responses) => {
                log.debug(`📤 Sending checkout success notification to business room: ${businessId}`);

                if (err) {
                    log.warn(
                        `⚠️ Some clients in business room ${businessId} did not acknowledge the event`
                    );
                }

                const confirmed = responses?.some((res) => res?.success);

                if (confirmed) {
                    log.info(
                        `✅ Checkout session acknowledged by at least one client (Business ID: ${businessId})`
                    );
                } else {
                    log.warn(
                        `📭 No clients acknowledged the checkout session (Business ID: ${businessId})`
                    );
                }
            }
        );

    return log.info(
        `------------------- 🎉 Split payment success event processed successfully (Session ID: ${id}, Business ID: ${businessId}) -------------------`
    );
};


export {
    handlePaymentSuccessEvent, 
    handleSelfServicePaymentSuccessEvent,
    handlePOSPaymentSuccessEvent, 
    handleTerminalFullPaymentSuccessEvent,
    handleTerminalSplitPaymentSuccessEvent
};