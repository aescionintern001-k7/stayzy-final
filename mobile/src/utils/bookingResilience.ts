export type BookingRequestState =
  | "IDLE"
  | "VALIDATING"
  | "SUBMITTING"
  | "RECOVERING"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "FAILED_RETRYABLE"
  | "FAILED_FINAL";

export type FailureKind = "UNCERTAIN" | "DEFINITIVE" | "AUTH_REQUIRED";

export interface ClassifiedFailure {
  kind: FailureKind;
  message: string;
  status?: number;
}

/**
 * Classify a booking/payment error into UNCERTAIN (timeout, 5xx, network drop),
 * AUTH_REQUIRED (401), or DEFINITIVE (4xx business/validation rejection).
 */
export function classifyBookingFailure(err: any): ClassifiedFailure {
  const status = typeof err?.status === "number" ? err.status : undefined;
  const rawMsg = String(err?.message || "").trim();

  if (status === 401) {
    return {
      kind: "AUTH_REQUIRED",
      status,
      message: "Your session expired. Please sign in to check or complete your booking.",
    };
  }

  if (
    status === 408 ||
    status === 499 ||
    err?.details?.isTimeout ||
    err?.details?.isCancelled ||
    (status !== undefined && status >= 500)
  ) {
    return {
      kind: "UNCERTAIN",
      status,
      message:
        "We're checking whether your booking was completed. Please don't submit another booking while we verify your reservation.",
    };
  }

  // Definitive client/domain rejections from backend (validation, sold out, expired hold, forbidden)
  if (status !== undefined && status >= 400 && status < 500) {
    return {
      kind: "DEFINITIVE",
      status,
      message: rawMsg || "This booking could not be completed.",
    };
  }

  // No HTTP status => offline, DNS, TCP reset, empty/malformed network failure
  return {
    kind: "UNCERTAIN",
    message:
      rawMsg && /network|fetch|timeout|connect|offline/i.test(rawMsg)
        ? "Connection interrupted. Please check your internet and verify your booking status before retrying."
        : "We couldn't confirm the booking status yet. Your request may still have been received.",
  };
}

export interface ResilientBookingDeps {
  createBooking: (payload: any) => Promise<{ booking: any }>;
  recoverByIdempotencyKey: (key: string) => Promise<{ booking: any }>;
  savePending: (record: {
    userId: string;
    idempotencyKey: string;
    roomTypeId: string;
    startDate: string;
    holdToken?: string | null;
    createdAt: number;
  }) => Promise<void>;
  clearPending: () => Promise<void>;
}

export interface ResilientBookingResult {
  state: BookingRequestState;
  booking?: any;
  message?: string;
  skipped?: boolean;
  requiresAuth?: boolean;
  clearRecoveryKey?: boolean;
}

/**
 * Execute a single booking creation or exact idempotency-key recovery safely,
 * ensuring synchronous lock protection and never creating a duplicate booking on timeout/5xx/network loss.
 */
