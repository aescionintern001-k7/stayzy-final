import test from "node:test";
import assert from "node:assert/strict";
import { envSchema } from "../src/config/env.js";

const baseValidConfig = {
  NODE_ENV: "development",
  PORT: 5000,
  API_PREFIX: "/api/v1",
  JWT_SECRET: "a_very_secure_and_long_jwt_secret_key_12345",
  JWT_EXPIRES_IN: "1d",
  CORS_ORIGIN: "http://localhost:3000",
  DB_HOST: "localhost",
  DB_PORT: 5432,
  DB_NAME: "stayzy_dev",
  DB_USER: "postgres",
  DB_PASSWORD: "secret_password",
};

test.describe("Environment Configuration & Security Validation Tests", () => {
  test("Development mode - safely falls back to local mock Razorpay keys when omitted", () => {
    const parsed = envSchema.safeParse({
      ...baseValidConfig,
      NODE_ENV: "development",
    });

    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.data.RAZORPAY_KEY_ID, "rzp_test_stayzykey123");
    assert.strictEqual(parsed.data.RAZORPAY_KEY_SECRET, "rzp_test_secret_stayzy456");
    assert.strictEqual(parsed.data.RAZORPAY_WEBHOOK_SECRET, "rzp_webhook_secret_stayzy789");
  });

  test("Test mode - safely falls back to local mock Razorpay keys when omitted", () => {
    const parsed = envSchema.safeParse({
      ...baseValidConfig,
      NODE_ENV: "test",
    });

    assert.strictEqual(parsed.success, true);
    assert.ok(parsed.data.RAZORPAY_KEY_ID);
  });

  test("Production mode - fails validation if Razorpay keys are missing", () => {
    const parsed = envSchema.safeParse({
      ...baseValidConfig,
      NODE_ENV: "production",
      // Omit Razorpay keys
    });

    assert.strictEqual(parsed.success, false);
    const issueFields = parsed.error.issues.map((i) => i.path[0]);
    assert.ok(issueFields.includes("RAZORPAY_KEY_ID"));
    assert.ok(issueFields.includes("RAZORPAY_KEY_SECRET"));
    assert.ok(issueFields.includes("RAZORPAY_WEBHOOK_SECRET"));
  });

  test("Production mode - fails validation if dummy mock fallback keys are used", () => {
    const parsed = envSchema.safeParse({
      ...baseValidConfig,
      NODE_ENV: "production",
      RAZORPAY_KEY_ID: "rzp_test_stayzykey123",
      RAZORPAY_KEY_SECRET: "rzp_test_secret_stayzy456",
      RAZORPAY_WEBHOOK_SECRET: "rzp_webhook_secret_stayzy789",
    });

    assert.strictEqual(parsed.success, false);
    const messages = parsed.error.issues.map((i) => i.message);
    assert.ok(messages.some((m) => m.includes("valid production RAZORPAY_KEY_ID")));
    assert.ok(messages.some((m) => m.includes("valid production RAZORPAY_KEY_SECRET")));
  });

  test("Production mode - succeeds when authentic live production keys are provided", () => {
    const parsed = envSchema.safeParse({
      ...baseValidConfig,
      NODE_ENV: "production",
      CORS_ORIGIN: "https://stayzy.example.com",
      DB_NAME: "stayzy_prod",
      RAZORPAY_KEY_ID: "rzp_live_realproductionkey12345",
      RAZORPAY_KEY_SECRET: "rzp_live_secret_realproductionsecret67890",
      RAZORPAY_WEBHOOK_SECRET: "rzp_live_webhook_realsecret112233",
    });

    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.data.NODE_ENV, "production");
    assert.strictEqual(parsed.data.RAZORPAY_KEY_ID, "rzp_live_realproductionkey12345");
  });

  test("Rejects JWT_SECRET if shorter than 32 characters", () => {
    const parsed = envSchema.safeParse({
      ...baseValidConfig,
      JWT_SECRET: "too_short_secret",
    });

    assert.strictEqual(parsed.success, false);
    assert.strictEqual(parsed.error.issues[0].path[0], "JWT_SECRET");
  });

  test("Rejects missing DB_PASSWORD", () => {
    const invalidConfig = { ...baseValidConfig };
    delete invalidConfig.DB_PASSWORD;

    const parsed = envSchema.safeParse(invalidConfig);
    assert.strictEqual(parsed.success, false);
    assert.strictEqual(parsed.error.issues[0].path[0], "DB_PASSWORD");
  });
});
