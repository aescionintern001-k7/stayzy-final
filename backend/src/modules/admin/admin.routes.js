import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import pool from "../../database/pool.js";
import { getMetricsSnapshot } from "../../utils/metrics.js";
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
  createAdminUser,
  updateAdminUserRole,
  getAdminCustomers,
  getAdminRooms,
  createAdminRoom,
  getAdminBeds,
  manageAdminBed,
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  getAdminCalendar,
  getAdminRates,
  updateAdminRate,
  createOfflineBooking,
  recordOfflinePayment,
  getAdminVisits,
  updateAdminVisit,
  getAdminSupportTickets,
  replyAdminSupportTicket,
  getAdminContent,
  updateAdminContent,
  getAdminSettings,
  updateAdminSettings,
  getAdminAuditLogs,
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
  createAdminUserSchema,
  updateUserRoleSchema,
  listCustomersQuerySchema,
  listAdminRoomsQuerySchema,
  createAdminRoomSchema,
  listAdminBedsQuerySchema,
  manageAdminBedSchema,
  createAvailabilityBlockSchema,
  calendarQuerySchema,
  listRatesQuerySchema,
  updateAdminRateSchema,
  createOfflineBookingSchema,
  recordOfflinePaymentSchema,
  listAdminVisitsQuerySchema,
  updateAdminVisitSchema,
  listAdminSupportQuerySchema,
  replyAdminSupportSchema,
  updateAdminContentSchema,
  updateAdminSettingsSchema,
  listAuditLogsQuerySchema,
} from "./admin.validator.js";

const router = Router();

// Strict RBAC: All administrative endpoints require valid authentication and "admin" role
router.use(authenticate, authorize("admin"));

// 1. Dashboard statistics
router.get("/dashboard", getDashboardStats);

// 1b. Protected operational metrics snapshot (bounded counters & latency percentiles)
router.get("/metrics", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Operational metrics retrieved",
    data: { metrics: getMetricsSnapshot(pool) },
  });
});

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

// 7. Users & Customer CRM (Phase A)
router.post(
  "/users",
  validateRequest({ body: createAdminUserSchema }),
  createAdminUser
);
router.patch(
  "/users/:id/role",
  validateRequest({ params: entityIdParamSchema, body: updateUserRoleSchema }),
  updateAdminUserRole
);
router.get(
  "/customers",
  validateRequest({ query: listCustomersQuerySchema }),
  getAdminCustomers
);

// 8. Rooms, Beds, Blocks, Calendar & Rates (Phase B)
router.get(
  "/rooms",
  validateRequest({ query: listAdminRoomsQuerySchema }),
  getAdminRooms
);
router.post(
  "/rooms",
  validateRequest({ body: createAdminRoomSchema }),
  createAdminRoom
);
router.get(
  "/beds",
  validateRequest({ query: listAdminBedsQuerySchema }),
  getAdminBeds
);
router.post(
  "/beds",
  validateRequest({ body: manageAdminBedSchema }),
  manageAdminBed
);
router.post(
  "/inventory/blocks",
  validateRequest({ body: createAvailabilityBlockSchema }),
  createAvailabilityBlock
);
router.delete(
  "/inventory/blocks/:id",
  validateRequest({ params: entityIdParamSchema }),
  deleteAvailabilityBlock
);
router.get(
  "/calendar",
  validateRequest({ query: calendarQuerySchema }),
  getAdminCalendar
);
router.get(
  "/rates",
  validateRequest({ query: listRatesQuerySchema }),
  getAdminRates
);
router.patch(
  "/rates/:id",
  validateRequest({ params: entityIdParamSchema, body: updateAdminRateSchema }),
  updateAdminRate
);

// 9. Offline Bookings, Offline Payments, Visits & Support Desk (Phase B)
router.post(
  "/bookings/offline",
  validateRequest({ body: createOfflineBookingSchema }),
  createOfflineBooking
);
router.post(
  "/payments/offline",
  validateRequest({ body: recordOfflinePaymentSchema }),
  recordOfflinePayment
);
router.get(
  "/visits",
  validateRequest({ query: listAdminVisitsQuerySchema }),
  getAdminVisits
);
router.patch(
  "/visits/:id",
  validateRequest({ params: entityIdParamSchema, body: updateAdminVisitSchema }),
  updateAdminVisit
);
router.get(
  "/support",
  validateRequest({ query: listAdminSupportQuerySchema }),
  getAdminSupportTickets
);
router.post(
  "/support/:id/reply",
  validateRequest({ params: entityIdParamSchema, body: replyAdminSupportSchema }),
  replyAdminSupportTicket
);

// 10. CMS Content, Settings & Audit Logs (Phase C)
router.get("/content", getAdminContent);
router.put(
  "/content",
  validateRequest({ body: updateAdminContentSchema }),
  updateAdminContent
);
router.get("/settings", getAdminSettings);
router.put(
  "/settings",
  validateRequest({ body: updateAdminSettingsSchema }),
  updateAdminSettings
);
router.get(
  "/audit-logs",
  validateRequest({ query: listAuditLogsQuerySchema }),
  getAdminAuditLogs
);

export default router;
