import express from 'express';
import multer from "multer";
import controller from '../controller/controller.js';


const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage:storage
})
router.get('/gen-guest-token', controller.genGuestToken);
// get //
router.get("/order/:id", controller.HandleGetOrderDetailsByJwt);
router.get("/business/:id/orders/status/:status/today", controller.HandleGetTodayOrders);
router.get("/business/:uid/open-hours", controller.HandleCheckBusinessOpenHours);
router.get("/order/payment/intent/:paymentIntentId", controller.HandleGetPaymentByPaymentIntentId);

// post //
router.post("/new-order", controller.HandleGetNewOrders);


// put //
router.put("/order/status", controller.HandleUpdateOrderStatus);
router.put("/order/:orderId/payment-success/:paymentIntentId", controller.HandleOrderPaymentSuccess);



export default router;