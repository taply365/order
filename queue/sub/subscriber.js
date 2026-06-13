import log from "minhluanlu-color-log";
import {
    handlePaymentSuccessEvent,
    handleSelfServicePaymentSuccessEvent,
    handlePOSPaymentSuccessEvent
} from "../queueEvents/handlePaymentSuccessEvent.js";



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
};




export default Subscriber;