export const config = {
  SOCKET_PORT: Number(process.env.SOCKET_PORT) || 1269,
  SERVER_PORT: Number(process.env.SERVER_PORT) || 1268,
};

export const jwtConfig = {
  secret: process.env.SECRET_KEY || "your_jwt_secret",
  expiresIn: "1h", // Token expiration time
  algorithm: "HS256", // JWT signing algorithm
};

export const orderStatus = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    REJECTED: "REJECTED",
    PREPARING: "PREPARING",
    READY: "READY",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED"
}