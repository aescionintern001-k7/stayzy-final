import { z } from "zod";

export const createOrderSchema = z.object({
  booking_id: z.string().uuid("Invalid booking UUID"),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay payment ID is required"),
  razorpay_signature: z.string().min(1, "Razorpay signature is required"),
});

export const failPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
  error_code: z.string().max(100).optional(),
  error_description: z.string().max(1000).optional(),
});

export const refundPaymentBodySchema = z.object({
  amount: z.number().positive("Refund amount must be positive").optional(),
  reason: z.string().max(500, "Reason must not exceed 500 characters").optional(),
});

export const paymentIdParamSchema = z.object({
  id: z.string().uuid("Invalid payment UUID"),
});

export const bookingIdParamSchema = z.object({
  bookingId: z.string().uuid("Invalid booking UUID"),
});

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["created", "captured", "failed", "refunded"]).optional(),
});

export default {
  createOrderSchema,
  verifyPaymentSchema,
  failPaymentSchema,
  refundPaymentBodySchema,
  paymentIdParamSchema,
  bookingIdParamSchema,
  listPaymentsQuerySchema,
};
