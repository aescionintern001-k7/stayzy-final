import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  createBooking,
  checkAvailability,
  getMyBookings,
  getPropertyReservations,
  getBooking,
  cancelBooking,
  updateBookingStatus,
  calculatePricing,
} from "./bookings.controller.js";
import {
  createBookingSchema,
  bookingIdParamSchema,
  cancelBookingSchema,
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

// Authenticated (Host / Admin): View reservations for a specific property
router.get(
  "/property/:propertyId",
  authenticate,
  getPropertyReservations
);

// Authenticated (Guest, Host, Admin): View specific booking details
router.get(
  "/:id",
  authenticate,
  validateRequest({ params: bookingIdParamSchema }),
  getBooking
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
