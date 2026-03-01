import { pool } from "../db/db.js";
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";
import { orderStatus } from "../config.js";
import { checkBusinessFeatureByName, calculateTotalPrice } from "../order/index.js";

const HandleGetNewOrders = async (req, res) => {
  log.debug("Handling get new orders request");

  const io = getIO();
  const connection = await pool.getConnection();

  try {
    const { receiverId, orders } = req.body;

    if (!receiverId || orders == null) {
      log.warn("Missing receiverId or orders in request body");
      return res.status(400).json({ message: "Missing receiverId or orders" });
    }

    await connection.beginTransaction();

    // get business id from database by uid
    const [businessRows] = await connection.query(
      "SELECT id, currency FROM businesses WHERE uid = ? LIMIT 1",
      [receiverId]
    );

    if (!businessRows || businessRows.length === 0) {
      log.warn(`No business found with uid: ${receiverId}`);
      await connection.rollback();
      return res.status(404).json({ message: "Business not found" });
    }

    const businessId = businessRows[0].id;
    const businessCurrency = businessRows[0].currency || "USD";
    // check if business has feature ORDER_ONLINE enabled
    const hasFeature = await checkBusinessFeatureByName(businessId, "ORDER_ONLINE");
    if (!hasFeature) {
      log.warn(`Business with ID: ${businessId} does not have ORDER_ONLINE feature enabled`);
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Business is currently not accepting online orders",
      });
    }

    const totalPrice = calculateTotalPrice(orders);

    // save order to database
    const [insertResult] = await connection.query(
      "INSERT INTO orders (businessId, status, data, currency, totalPrice) VALUES (?, ?, ?, ?, ?)",
      [businessId, orderStatus.PENDING, JSON.stringify(orders), businessCurrency, totalPrice]
    );

    if (!insertResult?.insertId) {
      log.warn(`Failed to save order to database for business ID: ${businessId}`);
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
      log.warn(`Failed to get order details for order ID: ${insertResult.insertId}`);
      await connection.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to get order details",
      });
    }

    await connection.commit();

    io.to(`business:${businessId}`).emit("new_order", orderDetails, (response) => {
      log.debug(`sending order to business room: ${businessId}`);
      if (response?.success) {
        log.info(`[socket ✅📦] Order confirmed for business with uid: ${receiverId}`);
      } else {
        log.warn(`[socket ⚠️📤] Failed to send order to business with uid: ${receiverId}`);
      }
    });

    log.debug(`💾 Saved order and emitted to business room: ${businessId} successfully`);

    return res.status(200).json({
      success: true,
      message: "Order sent to business successfully",
      data: orderDetails,
    });
  } catch (error) {
    log.err("Error handling get new orders request: ", error);
    console.log(error)
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

export { HandleGetNewOrders };