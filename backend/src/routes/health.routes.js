import { Router } from "express";
import { checkDatabaseConnection } from "../database/connection.js";
import pool from "../database/pool.js";
import { isShuttingDown } from "../utils/metrics.js";

const router = Router();

// Server liveness check (fast, no DB dependency)
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Stayzy API is healthy",
    data: {
      status: "UP",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    },
  });
});

// Readiness check (verifies process is not shutting down AND PostgreSQL is reachable)
router.get("/ready", async (req, res) => {
  if (isShuttingDown()) {
    return res.status(503).json({
      success: false,
      message: "Server is shutting down",
      data: { status: "SHUTTING_DOWN", timestamp: new Date().toISOString() },
    });
  }

  const database = await checkDatabaseConnection();
  return res.status(database.connected ? 200 : 503).json({
    success: database.connected,
    message: database.connected ? "Stayzy API is ready" : "Database not ready",
    data: {
      status: database.connected ? "READY" : "NOT_READY",
      timestamp: new Date().toISOString(),
      pool: {
        total: pool.totalCount ?? 0,
        idle: pool.idleCount ?? 0,
        waiting: pool.waitingCount ?? 0,
      },
    },
  });
});

// Database health check
router.get("/health/db", async (req, res) => {
  const database = await checkDatabaseConnection();

  res.status(database.connected ? 200 : 503).json({
    success: database.connected,
    message: database.message,
    data: {
      status: database.connected ? "UP" : "DOWN",
      timestamp: new Date().toISOString(),
      pool: {
        total: pool.totalCount ?? 0,
        idle: pool.idleCount ?? 0,
        waiting: pool.waitingCount ?? 0,
      },
    },
  });
});

export default router;
