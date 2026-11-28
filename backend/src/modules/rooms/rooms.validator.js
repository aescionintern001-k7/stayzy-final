import { z } from "zod";

const optionalBooleanLike = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === "boolean") return val;
    if (val === "true" || val === "1") return true;
    if (val === "false" || val === "0") return false;
    return undefined;
  });

export const listRoomsQuerySchema = z
  .object({
    city: z.string().trim().max(100).optional(),
    locality: z.string().trim().max(150).optional(),
    search: z.string().trim().max(150).optional(),
    category: z.string().trim().max(50).optional(),
    gender: z.string().trim().max(30).optional(),
    propertyId: z.string().uuid("Invalid propertyId UUID").optional(),
    durationType: z
      .enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .default("MONTHLY"),
    durationCount: z.coerce.number().int().min(1).max(60).default(1),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD")
      .optional(),
    startTime: z
      .string()
      .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "startTime must be HH:MM")
      .default("10:00"),
    hasAc: optionalBooleanLike,
    bathroomType: z.string().trim().max(30).optional(),
    foodIncluded: optionalBooleanLike,
    includeFood: optionalBooleanLike,
    availableOnly: optionalBooleanLike,
    minBudget: z.coerce.number().min(0).optional(),
    maxBudget: z.coerce.number().min(0).optional(),
    sortBy: z.enum(["price_asc", "price_desc", "newest"]).default("newest"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const roomSlugOrIdParamSchema = z
  .object({
    slugOrId: z.string().trim().min(1).max(200),
  })
  .strict();

export const roomDetailQuerySchema = z
  .object({
    durationType: z
      .enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"])
      .optional(),
    durationCount: z.coerce.number().int().min(1).max(60).default(1),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD")
      .optional(),
    startTime: z
      .string()
      .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "startTime must be HH:MM")
      .default("10:00"),
    includeFood: optionalBooleanLike,
  })
  .strict();
