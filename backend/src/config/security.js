import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { isProduction } from "./env.js";

export const securityMiddleware = helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false,
});

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 100 : 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  skip: (req) => req.method === "OPTIONS",
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : (process.env.NODE_ENV === "test" ? 150 : 30),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
  skip: (req) => req.method === "OPTIONS",
});
