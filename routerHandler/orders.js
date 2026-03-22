import { pool, RunQuery } from "../db/db.js";
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import { orderStatus } from "../config.js";
import { 
  checkBusinessFeatureByName, 
  calculateTotalPrice, 
  getOrderById, 
  updateOrderStatus, 
  checkBusinessOpenHours, 
  getTodayOrdersForBusiness
} from "../order/index.js";
import { sendOrderStatusToCustomer } from "../order/customer.js";
import { getJwtTokenData } from "../auth/index.js";
import { HandleCreatePayment, checkTooSmallAmount } from "../payment/index.js";
import { pickupTimeCalculation } from "../order/calculation.js";


const HandleGetNewOrders = async (req, res) => {
  log.debug("Handling get new orders request");
  const connection = await pool.getConnection();

  try {
    const { receiverId, orders } = req.body;
    const  { guestId } = await getJwtTokenData(req);

    if (!guestId) {
      console.log(guestId)
      log.warn("[⏳]Unauthorized request: Missing or invalid JWT token");
      return res.status(401).json({ message: "Unauthorized: Missing or invalid token" });
    }

    if (!receiverId || orders == null) {
      log.warn("[⏳]Missing receiverId or orders in request body");
      return res.status(400).json({ message: "Missing receiverId or orders" });
    }

    log.info(`[⏳📦]Processing new order request for business with uid: ${receiverId} from guest with id: ${guestId}`);

    await connection.beginTransaction();

    // get business id from database by uid
    const [businessRows] = await connection.query(
      `
      SELECT b.id AS businessId, b.openHours AS openHours, u.currency
      FROM businesses b
      JOIN users u ON u.uid = b.uid
      WHERE b.uid = ?
      LIMIT 1
      `,
      [receiverId]
    );

    if (!businessRows || businessRows.length === 0) {
      log.warn(`No business found with uid: ${receiverId}`);
      await connection.rollback();
      return res.status(404).json({ message: "Business not found" });
    }

    const businessId = businessRows[0].businessId;
    const businessCurrency = businessRows[0].currency || "";
    const openHours = businessRows[0].openHours || null;

    const { isOpen, reason } = await checkBusinessOpenHours(openHours);
    if (!isOpen) {
      log.warn(`[⏳]Business with ID: ${businessId}: ${reason}`);
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: reason || "Business is currently closed based on open hours",
      });
    }
    // check if business has feature ONLINE_ORDERING enabled
    const hasFeature = await checkBusinessFeatureByName(businessId, "ONLINE_ORDERING");
    if (!hasFeature) {
      log.warn(`[⏳]Business with ID: ${businessId} does not have ONLINE_ORDERING feature enabled`);
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Business is currently not accepting online orders",
      });
    }

    const totalPrice = calculateTotalPrice(orders);
    if(checkTooSmallAmount(totalPrice, businessCurrency)){
      log.warn(`[💳⚠️] Total order amount ${totalPrice} ${businessCurrency} is too small for processing`);
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Total order amount is too small for processing. Minimum is 0.50 USD/EUR or 2.50 DKK.`,
      });
    }

    // calculate pickup time
    const pickupTime = await pickupTimeCalculation(orders);

    // Save order to database
    const [insertResult] = await connection.query(
      "INSERT INTO orders (businessId, customerId, status, data, currency, totalPrice, pickupAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [businessId, guestId, orderStatus.PREPARING, JSON.stringify(orders), businessCurrency, totalPrice, pickupTime]
    );

    if (!insertResult?.insertId) {
      log.warn(`[📛]Failed to save order to database for business ID: ${businessId}`);
      await connection.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to save order to database",
      });
    }

    // get order details
    const [orderRows] = await connection.query(
      "SELECT * FROM orders WHERE id = ? LIMIT 1",
      [insertResult.insertId]
    );

    const orderDetails = orderRows?.[0];
    if (!orderDetails) {
      log.warn(`[📛]Failed to get order details for order ID: ${insertResult.insertId}`);
      await connection.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to get order details",
      });
    }

    const create_payment = await HandleCreatePayment(orderDetails);
    if(!create_payment){
      log.warn(`[💳❌]Payment processing failed for order ID: ${orderDetails.id}`);
      await connection.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to process payment",
      });
    }


    await connection.commit();

    // update order with paymentIntentId
    const { paymentIntentId } = create_payment;
    await RunQuery(`UPDATE orders SET paymentIntentId = ? WHERE id = ?`, [paymentIntentId, orderDetails.id]);

    const token = jwt.sign(
        { orderId: orderDetails.id, guestId: guestId, isBusiness: false},
        process.env.SECRET_KEY,
        { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      data: orderDetails,
      payment: create_payment,
      token,
    });
  } catch (error) {
    log.err(`[❌]Error handling get new orders request: ${error.message}`);
    try {
      await connection.rollback();
    } catch (_) {
      // ignore rollback errors
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    connection.release();
  }
};


async function HandleGetOrderDetailsByJwt(req, res) {
  log.debug("[⏳]Handling get order details request");
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    log.warn("[🚫]Missing authorization token in request headers");
    return res.status(401).json({ success: false, message: "Missing authorization token" });
  }

  let id;
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY, { algorithm: "HS256" }); 
    id = decoded.orderId;
  } catch (error) {
    log.warn("[🚫]Invalid authorization token");
    return res.status(401).json({success:false,  message: "Invalid authorization token" });
  }

  if (!id) {
    id = req.params.id; // fallback to URL parameter if not in token
    if (!id) {
      log.warn("[🚫]Missing orderId in both JWT token and URL parameters");
      return res.status(400).json({ success: false, message: "Missing orderId" });
    }
  }

  try {
    const order = await getOrderById(id);
    if (!order) {
      log.warn(`[📦❌]Order with ID ${id} not found`);
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    log.err(`[❌]Error handling get order details request: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function HandleUpdateOrderStatus(req, res) {
  log.debug("[⏳📦]Handling update order status request");
  const {id, status, customerId, data, business } = req.body;

  if (!id || !status) {
    log.warn("[🚫]Missing id or status in request");
    return res.status(400).json({ message: "Missing id or status" });
  }

  try {
    const isUpdated = await updateOrderStatus(id, status);
    if (!isUpdated) {
      log.warn(`[❌]Failed to update order status for order ID: ${id}`);
      return res.status(500).json({ message: "Failed to update order status" });
    }

    const itemImage = data?.[0]?.images?.[0] || "";
    const icon = business?.logo || "";

    const send = await sendOrderStatusToCustomer(customerId, id, status, itemImage, icon);
    if(!send){
      log.warn(`[❌]Failed to send order status update to customer for order ID: ${id}`);
    }
    log.debug(`[⏳📦]Order status updated and customer notified for order ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
    });
  } catch (error) {
    log.err(`[❌]Error handling update order status request: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}



async function HandleGetTodayOrders(req, res) {
  const businessId = req.params.id;
  const status = req.params.status;

  if (!businessId) {
    log.warn("[🏢]Missing businessId in request parameters");
    return res.status(400).json({ message: "Missing businessId" });
  }

  log.info(`[🏪🗓️]Handling get today orders request for business ID: ${businessId}`);
  try {
    const orders = await getTodayOrdersForBusiness(businessId, status);
    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    log.err(`[❌]Error handling get today orders request: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}


async function HandleOrderPaymentSuccess(req, res) {
  const { orderId, paymentIntentId } = req.params;
  const io = getIO();
  log.debug(`[💸✅]Handling order payment success for order ID: ${orderId} and paymentIntentId: ${paymentIntentId}`);

  if (!orderId || !paymentIntentId) {
    log.warn("[❌]Missing orderId or paymentIntentId in request parameters");
    return res.status(400).json({ message: "Missing orderId or paymentIntentId" });
  }

  log.debug(`[⏳📦]Handling order payment success for order ID: ${orderId} and paymentIntentId: ${paymentIntentId}`);

  await RunQuery(`UPDATE orders SET status = ? WHERE id = ?`,[orderStatus.PREPARING, orderId]);
  await RunQuery(`UPDATE payments SET status = ? WHERE paymentIntentId = ?`, ["succeeded", paymentIntentId]);
  const order = await getOrderById(orderId);
  if(!order){
    log.warn(`[❌]Order with ID ${orderId} not found after payment success`);
    return res.status(404).json({ message: "Order not found" });
  }
  const businessId = order?.businessId;
  io.to(`business:${businessId}`).emit("new_order", order, (response) => {
    log.debug(`sending order to business room: ${businessId}`);
    if (response?.success) {
      log.info(`[socket ✅📦] Order confirmed for business with uid: ${businessId}`);
    } else {
      log.warn(`[socket ⚠️📤] Failed to send order to business with uid: ${businessId}`);
    }
  });

  log.info(`💾 Saved order and emitted to business room: ${businessId} successfully`);

  return res.status(200).json({
    success: true,
    message: "Order payment processed and business notified successfully",
    data: order,
  });
}

export { HandleGetNewOrders, HandleGetOrderDetailsByJwt, HandleUpdateOrderStatus, HandleGetTodayOrders, HandleOrderPaymentSuccess };