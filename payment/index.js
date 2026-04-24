import { RunQuery } from "../db/db.js";
import http from "../http/http.js";
import log from "minhluanlu-color-log";


export function checkTooSmallAmount(amount, currency) {
  const minimums = {
    usd: 0.5,   // $0.50
    eur: 0.5,   // €0.50
    gbp: 0.5,   // £0.50
    dkk: 2.5,   // 2.50 kr
    sek: 5,     // 5 kr
  };

  const cur = currency?.toLowerCase();
  const min = minimums[cur];

  // unsupported currency → treat as invalid
  if (min == null) return true;

  return amount < min;
}

export async function HandleCreatePayment(type, order) {
    try{
       let price = order?.totalPrice
        if (typeof price === "string") {
            price = parseFloat(price)
            order.totalPrice = price;
        }
        log.debug(`[💳➕]Initiating payment for order ID: ${order.id}`);
        const res = await http.post(`/payment/create-intent/order/${order.id}?type=${type}`, order);
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
        console.error(error.data.message);
        return false;
    }

}


export async function GetPaymentByPaymentIntentId(paymentIntentId) {
    try {
        log.debug(`[💳🔍]Fetching payment details for payment intent ID: ${paymentIntentId}`);

        const [payment] = await RunQuery(`
            SELECT 
                p.*, 
                b.*
            FROM payments p
            JOIN businessStripeAccounts b 
                ON p.uid = b.businessId
            WHERE p.paymentIntentId = ?
        `, [paymentIntentId]);

        if (payment) {
            log.debug(`Payment details found for payment intent ID: ${paymentIntentId}`);
            return payment;
        } else {
            log.warn(`No payment details found for payment intent ID: ${paymentIntentId}`);
            return false;
        }
    } catch (error) {
        log.err(`[💳❌]Error occurred while fetching payment details for payment intent ID: ${paymentIntentId}`, error);
        return false;
    }
}