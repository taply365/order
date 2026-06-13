import { getPubClient } from "../../socketIO/socket.js";
import log from "minhluanlu-color-log";


const publish = async (event, data) => {
  const pubClient = await getPubClient();

  if(!pubClient) {
    throw new Error("Redis pubClient not initialized yet");
  }
  log.info(`[Queue publisher 🔗] Publishing event: ${event} with data:`, data);
  await pubClient.publish(
    event,
    JSON.stringify(data)
  );
};
export default publish;