import { RunQuery } from "../db/db.js";
import log from "minhluanlu-color-log"
import {
  getKitchenLoadForSlot,
  getAvailableKitchenSlot,
  getAvailableSlots as getAvailableSlotsFromQueue
} from "../kitchen/kitchenQueue.js";

function ceilToSlot(date, slotMinutes) {
  const ms = slotMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getNextSlot(date, slotMinutes) {
  return new Date(date.getTime() + slotMinutes * 60 * 1000);
}

async function getKitchenCapacity(businessId) {
  try{
    const rows = await RunQuery(
      `
      SELECT k.maxOrdersPerSlot, k.slotMinutes, k.prepMinutes, k.slotLimit, b.openHours
      FROM kitchenCapacity k LEFT JOIN businesses b ON k.businessId = b.id
      WHERE b.id = ?
      `,
      [businessId]
    );
    if(rows.length > 0){
      const { maxOrdersPerSlot, slotMinutes, prepMinutes, slotLimit, openingHours } = rows[0];
      log.info("Fetched kitchen capacity:", { maxOrdersPerSlot, slotMinutes, prepMinutes, slotLimit, openingHours });
      console.log(rows)
      return {
        maxOrdersPerSlot,
        slotMinutes,
        prepMinutes,
        slotLimit,
        openingHours
      };
    }
  }
  catch(error){
    log.err("Error fetching kitchen capacity:", error);
    return {
      maxOrdersPerSlot: 2,
      slotMinutes: 15,
      prepMinutes: 15,
      slotLimit: 5,
      openingHours: "09:00-21:00"

    };
  }
}

/**
 * Smart pickup time calculation
 * 
 * Counts BOTH:
 * - Online orders from orders table (pickupAt = kitchen due time)
 * - POS orders from tableOrders table (kitchenDueAt = kitchen due time)
 * 
 * This ensures:
 * - If POS orders fill the 19:30 slot, online pickup moves to 19:45
 * - Kitchen sees one unified queue, not separate tracks
 */
export const pickupTimeCalculation = async (businessId) => {
  const kitchenCapacity = await getKitchenCapacity(businessId);
  const { maxOrdersPerSlot, slotMinutes, prepMinutes, slotLimit, openingHours } = kitchenCapacity;

  const now = new Date();
  const localTime = now.toLocaleString("en-DK", {
    timeZone: "Europe/Copenhagen",
  });
  const earliestReady = new Date(now.getTime() + prepMinutes * 60 * 1000);

  log.info({"Current server time:": now});
  log.info({"Europe/Copenhagen time:": localTime});
  log.info({"Kitchen capacity settings:": {maxOrdersPerSlot, slotMinutes, prepMinutes, slotLimit}});

  // Find first available slot considering BOTH online and POS orders
  const pickupTime = await getAvailableKitchenSlot(
    businessId,
    earliestReady,
    maxOrdersPerSlot,
    slotMinutes
  );

  log.info(`Found available pickup time: ${formatTime(pickupTime)}`);

  // Build availableSlots starting from booked pickupTime
  const availableSlots = await getAvailableSlotsFromQueue(
    businessId,
    pickupTime,
    maxOrdersPerSlot,
    slotMinutes,
    slotLimit
  );

  return {
    orderTime: now,
    earliestReady,
    pickupTime,
    pickupLabel: formatTime(pickupTime),
    availableSlots,
  };
};

/**
 * KITCHEN CAPACITY CONCEPTS
 * 
 * === SHARED KITCHEN DUE TIME ===
 * Both online and POS orders consume from ONE kitchen queue
 * They are NOT separate tracks - they compete for the same capacity
 * 
 * === pickupAt (Online Orders) ===
 * - Column: orders.pickupAt
 * - Meaning: CUSTOMER PROMISE TIME - when customer will pick up
 * - Also: KITCHEN DUE TIME - when kitchen must have order ready
 * - Capacity: Counts toward shared kitchen load for this time slot
 * - Example: Order placed at 17:00, prep 20 min → pickupAt = 17:25 slot
 * 
 * === kitchenDueAt (POS Orders) ===
 * - Column: tableOrders.kitchenDueAt
 * - Meaning: KITCHEN DUE TIME - when order should be ready
 * - Priority: HIGH (customer already in restaurant, waiting)
 * - Capacity: Counts toward shared kitchen load for this time slot
 * - Example: POS order created at 17:20 → kitchenDueAt = 17:30 slot
 * 
 * === CAPACITY RULE ===
 * If maxOrdersPerSlot = 5 and slot 19:30 has:
 * - 3 online orders (pickupAt = 19:30)
 * - 2 POS orders (kitchenDueAt = 19:30)
 * Then:
 * - Used capacity = 5
 * - Remaining capacity = 0
 * - Next online order must move to 19:45 or later
 * 
 * === PRIORITY SORTING ===
 * Kitchen display shows one unified queue sorted by:
 * 1. priority (HIGH for POS, NORMAL for online)
 * 2. kitchenDueAt (when order should be ready)
 * 3. createdAt (insertion order)
 * 
 * This means POS orders appear first in the kitchen queue,
 * but if both have same priority, earlier due times come first.
 */

/* 
maxOrdersPerSlot
  What it does:
  Maximum number of orders (online + POS combined) per kitchen slot.
  Example:
  If maxOrdersPerSlot = 5, max 5 orders can be scheduled for 18:00:
  - Could be 5 online, OR
  - Could be 3 online + 2 POS, OR
  - Could be 2 online + 3 POS, OR
  - Could be 5 POS
  Used for:
  Checking if a slot is full or still available

slotMinutes
  What it does:
  Length of each time slot in minutes.
  Example:
  If slotMinutes = 15, slots are: 18:00, 18:15, 18:30, 18:45...

prepMinutes
  What it does:
  Minimum preparation time before an order is ready.
  Example:
  If now = 17:00 and prepMinutes = 20 → earliest ready = 17:20
  Used for:
  Ensuring online pickup is not too early

slotLimit
  What it does:
  Number of future time slots to return as options to customer.
  Example:
  If slotLimit = 5, you return: [18:00, 18:15, 18:30, 18:45, 19:00]
*/