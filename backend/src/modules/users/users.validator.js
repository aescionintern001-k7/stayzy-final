import { z } from "zod";

/**
 * Validator for updating the current user profile (PATCH /api/v1/users/me).
 * Strict validation: only permits full_name, phone, and profile_image_url.
 * Rejects role, account_status, email, password_hash, id, etc.
 */
export const updateProfileSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must not exceed 100 characters")
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{7,20}$/, "Invalid phone number format")
      .nullable()
      .optional(),
    profile_image_url: z
      .string()
      .trim()
      .url("Invalid URL format")
      .max(1000, "Profile image URL must not exceed 1000 characters")
      .refine((url) => /^https?:\/\//i.test(url), {
        message: "Profile image URL must use HTTP or HTTPS protocol",
      })
      .nullable()
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });

/**
 * Validator for listing users (GET /api/v1/users).
 * Admin only. Supports page, limit, search, role, status.
 */
export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1, "Page must be greater than or equal to 1").default(1),
    limit: z.coerce.number().int().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100").default(10),
    search: z.string().trim().max(100, "Search query must not exceed 100 characters").optional(),
    role: z.enum(["guest", "host", "admin"], {
      errorMap: () => ({ message: "Role filter must be one of: guest, host, admin" }),
    }).optional(),
    status: z.enum(["active", "suspended", "pending"], {
      errorMap: () => ({ message: "Status filter must be one of: active, suspended, pending" }),
    }).optional(),
  })
  .strict();

/**
 * Validator for route parameters containing a user UUID.
 */
export const userIdParamSchema = z
  .object({
    id: z.string().uuid("Invalid user ID format. Must be a valid UUID"),
  })
  .strict();

/**
 * Validator for updating a user's account status (PATCH /api/v1/users/:id/status).
 * Admin only. Supports status or account_status field, rejects all other fields.
 */
export const updateUserStatusSchema = z
  .object({
    status: z.enum(["active", "suspended", "pending"], {
      errorMap: () => ({ message: "Status must be one of: active, suspended, pending" }),
    }),
  })
  .strict();
