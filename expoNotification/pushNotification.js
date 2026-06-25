// pushNotification.js
import { Expo } from "expo-server-sdk";
import log from "minhluanlu-color-log";
import { RunQuery } from "../db/db.js";

const expo = new Expo();

/**
 * Get a single Expo token for a user.
 * @param {number|string} userID
 * @returns {Promise<string|null>}
 */
async function getToken(businessId) {
  try {
    // Use parameterized SQL (adjust placeholders to your DB driver)
    const rows = await RunQuery(
      `SELECT expoToken FROM businesses WHERE id = ? LIMIT 1`,
      [businessId]
    );
    return rows?.[0]?.expoToken ?? null;
  } catch (err) {
    log.err("getToken error:", err);
    console.error("getToken error:", err);
    return null;
  }
}

/**
 * Send ONE Expo push notification to ONE user.
 * @param {{businessId: number|string}} user
 * @param {{title: string, body: string, data?: object}} payload
 * @returns {Promise<{success: boolean, ticket?: any, message?: string, error?: string}>}
 */
export async function PushOneNotification(payload) {
  try {
    const token = await getToken(payload.businessId);
    // 2) Validate
    if (!Expo.isExpoPushToken(token)) {
      log.err(`Invalid Expo token: ${token}`);
      return { success: false, message: "Invalid token" };
    }

    // 3) Build message
    const message = {
      to: token,
      sound: "default",
      title: payload?.title ?? "New Message",
      body: payload?.body ?? "You have a new message!",
      data: payload?.data ?? {},
      priority: "high",
    };

    // 4) Send (array API even for one message)
    const tickets = await expo.sendPushNotificationsAsync([message]);
    const ticket = tickets?.[0];

    log.info(`Notification sent to user ${payload.businessId}: ${JSON.stringify(ticket)}`);
    return { success: true, ticket };
  } catch (error) {
    log.err("pushNotification error:", error);
    return { success: false, error: error.message };
  }
}


