import express from 'express';
import multer from "multer";
import controller from '../controller/controller.js';


const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage:storage
})
router.get("/production/authenticate", controller.HandleAuth);
router.get('/gen-guest-token', controller.genGuestToken);
// get //
router.get("/order/:id", controller.HandleGetOrderDetailsByJwt);
router.get("/business/:id/orders/status/:status/today", controller.HandleGetTodayOrders);
router.get("/business/:id/orders-history/status/:status/today", controller.HandleGetOrdersHistory);
router.get("/kitchen-routing/business/:id/orders/status/:status", controller.HandleGetOrdersForKitchen);
router.get("/business/:uid/open-hours", controller.HandleCheckBusinessOpenHours);
router.get("/order/payment/intent/:paymentIntentId", controller.HandleGetPaymentByPaymentIntentId);
router.get("/pickup-time/user-business/:id", controller.HandleCheckOrderPickupTime);

// post //
router.post("/new-order", controller.HandleGetNewOrders);
router.post("/checkout", controller.HandleCheckOut);
router.post("/order/receipt/send-to-mail", controller.HandleSendReceiptToEmail);

// put //
router.put("/order/status", controller.HandleUpdateOrderStatus);
router.put("/order/:orderId/payment-success/:paymentIntentId", controller.HandleOrderPaymentSuccess);



export default router;