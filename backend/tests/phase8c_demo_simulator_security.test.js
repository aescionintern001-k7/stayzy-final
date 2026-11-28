import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { envSchema, isDemoPropertySimulatorEnabled } from "../src/config/env.js";

const baseStagingConfig = {
  NODE_ENV: "production",
  APP_ENV: "staging",
  JWT_SECRET: "a_very_secure_random_staging_jwt_secret_123456",
  CORS_ORIGIN: "https://stayzy-final-rouge.vercel.app",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/neondb?sslmode=require",
  ALLOW_DEV_PAYMENT_SIMULATOR: "false",
  ALLOW_DEMO_PROPERTY_SIMULATOR: "false",
  RAZORPAY_KEY_ID: "rzp_test_1234567890abcdef",
  RAZORPAY_KEY_SECRET: "secret_test_1234567890",
  RAZORPAY_WEBHOOK_SECRET: "webhook_test_1234567890",
};

test("Phase 8C Demo Property Simulator Guard Tests", async (t) => {
  await t.test("Feature disabled by default -> simulation denied", () => {
    const parsed = envSchema.safeParse(baseStagingConfig);
    assert.equal(parsed.success, true);
    assert.equal(isDemoPropertySimulatorEnabled(parsed.data), false);
  });

  await t.test("APP_ENV=production -> simulation denied and env validation fails if enabled", () => {
    const parsed = envSchema.safeParse({
      ...baseStagingConfig,
      APP_ENV: "production",
      ALLOW_DEMO_PROPERTY_SIMULATOR: "true",
      RAZORPAY_KEY_ID: "rzp_live_1234567890abcdef",
    });
    assert.equal(parsed.success, false);
    assert.equal(
      isDemoPropertySimulatorEnabled({
        APP_ENV: "production",
        ALLOW_DEMO_PROPERTY_SIMULATOR: true,
        RAZORPAY_KEY_ID: "rzp_test_1234567890abcdef",
      }),
      false
    );
  });

  await t.test("Missing APP_ENV -> simulation denied", () => {
    const { APP_ENV: _omitted, ...withoutAppEnv } = baseStagingConfig;
    const parsed = envSchema.safeParse({
      ...withoutAppEnv,
      ALLOW_DEMO_PROPERTY_SIMULATOR: "true",
    });
    assert.equal(parsed.success, false);
    assert.equal(
      isDemoPropertySimulatorEnabled({
        ALLOW_DEMO_PROPERTY_SIMULATOR: true,
        RAZORPAY_KEY_ID: "rzp_test_1234567890abcdef",
      }),
      false
    );
  });

  await t.test("Live Razorpay key -> simulation denied", () => {
    const parsed = envSchema.safeParse({
      ...baseStagingConfig,
      ALLOW_DEMO_PROPERTY_SIMULATOR: "true",
      RAZORPAY_KEY_ID: "rzp_live_1234567890abcdef",
    });
    assert.equal(parsed.success, false);
    assert.equal(
      isDemoPropertySimulatorEnabled({
        APP_ENV: "staging",
        ALLOW_DEMO_PROPERTY_SIMULATOR: true,
        RAZORPAY_KEY_ID: "rzp_live_1234567890abcdef",
      }),
      false
    );
  });

  await t.test("Staging + flag enabled + rzp_test_ key -> eligible", () => {
    const parsed = envSchema.safeParse({
      ...baseStagingConfig,
      ALLOW_DEMO_PROPERTY_SIMULATOR: "true",
    });
    assert.equal(parsed.success, true);
    assert.equal(isDemoPropertySimulatorEnabled(parsed.data), true);
  });

  await t.test("demoSimulatePayment checks DB eligibility BEFORE createPaymentOrder", () => {
    const serviceSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/modules/payments/payments.service.js"),
      "utf-8"
    );
    const fnStart = serviceSrc.indexOf("export const demoSimulatePayment");
    assert.notEqual(fnStart, -1);
    const fnBody = serviceSrc.slice(fnStart);
    const eligCallIdx = fnBody.indexOf("assertDemoPropertyEligible(pool, booking_id, user)");
    const createOrderIdx = fnBody.indexOf("createPaymentOrder(user.id");
    assert.notEqual(eligCallIdx, -1, "Must call assertDemoPropertyEligible before createPaymentOrder");
    assert.notEqual(createOrderIdx, -1);
    assert.equal(eligCallIdx < createOrderIdx, true, "Eligibility check must run before createPaymentOrder");
  });
});
