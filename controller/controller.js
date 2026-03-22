import { HandleGetNewOrders, HandleGetOrderDetailsByJwt, HandleUpdateOrderStatus, HandleGetTodayOrders, HandleOrderPaymentSuccess } from "../routerHandler/orders.js";
import { genGuestToken } from "../routerHandler/gen_guest_token.js";
import { HandleCheckBusinessOpenHours } from "../routerHandler/businesses.js";
import { HandleGetPaymentByPaymentIntentId } from "../routerHandler/payments.js";
import { HandleAuth } from "../routerHandler/auth.js";

import { HandleCheckOut } from "../routerHandler/checkOut.js";

const Controller = {
   HandleGetNewOrders,
   HandleGetOrderDetailsByJwt,
   HandleUpdateOrderStatus,
   HandleGetTodayOrders,
   HandleOrderPaymentSuccess,
   genGuestToken,
   HandleCheckBusinessOpenHours,
   HandleGetPaymentByPaymentIntentId,
   HandleCheckOut,
   HandleAuth
}


export default Controller;