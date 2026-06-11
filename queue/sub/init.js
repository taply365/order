import log from "minhluanlu-color-log";
import handleForgetPass from "../queueEvents/handleForgetPass.js";



async function Subscriber(subscriber) {
    log.info("[Queue subscriber 🔗] initialized, subscribing to channels...");

    await subscriber.subscribe("forget-password-order", (message) => {
        const data = JSON.parse(message);
        console.log("Received forget password event with data:", data);
        handleForgetPass(data);
    });
};



export default Subscriber;