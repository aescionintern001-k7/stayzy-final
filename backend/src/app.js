import express from "express";
import cookieParser from "cookie-parser";

import { env } from "./config/env.js";
import { corsMiddleware } from "./config/cors.js";
import {
  securityMiddleware,
  globalRateLimiter,
} from "./config/security.js";

import { requestLogger } from "./middlewares/requestLogger.js";
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
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

// Security
app.use(securityMiddleware);

// CORS
app.use(corsMiddleware);

// Logging
app.use(requestLogger);

// Request parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

// Rate limiting
app.use(globalRateLimiter);

// Module routes
app.use(`${env.API_PREFIX}/auth`, noStorePrivate, authRoutes);
app.use(`${env.API_PREFIX}/users`, noStorePrivate, userRoutes);
app.use(`${env.API_PREFIX}/properties`, propertyRoutes);
app.use(`${env.API_PREFIX}/bookings`, noStorePrivate, bookingRoutes);
app.use(`${env.API_PREFIX}/payments`, noStorePrivate, paymentRoutes);
app.use(`${env.API_PREFIX}/reviews`, reviewRoutes);
app.use(`${env.API_PREFIX}/admin`, noStorePrivate, adminRoutes);

// Health endpoint
app.use(healthRoutes);

// API Documentation (Swagger UI)
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
app.get("/api/docs/spec.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(openapiDocument);
});

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
