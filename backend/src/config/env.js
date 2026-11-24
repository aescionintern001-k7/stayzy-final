import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    API_PREFIX: z.string().default("/api/v1"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().default("1d"),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.coerce.number().int().positive().default(5432),
    DB_NAME: z.string().min(1).default("stayzy_dev"),
    DB_USER: z.string().min(1).default("postgres"),
    DB_PASSWORD: z.string().min(1, "Database password is required"),
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
    // In production, prevent silent use of missing or mock fallback credentials
    if (data.NODE_ENV === "production") {
      if (!data.RAZORPAY_KEY_ID || data.RAZORPAY_KEY_ID.startsWith("rzp_test_stayzy")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RAZORPAY_KEY_ID"],
          message: "A valid production RAZORPAY_KEY_ID is required in production mode",
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
