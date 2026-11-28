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
  status: z
    .enum(["pending", "confirmed", "checked_in", "checked_out", "cancelled", "completed"])
    .optional(),
  payment_status: z
    .enum(["unpaid", "pending", "held", "paid", "failed", "refunded", "partially_refunded"])
    .optional(),
  property_id: z.string().uuid("Invalid property UUID").optional(),
  guest_id: z.string().uuid("Invalid guest UUID").optional(),
});

export const updateAdminBookingStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid booking UUID"),
  }),
  body: z.object({
    status: z.enum(["pending", "confirmed", "checked_in", "checked_out", "cancelled", "completed"]),
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
  status: z.enum(["created", "pending", "captured", "failed", "refunded"]).optional(),
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

export const createAdminUserSchema = z
  .object({
    full_name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{7,20}$/)
      .optional()
      .nullable(),
    role: z.enum(["guest", "host", "admin"]).default("guest"),
  })
  .strict();

export const updateUserRoleSchema = z
  .object({
    role: z.enum(["guest", "host", "admin"]),
  })
  .strict();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

export const listAdminRoomsQuerySchema = z.object({
  property_id: z.string().uuid("Invalid property UUID").optional(),
});

export const createAdminRoomSchema = z
  .object({
    property_id: z.string().uuid("Invalid property_id UUID"),
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().min(2).max(160).optional(),
    category: z
      .enum(["PRIVATE", "TWIN_SHARING", "TRIPLE_SHARING", "DORMITORY", "STUDIO"])
      .default("PRIVATE"),
    description: z.string().trim().max(2000).default(""),
    size_sq_ft: z.coerce.number().int().positive().default(220),
    base_capacity: z.coerce.number().int().min(1).default(1),
    max_capacity: z.coerce.number().int().min(1).default(2),
    has_ac: z.boolean().default(true),
    bathroom_type: z.enum(["ATTACHED", "COMMON"]).default("ATTACHED"),
    food_included: z.boolean().default(false),
    food_details: z.string().trim().max(500).nullable().optional(),
    gender_eligibility: z.enum(["COLIVING", "MALE", "FEMALE"]).default("COLIVING"),
    amenities: z.array(z.string().trim().min(1)).default([]),
    images: z.array(z.string().trim().url()).default([]),
    room_numbers: z.array(z.string().trim().min(1).max(20)).min(1).default(["101"]),
    beds_per_room: z.coerce.number().int().min(1).max(12).default(1),
    rate_plans: z
      .array(
        z.object({
          duration_type: z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
          price: z.coerce.number().nonnegative(),
          is_enabled: z.boolean().default(true),
          min_duration: z.coerce.number().int().min(1).default(1),
          max_duration: z.coerce.number().int().min(1).nullable().optional(),
          allowed_hours_start: z.string().trim().max(10).default("08:00"),
          allowed_hours_end: z.string().trim().max(10).default("22:00"),
          deposit_amount: z.coerce.number().nonnegative().default(0),
          food_monthly_charge: z.coerce.number().nonnegative().default(0),
          electricity_rule: z.string().trim().max(120).optional(),
          notes: z.string().trim().max(500).nullable().optional(),
        })
      )
      .default([]),
  })
  .strict();

export const listAdminBedsQuerySchema = z.object({
  property_id: z.string().uuid("Invalid property UUID").optional(),
  room_type_id: z.string().uuid("Invalid room_type_id UUID").optional(),
});

export const manageAdminBedSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("ADD_UNIT"),
      room_id: z.string().uuid().optional(),
      room_type_id: z.string().uuid().optional(),
      room_number: z.string().trim().min(1).max(20).optional(),
      floor: z.coerce.number().int().min(0).max(100).optional(),
      identifier: z.string().trim().min(1).max(30),
      is_bed: z.boolean().default(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("UPDATE_STATUS"),
      inventory_unit_id: z.string().uuid(),
      status: z.enum(["available", "maintenance", "blocked"]),
    })
    .strict(),
]);

export const createAvailabilityBlockSchema = z
  .object({
    inventory_unit_id: z.string().uuid("Invalid inventory_unit_id UUID"),
    reason: z.enum(["MAINTENANCE", "CLEANING", "OFFLINE_HOLD"]).default("MAINTENANCE"),
    start_time: z.string().datetime({ offset: true }),
    end_time: z.string().datetime({ offset: true }),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .strict()
  .refine((d) => new Date(d.end_time) > new Date(d.start_time), {
    message: "end_time must be after start_time",
    path: ["end_time"],
  });

export const calendarQuerySchema = z.object({
  from_date: z.string().regex(dateRegex, "from_date must be YYYY-MM-DD").optional(),
  days: z.coerce.number().int().min(1).max(31).default(10),
  property_id: z.string().uuid().optional(),
});

export const listRatesQuerySchema = z.object({
  property_id: z.string().uuid().optional(),
  room_type_id: z.string().uuid().optional(),
});

export const updateAdminRateSchema = z
  .object({
    price: z.coerce.number().nonnegative().optional(),
    is_enabled: z.boolean().optional(),
    min_duration: z.coerce.number().int().min(1).optional(),
    max_duration: z.coerce.number().int().min(1).nullable().optional(),
    allowed_hours_start: z.string().trim().max(10).optional(),
    allowed_hours_end: z.string().trim().max(10).optional(),
    deposit_amount: z.coerce.number().nonnegative().optional(),
    food_monthly_charge: z.coerce.number().nonnegative().optional(),
    electricity_rule: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one rate plan field to update",
  });

export const createOfflineBookingSchema = z
  .object({
    room_type_id: z.string().uuid(),
    inventory_unit_id: z.string().uuid().optional().nullable(),
    guest_id: z.string().uuid().optional().nullable(),
    guest_name: z.string().trim().min(2).max(120),
    guest_email: z.string().trim().email().max(255),
    guest_phone: z.string().trim().min(7).max(25),
    duration_type: z
      .enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .default("MONTHLY"),
    start_date: z.string().regex(dateRegex, "start_date must be YYYY-MM-DD"),
    start_time: z
      .string()
      .regex(/^([01]?\d|2[0-3]):[0-5]\d$/)
      .optional(),
    duration_count: z.coerce.number().int().min(1).max(60).default(1),
    include_food: z.boolean().default(false),
    guests_count: z.coerce.number().int().min(1).default(1),
    mark_paid: z.boolean().default(false),
    payment_notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const recordOfflinePaymentSchema = z
  .object({
    booking_id: z.string().uuid(),
    payment_schedule_id: z.string().uuid().optional().nullable(),
    amount: z.coerce.number().positive().optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const listAdminVisitsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]).optional(),
});

export const updateAdminVisitSchema = z
  .object({
    status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]),
    admin_notes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export const listAdminSupportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
});

export const replyAdminSupportSchema = z
  .object({
    admin_reply: z.string().trim().min(2).max(4000),
    status: z.enum(["open", "in_progress", "resolved", "closed"]).default("resolved"),
  })
  .strict();

export const updateAdminContentSchema = z
  .object({
    key: z.string().trim().min(2).max(100),
    value: z.any(),
  })
  .strict();

export const updateAdminSettingsSchema = z
  .object({
    key: z.string().trim().min(2).max(100).default("platform_config"),
    value: z.record(z.string(), z.any()),
    is_public: z.boolean().default(true),
  })
  .strict();

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  action: z.string().trim().max(100).optional(),
  entity_type: z.string().trim().max(80).optional(),
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
};
