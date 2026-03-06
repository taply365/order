import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";



export async function sendOrderStatusToCustomer(customerId, orderId, status) {
    try{
        const io = getIO();
        io.to(`guest:${customerId}`).emit("orderStatusUpdate", { orderId, status });
        log.debug(`📣 Emitted order status update to guest:${customerId} for order ${orderId} with status: ${status}`);
        return true;
    }
    catch(err){
        log.err("Error in HandleUpdateOrderStatusForCustomer:", err);
        return false;
    }
}