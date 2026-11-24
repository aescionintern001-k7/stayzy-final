import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  getDashboardStats,
  getAdminProperties,
  moderateProperty,
  getAdminBookings,
  updateAdminBookingStatus,
  cancelAdminBooking,
  getAdminPayments,
  getRevenueReport,
  getAdminReviews,
  deleteAdminReview,
} from "./admin.controller.js";
import {
  listAdminPropertiesQuerySchema,
  moderatePropertySchema,
  listAdminBookingsQuerySchema,
  updateAdminBookingStatusSchema,
  cancelAdminBookingSchema,
  listAdminPaymentsQuerySchema,
  listAdminReviewsQuerySchema,
  revenueReportQuerySchema,
  entityIdParamSchema,
} from "./admin.validator.js";

const router = Router();

// Strict RBAC: All administrative endpoints require valid authentication and "admin" role
router.use(authenticate, authorize("admin"));

// 1. Dashboard statistics
router.get("/dashboard", getDashboardStats);

// 2. Property oversight & moderation
router.get(
  "/properties",
  validateRequest({ query: listAdminPropertiesQuerySchema }),
  getAdminProperties
);
router.patch(
  "/properties/:id/status",
  validateRequest(moderatePropertySchema),
  moderateProperty
);

// 3. Booking management & cancellation
router.get(
  "/bookings",
  validateRequest({ query: listAdminBookingsQuerySchema }),
  getAdminBookings
);
router.patch(
  "/bookings/:id/status",
  validateRequest(updateAdminBookingStatusSchema),
  updateAdminBookingStatus
);
router.post(
  "/bookings/:id/cancel",
  validateRequest(cancelAdminBookingSchema),
  cancelAdminBooking
);

// 4. Payment overview
router.get(
  "/payments",
  validateRequest({ query: listAdminPaymentsQuerySchema }),
  getAdminPayments
);

// 5. Financial reports
router.get(
  "/reports/revenue",
  validateRequest({ query: revenueReportQuerySchema }),
  getRevenueReport
);

// 6. Review moderation
router.get(
  "/reviews",
  validateRequest({ query: listAdminReviewsQuerySchema }),
  getAdminReviews
);
router.delete(
  "/reviews/:id",
  validateRequest({ params: entityIdParamSchema }),
  deleteAdminReview
);

export default router;
