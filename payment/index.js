import { RunQuery } from "../db/db.js";
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
        log.err(`[💳❌]Error occurred while initiating payment for order ID: ${order.id}`, error);
        console.error(error);
        return false;
    }

}


export async function GetPaymentByPaymentIntentId(paymentIntentId) {
    try{
        log.debug(`[💳🔍]Fetching payment details for payment intent ID: ${paymentIntentId}`);
        const [payment] = await RunQuery(`SELECT * FROM payments WHERE paymentIntentId = ?`, [paymentIntentId]);
        if(payment){
            log.debug(`Payment details found for payment intent ID: ${paymentIntentId}`);
            return payment;
        } else {
            log.warn(`No payment details found for payment intent ID: ${paymentIntentId}`);
            return false;
        }
    }
    catch(error){
        log.err(`[💳❌]Error occurred while fetching payment details for payment intent ID: ${paymentIntentId}`, error);
        return false;
    }
}