export async function executeResilientBookingAttempt(params: {
  submitLockRef: { current: boolean };
  idempotencyKey: string;
  userId: string;
  roomTypeId: string;
  startDate: string;
  holdToken?: string | null;
  activeBooking: any | null;
  bookingPayload: any;
  deps: ResilientBookingDeps;
  onStateChange?: (state: BookingRequestState, msg?: string | null) => void;
}): Promise<ResilientBookingResult> {
  const {
    submitLockRef,
    idempotencyKey,
    userId,
    roomTypeId,
    startDate,
    holdToken,
    activeBooking,
    bookingPayload,
    deps,
    onStateChange,
  } = params;

  if (submitLockRef.current) {
    return { state: "SUBMITTING", skipped: true };
  }

  if (activeBooking) {
    const isPaidConfirmed =
      ["confirmed", "checked_in", "completed"].includes(
        String(activeBooking.status || "").toLowerCase()
      ) && String(activeBooking.payment_status || "").toLowerCase() === "paid";
    return {
      state: isPaidConfirmed ? "CONFIRMED" : "PAYMENT_PENDING",
      booking: activeBooking,
    };
  }

  submitLockRef.current = true;
  try {
    onStateChange?.("SUBMITTING", null);
    await deps.savePending({
      userId,
      idempotencyKey,
      roomTypeId,
      startDate,
      holdToken: holdToken || null,
      createdAt: Date.now(),
    });

    try {
      const res = await deps.createBooking({
        ...bookingPayload,
        idempotency_key: idempotencyKey,
      });
      const booking = res.booking;
      const isPaidConfirmed =
        ["confirmed", "checked_in", "completed"].includes(
          String(booking?.status || "").toLowerCase()
        ) && String(booking?.payment_status || "").toLowerCase() === "paid";

      if (isPaidConfirmed) {
        await deps.clearPending();
      }
      onStateChange?.(isPaidConfirmed ? "CONFIRMED" : "PAYMENT_PENDING", null);
      return {
        state: isPaidConfirmed ? "CONFIRMED" : "PAYMENT_PENDING",
        booking,
      };
    } catch (err: any) {
      const classified = classifyBookingFailure(err);

      if (classified.kind === "AUTH_REQUIRED") {
        onStateChange?.("FAILED_RETRYABLE", classified.message);
        return {
          state: "FAILED_RETRYABLE",
          message: classified.message,
          requiresAuth: true,
        };
      }

      if (classified.kind === "DEFINITIVE") {
        await deps.clearPending();
        onStateChange?.("FAILED_FINAL", classified.message);
        return {
          state: "FAILED_FINAL",
          message: classified.message,
          clearRecoveryKey: true,
        };
      }

      // UNCERTAIN outcome: attempt exact idempotency-key recovery before surfacing error
      onStateChange?.("RECOVERING", classified.message);
      try {
        const rec = await deps.recoverByIdempotencyKey(idempotencyKey);
        if (rec?.booking) {
          const isPaidConfirmed =
            ["confirmed", "checked_in", "completed"].includes(
              String(rec.booking.status || "").toLowerCase()
            ) &&
            String(rec.booking.payment_status || "").toLowerCase() === "paid";
          if (isPaidConfirmed) {
            await deps.clearPending();
          }
          onStateChange?.(
            isPaidConfirmed ? "CONFIRMED" : "PAYMENT_PENDING",
            null
          );
          return {
            state: isPaidConfirmed ? "CONFIRMED" : "PAYMENT_PENDING",
            booking: rec.booking,
          };
        }
      } catch (recErr: any) {
        if (recErr?.status === 404) {
          // Server confirmed no booking exists for this key yet -> safe to retry with SAME key
          const retryMsg =
            "The request did not complete. Tap retry to safely try again with your existing reservation lock.";
          onStateChange?.("FAILED_RETRYABLE", retryMsg);
          return {
            state: "FAILED_RETRYABLE",
            message: retryMsg,
          };
        }
        if (recErr?.status === 401) {
          const authMsg =
            "Please sign in again to verify whether your booking was completed.";
          onStateChange?.("FAILED_RETRYABLE", authMsg);
          return {
            state: "FAILED_RETRYABLE",
            message: authMsg,
            requiresAuth: true,
          };
        }
      }

      const unresolvedMsg =
        "We couldn't confirm the booking status yet. Your request may still have been received. Check booking status or My Stays before trying again.";
      onStateChange?.("RECOVERING", unresolvedMsg);
      return {
        state: "RECOVERING",
        message: unresolvedMsg,
      };
    }
  } finally {
    submitLockRef.current = false;
  }
}

/**
 * Recover an existing pending booking by exact idempotency key (used on app reopen / manual Check Status).
 */
export async function recoverPendingBookingByKey(params: {
  idempotencyKey: string;
  deps: Pick<ResilientBookingDeps, "recoverByIdempotencyKey" | "clearPending">;
}): Promise<ResilientBookingResult> {
  const { idempotencyKey, deps } = params;
  try {
    const res = await deps.recoverByIdempotencyKey(idempotencyKey);
    const booking = res?.booking;
    if (!booking) {
      return { state: "RECOVERING", message: "Checking reservation status..." };
    }
    const normStatus = String(booking.status || "").toLowerCase();
    const normPay = String(booking.payment_status || "").toLowerCase();
    if (normStatus === "cancelled") {
      await deps.clearPending();
      return { state: "FAILED_FINAL", booking, clearRecoveryKey: true };
    }
    if (
      ["confirmed", "checked_in", "completed"].includes(normStatus) &&
      normPay === "paid"
    ) {
      await deps.clearPending();
      return { state: "CONFIRMED", booking, clearRecoveryKey: true };
    }
    return { state: "PAYMENT_PENDING", booking };
  } catch (err: any) {
    if (err?.status === 404) {
      await deps.clearPending();
      return { state: "IDLE", clearRecoveryKey: true };
    }
    if (err?.status === 401) {
      return {
        state: "FAILED_RETRYABLE",
        requiresAuth: true,
        message: "Please sign in to verify your pending reservation.",
      };
    }
    return {
      state: "RECOVERING",
      message:
        "We couldn't confirm the booking status yet. Your request may still have been received. Check My Stays before trying again.",
    };
  }
}
