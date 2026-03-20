import { RunQuery } from "../db/db.js";

const maxOrdersPerSlot = 2;
const spacingMinutes = 15;
const basePrepMinutes = 15;
const sameSlotBufferMinutes = 10;

export const pickupTimeCalculation = async () => {
  return await Calculation();
};

export const Calculation = async () => {
  const now = roundToMinute(new Date());

  const latestPickupAtToday = await getLatestPickupAtToday();

  // no order for today yet
  if (!latestPickupAtToday) {
    return new Date(now.getTime() + basePrepMinutes * 60000);
  }

  const latestPickupAt = roundToMinute(new Date(latestPickupAtToday));
  const countInSameSlot = await countOrdersByPickupAt(latestPickupAtToday);

  // if same pickup slot still has room, use it + 10 min buffer
  if (countInSameSlot < maxOrdersPerSlot) {
  return new Date(latestPickupAt.getTime() + sameSlotBufferMinutes * 60000);
}

  // otherwise move to next slot
  return new Date(latestPickupAt.getTime() + spacingMinutes * 60000);
};

function roundToMinute(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

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

async function countOrdersByPickupAt(pickupAt) {
  try {
    const rows = await RunQuery(
      `SELECT COUNT(*) AS total
       FROM orders
       WHERE pickupAt = ?`,
      [pickupAt]
    );

    return Number(rows?.[0]?.total || 0);
  } catch (error) {
    console.error("Error counting orders by pickupAt:", error);
    return 0;
  }
}


/* Look at latest pickupAt today

Count how many orders already have that exact time

Then:

Situation	Result
No orders today	now + 15 min
Slot has < 2 orders	reuse same pickupAt
Slot already has 2 orders	pickupAt + 15 min */