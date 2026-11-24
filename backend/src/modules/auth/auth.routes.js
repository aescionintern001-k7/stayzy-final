import { Router } from "express";
import { register, login, getProfile } from "./auth.controller.js";
import { registerSchema, loginSchema } from "./auth.validator.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authRateLimiter } from "../../config/security.js";

const router = Router();

router.post("/register", authRateLimiter, validateRequest({ body: registerSchema }), register);
router.post("/login", authRateLimiter, validateRequest({ body: loginSchema }), login);
router.get("/me", authenticate, getProfile);

export default router;
