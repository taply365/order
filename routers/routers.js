import express from 'express';
import multer from "multer";
import controller from '../controller/controller.js';


const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage:storage
})

// AUTH //
router.get("/production/authenticate", controller.HandleAuth);
router.get('/gen-guest-token', controller.genGuestToken);

// GET //
router.get("/order/:id", controller.HandleGetOrderDetailsByJwt);
router.get("/business/:id/orders/status/:status/today", controller.HandleGetTodayOrders);
router.get("/business/:id/orders-history/status/:status/today", controller.HandleGetOrdersHistory);
router.get("/kitchen-routing/business/:id/orders/status/:status", controller.HandleGetOrdersForKitchen);
router.get("/business/:uid/open-hours", controller.HandleCheckBusinessOpenHours);
router.get("/order/payment/intent/:paymentIntentId", controller.HandleGetPaymentByPaymentIntentId);
router.get("/pickup-time/user-business/:id", controller.HandleCheckOrderPickupTime);

// POST //
router.post("/new-order", controller.HandleGetNewOrders); // New order from online ordring
router.post("/order/receipt/send-to-mail", controller.HandleSendReceiptToEmail); // send receipt to email after order payment success
router.post("/business/:id/kitchen-routing/send-table-orders/table/:tableId", controller.HandleSendTableOrdersForKitchen); // send table orders to kitchen

// PUT //
router.put("/order/status", controller.HandleUpdateOrderStatus); // order status update by business
router.put("/order/:orderId/payment-success/:paymentIntentId", controller.HandleOrderPaymentSuccess); // order POS payment success update by business
router.put("/order/:orderId/payment-success/:paymentIntentId/session/:sessionId", controller.HandleCheckoutSessionSuccess); // order POS payment success update by business
router.put("/order/table-order/:id/status/:status", controller.HandleUpdateTableOrderStatus); // table order status update by business




export default router;