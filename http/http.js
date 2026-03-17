import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const http = axios.create({
  baseURL: `${process.env.API_SERVER}/api-server`,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const token = jwt.sign(
    { service: "server-order" },
    process.env.SECRET_KEY,
    { expiresIn: "5m" }
  );

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default http;