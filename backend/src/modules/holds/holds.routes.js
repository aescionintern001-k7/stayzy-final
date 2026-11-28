import { Router } from "express";
import jwt from "jsonwebtoken";
import pool from "../../database/pool.js";
import { env } from "../../config/env.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  globalRateLimiter,
  bookingMutationLimiter,
} from "../../config/security.js";
import { createHold, getHold, releaseHold } from "./holds.controller.js";
import { createHoldSchema, holdTokenParamSchema } from "./holds.validator.js";

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
    // Allow unauthenticated guest hold creation cleanly
  }
  return next();
};

const router = Router();

router.post(
  "/",
  globalRateLimiter,
  optionalAuth,
  bookingMutationLimiter,
  validateRequest({ body: createHoldSchema }),
  createHold
);

router.get(
  "/:token",
  optionalAuth,
  validateRequest({ params: holdTokenParamSchema }),
  getHold
);

router.delete(
  "/:token",
  optionalAuth,
  validateRequest({ params: holdTokenParamSchema }),
  releaseHold
);

export default router;
