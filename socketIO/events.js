import log from "minhluanlu-color-log";
import { saveSocketIdForBusiness, sendOrderToBusiness } from "../business/sockets.js";


export function emitEvent(socket) {

  // FOR BUSINESS //
  socket.on("business-connection", (data, ack) => {
    const save = saveSocketIdForBusiness(data, socket.id);
    if(!save){
        log.err("Failed to save socket ID for business");
        if (typeof ack === "function") ack({ success: false, ts: Date.now() });
        return;
    }
    log.info("save socket into database successfully for business");
    if (typeof ack === "function") ack({ success: true, ts: Date.now() });
  });


  // FOR ORDERS //
  socket.on("new_order", (data, ack) => {
    log.debug(`new_order event received from socketID=(${socket.id}):`);
    const send = sendOrderToBusiness(socket, data);
    if(!send){
        log.err("Failed to send order to business");
        if (typeof ack === "function") ack({ success: false, ts: Date.now() });
        return;
    }
    if (typeof ack === "function") ack({ success: true, ts: Date.now() });
  });
}