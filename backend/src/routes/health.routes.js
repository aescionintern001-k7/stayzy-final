import { Router } from "express";

const router = Router();

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

export default router;
