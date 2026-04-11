export const config = {
  SOCKET_PORT: Number(process.env.SOCKET_PORT) || 3004,
  SERVER_PORT: Number(process.env.SERVER_PORT) || 4000,
};

export const origins = [
  "http://localhost:5173",
  "https://taply.dk",
  "https://www.taply.dk",
  "https://taply.dk",
  "https://dev.taply.dk",
  "https://www.dev.taply.dk",
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