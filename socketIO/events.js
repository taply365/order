export function emitEvent(socket) {
  socket.on("new_order", (data, ack) => {
    console.log("Received new_order event with data:", data);
    if (typeof ack === "function") ack({ success: true, ts: Date.now() });
  });
}