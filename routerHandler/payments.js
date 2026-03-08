import log from "minhluanlu-color-log";

import { GetPaymentByPaymentIntentId } from "../payment/index.js";





async function HandleGetPaymentByPaymentIntentId(req, res) {
    const { paymentIntentId } = req.params;
    log.debug(`[💳]Received request to get payment for intent ID: ${paymentIntentId}`);
    const payment = await GetPaymentByPaymentIntentId(paymentIntentId);
    if (!payment) {
        log.warn(`[💳❌]Payment not found for intent ID: ${paymentIntentId}`);
        return res.status(404).json({ success: false, message: "Payment not found" });
    }
    return res.status(200).json({ success: true, data: payment });
}

export {
    HandleGetPaymentByPaymentIntentId
}