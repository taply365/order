import { RunQuery } from "../db/db.js";

export const pickupTimeCalculation = async (businessId) => {
  const settings = await getPickupSettings(businessId);
  return await calculatePickupTime(businessId, settings);
};

const getPickupSettings = async (businessId) => {
  try {
    const rows = await RunQuery(
      `SELECT * FROM pickupSettings WHERE businessId = ? LIMIT 1`,
      [businessId]
    );

    if (rows.length > 0) {
      const settings = rows[0];
      return {
        maxOrdersPerSlot: Number(settings.maxOrdersPerSlot) || 5,
        spacingMinutes: Number(settings.spacingMinutes) || 15,
        basePrepMinutes: Number(settings.basePrepMinutes) || 15,
        sameSlotBufferMinutes: Number(settings.sameSlotBufferMinutes) || 10,
      };
    }
  } catch (error) {
    console.error("Error fetching pickup settings:", error);
  }

  return {
    maxOrdersPerSlot: 5,
    spacingMinutes: 15,
    basePrepMinutes: 15,
    sameSlotBufferMinutes: 10,
  };
};

const calculatePickupTime = async (businessId, settings) => {
  const now = roundToMinute(new Date());

  const latestPickupAtToday = await getLatestPickupAtToday(businessId);

  // no order for today yet
  if (!latestPickupAtToday) {
    return new Date(now.getTime() + settings.basePrepMinutes * 60000);
  }

  const latestPickupAt = roundToMinute(new Date(latestPickupAtToday));
  const countInSameSlot = await countOrdersByPickupAt(businessId, latestPickupAtToday);

  // if latest pickup time still has room, add a small kitchen buffer
  if (countInSameSlot < settings.maxOrdersPerSlot) {
    return new Date(latestPickupAt.getTime() + settings.sameSlotBufferMinutes * 60000);
  }

  // otherwise move to next slot
  return new Date(latestPickupAt.getTime() + settings.spacingMinutes * 60000);
};

function roundToMinute(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

async function getLatestPickupAtToday(businessId) {
  try {
    const rows = await RunQuery(
      `SELECT pickupAt
       FROM orders
       WHERE businessId = ?
         AND DATE(pickupAt) = CURDATE()
       ORDER BY pickupAt DESC
       LIMIT 1`,
      [businessId]
    );

    return rows?.[0]?.pickupAt || null;
  } catch (error) {
    console.error("Error fetching latest pickupAt for today:", error);
    return null;
  }
}

async function countOrdersByPickupAt(businessId, pickupAt) {
  try {
    const rows = await RunQuery(
      `SELECT COUNT(*) AS total
       FROM orders
       WHERE businessId = ?
         AND pickupAt = ?`,
      [businessId, pickupAt]
    );

    return Number(rows?.[0]?.total || 0);
  } catch (error) {
    console.error("Error counting orders by pickupAt:", error);
    return 0;
  }
}


/* Look at latest pickupAt today for this business

Count how many orders already have that exact time

Then:

Situation                                Result
No orders today                          now + basePrepMinutes
Latest pickup time has room              latestPickupAt + sameSlotBufferMinutes
Latest pickup time is full               latestPickupAt + spacingMinutes
*/