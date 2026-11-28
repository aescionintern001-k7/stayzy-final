import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { bookingMutationLimiter, demoSimulatorRateLimiter } from "../../config/security.js";
import {
  createOrder,
  verifyPayment,
  recordFailure,
  processRefund,
  reconcilePayment,
  demoSimulate,
  getPaymentById,
  getPaymentsByBooking,
  getMyPayments,
  handleWebhook,
} from "./payments.controller.js";
import {
  createOrderSchema,
  verifyPaymentSchema,
  failPaymentSchema,
  refundPaymentBodySchema,
  reconcilePaymentSchema,
  demoSimulateSchema,
  paymentIdParamSchema,
  bookingIdParamSchema,
  listPaymentsQuerySchema,
} from "./payments.validator.js";

const router = Router();

// 1. Webhook endpoint (unauthenticated, signature checked inside service)
router.post("/webhook", handleWebhook);

// All subsequent routes require JWT authentication
router.use(authenticate);

// 2. Create Razorpay order for an eligible booking
router.post(
  "/create-order",
  bookingMutationLimiter,
  validateRequest({ body: createOrderSchema }),
  createOrder
);

// 3. Verify server-side HMAC SHA-256 signature and capture payment
router.post(
  "/verify",
  bookingMutationLimiter,
  validateRequest({ body: verifyPaymentSchema }),
  verifyPayment
);

// 4. Record payment failure safely
router.post(
  "/fail",
  validateRequest({ body: failPaymentSchema }),
  recordFailure
);

// 4b. Reconcile pending or created orders with Razorpay
router.post(
  "/reconcile",
  bookingMutationLimiter,
  validateRequest({ body: reconcilePaymentSchema }),
  reconcilePayment
);

// 4c. Staging-only DEMO-property payment simulator (returns 403 Forbidden in production or for real properties)
router.post(
  "/demo-simulate",
  demoSimulatorRateLimiter,
  validateRequest({ body: demoSimulateSchema }),
  demoSimulate
);

// 5. Paginated payment transactions for authenticated guest
router.get(
  "/my",
  validateRequest({ query: listPaymentsQuerySchema }),
  getMyPayments
);

// 6. View payments for a specific booking
router.get(
  "/booking/:bookingId",
  validateRequest({ params: bookingIdParamSchema }),
  getPaymentsByBooking
);

// 7. View single payment transaction details
router.get(
  "/:id",
  validateRequest({ params: paymentIdParamSchema }),
  getPaymentById
);

// 8. Process full or partial refund
router.post(
  "/:id/refund",
  validateRequest({
    params: paymentIdParamSchema,
    body: refundPaymentBodySchema,
  }),
  processRefund
);

export default router;
