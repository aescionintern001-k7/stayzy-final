import { z } from "zod";
import { getTodayIstYmd } from "../../utils/pricing.js";

export const VALID_VISIT_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
];

export const scheduleVisitSchema = z
  .object({
    property_id: z.string().uuid("Invalid property_id UUID").optional(),
    room_type_id: z.string().uuid("Invalid room_type_id UUID").optional(),
    room_slug: z.string().trim().min(1).max(200).optional(),
    customer_name: z.string().trim().min(2, "Full name is required").max(120),
    customer_phone: z.string().trim().min(10, "Valid 10-digit phone number is required").max(25),
    customer_email: z.string().trim().email("Valid email is required").max(255),
    preferred_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "preferred_date must be in YYYY-MM-DD format")
      .refine((d) => d >= getTodayIstYmd(), {
        message: "preferred_date cannot be in the past",
      }),
    time_slot: z.string().trim().min(4).max(30),
    notes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();

export const visitIdParamSchema = z
  .object({
    id: z.string().uuid("Invalid visit ID UUID"),
  })
  .strict();

export const updateVisitStatusSchema = z
  .object({
    status: z.enum(["scheduled", "confirmed", "completed", "cancelled"]),
    admin_notes: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();
