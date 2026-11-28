import { Router } from "express";
import jwt from "jsonwebtoken";
import pool from "../../database/pool.js";
import { env } from "../../config/env.js";
import {
  register,
  login,
  googleLogin,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
} from "./auth.controller.js";
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validator.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authRateLimiter } from "../../config/security.js";

const optionalAuthenticateForLogout = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const userRes = await pool.query("SELECT id FROM users WHERE id = $1 LIMIT 1", [decoded.sub]);
    if (userRes.rows[0]) {
      req.user = userRes.rows[0];
    }
  } catch {
    // Allow refresh_token-based logout even if access token has expired
  }
  return next();
};

const router = Router();

router.post("/register", authRateLimiter, validateRequest({ body: registerSchema }), register);
router.post("/login", authRateLimiter, validateRequest({ body: loginSchema }), login);
router.post("/google", authRateLimiter, validateRequest({ body: googleAuthSchema }), googleLogin);
router.post("/refresh", authRateLimiter, validateRequest({ body: refreshTokenSchema }), refresh);
router.post("/logout", optionalAuthenticateForLogout, validateRequest({ body: logoutSchema }), logout);
router.post(
  "/forgot-password",
  authRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  forgotPassword
);
router.post(
  "/reset-password",
  authRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  resetPassword
);
router.get("/me", authenticate, getProfile);

export default router;
