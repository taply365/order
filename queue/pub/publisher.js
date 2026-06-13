// queue/pub.js
import { getPubClient } from "../../socketIO/socket.js";

const STREAM_NAME = "jobs";

const publish = async (event, data) => {
  const redis = getPubClient();

  await redis.xAdd(STREAM_NAME, "*", {
    event,
    payload: JSON.stringify(data),
  });
};

export default publish;