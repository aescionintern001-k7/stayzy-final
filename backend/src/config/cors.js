import cors from "cors";
import { env } from "./env.js";

const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

export const corsOptions = {
  origin(origin, callback) {
    const normalizedOrigin = origin ? origin.replace(/\/$/, "") : origin;
    if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    const err = new Error(`CORS blocked origin: ${origin}`);
    err.status = 403;
    return callback(err);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Request-Id"],
  exposedHeaders: ["X-Request-Id"],
};

export const corsMiddleware = cors(corsOptions);
