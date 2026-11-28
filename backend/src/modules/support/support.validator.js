import { z } from "zod";

export const createSupportTicketSchema = z
  .object({
    booking_id: z.string().uuid("Invalid booking_id UUID").optional().nullable(),
    category: z
      .enum(["general", "maintenance", "housekeeping", "payment", "cancellation"])
      .default("general"),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
    subject: z.string().trim().min(3, "Subject is required").max(160),
    message: z.string().trim().min(5, "Message must be at least 5 characters").max(4000),
  })
  .strict();

export const listSupportQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  })
  .strict();
