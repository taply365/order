import { HandleGetNewOrders, HandleGetOrderDetails, HandleUpdateOrderStatus, HandleGetTodayOrders } from "../routerHandler/orders.js";
import { genGuestToken } from "../routerHandler/gen_guest_token.js";


const Controller = {
   HandleGetNewOrders,
   HandleGetOrderDetails,
   HandleUpdateOrderStatus,
   HandleGetTodayOrders,
   genGuestToken
}


export default Controller;