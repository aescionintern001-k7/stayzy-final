import { Router } from "express";
import { register, login, getProfile } from "./auth.controller.js";
import { registerSchema, loginSchema } from "./auth.validator.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", validateRequest({ body: registerSchema }), register);
router.post("/login", validateRequest({ body: loginSchema }), login);
router.get("/me", authenticate, getProfile);

export default router;
