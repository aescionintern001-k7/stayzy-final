export interface ExpressBookingParams {
  backendUrl: string;
  token: string;
  idempotencyKey?: string;
  payload: Record<string, unknown>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface ExpressBookingResult {
  status: number;
  body: Record<string, unknown>;
}

const DEFAULT_EXPRESS_TIMEOUT_MS = 15000;

/**
 * Execute authoritative Express PostgreSQL booking + Razorpay order creation.
 * Never falls back to local Prisma/SQLite on backend errors, timeouts, or outages.
 */
export async function executeExpressBookingWithOrder({
  backendUrl,
  token,
  idempotencyKey,
  payload,
  timeoutMs = DEFAULT_EXPRESS_TIMEOUT_MS,
  fetchImpl = fetch,
}: ExpressBookingParams): Promise<ExpressBookingResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let bookingRes: Response;
  try {
    bookingRes = await fetchImpl(`${backendUrl}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      status: isTimeout ? 504 : 503,
      body: {
        success: false,
        code: isTimeout ? "BOOKING_TIMEOUT" : "BACKEND_UNAVAILABLE",
        uncertainOutcome: true,
        idempotencyKey: idempotencyKey || null,
        error: isTimeout
          ? "Booking request timed out. Please check recovery or retry safely."
          : "Booking service is temporarily unavailable. Please retry safely.",
      },
    };
  } finally {
    clearTimeout(timer);
  }

  const bookingJson = (await bookingRes.json().catch(() => ({}))) as Record<string, unknown>;
  if (!bookingRes.ok) {
    return {
      status: bookingRes.status,
      body: {
        success: false,
        code: (bookingJson.errorCode as string) || "BOOKING_FAILED",
        error:
          (bookingJson.message as string) ||
          (bookingJson.error as string) ||
          "Failed to create booking.",
      },
    };
  }

  const dataObj = (bookingJson.data as Record<string, unknown>) || bookingJson;
  const createdBooking = (dataObj.booking as Record<string, unknown>) || dataObj;
  const bookingId = createdBooking?.id as string | undefined;

  if (!bookingId) {
    return {
      status: 502,
      body: {
        success: false,
        code: "INVALID_BACKEND_RESPONSE",
        error: "Booking service returned an incomplete response.",
      },
    };
  }

  const orderController = new AbortController();
  const orderTimer = setTimeout(() => orderController.abort(), timeoutMs);
  let orderRes: Response;
  try {
    orderRes = await fetchImpl(`${backendUrl}/payments/create-order`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ booking_id: bookingId }),
      signal: orderController.signal,
    });
  } catch (err: unknown) {
    clearTimeout(orderTimer);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      status: isTimeout ? 504 : 503,
      body: {
        success: false,
        code: isTimeout ? "PAYMENT_ORDER_TIMEOUT" : "PAYMENT_SERVICE_UNAVAILABLE",
        bookingCreated: true,
        paymentRequired: true,
        bookingId,
        bookingReference: createdBooking.booking_reference,
        idempotencyKey: idempotencyKey || null,
        error:
          "Your booking was created, but payment order initiation was interrupted. Please retry payment.",
      },
    };
  } finally {
    clearTimeout(orderTimer);
  }

  const orderJson = (await orderRes.json().catch(() => ({}))) as Record<string, unknown>;
  if (!orderRes.ok) {
    return {
      status: orderRes.status,
      body: {
        success: false,
        code: "PAYMENT_ORDER_FAILED",
        bookingCreated: true,
        paymentRequired: true,
        bookingId,
        bookingReference: createdBooking.booking_reference,
        idempotencyKey: idempotencyKey || null,
        error:
          (orderJson.message as string) ||
          (orderJson.error as string) ||
          "Booking created, but failed to initiate payment order.",
      },
    };
  }

  const orderData = (orderJson.data as Record<string, unknown>) || orderJson;
  const orderObj = orderData.order as Record<string, unknown> | undefined;

  return {
    status: 200,
    body: {
      success: true,
      source: "express_backend",
      bookingId,
      bookingReference: createdBooking.booking_reference,
      payableNow: Number(createdBooking.payable_now ?? createdBooking.total_price ?? 0),
      currency: "INR",
      paymentDetails: {
        mode: "razorpay",
        order: orderObj,
        keyId: orderData.key_id,
        transactionRef: orderObj?.id,
      },
    },
  };
}
