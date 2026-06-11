import { getPubClient } from "../../socketIO/socket.js";

const publish = async (event, data) => {
  const pubClient = getPubClient();

  await pubClient.publish(
    event,
    JSON.stringify(data)
  );
};
export default publish;