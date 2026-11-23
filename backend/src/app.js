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

const app = express();

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

// Authentication routes
app.use(`${env.API_PREFIX}/auth`, authRoutes);

// Health endpoint
app.use(healthRoutes);

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


