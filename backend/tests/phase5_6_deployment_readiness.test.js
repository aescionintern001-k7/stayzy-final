import test from "node:test";
import assert from "node:assert/strict";

import { envSchema } from "../src/config/env.js";
import { corsOptions } from "../src/config/cors.js";

const validProdBase = {
  NODE_ENV: "production",
  APP_ENV: "production",
  PORT: "5000",
  API_PREFIX: "/api/v1",
  JWT_SECRET: "prod_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f",
  CORS_ORIGIN: "https://stayzy.example.com",
  DATABASE_URL: "postgresql://stayzy_app:secret@db.stayzy.internal:5432/stayzy_prod?sslmode=require",
  RAZORPAY_KEY_ID: "rzp_live_exampleKey123456",
  RAZORPAY_KEY_SECRET: "live_secret_example_987654321",
  RAZORPAY_WEBHOOK_SECRET: "whsec_live_example_123456789",
};

test("Phase 5.6 Env Validation: accepts valid production configuration", () => {
  const parsed = envSchema.safeParse(validProdBase);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.NODE_ENV, "production");
  assert.equal(parsed.data.APP_ENV, "production");
});

test("Phase 5.6 Env Validation: rejects placeholder secrets, localhost CORS, dev DB, simulator, and test Razorpay keys in production", () => {
  const unsafeProd = {
    ...validProdBase,
    JWT_SECRET: "your_jwt_secret_minimum_32_characters_long",
    ALLOW_DEV_PAYMENT_SIMULATOR: "true",
    CORS_ORIGIN: "http://localhost:3000",
    DATABASE_URL: undefined,
    DB_NAME: "stayzy_dev",
    DB_PASSWORD: "localpassword",
    RAZORPAY_KEY_ID: "rzp_test_1234567890",
  };

  const parsed = envSchema.safeParse(unsafeProd);
  assert.equal(parsed.success, false);
  const paths = parsed.error.issues.map((i) => i.path.join("."));
  assert.ok(paths.includes("JWT_SECRET"));
  assert.ok(paths.includes("ALLOW_DEV_PAYMENT_SIMULATOR"));
  assert.ok(paths.includes("CORS_ORIGIN"));
  assert.ok(paths.includes("DB_NAME"));
  assert.ok(paths.includes("RAZORPAY_KEY_ID"));
});

test("Phase 5.6 Env Validation: allows staging (NODE_ENV=production, APP_ENV=staging) with non-mock Razorpay test keys", () => {
  const stagingConfig = {
    ...validProdBase,
    APP_ENV: "staging",
    CORS_ORIGIN: "https://staging.stayzy.example.com",
    DATABASE_URL: "postgresql://stayzy_stg:secret@db.staging.internal:5432/stayzy_staging?sslmode=require",
    RAZORPAY_KEY_ID: "rzp_test_stagingKey987654",
    RAZORPAY_KEY_SECRET: "staging_secret_987654321",
    RAZORPAY_WEBHOOK_SECRET: "whsec_staging_123456789",
  };

  const parsed = envSchema.safeParse(stagingConfig);
  assert.equal(parsed.success, true);
});

test("Phase 5.6 CORS Configuration: allows Idempotency-Key and X-Request-Id headers", () => {
  assert.ok(corsOptions.allowedHeaders.includes("Idempotency-Key"));
  assert.ok(corsOptions.allowedHeaders.includes("X-Request-Id"));
  assert.ok(corsOptions.exposedHeaders.includes("X-Request-Id"));
});
