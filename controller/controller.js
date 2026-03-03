import { HandleGetNewOrders, HandleGetOrderDetailsByJwt, HandleUpdateOrderStatus, HandleGetTodayOrders } from "../routerHandler/orders.js";
import { genGuestToken } from "../routerHandler/gen_guest_token.js";


const Controller = {
   HandleGetNewOrders,
   HandleGetOrderDetailsByJwt,
   HandleUpdateOrderStatus,
   HandleGetTodayOrders,
   genGuestToken
}


export default Controller;