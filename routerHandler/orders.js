import { pool } from "../db/db.js";
import log from "minhluanlu-color-log";
import { getIO } from "../socketIO/socket.js";
import { orderStatus } from "../config.js";
import { checkBusinessFeatureByName, calculateTotalPrice, getOrderById, updateOrderStatus, getTodayOrdersForBusiness} from "../order/index.js";

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

    console.log("Received new order request: ", orders);

    await connection.beginTransaction();

    // get business id from database by uid
    const [businessRows] = await connection.query(
      `
      SELECT b.id AS businessId, u.currency
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


async function HandleGetOrderDetails(req, res) {
  log.debug("Handling get order details request");
  const { id } = req.params;

  if (!id) {
    log.warn("Missing id in request parameters");
    return res.status(400).json({ message: "Missing id" });
  }

  try {
    const order = await getOrderById(id);
    if (!order) {
      log.warn(`Order with ID ${id} not found`);
      return res.status(404).json({ message: "Order not found" });
    }
    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    log.err("Error handling get order details request: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function HandleUpdateOrderStatus(req, res) {
  log.debug("Handling update order status request");
  const { id } = req.params;
  const { status } = req.body;

  if (!id || !status) {
    log.warn("Missing id or status in request");
    return res.status(400).json({ message: "Missing id or status" });
  }

  try {
    const isUpdated = await updateOrderStatus(id, status);
    if (!isUpdated) {
      log.warn(`Failed to update order status for order ID: ${id}`);
      return res.status(500).json({ message: "Failed to update order status" });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
    });
  } catch (error) {
    log.err("Error handling update order status request: ", error);
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
    log.warn("Missing businessId in request parameters");
    return res.status(400).json({ message: "Missing businessId" });
  }

  log.debug(`Handling get today orders request for business ID: ${businessId}`);
  try {
    const orders = await getTodayOrdersForBusiness(businessId, status);
    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    log.err("Error handling get today orders request: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export { HandleGetNewOrders, HandleGetOrderDetails, HandleUpdateOrderStatus, HandleGetTodayOrders };