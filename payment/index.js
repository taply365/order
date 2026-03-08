import http from "../http/http.js";
import log from "minhluanlu-color-log";




export async function HandleCreatePayment(order) {
    try{
        log.debug(`[💳➕]Initiating payment for order ID: ${order.id}`);
        const res = await http.post(`/payment/create-intent/order/${order.id}`, order);
        if(res.data.success){
            log.debug(`Payment successful for order ID: ${order.id}`);
            log.info(res?.data?.message);
            return res.data.data;
        } else {
            log.warn(`Payment failed for order ID: ${order.id} - ${res.data.message}`);
            return false;
        }
    }
    catch(error){
        log.error(`[💳❌]Error occurred while initiating payment for order ID: ${order.id}`, error);
        return false;
    }

}