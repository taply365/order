import log from "minhluanlu-color-log";
import {
    handlePaymentSuccessEvent,
    handleSelfServicePaymentSuccessEvent,
    handlePOSPaymentSuccessEvent,
    handleTerminalFullPaymentSuccessEvent,
    handleTerminalSplitPaymentSuccessEvent,
} from "../queueEvents/handlePaymentSuccessEvent.js";

import { handleSendTapToPayPaymentEvent, HandleSendCloseCheckoutSessionEvent } from "../queueEvents/terminalPayment.js";



async function Subscriber(subscriber) {
    log.info("[Queue subscriber 🔗] initialized, subscribing to channels...");

    await subscriber.subscribe("new-payment-success", (message) => {
        const data = JSON.parse(message);
        handlePaymentSuccessEvent(data);
    });

    await subscriber.subscribe("new-self-service-payment-success", (message) => {
        const data = JSON.parse(message);
        handleSelfServicePaymentSuccessEvent(data);
    });

    await subscriber.subscribe("new-pos-payment-success", (message) => {
        const data = JSON.parse(message);
        handlePOSPaymentSuccessEvent(data);
    });

    await subscriber.subscribe("new-terminal-full-payment-success", (message) => {
        const data = JSON.parse(message);
        handleTerminalFullPaymentSuccessEvent(data);
    });

    await subscriber.subscribe("new-terminal-split-payment-success", (message) => {
        const data = JSON.parse(message);
        handleTerminalSplitPaymentSuccessEvent(data);
    });

    await subscriber.subscribe("new-tap-to-pay-payment", (message) => {
        const data = JSON.parse(message);
        handleSendTapToPayPaymentEvent(data);
    });

    await subscriber.subscribe("new-close-checkout-session", (message) => {
        const data = JSON.parse(message);
        HandleSendCloseCheckoutSessionEvent(data);
    });
};




export default Subscriber;