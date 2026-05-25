/**
 * Table Order Handler
 * 
 * Creates and manages POS/Table orders with kitchen capacity integration
 * 
 * When a POS order is created:
 * 1. Set businessId (from table → tables table)
 * 2. Set source = 'pos'
 * 3. Set priority = 'high'
 * 4. Calculate kitchenDueAt and kitchenStartAt based on prep time
 * 5. No pickupAt needed (customer is in restaurant)
 */

import { RunQuery, pool } from "../db/db.js";
import log from "minhluanlu-color-log";
import { calculatePOSKitchenTimes, getKitchenLoadForSlot } from "./kitchenQueue.js";

/**
 * Create a table order with kitchen capacity tracking
 * 
 * @param {Object} orderData - Order data
 * @param {number} orderData.tableId - Table ID
 * @param {Array} orderData.items - Order items
 * @param {number} orderData.totalPrice - Total price
 * @param {string} orderData.currency - Currency code
 * @param {number} prepMinutes - Prep time in minutes (optional, default 15)
 * @returns {Promise<Object>} Created order with all fields
 */
async function createTableOrder(orderData, prepMinutes = 15) {
  const { tableId, items, totalPrice, currency } = orderData;

  if (!tableId || !items || !totalPrice) {
    throw new Error("Missing required fields: tableId, items, totalPrice");
  }

  try {
    // Get businessId from table
    const tableRows = await RunQuery(
      "SELECT businessId FROM tables WHERE id = ?",
      [tableId]
    );

    if (!tableRows || tableRows.length === 0) {
      throw new Error(`Table with ID ${tableId} not found`);
    }

    const businessId = tableRows[0].businessId;

    // Calculate kitchen times
    const { kitchenStartAt, kitchenDueAt } = calculatePOSKitchenTimes(prepMinutes);

    // Create order
    const insertResult = await RunQuery(
      `INSERT INTO tableOrders 
        (tableId, businessId, source, priority, data, totalPrice, currency, 
         kitchenStartAt, kitchenDueAt, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tableId,
        businessId,
        'pos',
        'high',
        JSON.stringify(items),
        totalPrice,
        currency,
        kitchenStartAt.toISOString(),
        kitchenDueAt.toISOString(),
        'PENDING'
      ]
    );

    if (!insertResult?.insertId) {
      throw new Error("Failed to insert table order");
    }

    log.info(
      `✅ Table order created:`,
      {
        orderId: insertResult.insertId,
        tableId,
        businessId,
        kitchenDueAt: kitchenDueAt.toISOString(),
      }
    );

    // Return created order
    const created = await RunQuery(
      "SELECT * FROM tableOrders WHERE id = ?",
      [insertResult.insertId]
    );

    return created[0];
  } catch (error) {
    log.err("Error creating table order:", error);
    throw error;
  }
}

/**
 * Update table order status (e.g., PENDING → PREPARING → READY → SERVED)
 * 
 * @param {number} orderId - Table order ID
 * @param {string} newStatus - New status
 * @param {Object} orderData - Updated order data (optional)
 * @returns {Promise<Object>} Updated order
 */
async function updateTableOrderStatus(orderId, newStatus, orderData = null) {
  try {
    const updateData = orderData ? JSON.stringify(orderData) : undefined;

    if (updateData) {
      await RunQuery(
        "UPDATE tableOrders SET status = ?, data = ? WHERE id = ?",
        [newStatus, updateData, orderId]
      );
    } else {
      await RunQuery(
        "UPDATE tableOrders SET status = ? WHERE id = ?",
        [newStatus, orderId]
      );
    }

    log.info(`✅ Table order ${orderId} updated to ${newStatus}`);

    const updated = await RunQuery(
      "SELECT * FROM tableOrders WHERE id = ?",
      [orderId]
    );

    return updated[0];
  } catch (error) {
    log.err("Error updating table order:", error);
    throw error;
  }
}

/**
 * Get all table orders for a business in a specific status
 * 
 * @param {number} businessId - Business ID
 * @param {string} status - Status filter (optional)
 * @returns {Promise<Array>} List of table orders
 */
async function getTableOrdersByBusiness(businessId, status = null) {
  try {
    let query = `
      SELECT * FROM tableOrders
      WHERE businessId = ?
        AND createdAt >= CURDATE()
        AND createdAt < CURDATE() + INTERVAL 1 DAY
    `;

    const params = [businessId];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY kitchenDueAt ASC, createdAt ASC";

    const result = await RunQuery(query, params);
    return result;
  } catch (error) {
    log.err("Error fetching table orders:", error);
    return [];
  }
}

/**
 * Get kitchen capacity info for a table order
 * Shows how many orders share the same kitchen due time
 * 
 * @param {number} orderId - Table order ID
 * @returns {Promise<Object>} Capacity info
 */
async function getTableOrderKitchenCapacity(orderId) {
  try {
    const orderRows = await RunQuery(
      "SELECT businessId, kitchenDueAt FROM tableOrders WHERE id = ?",
      [orderId]
    );

    if (!orderRows || orderRows.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }

    const { businessId, kitchenDueAt } = orderRows[0];
    const load = await getKitchenLoadForSlot(businessId, kitchenDueAt);

    return {
      orderId,
      kitchenDueAt,
      kitchenLoad: load,
      note: `This order shares kitchen capacity with ${load - 1} other orders at ${new Date(kitchenDueAt).toLocaleTimeString()}`,
    };
  } catch (error) {
    log.err("Error getting table order kitchen capacity:", error);
    throw error;
  }
}

export {
  createTableOrder,
  updateTableOrderStatus,
  getTableOrdersByBusiness,
  getTableOrderKitchenCapacity,
};
