import { RunQuery } from "../db/db.js";

// Configuration
const maxOrdersPerSlot = 5;       // Maximum number of orders allowed in the same pickup slot
const spacingMinutes = 15;        // Time gap between slots when moving to next slot
const basePrepMinutes = 15;       // Minimum preparation time from "now"
const sameSlotBufferMinutes = 5; // Buffer between orders inside the same slot

export const pickupTimeCalculation = async () => {
  return await Calculation();
};



export const Calculation = async () => {
  // Get current time rounded to minute (remove seconds/milliseconds)
  const now = roundToMinute(new Date());

  // Calculate minimum ready time: now + prep time
  const minReadyTime = new Date(
    now.getTime() + basePrepMinutes * 60000 // convert minutes → milliseconds
  );

  // Get latest pickup time for today from DB
  const latestPickupAtToday = await getLatestPickupAtToday();

  // CASE 1: No orders today → just return minimum ready time
  if (!latestPickupAtToday) {
    return minReadyTime;
  }

  // Convert DB value to Date and normalize it
  const latestPickupAt = roundToMinute(new Date(latestPickupAtToday));

  // Count how many orders already use this exact pickup time
  const countInSameSlot = await countOrdersByPickupAt(latestPickupAtToday);

  // Decide base time:
  // - If latestPickupAt is in the future → use it
  // - If it's in the past → use minReadyTime instead
  const baseTime =
    latestPickupAt > minReadyTime ? latestPickupAt : minReadyTime;

  // CASE 2: Slot still has capacity
  if (countInSameSlot < maxOrdersPerSlot) {
    return new Date(
      baseTime.getTime() +
        countInSameSlot * sameSlotBufferMinutes * 60000
      // Explanation:
      // countInSameSlot → how many orders already in this slot
      // sameSlotBufferMinutes → spacing between each order
      // Example:
      // 0 orders → +0 min
      // 1 order → +10 min
      // 2 orders → +20 min
    );
  }

  // CASE 3: Slot is full → move to next slot
  return new Date(
    baseTime.getTime() + spacingMinutes * 60000
    // Add fixed spacing to jump to next available slot
  );
};

// Helper: remove seconds and milliseconds for clean comparison
function roundToMinute(date) {
  const d = new Date(date);
  d.setSeconds(0, 0); // zero out seconds + milliseconds
  return d;
}

// Get latest pickupAt for today
async function getLatestPickupAtToday() {
  try {
    const rows = await RunQuery(
      `SELECT pickupAt
       FROM orders
       WHERE DATE(pickupAt) = CURDATE()
       ORDER BY pickupAt DESC
       LIMIT 1`,
      []
    );

    return rows?.[0]?.pickupAt || null;
  } catch (error) {
    console.error("Error fetching latest pickupAt for today:", error);
    return null;
  }
}

// Count how many orders share the same pickupAt
async function countOrdersByPickupAt(pickupAt) {
  try {
    const rows = await RunQuery(
      `SELECT COUNT(*) AS total
       FROM orders
       WHERE pickupAt = ?`,
      [pickupAt]
    );

    return Number(rows?.[0]?.total || 0); // ensure number type
  } catch (error) {
    console.error("Error counting orders by pickupAt:", error);
    return 0;
  }
}

/*
======================== FULL FLOW ========================

1. Get current time → now
2. Add prep time → minReadyTime

3. Get latest pickupAt today

4. If no orders:
   → return minReadyTime

5. If orders exist:
   → count how many share same pickupAt

6. Decide baseTime:
   → max(latestPickupAt, minReadyTime)

7. If slot NOT full:
   → spread orders using sameSlotBufferMinutes

8. If slot FULL:
   → move to next slot using spacingMinutes

===========================================================
*/