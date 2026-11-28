import Razorpay from "razorpay";
import crypto from "node:crypto";
import { env } from "./env.js";

let razorpayClient;

try {
  razorpayClient = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
} catch (err) {
  console.warn("Failed to initialize Razorpay SDK client:", err.message);
}

export const getRazorpayClient = () => razorpayClient;

/**
 * Create an order on Razorpay or mock in test mode.
 */
export const createRazorpayOrder = async ({
  amount,
  currency = "INR",
  receipt,
  notes = {},
}) => {
  // If in test environment or mock keys, generate deterministic order
  if (
    env.NODE_ENV === "test" ||
    env.RAZORPAY_KEY_ID.startsWith("rzp_test_stayzy")
  ) {
    const mockOrderId = `order_test_${crypto.randomBytes(8).toString("hex")}`;
    return {
      id: mockOrderId,
      entity: "order",
      amount,
      amount_paid: 0,
      amount_due: amount,
      currency,
      receipt: String(receipt || ""),
      status: "created",
      attempts: 0,
      notes,
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  return await razorpayClient.orders.create({
    amount,
    currency,
    receipt: String(receipt || ""),
    notes,
  });
};

/**
 * Process a refund on Razorpay or mock in test mode.
 */
export const processRazorpayRefund = async (
  paymentId,
  { amount, notes = {} } = {}
) => {
  if (
    env.NODE_ENV === "test" ||
    env.RAZORPAY_KEY_ID.startsWith("rzp_test_stayzy")
  ) {
    const mockRefundId = `rfnd_test_${crypto.randomBytes(8).toString("hex")}`;
    return {
      id: mockRefundId,
      entity: "refund",
      amount: amount || 0,
      currency: "INR",
      payment_id: paymentId,
      status: "processed",
      notes,
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  return await razorpayClient.payments.refund(paymentId, {
    amount,
    notes,
  });
};

/**
 * Fetch payments linked to a Razorpay Order for reconciliation.
 * In test or local fallback key mode returns null unless live Razorpay SDK is configured.
 */
export const fetchRazorpayOrderPayments = async (orderId) => {
  if (
    env.NODE_ENV === "test" ||
    env.RAZORPAY_KEY_ID.startsWith("rzp_test_stayzy")
  ) {
    return null;
  }

  return await razorpayClient.orders.fetchPayments(orderId);
};

/**
 * Verify Razorpay payment signature using timing-safe HMAC-SHA256 comparison.
 */
export const verifyRazorpaySignature = ({
  orderId,
  paymentId,
  signature,
  secret = env.RAZORPAY_KEY_SECRET,
}) => {
  if (!orderId || !paymentId || !signature) {
    return false;
  }
  const payload = `${orderId}|${paymentId}`;
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(generatedSignature, "utf8");
  const providedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

/**
 * Generate a valid signature (useful for tests and webhook verification).
 */
export const generateRazorpaySignature = ({
  orderId,
  paymentId,
  secret = env.RAZORPAY_KEY_SECRET,
}) => {
  const payload = `${orderId}|${paymentId}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

/**
 * Verify Razorpay webhook signature.
 */
export const verifyWebhookSignature = ({
  payload,
  signature,
  secret = env.RAZORPAY_WEBHOOK_SECRET,
}) => {
  if (!payload || !signature) {
    return false;
  }
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  const expectedBuffer = Buffer.from(generatedSignature, "utf8");
  const providedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

export default {
  getRazorpayClient,
  createRazorpayOrder,
  processRazorpayRefund,
  fetchRazorpayOrderPayments,
  verifyRazorpaySignature,
  generateRazorpaySignature,
  verifyWebhookSignature,
};
