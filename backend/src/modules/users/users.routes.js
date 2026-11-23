import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  getMe,
  updateMe,
  listUsers,
  getUser,
  changeUserStatus,
} from "./users.controller.js";
import {
  updateProfileSchema,
  listUsersQuerySchema,
  userIdParamSchema,
  updateUserStatusSchema,
} from "./users.validator.js";

const router = Router();

// Current user profile endpoints (any authenticated user)
router.get("/me", authenticate, getMe);
router.patch(
  "/me",
  authenticate,
  validateRequest({ body: updateProfileSchema }),
  updateMe
);

// Admin user management endpoints
router.get(
  "/",
  authenticate,
  authorize("admin"),
  validateRequest({ query: listUsersQuerySchema }),
  listUsers
);
router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  validateRequest({ params: userIdParamSchema }),
  getUser
);
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin"),
  validateRequest({ params: userIdParamSchema, body: updateUserStatusSchema }),
  changeUserStatus
);

export default router;
