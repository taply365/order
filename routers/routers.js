import express from 'express';
import multer from "multer";
import controller from '../controller/controller.js';


const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage:storage
})

// get //
router.get("/order/", controller.HandleGetOrderDetailsByJwt);
router.get("/business/:id/orders/status/:status/today", controller.HandleGetTodayOrders);
router.get('/gen-guest-token/:publicCode', controller.genGuestToken);
router.get("/business/:uid/open-hours", controller.HandleCheckBusinessOpenHours);


// post //
router.post("/new-order", controller.HandleGetNewOrders);

// put //
router.put("/order/:id/status", controller.HandleUpdateOrderStatus);



export default router;