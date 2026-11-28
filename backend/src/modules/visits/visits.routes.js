import { Router } from "express";
import jwt from "jsonwebtoken";
import pool from "../../database/pool.js";
import { env } from "../../config/env.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { globalRateLimiter } from "../../config/security.js";
import {
  scheduleVisit,
  getMyVisits,
  getOwnerVisits,
  updateVisitStatus,
} from "./visits.controller.js";
import {
  scheduleVisitSchema,
  visitIdParamSchema,
  updateVisitStatusSchema,
} from "./visits.validator.js";

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), env.JWT_SECRET);
    const userRes = await pool.query(
      "SELECT id, email, role, account_status FROM users WHERE id = $1 LIMIT 1",
      [decoded.sub]
    );
    if (userRes.rows[0]?.account_status === "active") {
      req.user = userRes.rows[0];
    }
  } catch {
    // Allow public walkthrough scheduling when unauthenticated
  }
  return next();
};

const router = Router();

router.post(
  "/schedule",
  globalRateLimiter,
  optionalAuth,
  validateRequest({ body: scheduleVisitSchema }),
  scheduleVisit
);

router.get("/my", authenticate, getMyVisits);
router.get("/owner", authenticate, getOwnerVisits);
router.patch(
  "/:id/status",
  authenticate,
  validateRequest({ params: visitIdParamSchema, body: updateVisitStatusSchema }),
  updateVisitStatus
);

export default router;
