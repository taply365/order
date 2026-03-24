import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";
import { pushNotification} from "../firebase/firebaseConfig.js";


export async function sendOrderStatusToCustomer(customerId, orderId, status, image, icon) {
    try{
        const io = getIO();
        io.to(`guest:${customerId}`).emit("orderStatusUpdate", { orderId, status });
        // Also send a push notification
        try{
            log.debug(`📣 Emitted order status update to guest:${customerId} for order ${orderId} with status: ${status}`);

            const notificationData = {
                token: customerId, // Assuming customerId is the FCM token, adjust if it's not
                title: "Order Status Update",
                body: `Your order #${orderId} is now ${status}.`,
                link: `${process.env.APP_URL}/receipt/production?orderId=${orderId}`, 
                icon: icon ,
                image: image
                //badge: "https://th.bing.com/th/id/OIP.yN8LzEPl81YvvqO2ZW-91AHaE8?w=243&h=180&c=7&r=0&o=7&pid=1.7&rm=3",
            };
            if(status === "READY") {
                try{
                    await pushNotification(notificationData);
                }
                catch(err){
                    log.err("Error sending push notification in sendOrderStatusToCustomer:", err);
                }
            }
        }
        catch(err){
            log.err("Error sending push notification in sendOrderStatusToCustomer:", err);
        }

        return true;
    }
    catch(err){
        log.err("Error in HandleUpdateOrderStatusForCustomer:", err);
        return false;
    }
}