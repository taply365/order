import { HandleGetNewOrders, HandleGetOrderDetailsByJwt, HandleUpdateOrderStatus, HandleGetTodayOrders, HandleGetOrdersHistory, HandleOrderPaymentSuccess, HandleCheckOrderPickupTime } from "../routerHandler/orders.js";
import { genGuestToken } from "../routerHandler/gen_guest_token.js";
import { HandleCheckBusinessOpenHours } from "../routerHandler/businesses.js";
import { HandleGetPaymentByPaymentIntentId } from "../routerHandler/payments.js";
import { HandleAuth } from "../routerHandler/auth.js";
import { HandleGetOrdersForKitchen, HandleSendTableOrdersForKitchen, HandleUpdateOrdersStatus } from "../routerHandler/kitchen.js";
import { HandleSendReceiptToEmail, HandleCreateReceiptSession, HandleGetReceiptSession } from "../routerHandler/receipts.js";
import { HandleCheckoutSessionSuccess } from "../routerHandler/checkout_session.js";
import { HandleUpdateTableOrderStatus } from "../routerHandler/tableOrders.js";
import { HandleSendOpenCheckoutSessionToApp, HandleSendCloseCheckoutSessionToApp } from "../routerHandler/terminal.js";
import { handleSendWellcomeEmail } from "../routerHandler/email.js";


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
   HandleSendTableOrdersForKitchen,
   HandleSendReceiptToEmail,
   HandleCreateReceiptSession,
   HandleGetReceiptSession,
   HandleCheckoutSessionSuccess,
   HandleUpdateTableOrderStatus,
   HandleUpdateOrdersStatus,
   HandleSendOpenCheckoutSessionToApp,
   HandleSendCloseCheckoutSessionToApp,
   handleSendWellcomeEmail,
}


export default Controller;