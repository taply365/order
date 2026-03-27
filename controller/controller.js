import { HandleGetNewOrders, HandleGetOrderDetailsByJwt, HandleUpdateOrderStatus, HandleGetTodayOrders, HandleGetOrdersHistory, HandleOrderPaymentSuccess, HandleCheckOrderPickupTime } from "../routerHandler/orders.js";
import { genGuestToken } from "../routerHandler/gen_guest_token.js";
import { HandleCheckBusinessOpenHours } from "../routerHandler/businesses.js";
import { HandleGetPaymentByPaymentIntentId } from "../routerHandler/payments.js";
import { HandleAuth } from "../routerHandler/auth.js";
import { HandleGetOrdersForKitchen } from "../routerHandler/kitchen.js";
import { HandleSendReceiptToEmail } from "../routerHandler/receipts.js";




const Controller = {
   HandleGetNewOrders,
   HandleGetOrderDetailsByJwt,
   HandleUpdateOrderStatus,
   HandleGetTodayOrders,
   HandleGetOrdersHistory,
   HandleOrderPaymentSuccess,
   genGuestToken,
   HandleCheckBusinessOpenHours,
   HandleGetPaymentByPaymentIntentId,
   HandleAuth,
   HandleCheckOrderPickupTime,
   HandleGetOrdersForKitchen,
   HandleSendReceiptToEmail,

}


export default Controller;