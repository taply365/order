/**
 * Shared Kitchen Capacity Management
 * 
 * This module provides unified kitchen capacity calculation across:
 * - Online orders (orders table) - customer pickup time
 * - POS/Table orders (tableOrders table) - customer already in restaurant
 * 
 * Kitchen capacity = one shared queue sorted by priority and due time
 * Not separate rows for online vs POS
 */

import { RunQuery } from "../db/db.js";
import log from "minhluanlu-color-log";

/**
 * Get total kitchen load for a specific slot time
 * Counts BOTH online orders and POS orders that have this due time
 * 
 * @param {number} businessId - The business ID
 * @param {Date} slotTime - The slot time (ISO string or Date object)
 * @returns {Promise<number>} Total order count for this slot
 * 
 * IMPORTANT:
 * - pickupAt (online) = kitchen due time = customer promise time
 * - kitchenDueAt (POS) = when kitchen should have order ready
 * - Both consume the same kitchen capacity
 */
async function getKitchenLoadForSlot(businessId, slotTime) {
  try {
    const slotTimeStr = slotTime instanceof Date ? slotTime.toISOString() : slotTime;

    // Unified query: count active orders from BOTH tables for this slot
    const countRows = await RunQuery(
      `
      SELECT COUNT(*) AS count
      FROM (
        -- Online orders: pickupAt is the kitchen due time
        SELECT id
        FROM orders
        WHERE businessId = ?
          AND pickupAt = ?
          AND status NOT IN ('CANCELLED', 'COMPLETED', 'FAILED')
          AND createdAt >= CURDATE()
          AND createdAt < CURDATE() + INTERVAL 1 DAY

        UNION ALL

        -- POS/Table orders: kitchenDueAt is the kitchen due time
        SELECT id
        FROM tableOrders
        WHERE businessId = ?
          AND kitchenDueAt = ?
          AND status NOT IN ('CANCELLED', 'COMPLETED', 'FAILED')
          AND createdAt >= CURDATE()
          AND createdAt < CURDATE() + INTERVAL 1 DAY
      ) AS kitchen_load
      `,
      [businessId, slotTimeStr, businessId, slotTimeStr]
    );

    return Number(countRows[0]?.count || 0);
  } catch (error) {
    log.err("Error calculating kitchen load for slot:", error);
    return 0;
  }
}

/**
 * Find the next available kitchen slot
 * Respects kitchen capacity settings and returns first slot with available space
 * 
 * @param {number} businessId - Business ID
 * @param {Date} earliestReady - Earliest time kitchen can start (now + prepMinutes)
 * @param {number} maxOrdersPerSlot - Max orders allowed per slot
 * @param {number} slotMinutes - Slot duration in minutes
 * @returns {Promise<Date>} Next available slot time
 */
async function getAvailableKitchenSlot(businessId, earliestReady, maxOrdersPerSlot, slotMinutes) {
  const ms = slotMinutes * 60 * 1000;
  let pickupTime = new Date(Math.ceil(earliestReady.getTime() / ms) * ms);

  // Find first available slot starting from roundedEarliest
  while (true) {
    const load = await getKitchenLoadForSlot(businessId, pickupTime);

    if (load < maxOrdersPerSlot) {
      return pickupTime;
    }

    // Move to next slot
    pickupTime = new Date(pickupTime.getTime() + slotMinutes * 60 * 1000);
  }
}

/**
 * Get unified kitchen queue - all orders (online + POS) for display
 * Orders sorted by: priority (high first) → kitchenDueAt → createdAt
 * 
 * @param {number} businessId - Business ID
 * @returns {Promise<Array>} Unified list of all kitchen orders
 * 
 * Response format includes source badges:
 * - source: 'online' or 'pos'
 * - priority: 'high' (POS) or 'normal' (online)
 */
