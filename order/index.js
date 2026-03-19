import log from "minhluanlu-color-log";
import { RunQuery } from "../db/db.js";
import { orderStatus } from "../config.js";


function timeToMinutes(t) {
  if (!t) return null;

  // accept "09:43" or "09.43"
  const cleaned = String(t).trim().replace(".", ":");
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;

  return h * 60 + m;
}

export async function checkBusinessOpenHours(openHours, now = new Date()) {
  const currentDay = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const businessDay = openHours?.[currentDay];
  if (!businessDay) {
    return { isOpen: false, reason: "Closed today", currentDay };
  }

  const openMin = timeToMinutes(businessDay.open);
  const closeMin = timeToMinutes(businessDay.close);

  // current time in minutes
  const currentMin = now.getHours() * 60 + now.getMinutes();

  if (openMin == null || closeMin == null) {
    return { isOpen: false, reason: "Invalid open/close format", currentDay };
  }

  // Normal case (same-day)
  if (closeMin >= openMin) {
    const isOpen = currentMin >= openMin && currentMin <= closeMin;
    return {
      isOpen,
      reason: isOpen ? "Open" : "Outside hours",
      currentDay,
      currentTime: `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`,
      open: businessDay.open,
      close: businessDay.close,
    };
  }

  // Overnight case (e.g. 18:00 -> 02:00)
  const isOpen = currentMin >= openMin || currentMin <= closeMin;
  console.log({ currentDay, businessDay, open: businessDay?.open, close: businessDay?.close });
console.log("now:", now.getHours(), now.getMinutes());
  return {
    isOpen,
    reason: isOpen ? "Open (overnight)" : "Outside hours",
    currentDay,
    currentTime: `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`,
    open: businessDay.open,
    close: businessDay.close,
  };
}



export async function checkBusinessFeatureByName(businessId, name) {
    try {
        const feature = await RunQuery(`
            SELECT *
            FROM businessFeatures
            WHERE businessId = ?
            AND featureId = (
                SELECT id
                FROM features
                WHERE name = ?
                LIMIT 1
            )
            LIMIT 1
        `, [businessId, name]);

        if(feature.length === 0) {
            log.debug(`Business ${businessId} does not have feature ${name}`);
            return false;
        }

        return feature[0].isEnabled === 1 ? true : false;

    } catch (error) {
        log.err(`[❌]Error fetching business features: ${error.message}`);
        throw error;
    }
}

export const calculateTotalPrice = (orders) => {
    log.info(`[💸]Calculating total price for orders:`, orders);
    let total = 0;
    orders.forEach((item) => {
      const quantity = item.quantity || 1;
      // Price is in item.data[0].price
      const basePrice = parseFloat(item.data?.[0]?.price) || 0;
      let extrasPrice = 0;
      if (item.extras && Array.isArray(item.extras)) {
        item.extras.forEach((extra) => {
          extrasPrice += parseFloat(extra.price) || 0;
        });
      }
      total += (basePrice + extrasPrice) * quantity;
    });
    log.info(`[💸]Total price calculated: ${total}`);
    return total;
};



export async function getOrderById(orderId) {
  const rows = await RunQuery(`
    SELECT
      o.id AS id,
      o.businessId AS orderBusinessId,
      o.customerId AS customerId,
      o.data,
      o.paymentIntentId AS paymentIntentId,
      o.status,
      o.pickupAt,
      o.createdAt,
      o.updatedAt,
      o.totalPrice,
      o.currency,
      b.id AS businessId,
      b.name AS businessName,
      b.address AS businessAddress,
      b.Phone AS businessPhone,
      b.logo AS businessLogo,
      b.openHours AS businessOpenHours,
      b.theme AS businessTheme
    FROM orders o
    JOIN businesses b ON o.businessId = b.id
    WHERE o.id = ?
    LIMIT 1
  `, [orderId]);

  return rows.length ? rows[0] : null;
}



export async function updateOrderStatus(orderId, status) {
    try {
        const result = await RunQuery(`
            UPDATE orders
            SET status = ?
            WHERE id = ?
        `, [status, orderId]);
            
        return result.affectedRows > 0;
    } catch (error) {
        log.err(`[❌]Error updating order status: ${error.message}`);
        throw error;
    }
}


export async function getTodayOrdersForBusiness(businessId, status) {
    try {
        const results = await RunQuery(`
            SELECT *
            FROM orders
            WHERE businessId = ?
            AND DATE(createdAt) = CURDATE()
            AND (status = ? OR status = ?)
            ORDER BY createdAt DESC
        `, [businessId, status, "READY"]);
        return results;
    }
    catch (error) {
        log.err(`[❌]Error fetching today's orders for business: ${error.message}`);
        throw error;
    }
}


