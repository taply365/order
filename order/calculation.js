import { RunQuery } from "../db/db.js";
import log from "minhluanlu-color-log"

function ceilToSlot(date, slotMinutes) {
  const ms = slotMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
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

export const pickupTimeCalculation = async (businessId) => {
  const kitchenCapacity = await getKitchenCapacity(businessId);
  const { maxOrdersPerSlot, slotMinutes, prepMinutes, slotLimit, openingHours } = kitchenCapacity;

  const now = new Date();
  const earliestReady = new Date(now.getTime() + prepMinutes * 60 * 1000);
  const roundedEarliest = ceilToSlot(earliestReady, slotMinutes);

  let pickupTime = roundedEarliest;

  // Find first available slot starting from roundedEarliest
  while (true) {
    const countRows = await RunQuery(
      `
      SELECT COUNT(*) AS count
      FROM orders
      WHERE pickupAt = ?
      `,
      [pickupTime.toISOString()]
    );

    const count = Number(countRows[0]?.count || 0);

    if (count < maxOrdersPerSlot) {
      break;
    }

    pickupTime = getNextSlot(pickupTime, slotMinutes);
  }

  // Build availableSlots starting from booked pickupTime
  const availableSlots = [];

  for (let i = 0; i < slotLimit; i++) {
    const slotTime = new Date(
      pickupTime.getTime() + i * slotMinutes * 60 * 1000
    );

    const countRows = await RunQuery(
      `
      SELECT COUNT(*) AS count
      FROM orders
      WHERE pickupAt = ?
      `,
      [slotTime.toISOString()]
    );

    const currentOrders = Number(countRows[0]?.count || 0);

    availableSlots.push({
      slotTime,
      label: formatTime(slotTime),
      currentOrders,
      remainingCapacity: maxOrdersPerSlot - currentOrders,
      isAvailable: currentOrders < maxOrdersPerSlot,
    });
  }

  return {
    orderTime: now,
    earliestReady,
    pickupTime,
    pickupLabel: formatTime(pickupTime),
    availableSlots,
  };
};