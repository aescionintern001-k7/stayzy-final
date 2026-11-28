import { z } from "zod";

export const createOrderSchema = z
  .object({
    booking_id: z.string().uuid("Invalid booking UUID"),
    payment_schedule_id: z.string().uuid("Invalid payment_schedule_id UUID").optional().nullable(),
    idempotency_key: z.string().trim().min(6).max(120).optional(),
  })
  .strict();

export const verifyPaymentSchema = z
  .object({
    razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
    razorpay_payment_id: z.string().min(1, "Razorpay payment ID is required"),
    razorpay_signature: z.string().min(1, "Razorpay signature is required"),
  })
  .strict();

export const failPaymentSchema = z
  .object({
    razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
    error_code: z.string().max(100).optional(),
    error_description: z.string().max(1000).optional(),
  })
  .strict();

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
  status: z.enum(["created", "pending", "captured", "failed", "refunded"]).optional(),
});

export const reconcilePaymentSchema = z
  .object({
    booking_id: z.string().uuid("Invalid booking_id UUID").optional(),
    payment_id: z.string().uuid("Invalid payment_id UUID").optional(),
    razorpay_order_id: z.string().trim().min(1).max(120).optional(),
  })
  .strict()
  .refine((d) => Boolean(d.booking_id || d.payment_id || d.razorpay_order_id), {
    message: "Provide booking_id, payment_id, or razorpay_order_id to reconcile",
  });

export const demoSimulateSchema = z
  .object({
    booking_id: z.string().uuid("Invalid booking_id UUID").optional(),
    razorpay_order_id: z.string().trim().min(1).max(120).optional(),
    payment_schedule_id: z.string().uuid("Invalid payment_schedule_id UUID").optional().nullable(),
    outcome: z.enum(["SUCCESS", "FAILED", "PENDING"]).default("SUCCESS"),
  })
  .strict()
  .refine((d) => Boolean(d.booking_id || d.razorpay_order_id), {
    message: "booking_id or razorpay_order_id is required",
  });

export default {
  createOrderSchema,
  verifyPaymentSchema,
  failPaymentSchema,
  refundPaymentBodySchema,
  paymentIdParamSchema,
  bookingIdParamSchema,
  listPaymentsQuerySchema,
  reconcilePaymentSchema,
  demoSimulateSchema,
};
