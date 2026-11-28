import { z } from "zod";

export const registerSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,20}$/, "Invalid phone number format")
    .optional(),
  role: z.enum(["guest", "host"]).default("guest"),
});

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(255).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
    identifier: z.string().trim().min(3).max(255).optional(),
    password: z.string().min(1).max(72),
    device_label: z.string().trim().max(120).optional(),
  })
  .refine((data) => Boolean(data.email || data.phone || data.identifier), {
    message: "Email or phone identifier is required",
    path: ["email"],
  });

export const googleAuthSchema = z
  .object({
    idToken: z.string().trim().min(20, "A valid Google/Firebase ID token is required"),
    device_label: z.string().trim().max(120).optional(),
  })
  .strict();

export const refreshTokenSchema = z
  .object({
    refresh_token: z.string().trim().min(32, "Valid refresh_token is required"),
    device_label: z.string().trim().max(120).optional(),
  })
  .strict();

export const logoutSchema = z
  .object({
    refresh_token: z.string().trim().min(32).optional(),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email().max(255),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20, "Valid reset token is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters").max(72),
  })
  .strict();
