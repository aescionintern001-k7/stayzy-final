import { z } from "zod";

export const createHoldSchema = z
  .object({
    room_type_id: z.string().uuid("Invalid room_type_id UUID"),
    inventory_unit_id: z.string().uuid("Invalid inventory_unit_id UUID").optional().nullable(),
    duration_type: z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "start_date must be YYYY-MM-DD"),
    start_time: z
      .string()
      .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "start_time must be HH:MM")
      .optional(),
    duration_count: z.coerce.number().int().min(1).max(60),
    include_food: z.boolean().default(false),
    guest_email: z.string().trim().email().max(255).optional(),
  })
  .strict();

export const holdTokenParamSchema = z
  .object({
    token: z.string().trim().min(10, "Invalid hold token").max(160),
  })
  .strict();
