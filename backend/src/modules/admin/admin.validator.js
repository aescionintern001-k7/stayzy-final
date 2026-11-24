import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const listAdminPropertiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["active", "inactive", "archived", "draft"]).optional(),
  search: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
});

export const moderatePropertySchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid property UUID"),
  }),
  body: z.object({
    status: z.enum(["active", "inactive", "archived"]),
    moderation_note: z.string().trim().max(1000).optional(),
  }),
});

export const listAdminBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
  payment_status: z.enum(["unpaid", "paid", "failed", "refunded"]).optional(),
  property_id: z.string().uuid("Invalid property UUID").optional(),
  guest_id: z.string().uuid("Invalid guest UUID").optional(),
});

export const updateAdminBookingStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid booking UUID"),
  }),
  body: z.object({
    status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
  }),
});

export const cancelAdminBookingSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid booking UUID"),
  }),
  body: z.object({
    cancellation_reason: z.string().trim().max(500).optional(),
  }),
});

export const listAdminPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["created", "captured", "failed", "refunded"]).optional(),
});

export const listAdminReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  property_id: z.string().uuid("Invalid property UUID").optional(),
});

export const revenueReportQuerySchema = z.object({
  from_date: z
    .string()
    .regex(dateRegex, "from_date must be in YYYY-MM-DD format")
    .optional(),
  to_date: z
    .string()
    .regex(dateRegex, "to_date must be in YYYY-MM-DD format")
    .optional(),
  interval: z.enum(["day", "month"]).default("day"),
});

export const entityIdParamSchema = z.object({
  id: z.string().uuid("Invalid UUID parameter"),
});

export default {
  listAdminPropertiesQuerySchema,
  moderatePropertySchema,
  listAdminBookingsQuerySchema,
  updateAdminBookingStatusSchema,
  cancelAdminBookingSchema,
  listAdminPaymentsQuerySchema,
  listAdminReviewsQuerySchema,
  revenueReportQuerySchema,
  entityIdParamSchema,
};
