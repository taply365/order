import log from "minhluanlu-color-log";
import { saveSocketIdForBusiness, sendOrderToBusiness } from "../business/sockets.js";


export function emitEvent(io, socket) {

  // FOR ORDERS //
  socket.on("new_order", (data, ack) => {
    log.debug(`new_order event received from socketID=(${socket.id}):`);
    const send = sendOrderToBusiness(io, data);
    if(!send){
        log.err("Failed to send order to business");
        if (typeof ack === "function") ack({ success: false, ts: Date.now() });
        return;
    }
    log.info("Order sent to business successfully");
    if (typeof ack === "function") ack({ success: true, ts: Date.now() });
  });
}