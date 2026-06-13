// queue/sub.js
import crypto from "crypto";
import log from "minhluanlu-color-log";

import {
  handlePaymentSuccessEvent,
  handleSelfServicePaymentSuccessEvent,
  handlePOSPaymentSuccessEvent,
} from "../queueEvents/handlePaymentSuccessEvent.js";

const STREAM_NAME = "jobs";
const GROUP_NAME = "workers";

async function createGroup(redis) {
  try {
    await redis.xGroupCreate(STREAM_NAME, GROUP_NAME, "$", {
      MKSTREAM: true,
    });
  } catch (err) {
    if (!String(err.message).includes("BUSYGROUP")) {
      throw err;
    }
  }
}

async function Subscriber(redis) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await createGroup(redis);
      break;
    } catch (err) {
      console.log(`[Queue ⚠️] createGroup failed (attempt ${attempt}/5): ${err.message}`);
      if (attempt === 5) throw err;
      await new Promise((r) => setTimeout(r, attempt * 500));
    }
  }

  const consumerName = `node-worker-${crypto.randomUUID()}`;

  log.info(`[Queue subscriber ⛃] Redis Stream worker started: ${consumerName}`);

  const handlers = {
    "new-payment-success": handlePaymentSuccessEvent,
    "new-self-service-payment-success": handleSelfServicePaymentSuccessEvent,
    "new-pos-payment-success": handlePOSPaymentSuccessEvent,
  };

  while (true) {
    try {
      const result = await redis.xReadGroup(
        GROUP_NAME,
        consumerName,
        [
          {
            key: STREAM_NAME,
            id: ">",
          },
        ],
        {
          COUNT: 1,
          BLOCK: 5000,
        }
      );

      if (!result) continue;

      for (const stream of result) {
        for (const message of stream.messages) {
          const messageId = message.id;
          const event = message.message.event;
          const payload = JSON.parse(message.message.payload);

          const handler = handlers[event];

          if (!handler) {
            log.warn(`[Queue ⚠️] No handler for event: ${event}`);
            await redis.xAck(STREAM_NAME, GROUP_NAME, messageId);
            continue;
          }

          try {
            await handler(payload);

            await redis.xAck(STREAM_NAME, GROUP_NAME, messageId);

            log.info(`[Queue ✅] ACK ${event}: ${messageId}`);
          } catch (err) {
            console.log(`[Queue ❌] Handler failed: ${event}`, err);

            // Do not ACK.
            // Redis keeps it pending so another worker can retry later.
          }
        }
      }
    } catch (err) {
      console.log("[Queue ❌] xReadGroup error:", err);
    }
  }
}

export default Subscriber;