import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { isProduction } from "./env.js";

export const securityMiddleware = helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false,
});

const makeRateLimitHandler = (message) => (req, res, _next, options) => {
  const retryAfterSec = Math.max(
    1,
    Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
  );
  if (!res.getHeader("Retry-After")) {
    res.setHeader("Retry-After", String(retryAfterSec));
  }
  res.status(options.statusCode || 429).json({
    success: false,
    message,
  });
};

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 120 : 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: makeRateLimitHandler("Too many requests. Please try again later."),
  skip: (req) => req.method === "OPTIONS",
});

export const searchRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 180 : 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: makeRateLimitHandler("Too many search requests. Please slow down."),
  skip: (req) => req.method === "OPTIONS",
});

export const bookingMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 30 : 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip || "127.0.0.1")}`,
  handler: makeRateLimitHandler(
    "Too many booking or payment attempts. Please wait before retrying."
  ),
  skip: (req) => req.method === "OPTIONS",
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : (process.env.NODE_ENV === "test" ? 150 : 30),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: makeRateLimitHandler(
    "Too many authentication attempts. Please try again later."
  ),
  skip: (req) => req.method === "OPTIONS",
});
