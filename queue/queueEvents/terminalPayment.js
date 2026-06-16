import log from "minhluanlu-color-log";
import { getIO } from "../../socketIO/socket.js";

async function handleSendTapToPayPaymentEvent(data) {
  // ...
  try{
    const io = getIO();
    console.log("Handling send tap to pay payment event with data:", data);
    const { businessId} = data;

    const room = `business:${businessId}`;

     io.to(room)
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
  }
  catch(err){
    log.error(`[Queue Handler ❌] Error handling send tap to pay payment event | error=${err.message}`);
  }
}



function HandleSendCloseCheckoutSessionEvent(data) {
   try{
        const { businessId } = data;

        const io = getIO();

        const room = `business:${businessId}`;
        io.to(room)
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

        return log.info(`------------------- 🎉 Close checkout session event processed successfully (Business ID: ${businessId}) -------------------`
        );
    }
    catch(error){
        log.err('Error sending close checkout session to app:', error);
    }
}

export { handleSendTapToPayPaymentEvent, HandleSendCloseCheckoutSessionEvent };