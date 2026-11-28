import express from "express";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { corsMiddleware } from "./config/cors.js";
import {
  securityMiddleware,
  globalRateLimiter,
  searchRateLimiter,
} from "./config/security.js";

import { requestContextMiddleware } from "./middlewares/requestContext.js";
import {
  notFoundHandler,
  errorHandler,
} from "./middlewares/errorHandler.js";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/users.routes.js";
import propertyRoutes from "./modules/properties/properties.routes.js";
import bookingRoutes from "./modules/bookings/bookings.routes.js";
import paymentRoutes from "./modules/payments/payments.routes.js";
import reviewRoutes from "./modules/reviews/reviews.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import roomRoutes from "./modules/rooms/rooms.routes.js";
import holdRoutes from "./modules/holds/holds.routes.js";
import visitRoutes from "./modules/visits/visits.routes.js";
import supportRoutes from "./modules/support/support.routes.js";
import cityRoutes from "./modules/cities/cities.routes.js";
import cmsRoutes from "./modules/cms/cms.routes.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzip } from "node:zlib";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openapiDocument = YAML.load(path.join(__dirname, "../docs/openapi.yaml"));

const app = express();

// Trust first reverse proxy hop (Render/Railway/Fly/Nginx) for accurate rate limiting
app.set("trust proxy", 1);

// Prevent caching of personalized or security-sensitive API responses across sessions
const noStorePrivate = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Vary", "Authorization, Cookie");
  next();
};

// Safe short-lived HTTP caching for strictly non-sensitive public catalog/CMS GET endpoints
const publicCatalogCache = (req, res, next) => {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
  }
  next();
};

// Lightweight async gzip compression for JSON payloads >= 1024 bytes when client supports gzip
const jsonGzipCompression = (req, res, next) => {
  const acceptEnc = String(req.headers["accept-encoding"] || "");
  if (!acceptEnc.includes("gzip")) return next();
  const origJson = res.json.bind(res);
  res.json = (body) => {
    const jsonStr = JSON.stringify(body);
    if (Buffer.byteLength(jsonStr, "utf8") < 1024) {
      return origJson(body);
    }
    gzip(jsonStr, (err, gz) => {
      if (err) return origJson(body);
      if (res.headersSent) return;
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(gz);
    });
    return res;
  };
  next();
};

// Security
app.use(securityMiddleware);

// CORS
app.use(corsMiddleware);

// Request correlation, bounded metrics & structured request logging
app.use(requestContextMiddleware);

// Request parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// Health endpoints (exempt from API rate limiter so liveness probes never get 429)
app.use(healthRoutes);

// Request timeout guard so hung sockets fail cleanly without pool/memory exhaustion
app.use((req, res, next) => {
  res.setTimeout(25000, () => {
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: "Request timed out. Please try again.",
      });
    }
  });
  next();
});

// Rate limiting (catalog/search and HMAC-verified webhooks use dedicated policies)
app.use((req, res, next) => {
  const p = req.path || "";
  if (
    p.startsWith(`${env.API_PREFIX}/rooms`) ||
    p.startsWith(`${env.API_PREFIX}/cities`) ||
    p.startsWith(`${env.API_PREFIX}/content`) ||
    p === `${env.API_PREFIX}/payments/webhook`
  ) {
    return next();
  }
  return globalRateLimiter(req, res, next);
});

// Response compression
app.use(jsonGzipCompression);

// Module routes
app.use(`${env.API_PREFIX}/auth`, noStorePrivate, authRoutes);
app.use(`${env.API_PREFIX}/users`, noStorePrivate, userRoutes);
app.use(`${env.API_PREFIX}/properties`, propertyRoutes);
app.use(`${env.API_PREFIX}/rooms`, searchRateLimiter, roomRoutes);
app.use(`${env.API_PREFIX}/holds`, noStorePrivate, holdRoutes);
app.use(`${env.API_PREFIX}/bookings`, noStorePrivate, bookingRoutes);
app.use(`${env.API_PREFIX}/payments`, noStorePrivate, paymentRoutes);
app.use(`${env.API_PREFIX}/visits`, noStorePrivate, visitRoutes);
app.use(`${env.API_PREFIX}/support`, noStorePrivate, supportRoutes);
app.use(`${env.API_PREFIX}/cities`, searchRateLimiter, publicCatalogCache, cityRoutes);
app.use(`${env.API_PREFIX}/content`, searchRateLimiter, publicCatalogCache, cmsRoutes);
app.use(`${env.API_PREFIX}/reviews`, reviewRoutes);
app.use(`${env.API_PREFIX}/admin`, noStorePrivate, adminRoutes);

// API Documentation (Swagger UI — disabled in live production)
if (!(env.NODE_ENV === "production" && env.APP_ENV === "production")) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
  app.get("/api/docs/spec.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.json(openapiDocument);
  });
}

// API root
app.get(env.API_PREFIX, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Stayzy API",
    version: "1.0.0",
  });
});

// 404
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
