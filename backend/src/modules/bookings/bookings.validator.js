import { z } from "zod";

const bookingStatuses = ["pending", "confirmed", "cancelled", "completed"];

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Helper to ensure a date string is not in the past (midnight UTC comparison).
 */
const isNotPastDate = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date >= now;
};

/**
 * Validator for creating a new booking (POST /api/v1/bookings).
 */
export const createBookingSchema = z
  .object({
    property_id: z
      .string()
      .uuid("Invalid property ID format. Must be a valid UUID"),
    check_in_date: z
      .string()
      .regex(dateRegex, "check_in_date must be in YYYY-MM-DD format")
      .refine(isNotPastDate, {
        message: "check_in_date cannot be in the past",
      }),
    check_out_date: z
      .string()
      .regex(dateRegex, "check_out_date must be in YYYY-MM-DD format"),
    guests_count: z.coerce
      .number()
      .int()
      .min(1, "guests_count must be at least 1")
      .default(1),
    special_requests: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine(
    (data) => {
      const checkIn = new Date(data.check_in_date);
      const checkOut = new Date(data.check_out_date);
      return checkOut > checkIn;
    },
    {
      message: "check_out_date must be after check_in_date",
      path: ["check_out_date"],
    }
  );

/**
 * Validator for booking route parameter :id.
 */
export const bookingIdParamSchema = z
  .object({
    id: z.string().uuid("Invalid booking ID format. Must be a valid UUID"),
  })
  .strict();

/**
 * Validator for cancelling a booking (PATCH /api/v1/bookings/:id/cancel).
 */
export const cancelBookingSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .max(500, "Cancellation reason must not exceed 500 characters")
      .optional(),
  })
  .strict();

/**
 * Validator for managing booking status (PATCH /api/v1/bookings/:id/status).
 */
export const updateBookingStatusSchema = z
  .object({
    status: z.enum(["confirmed", "completed", "cancelled"], {
      errorMap: () => ({
        message: "Status must be one of: confirmed, completed, cancelled",
      }),
    }),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

/**
 * Validator for listing bookings query parameters (GET /api/v1/bookings).
 */
export const listBookingsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1, "Limit must be at least 1")
      .max(100, "Limit cannot exceed 100")
      .default(10),
    status: z.enum(bookingStatuses).optional(),
  })
  .strict();

/**
 * Validator for checking property date availability (GET /api/v1/bookings/availability).
 */
export const checkAvailabilityQuerySchema = z
  .object({
    property_id: z
      .string()
      .uuid("Invalid property ID format. Must be a valid UUID"),
    check_in_date: z
      .string()
      .regex(dateRegex, "check_in_date must be in YYYY-MM-DD format"),
    check_out_date: z
      .string()
      .regex(dateRegex, "check_out_date must be in YYYY-MM-DD format"),
  })
  .strict()
  .refine(
    (data) => {
      const checkIn = new Date(data.check_in_date);
      const checkOut = new Date(data.check_out_date);
      return checkOut > checkIn;
    },
    {
      message: "check_out_date must be after check_in_date",
      path: ["check_out_date"],
    }
  );
