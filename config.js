export const config = {
  SOCKET_PORT: Number(process.env.SOCKET_PORT) || 1269,
  SERVER_PORT: Number(process.env.SERVER_PORT) || 1268,
};

export const origins = [
  "http://localhost:5173",
  "https://taply.dk",
  "https://www.taply.dk",
  "https://dev.taply.dk",
]

export const orderStatus = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    REJECTED: "REJECTED",
    PREPARING: "PREPARING",
    READY: "READY",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED"
}