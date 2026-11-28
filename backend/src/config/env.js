import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    APP_ENV: z.enum(["development", "staging", "production", "test"]).optional(),
    LOG_FORMAT: z.enum(["pretty", "json"]).optional(),
    PORT: z.coerce.number().int().positive().default(5000),
    API_PREFIX: z.string().default("/api/v1"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().default("1d"),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
    FIREBASE_WEB_API_KEY: z.string().optional(),
    ALLOW_DEV_PAYMENT_SIMULATOR: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((val) => val === true || val === "true"),
    ALLOW_DEMO_PROPERTY_SIMULATOR: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((val) => val === true || val === "true"),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    DATABASE_URL: z.string().optional(),
    DB_SSL: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((val) => val === true || val === "true"),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_NAME: z.string().min(1).default("stayzy_dev"),
    DB_USER: z.string().min(1).default("postgres"),
    DB_PASSWORD: z.string().optional(),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  })
  .transform((data) => {
    // In test and development, provide safe local fallback mock keys if not set
    if (data.NODE_ENV !== "production") {
      return {
        ...data,
        RAZORPAY_KEY_ID: data.RAZORPAY_KEY_ID || "rzp_test_stayzykey123",
        RAZORPAY_KEY_SECRET: data.RAZORPAY_KEY_SECRET || "rzp_test_secret_stayzy456",
        RAZORPAY_WEBHOOK_SECRET: data.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_secret_stayzy789",
      };
    }
    return data;
  })
  .superRefine((data, ctx) => {
    if (!data.DATABASE_URL && (!data.DB_PASSWORD || data.DB_PASSWORD.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DB_PASSWORD"],
        message: "DB_PASSWORD is required when DATABASE_URL is not set",
      });
    }
    // In production, prevent silent use of missing, placeholder, or dev/test credentials
    if (data.NODE_ENV === "production") {
      const effectiveEnv = data.APP_ENV || data.NODE_ENV;
      const lowerJwt = data.JWT_SECRET.toLowerCase();
      if (
        lowerJwt.includes("your_jwt_secret") ||
        lowerJwt.includes("change_me") ||
        lowerJwt.includes("dev_secret") ||
        lowerJwt.includes("test_jwt_secret") ||
        lowerJwt.includes("stayzy_dev")
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "JWT_SECRET must not use a placeholder or development/test secret in production",
        });
      }

      if (data.ALLOW_DEV_PAYMENT_SIMULATOR) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ALLOW_DEV_PAYMENT_SIMULATOR"],
          message: "ALLOW_DEV_PAYMENT_SIMULATOR must be false in production",
        });
      }

      if (data.ALLOW_DEMO_PROPERTY_SIMULATOR) {
        if (data.APP_ENV !== "staging") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ALLOW_DEMO_PROPERTY_SIMULATOR"],
            message: "ALLOW_DEMO_PROPERTY_SIMULATOR is only allowed when APP_ENV=staging",
          });
        }
        if (!data.RAZORPAY_KEY_ID || !data.RAZORPAY_KEY_ID.startsWith("rzp_test_")) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ALLOW_DEMO_PROPERTY_SIMULATOR"],
            message: "ALLOW_DEMO_PROPERTY_SIMULATOR requires a test RAZORPAY_KEY_ID (rzp_test_*)",
          });
        }
      }

      const corsOrigins = data.CORS_ORIGIN.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
      if (corsOrigins.length === 0 || corsOrigins.includes("*")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CORS_ORIGIN"],
          message: "CORS_ORIGIN must specify explicit origins (not empty or '*') in production",
        });
      } else if (
        effectiveEnv === "production" &&
        corsOrigins.some((o) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CORS_ORIGIN"],
          message: "CORS_ORIGIN must not include localhost/127.0.0.1 in production",
        });
      }

      if (effectiveEnv === "production" && !data.DATABASE_URL && data.DB_NAME === "stayzy_dev") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["DB_NAME"],
          message: "DB_NAME must not point to stayzy_dev in production",
        });
      }

      if (!data.RAZORPAY_KEY_ID || data.RAZORPAY_KEY_ID.startsWith("rzp_test_stayzy")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RAZORPAY_KEY_ID"],
          message: "A valid production RAZORPAY_KEY_ID is required in production mode",
        });
      } else if (effectiveEnv === "production" && data.RAZORPAY_KEY_ID.startsWith("rzp_test_")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RAZORPAY_KEY_ID"],
          message: "Live production requires a non-test RAZORPAY_KEY_ID (use APP_ENV=staging for staging)",
        });
      }
      if (!data.RAZORPAY_KEY_SECRET || data.RAZORPAY_KEY_SECRET.startsWith("rzp_test_secret_stayzy")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RAZORPAY_KEY_SECRET"],
          message: "A valid production RAZORPAY_KEY_SECRET is required in production mode",
        });
      }
      if (!data.RAZORPAY_WEBHOOK_SECRET || data.RAZORPAY_WEBHOOK_SECRET.startsWith("rzp_webhook_secret_stayzy")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RAZORPAY_WEBHOOK_SECRET"],
          message: "A valid production RAZORPAY_WEBHOOK_SECRET is required in production mode",
        });
      }
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment configuration:");

  for (const issue of parsedEnv.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }

  process.exit(1);
}

export const env = Object.freeze(parsedEnv.data);
export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";

export const isDemoPropertySimulatorEnabled = (config = env) =>
  config?.APP_ENV === "staging" &&
  config?.ALLOW_DEMO_PROPERTY_SIMULATOR === true &&
  typeof config?.RAZORPAY_KEY_ID === "string" &&
  config.RAZORPAY_KEY_ID.startsWith("rzp_test_");