async function getUnifiedKitchenQueue(businessId, status = null) {
  try {
    let query = `
        SELECT 
            o.id, 
            'online' as source, 
			"normal" as priority, 
			o.pickupAt as kitchenDueAt,
            o.status, 
            o.data, 
            o.customerId, 
            NULL as tableId,
            NULL as tableNumber,
            o.orderNumber,
            o.createdAt
        FROM orders o
        WHERE o.businessId = ? AND o.status = ?
        
        UNION
        
        SELECT 
            t.id, 
            t.source, 
            t.priority, 
            t.kitchenDueAt, 
            t.status, 
            t.data, 
            NULL as customerId, 
            t.tableId,
            tbl.number as tableNumber,
            NULL as orderNumber,
            t.createdAt
        FROM tableOrders t
        LEFT JOIN tables tbl ON t.tableId = tbl.id
        WHERE t.businessId = ? AND t.status = ?
        
        ORDER BY 
            FIELD(priority, 'high', 'normal') ASC,
            kitchenDueAt ASC, 
            createdAt ASC
    `;


    const params = [businessId, businessId];

    if (status) {
      query = query.replace("AND status NOT IN", "AND status = ? AND status NOT IN");
      params.splice(1, 0, status);
      params.splice(3, 0, status);
    }

    // Sort by: priority (high=1, normal=2), then kitchenDueAt, then createdAt
    query += `
      ORDER BY 
        CASE WHEN priority = 'high' THEN 1 ELSE 2 END ASC,
        kitchenDueAt ASC,
        createdAt ASC
    `;

    const result = await RunQuery(query, params);
    return result;
  } catch (error) {
    log.err("Error fetching unified kitchen queue:", error);
    return [];
  }
}

/**
 * Get available slots display for customer
 * Shows next N slots with current occupancy and availability
 * 
 * @param {number} businessId
 * @param {Date} pickupTime - First available slot (already rounded)
 * @param {number} maxOrdersPerSlot
 * @param {number} slotMinutes
 * @param {number} slotLimit
 * @returns {Promise<Array>} Array of slot info with occupancy
 */
async function getAvailableSlots(businessId, pickupTime, maxOrdersPerSlot, slotMinutes, slotLimit) {
  const availableSlots = [];
  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      timeZone: "Europe/Copenhagen",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  for (let i = 0; i < slotLimit; i++) {
    const slotTime = new Date(pickupTime.getTime() + i * slotMinutes * 60 * 1000);
    const currentLoad = await getKitchenLoadForSlot(businessId, slotTime);

    availableSlots.push({
      slotTime,
      label: formatTime(slotTime),
      currentOrders: currentLoad,
      remainingCapacity: maxOrdersPerSlot - currentLoad,
      isAvailable: currentLoad < maxOrdersPerSlot,
    });
  }

  return availableSlots;
}

/**
 * Calculate kitchen due time for a POS order
 * POS orders should be ready quickly since customer is in restaurant
 * 
 * For POS orders:
 * - kitchenStartAt = now (start immediately)
 * - kitchenDueAt = now + prepMinutes (when kitchen should have it ready)
 * 
 * This allows kitchen to prioritize based on actual readiness time,
 * not slot-based buckets like online orders
 * 
 * @param {number} prepMinutes - Prep time in minutes
 * @returns {Object} {kitchenStartAt, kitchenDueAt}
 */
function calculatePOSKitchenTimes(prepMinutes = 15) {
  const now = new Date();
  const kitchenDueAt = new Date(now.getTime() + prepMinutes * 60 * 1000);
  
  return {
    kitchenStartAt: now,
    kitchenDueAt: kitchenDueAt
  };
}

/**
 * Calculate kitchen due time for an online order
 * Online orders use slot-based pickup times
 * 
 * For online orders:
 * - kitchenDueAt = pickupAt (slot time)
 * - kitchenStartAt = pickupAt - prepMinutes (when to start prep)
 * 
 * @param {Date} pickupAt - Scheduled pickup time
 * @param {number} prepMinutes - Prep time in minutes
 * @returns {Object} {kitchenStartAt, kitchenDueAt}
 */
function calculateOnlineKitchenTimes(pickupAt, prepMinutes = 15) {
  const kitchenStartAt = new Date(pickupAt.getTime() - prepMinutes * 60 * 1000);
  
  return {
    kitchenStartAt: kitchenStartAt,
    kitchenDueAt: pickupAt
  };
}

export {
  getKitchenLoadForSlot,
  getAvailableKitchenSlot,
  getUnifiedKitchenQueue,
  getAvailableSlots,
  calculatePOSKitchenTimes,
  calculateOnlineKitchenTimes,
};
