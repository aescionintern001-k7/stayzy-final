import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { bookingMutationLimiter } from "../../config/security.js";
import {
  createBooking,
  checkAvailability,
  getMyBookings,
  getPropertyReservations,
  getOwnerBookings,
  getBooking,
  recoverBooking,
  cancelBooking,
  extendBooking,
  updateBookingStatus,
  calculatePricing,
} from "./bookings.controller.js";
import {
  createBookingSchema,
  bookingIdParamSchema,
  recoverByIdempotencyKeyParamSchema,
  cancelBookingSchema,
  extendBookingSchema,
  updateBookingStatusSchema,
  listBookingsQuerySchema,
  checkAvailabilityQuerySchema,
} from "./bookings.validator.js";

const router = Router();

// Public: Check property availability & calculate price
router.get(
  "/availability",
  validateRequest({ query: checkAvailabilityQuerySchema }),
  checkAvailability
);

// Public: Authoritative multi-duration pricing calculation
router.post("/calculate-pricing", calculatePricing);
router.get("/calculate-pricing", calculatePricing);

// Authenticated: Create a booking
router.post(
  "/",
  authenticate,
  bookingMutationLimiter,
  validateRequest({ body: createBookingSchema }),
  createBooking
);

// Authenticated: Retrieve current user's booking history
router.get(
  "/",
  authenticate,
  validateRequest({ query: listBookingsQuerySchema }),
  getMyBookings
);

// Authenticated (Host / Admin): View reservations across all owned properties
router.get(
  "/owner",
  authenticate,
  validateRequest({ query: listBookingsQuerySchema }),
  getOwnerBookings
);

// Authenticated (Host / Admin): View reservations for a specific property
router.get(
  "/property/:propertyId",
  authenticate,
  getPropertyReservations
);

// Authenticated (Guest): Recover a booking by client idempotency_key after timeout
router.get(
  "/recover/:idempotencyKey",
  authenticate,
  validateRequest({ params: recoverByIdempotencyKeyParamSchema }),
  recoverBooking
);

// Authenticated (Guest, Host, Admin): View specific booking details
router.get(
  "/:id",
  authenticate,
  validateRequest({ params: bookingIdParamSchema }),
  getBooking
);

// Authenticated (Guest, Host, Admin): Extend an existing booking
router.post(
  "/:id/extend",
  authenticate,
  validateRequest({ params: bookingIdParamSchema, body: extendBookingSchema }),
  extendBooking
);

// Authenticated (Guest, Host, Admin): Cancel a booking
router.patch(
  "/:id/cancel",
  authenticate,
  validateRequest({ params: bookingIdParamSchema, body: cancelBookingSchema }),
  cancelBooking
);

// Authenticated (Host, Admin): Update booking status
router.patch(
  "/:id/status",
  authenticate,
  validateRequest({ params: bookingIdParamSchema, body: updateBookingStatusSchema }),
  updateBookingStatus
);

export default router;
