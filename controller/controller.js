import { HandleGetNewOrders, HandleGetOrderDetails, HandleUpdateOrderStatus, HandleGetTodayOrders, HandleGetOrdersHistory, HandleCheckOrderPickupTime } from "../routerHandler/orders.js";
import { genGuestToken } from "../routerHandler/gen_guest_token.js";
import { HandleCheckBusinessOpenHours } from "../routerHandler/businesses.js";
import { HandleGetPaymentByPaymentIntentId } from "../routerHandler/payments.js";
import { HandleAuth } from "../routerHandler/auth.js";
import { HandleGetOrdersForKitchen, HandleUpdateOrdersStatus } from "../routerHandler/kitchen.js";
import { HandleSendReceiptToEmail, HandleCreateReceiptSession } from "../routerHandler/receipts.js";
import { HandleUpdateTableOrderStatus } from "../routerHandler/tableOrders.js";
import { handleSendWellcomeEmail } from "../routerHandler/email.js";


const Controller = {
   HandleGetNewOrders,
   HandleGetOrderDetails,
   HandleUpdateOrderStatus,
   HandleGetTodayOrders,
   HandleGetOrdersHistory,
   genGuestToken,
   HandleCheckBusinessOpenHours,
   HandleGetPaymentByPaymentIntentId,
   HandleAuth,
   HandleCheckOrderPickupTime,
   HandleGetOrdersForKitchen,
   HandleSendReceiptToEmail,
   HandleCreateReceiptSession,
   HandleUpdateTableOrderStatus,
   HandleUpdateOrdersStatus,
   handleSendWellcomeEmail,
}


export default Controller;