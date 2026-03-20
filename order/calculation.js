import { RunQuery } from "../db/db.js";

const maxOrdersPerSlot = 2;
const spacingMinutes = 15;
const basePrepMinutes = 15;

export const pickupTimeCalculation = async () => {
  return await Calculation();
};

export const Calculation = async () => {
  const now = roundToMinute(new Date());

  const latestPreparingPickupAt = await getLatestPreparingPickupAt();

  // no preparing orders yet
  if (!latestPreparingPickupAt) {
    return new Date(now.getTime() + basePrepMinutes * 60000);
  }

  const latestPickupAt = roundToMinute(new Date(latestPreparingPickupAt));
  const countInLatestSlot = await countPreparingOrdersByPickupAt(latestPickupAt);

  // if latest slot still has room, use same slot
  if (countInLatestSlot < maxOrdersPerSlot) {
    return latestPickupAt;
  }

  // latest slot is full, move to next slot
  return new Date(latestPickupAt.getTime() + spacingMinutes * 60000);
};

function roundToMinute(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

async function getLatestPreparingPickupAt() {
  try {
    const rows = await RunQuery(
      `SELECT pickupAt
       FROM orders
       WHERE status != 'CANCELLED'
       ORDER BY pickupAt DESC
       LIMIT 1`,
      []
    );

    return rows?.[0]?.pickupAt || null;
  } catch (error) {
    console.error("Error fetching latest preparing pickupAt:", error);
    return null;
  }
}

async function countPreparingOrdersByPickupAt(pickupAt) {
  try {
    const rows = await RunQuery(
      `SELECT COUNT(*) AS total
       FROM orders
       WHERE status != 'CANCELLED'
       AND pickupAt = ?`,
      [pickupAt]
    );

    return rows?.[0]?.total || 0;
  } catch (error) {
    console.error("Error counting preparing orders by pickupAt:", error);
    return 0;
  }
}