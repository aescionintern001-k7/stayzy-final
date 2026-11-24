import { Router } from "express";
import { checkDatabaseConnection } from "../database/connection.js";

const router = Router();

// Server liveness check
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

// Database health check
router.get("/health/db", async (req, res) => {
  const database = await checkDatabaseConnection();

  res.status(database.connected ? 200 : 503).json({
    success: database.connected,
    message: database.message,
    data: {
      status: database.connected ? "UP" : "DOWN",
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
