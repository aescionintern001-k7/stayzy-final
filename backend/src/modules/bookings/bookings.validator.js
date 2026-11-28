import { z } from "zod";
import { getTodayIstYmd } from "../../utils/pricing.js";

const bookingStatuses = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "completed",
];

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;

/**
 * Helper to ensure a date string is not in the past.
 */
const isNotPastDate = (dateStr) => {
  return String(dateStr) >= getTodayIstYmd();
};

/**
 * Validator for creating a new booking (POST /api/v1/bookings).
 * Supports both legacy property bookings AND unified room-type / hold checkout.
 */
export const createBookingSchema = z
  .object({
    property_id: z
      .string()
      .uuid("Invalid property ID format. Must be a valid UUID")
      .optional(),
    room_type_id: z
      .string()
      .uuid("Invalid room_type_id format. Must be a valid UUID")
      .optional(),
    inventory_unit_id: z
      .string()
      .uuid("Invalid inventory_unit_id format. Must be a valid UUID")
      .optional()
      .nullable(),
    hold_token: z.string().trim().min(10).max(160).optional().nullable(),
    duration_type: z
      .enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional(),
    start_date: z
      .string()
      .regex(dateRegex, "start_date must be in YYYY-MM-DD format")
      .optional(),
    start_time: z
      .string()
      .regex(timeRegex, "start_time must be in HH:MM format")
      .optional(),
    duration_count: z.coerce.number().int().min(1).max(60).optional(),
    include_food: z.boolean().default(false).optional(),
    check_in_date: z
      .string()
      .regex(dateRegex, "check_in_date must be in YYYY-MM-DD format")
      .optional(),
    check_out_date: z
      .string()
      .regex(dateRegex, "check_out_date must be in YYYY-MM-DD format")
      .optional(),
    guests_count: z.coerce
      .number()
      .int()
      .min(1, "guests_count must be at least 1")
      .default(1),
    guest_name: z.string().trim().min(2).max(120).optional(),
    guest_email: z.string().trim().email().max(255).optional(),
    guest_phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{7,20}$/, "Invalid guest_phone format")
      .optional(),
    special_requests: z.string().trim().max(500).optional(),
    idempotency_key: z.string().trim().min(8).max(120).optional().nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const isRoomFlow = Boolean(data.room_type_id || data.hold_token);

    if (!isRoomFlow && !data.property_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["property_id"],
        message: "Either property_id or room_type_id is required",
      });
      return;
    }

    if (!isRoomFlow) {
      if (!data.check_in_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["check_in_date"],
          message: "check_in_date is required",
        });
      } else if (!isNotPastDate(data.check_in_date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["check_in_date"],
          message: "check_in_date cannot be in the past",
        });
      }

      if (!data.check_out_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["check_out_date"],
          message: "check_out_date is required",
        });
      } else if (
        data.check_in_date &&
        new Date(data.check_out_date) <= new Date(data.check_in_date)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["check_out_date"],
          message: "check_out_date must be after check_in_date",
        });
      }
      return;
    }

    // Room-type / hold flow validation
    const effectiveStartDate = data.start_date || data.check_in_date;
    if (!data.hold_token && !effectiveStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["start_date"],
        message: "start_date is required when hold_token is not provided",
      });
    } else if (effectiveStartDate && !isNotPastDate(effectiveStartDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [data.start_date ? "start_date" : "check_in_date"],
        message: "Check-in date cannot be in the past",
      });
    }

    if (!data.hold_token && !data.duration_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["duration_type"],
        message: "duration_type is required when hold_token is not provided",
      });
    }
  });

/**
 * Validator for booking route parameter :id.
 */
export const recoverByIdempotencyKeyParamSchema = z
  .object({
    idempotencyKey: z
      .string()
      .trim()
      .min(8, "Invalid idempotencyKey")
      .max(120, "Invalid idempotencyKey"),
  })
  .strict();

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
    status: z.enum(["confirmed", "checked_in", "checked_out", "completed", "cancelled"], {
      errorMap: () => ({
        message:
          "Status must be one of: confirmed, checked_in, checked_out, completed, cancelled",
      }),
    }),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const extendBookingSchema = z
  .object({
    additional_count: z.coerce
      .number()
      .int()
      .min(1, "additional_count must be at least 1")
      .max(24, "additional_count cannot exceed 24"),
    include_food: z.boolean().optional(),
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
