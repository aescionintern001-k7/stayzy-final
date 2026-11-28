import crypto from "node:crypto";
import pool from "../../database/pool.js";
import { env } from "../../config/env.js";
import {
  createRazorpayOrder,
  processRazorpayRefund,
  fetchRazorpayOrderPayments,
  generateRazorpaySignature,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from "../../config/razorpay.js";
import { recordAuditLog } from "../../utils/audit.js";

const PAYMENT_COLUMNS = [
  "id",
  "booking_id",
  "user_id",
  "provider",
  "payment_schedule_id",
  "is_demo",
  "idempotency_key",
  "webhook_event_id",
  "razorpay_order_id",
  "razorpay_payment_id",
  "razorpay_signature",
  "amount",
  "currency",
  "status",
  "error_code",
  "error_description",
  "refund_id",
  "refund_amount",
  "refund_status",
  "verified_at",
  "notes",
  "created_at",
  "updated_at",
];

const SELECT_PAYMENT_SQL = PAYMENT_COLUMNS.map((col) => `p.${col}`).join(", ");

const formatPaymentRow = (row) => {
  if (!row) return null;

  const payment = {
    id: row.id,
    booking_id: row.booking_id,
    user_id: row.user_id,
    provider: row.provider || "RAZORPAY",
    payment_schedule_id: row.payment_schedule_id || null,
    is_demo: Boolean(row.is_demo),
    idempotency_key: row.idempotency_key || null,
    razorpay_order_id: row.razorpay_order_id,
    razorpay_payment_id: row.razorpay_payment_id,
    amount: Number.parseFloat(row.amount),
    currency: row.currency,
    status: row.status,
    error_code: row.error_code,
    error_description: row.error_description,
    refund_id: row.refund_id,
    refund_amount: Number.parseFloat(row.refund_amount || 0),
    refund_status: row.refund_status,
    verified_at: row.verified_at || null,
    notes: row.notes || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.booking_total_price !== undefined) {
    payment.booking = {
      id: row.booking_id,
      booking_reference: row.booking_reference || null,
      total_price: Number.parseFloat(row.booking_total_price),
      currency: row.booking_currency,
      status: row.booking_status,
      payment_status: row.booking_payment_status,
      check_in_date: row.booking_check_in_date,
      check_out_date: row.booking_check_out_date,
      property_id: row.booking_property_id,
    };
  }

  return payment;
};

/**
 * Create a Razorpay order for a booking or installment schedule.
 * Supports idempotency keys, active-order reuse, and clean retries after failed payments.
 */
export const createPaymentOrder = async (
  userId,
  { booking_id, payment_schedule_id = null, idempotency_key = null }
) => {
  // 1. Verify user exists and is active
  const userRes = await pool.query(
    "SELECT id, role, account_status FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const user = userRes.rows[0];
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  if (user.account_status === "suspended") {
    const error = new Error("Your account has been suspended");
    error.status = 403;
    throw error;
  }

  // 1b. Idempotency replay check
  if (idempotency_key) {
    const existingKeyRes = await pool.query(
      "SELECT * FROM payments WHERE idempotency_key = $1 LIMIT 1",
      [idempotency_key]
    );
    const existingByKey = existingKeyRes.rows[0];
    if (existingByKey) {
      if (existingByKey.user_id !== userId && user.role !== "admin") {
        const error = new Error("Idempotency key belongs to another user");
        error.status = 403;
        throw error;
      }
      const amt = Number.parseFloat(existingByKey.amount);
      return {
        payment: formatPaymentRow(existingByKey),
        order: {
          id: existingByKey.razorpay_order_id,
          amount: amt,
          amount_subunit: Math.round(amt * 100),
          currency: existingByKey.currency,
          receipt: existingByKey.booking_id,
          key_id: env.RAZORPAY_KEY_ID,
        },
        idempotent_replay: true,
      };
    }
  }

  // 2. Fetch booking details
  const bookingRes = await pool.query(
    `
      SELECT b.id, b.guest_id, b.property_id, b.total_price, b.payable_now,
             b.currency, b.status, b.payment_status, p.title AS property_title
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE b.id = $1
      LIMIT 1
    `,
    [booking_id]
  );

  const booking = bookingRes.rows[0];
  if (!booking) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  // Check ownership: user must be the guest who created the booking (or admin)
  const isAdmin = user.role === "admin";
  if (booking.guest_id !== userId && !isAdmin) {
    const error = new Error("You are not authorized to pay for this booking");
    error.status = 403;
    throw error;
  }

  if (booking.status === "cancelled") {
    const error = new Error("Cannot make payment for a cancelled booking");
    error.status = 400;
    throw error;
  }

  const rawPayableNow = Number.parseFloat(booking.payable_now || 0);
  let targetAmount =
    rawPayableNow > 0 ? rawPayableNow : Number.parseFloat(booking.total_price);

  if (payment_schedule_id) {
    const schedRes = await pool.query(
      "SELECT * FROM payment_schedules WHERE id = $1 AND booking_id = $2 LIMIT 1",
      [payment_schedule_id, booking.id]
    );
    const schedule = schedRes.rows[0];
    if (!schedule) {
      const error = new Error("Payment installment schedule not found for this booking");
      error.status = 404;
      throw error;
    }
    if (schedule.status === "PAID") {
      const error = new Error("This installment schedule has already been paid");
      error.status = 400;
      throw error;
    }
    if (schedule.status === "CANCELLED") {
      const error = new Error("Cannot pay for a cancelled installment schedule");
      error.status = 400;
      throw error;
    }
    targetAmount = Number.parseFloat(schedule.amount);
  } else if (booking.payment_status === "paid") {
    const error = new Error("This booking has already been paid for");
    error.status = 400;
    throw error;
  }

  const currency = booking.currency === "USD" ? "USD" : "INR";

  // 2b. Reuse existing pending/created order for the exact same target if not failed
  const openOrderRes = await pool.query(
    `
      SELECT *
      FROM payments
      WHERE booking_id = $1
        AND payment_schedule_id IS NOT DISTINCT FROM $2
        AND status IN ('created', 'pending')
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [booking.id, payment_schedule_id]
  );

  if (openOrderRes.rows[0]) {
    const existingOpen = openOrderRes.rows[0];
    const existingAmt = Number.parseFloat(existingOpen.amount);
    return {
      payment: formatPaymentRow(existingOpen),
      order: {
        id: existingOpen.razorpay_order_id,
        amount: existingAmt,
        amount_subunit: Math.round(existingAmt * 100),
        currency: existingOpen.currency,
        receipt: booking.id,
        key_id: env.RAZORPAY_KEY_ID,
      },
      reused_existing_order: true,
    };
  }

  const amountSubunit = Math.round(targetAmount * 100);

  // 3. Create Razorpay order (new attempt or retry after failure)
  const rzpOrder = await createRazorpayOrder({
    amount: amountSubunit,
    currency,
    receipt: booking.id,
    notes: {
      booking_id: booking.id,
      guest_id: userId,
      payment_schedule_id: payment_schedule_id || "",
    },
  });

  // 4. Save payment transaction record atomically with idempotency protection
  const insertRes = await pool.query(
    `
      INSERT INTO payments (
        booking_id, user_id, provider, payment_schedule_id,
        idempotency_key, razorpay_order_id, amount, currency, status
      )
      VALUES ($1, $2, 'RAZORPAY', $3, $4, $5, $6, $7, 'created')
      RETURNING *
    `,
    [
      booking.id,
      userId,
      payment_schedule_id,
      idempotency_key || null,
      rzpOrder.id,
      targetAmount,
      currency,
    ]
  );

  const paymentRecord = formatPaymentRow(insertRes.rows[0]);

  return {
    payment: paymentRecord,
    order: {
      id: rzpOrder.id,
      amount: targetAmount,
      amount_subunit: amountSubunit,
      currency,
      receipt: booking.id,
      key_id: env.RAZORPAY_KEY_ID,
    },
  };
};

/**
 * Atomic helper to mark a payment captured and synchronize booking / installment state.
 */
const applyCaptureTx = async (
  client,
  payment,
  { razorpay_payment_id, razorpay_signature = null, webhook_event_id = null }
) => {
  const updatedPaymentRes = await client.query(
    `
      UPDATE payments
      SET status = 'captured',
          razorpay_payment_id = COALESCE($1, razorpay_payment_id),
          razorpay_signature = COALESCE($2, razorpay_signature),
          webhook_event_id = COALESCE($3, webhook_event_id),
          verified_at = COALESCE(verified_at, NOW()),
          error_code = NULL,
          error_description = NULL,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `,
    [razorpay_payment_id, razorpay_signature, webhook_event_id, payment.id]
  );

  const updatedPayment = updatedPaymentRes.rows[0];
  let updatedBooking;

  if (updatedPayment.payment_schedule_id) {
    await client.query(
      `
        UPDATE payment_schedules
        SET status = 'PAID', paid_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `,
      [updatedPayment.payment_schedule_id]
    );
    const bookingUpdateRes = await client.query(
      `
        UPDATE bookings
        SET balance_remaining = GREATEST(0, COALESCE(balance_remaining, 0) - $1),
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
      [updatedPayment.amount, updatedPayment.booking_id]
    );
    updatedBooking = bookingUpdateRes.rows[0];
  } else {
    const bookingUpdateRes = await client.query(
      `
        UPDATE bookings
        SET payment_status = 'paid',
            status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [updatedPayment.booking_id]
    );
    updatedBooking = bookingUpdateRes.rows[0];
  }

  return {
    payment: updatedPayment,
    booking: updatedBooking,
  };
};

/**
 * Verify payment signature and capture payment transaction idempotently with FOR UPDATE lock.
 */
export const verifyPayment = async (
  userId,
  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const paymentRes = await client.query(
      `
        SELECT p.*, b.status AS booking_status, b.payment_status AS booking_payment_status,
               b.guest_id AS booking_guest_id
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        WHERE p.razorpay_order_id = $1
        FOR UPDATE OF p
      `,
      [razorpay_order_id]
    );

    const payment = paymentRes.rows[0];
    if (!payment) {
      const error = new Error("Payment record for this order ID was not found");
      error.status = 404;
      throw error;
    }

    if (payment.user_id !== userId) {
      const error = new Error("You are not authorized to verify this payment");
      error.status = 403;
      throw error;
    }

    if (payment.status === "captured") {
      await client.query("COMMIT");
      return {
        payment: formatPaymentRow(payment),
        message: "Payment has already been verified and captured",
        idempotent: true,
      };
    }

    const isValidSignature = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      secret: env.RAZORPAY_KEY_SECRET,
    });

    if (!isValidSignature) {
      await client.query(
        `
          UPDATE payments
          SET status = 'failed',
              error_code = 'SIGNATURE_VERIFICATION_FAILED',
              error_description = 'Payment signature does not match expected HMAC signature',
              updated_at = NOW()
          WHERE id = $1
        `,
        [payment.id]
      );

      if (!payment.payment_schedule_id && payment.booking_payment_status !== "paid") {
        await client.query(
          "UPDATE bookings SET payment_status = 'failed', updated_at = NOW() WHERE id = $1",
          [payment.booking_id]
        );
      }

      await client.query("COMMIT");

      const error = new Error("Payment signature verification failed");
      error.status = 400;
      throw error;
    }

    const captured = await applyCaptureTx(client, payment, {
      razorpay_payment_id,
      razorpay_signature,
    });

    await client.query("COMMIT");

    return {
      payment: formatPaymentRow(captured.payment),
      booking: captured.booking,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Handle payment failure safely.
 */
export const recordPaymentFailure = async (
  userId,
  { razorpay_order_id, error_code, error_description }
) => {
  const paymentRes = await pool.query(
    "SELECT * FROM payments WHERE razorpay_order_id = $1 LIMIT 1",
    [razorpay_order_id]
  );

  const payment = paymentRes.rows[0];
  if (!payment) {
    const error = new Error("Payment record not found for this order ID");
    error.status = 404;
    throw error;
  }

  if (payment.user_id !== userId) {
    const error = new Error("You are not authorized to update this payment");
    error.status = 403;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updatedPaymentRes = await client.query(
      `
        UPDATE payments
        SET status = 'failed',
            error_code = $1,
            error_description = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [
        error_code || "PAYMENT_FAILED",
        error_description || "Payment was declined or cancelled by the user",
        payment.id,
      ]
    );

    await client.query(
      "UPDATE bookings SET payment_status = 'failed', updated_at = NOW() WHERE id = $1",
      [payment.booking_id]
    );

    await client.query("COMMIT");

    return formatPaymentRow(updatedPaymentRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Process a refund workflow hook for a captured payment.
 */
export const processRefund = async (user, paymentId, { amount, reason } = {}) => {
  // 1. Fetch payment with booking and property ownership
  const paymentRes = await pool.query(
    `
      SELECT p.*, b.status AS booking_status, b.guest_id, b.property_id,
             prop.host_id
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON b.property_id = prop.id
      WHERE p.id = $1
      LIMIT 1
    `,
    [paymentId]
  );

  const payment = paymentRes.rows[0];
  if (!payment) {
    const error = new Error("Payment transaction not found");
    error.status = 404;
    throw error;
  }

  // Authorization: Admin, Property Host, or Guest (if booking cancelled)
  const isAdmin = user.role === "admin";
  const isHost = payment.host_id === user.id;
  const isGuest = payment.guest_id === user.id;

  if (!isAdmin && !isHost && (!isGuest || payment.booking_status !== "cancelled")) {
    const error = new Error(
      "You are not authorized to request a refund for this payment"
    );
    error.status = 403;
    throw error;
  }

  if (payment.status === "refunded") {
    const error = new Error("This payment has already been fully refunded");
    error.status = 400;
    throw error;
  }

  if (payment.status !== "captured") {
    const error = new Error(
      `Cannot refund a payment with status '${payment.status}'. Only captured payments can be refunded.`
    );
    error.status = 400;
    throw error;
  }

  const originalAmount = Number.parseFloat(payment.amount);
  const alreadyRefunded = Number.parseFloat(payment.refund_amount || 0);
  const maxRefundable = Number((originalAmount - alreadyRefunded).toFixed(2));

  if (maxRefundable <= 0) {
    const error = new Error("This payment has already been fully refunded");
    error.status = 400;
    throw error;
  }

  const refundAmount = amount !== undefined ? Number(amount) : maxRefundable;

  if (refundAmount <= 0) {
    const error = new Error("Refund amount must be greater than zero");
    error.status = 400;
    throw error;
  }

  if (refundAmount > maxRefundable) {
    const error = new Error(
      `Requested refund amount (${refundAmount}) exceeds maximum refundable balance (${maxRefundable})`
    );
    error.status = 400;
    throw error;
  }

  // 2. Call Razorpay refund API
  const amountSubunit = Math.round(refundAmount * 100);
  const rzpRefund = await processRazorpayRefund(payment.razorpay_payment_id, {
    amount: amountSubunit,
    notes: {
      reason: reason || "User requested refund",
      payment_id: payment.id,
      booking_id: payment.booking_id,
    },
  });

  // 3. Atomically update payment and booking
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const newTotalRefund = Number((alreadyRefunded + refundAmount).toFixed(2));
    const isFullyRefunded = newTotalRefund >= originalAmount;

    const updatedPaymentRes = await client.query(
      `
        UPDATE payments
        SET refund_id = $1,
            refund_amount = $2,
            refund_status = 'processed',
            status = $3,
            updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `,
      [
        rzpRefund.id,
        newTotalRefund,
        isFullyRefunded ? "refunded" : "captured",
        payment.id,
      ]
    );

    await client.query(
      `
        UPDATE bookings
        SET payment_status = $1,
            updated_at = NOW()
        WHERE id = $2
      `,
      [isFullyRefunded ? "refunded" : "paid", payment.booking_id]
    );

    await client.query("COMMIT");

    return {
      payment: formatPaymentRow(updatedPaymentRes.rows[0]),
      refund: {
        id: rzpRefund.id,
        amount: refundAmount,
        currency: payment.currency,
        status: "processed",
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get payment details by ID with ownership authorization.
 */
export const getPaymentById = async (user, paymentId) => {
  const paymentRes = await pool.query(
    `
      SELECT ${SELECT_PAYMENT_SQL},
             b.total_price AS booking_total_price,
             b.currency AS booking_currency,
             b.status AS booking_status,
             b.payment_status AS booking_payment_status,
             b.check_in_date AS booking_check_in_date,
             b.check_out_date AS booking_check_out_date,
             b.property_id AS booking_property_id,
             prop.host_id AS property_host_id
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      JOIN properties prop ON b.property_id = prop.id
      WHERE p.id = $1
      LIMIT 1
    `,
    [paymentId]
  );

  const payment = paymentRes.rows[0];
  if (!payment) {
    const error = new Error("Payment transaction not found");
    error.status = 404;
    throw error;
  }

  // Authorization: Payer, Property Host, or Admin
  const isPayer = payment.user_id === user.id;
  const isHost = payment.property_host_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isPayer && !isHost && !isAdmin) {
    const error = new Error("You are not authorized to view this payment");
    error.status = 403;
    throw error;
  }

  return formatPaymentRow(payment);
};

/**
 * Get payment records for a specific booking.
 */
export const getPaymentsByBookingId = async (user, bookingId) => {
  const bookingRes = await pool.query(
    `
      SELECT b.id, b.guest_id, prop.host_id
      FROM bookings b
      JOIN properties prop ON b.property_id = prop.id
      WHERE b.id = $1
      LIMIT 1
    `,
    [bookingId]
  );

  const booking = bookingRes.rows[0];
  if (!booking) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  const isGuest = booking.guest_id === user.id;
  const isHost = booking.host_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isGuest && !isHost && !isAdmin) {
    const error = new Error(
      "You are not authorized to view payments for this booking"
    );
    error.status = 403;
    throw error;
  }

  const paymentsRes = await pool.query(
    `
      SELECT ${SELECT_PAYMENT_SQL}
      FROM payments p
      WHERE p.booking_id = $1
      ORDER BY p.created_at DESC
    `,
    [bookingId]
  );

  return paymentsRes.rows.map(formatPaymentRow);
};

/**
 * Get paginated payments, installment schedules, and refunds for the authenticated user.
 */
export const getMyPayments = async (userId, { page = 1, limit = 10, status }) => {
  const offset = (page - 1) * limit;
  const params = [userId];
  const conditions = ["p.user_id = $1"];

  if (status) {
    params.push(status);
    conditions.push(`p.status = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM payments p ${whereClause}`,
    params
  );
  const total = countRes.rows[0].total;

  params.push(limit, offset);
  const listRes = await pool.query(
    `
      SELECT ${SELECT_PAYMENT_SQL},
             b.booking_reference,
             b.total_price AS booking_total_price,
             b.currency AS booking_currency,
             b.status AS booking_status,
             b.payment_status AS booking_payment_status,
             b.check_in_date AS booking_check_in_date,
             b.check_out_date AS booking_check_out_date,
             b.property_id AS booking_property_id
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  const [schedulesRes, refundsRes] = await Promise.all([
    pool.query(
      `
        SELECT ps.*, b.booking_reference, p.title AS property_title
        FROM payment_schedules ps
        JOIN bookings b ON ps.booking_id = b.id
        JOIN properties p ON b.property_id = p.id
        WHERE b.guest_id = $1
        ORDER BY ps.due_date ASC
      `,
      [userId]
    ),
    pool.query(
      `
        SELECT rf.*, b.booking_reference
        FROM refunds rf
        JOIN bookings b ON rf.booking_id = b.id
        WHERE b.guest_id = $1
        ORDER BY rf.requested_at DESC
      `,
      [userId]
    ),
  ]);

  return {
    payments: listRes.rows.map(formatPaymentRow),
    schedules: schedulesRes.rows.map((s) => ({
      ...s,
      amount: Number.parseFloat(s.amount),
    })),
    refunds: refundsRes.rows.map((r) => ({
      ...r,
      amount: Number.parseFloat(r.amount),
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Reconcile pending/created payments against Razorpay order records and sync booking status.
 */
export const reconcilePayment = async (
  user,
  { booking_id, payment_id, razorpay_order_id }
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let paymentQuery;
    let queryVal;
    if (payment_id) {
      paymentQuery = `
        SELECT p.*, b.guest_id AS booking_guest_id, b.status AS booking_status, b.payment_status AS booking_payment_status
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        WHERE p.id = $1
        FOR UPDATE OF p
      `;
      queryVal = payment_id;
    } else if (razorpay_order_id) {
      paymentQuery = `
        SELECT p.*, b.guest_id AS booking_guest_id, b.status AS booking_status, b.payment_status AS booking_payment_status
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        WHERE p.razorpay_order_id = $1
        FOR UPDATE OF p
      `;
      queryVal = razorpay_order_id;
    } else {
      paymentQuery = `
        SELECT p.*, b.guest_id AS booking_guest_id, b.status AS booking_status, b.payment_status AS booking_payment_status
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        WHERE p.booking_id = $1
        ORDER BY p.created_at DESC
        LIMIT 1
        FOR UPDATE OF p
      `;
      queryVal = booking_id;
    }

    const paymentRes = await client.query(paymentQuery, [queryVal]);
    const payment = paymentRes.rows[0];
    if (!payment) {
      const error = new Error("No payment record found to reconcile");
      error.status = 404;
      throw error;
    }

    if (
      user.role !== "admin" &&
      payment.user_id !== user.id &&
      payment.booking_guest_id !== user.id
    ) {
      const error = new Error("You are not authorized to reconcile this payment");
      error.status = 403;
      throw error;
    }

    if (payment.status === "captured") {
      // Ensure booking agrees with captured payment (self-heal if needed)
      if (!payment.payment_schedule_id && payment.booking_payment_status !== "paid") {
        const syncedBookingRes = await client.query(
          `
            UPDATE bookings
            SET payment_status = 'paid',
                status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `,
          [payment.booking_id]
        );
        await client.query("COMMIT");
        return {
          payment: formatPaymentRow(payment),
          booking: syncedBookingRes.rows[0],
          reconciled: true,
          action: "synced_booking_to_captured",
        };
      }
      await client.query("COMMIT");
      return {
        payment: formatPaymentRow(payment),
        reconciled: false,
        action: "already_captured",
      };
    }

    // Consult Razorpay Orders API when real/test Razorpay credentials are active
    const remotePayments = await fetchRazorpayOrderPayments(payment.razorpay_order_id);
    const items = Array.isArray(remotePayments?.items) ? remotePayments.items : [];
    const capturedEntity = items.find((i) => i.status === "captured");
    const failedEntity = items.find((i) => i.status === "failed");

    if (capturedEntity) {
      const captured = await applyCaptureTx(client, payment, {
        razorpay_payment_id: capturedEntity.id,
      });
      await recordAuditLog(
        {
          actorId: user.id,
          actorEmail: user.email,
          action: "RECONCILE_PAYMENT_CAPTURED",
          entityType: "payment",
          entityId: payment.id,
          details: { bookingId: payment.booking_id, rzpPaymentId: capturedEntity.id },
        },
        client
      );
      await client.query("COMMIT");
      return {
        payment: formatPaymentRow(captured.payment),
        booking: captured.booking,
        reconciled: true,
        action: "captured_from_gateway",
      };
    }

    if (failedEntity && payment.status !== "failed") {
      const failRes = await client.query(
        `
          UPDATE payments
          SET status = 'failed',
              error_code = $1,
              error_description = $2,
              updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `,
        [
          failedEntity.error_code || "GATEWAY_FAILED",
          failedEntity.error_description || "Payment failed at gateway",
          payment.id,
        ]
      );
      if (!payment.payment_schedule_id && payment.booking_payment_status !== "paid") {
        await client.query(
          "UPDATE bookings SET payment_status = 'failed', updated_at = NOW() WHERE id = $1",
          [payment.booking_id]
        );
      }
      await client.query("COMMIT");
      return {
        payment: formatPaymentRow(failRes.rows[0]),
        reconciled: true,
        action: "marked_failed_from_gateway",
      };
    }

    await client.query("COMMIT");
    return {
      payment: formatPaymentRow(payment),
      reconciled: false,
      action: `remains_${payment.status}`,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Development/Test ONLY payment simulator (strictly forbidden in production).
 */
export const demoSimulatePayment = async (
  user,
  { booking_id, razorpay_order_id, payment_schedule_id = null, outcome = "SUCCESS" }
) => {
  if (env.NODE_ENV === "production") {
    const error = new Error(
      "Secure Payment Portal simulator is strictly disabled in production"
    );
    error.status = 403;
    throw error;
  }

  let targetOrderId = razorpay_order_id;
  if (!targetOrderId && booking_id) {
    const created = await createPaymentOrder(user.id, {
      booking_id,
      payment_schedule_id,
    });
    targetOrderId = created.order.id;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const payRes = await client.query(
      "SELECT * FROM payments WHERE razorpay_order_id = $1 FOR UPDATE",
      [targetOrderId]
    );
    const payment = payRes.rows[0];
    if (!payment) {
      const error = new Error("Payment order not found");
      error.status = 404;
      throw error;
    }

    if (payment.user_id !== user.id && user.role !== "admin") {
      const error = new Error("You are not authorized to simulate this payment");
      error.status = 403;
      throw error;
    }

    if (payment.status === "captured") {
      await client.query("COMMIT");
      return {
        payment: formatPaymentRow(payment),
        idempotent: true,
        message: "Payment already captured",
      };
    }

    if (outcome === "PENDING") {
      const pendRes = await client.query(
        `
          UPDATE payments
          SET status = 'pending',
              provider = 'DEMO_SIMULATOR',
              is_demo = TRUE,
              notes = 'Simulated pending bank confirmation (dev/test only)',
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [payment.id]
      );
      if (!payment.payment_schedule_id) {
        await client.query(
          "UPDATE bookings SET payment_status = 'pending', updated_at = NOW() WHERE id = $1",
          [payment.booking_id]
        );
      }
      await client.query("COMMIT");
      return {
        payment: formatPaymentRow(pendRes.rows[0]),
        outcome: "PENDING",
      };
    }

    if (outcome === "FAILED") {
      const failRes = await client.query(
        `
          UPDATE payments
          SET status = 'failed',
              provider = 'DEMO_SIMULATOR',
              is_demo = TRUE,
              error_code = 'DEMO_DECLINED',
              error_description = 'Simulated payment decline in development simulator',
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [payment.id]
      );
      if (!payment.payment_schedule_id) {
        await client.query(
          "UPDATE bookings SET payment_status = 'failed', updated_at = NOW() WHERE id = $1",
          [payment.booking_id]
        );
      }
      await client.query("COMMIT");
      return {
        payment: formatPaymentRow(failRes.rows[0]),
        outcome: "FAILED",
      };
    }

    // SUCCESS simulation via test HMAC signature
    const simPaymentId = `pay_demo_${crypto.randomBytes(6).toString("hex")}`;
    const simSignature = generateRazorpaySignature({
      orderId: payment.razorpay_order_id,
      paymentId: simPaymentId,
      secret: env.RAZORPAY_KEY_SECRET,
    });

    await client.query(
      "UPDATE payments SET provider = 'DEMO_SIMULATOR', is_demo = TRUE, notes = 'Dev simulator test capture' WHERE id = $1",
      [payment.id]
    );

    const captured = await applyCaptureTx(client, payment, {
      razorpay_payment_id: simPaymentId,
      razorpay_signature: simSignature,
    });

    await client.query("COMMIT");
    return {
      payment: formatPaymentRow(captured.payment),
      booking: captured.booking,
      outcome: "SUCCESS",
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Handle incoming Razorpay Webhook safely with event deduplication & atomic booking sync.
 */
export const handleWebhook = async (rawPayload, signature) => {
  const isValid = verifyWebhookSignature({
    payload: rawPayload,
    signature,
    secret: env.RAZORPAY_WEBHOOK_SECRET,
  });

  if (!isValid) {
    const error = new Error("Invalid webhook signature");
    error.status = 400;
    throw error;
  }

  const event =
    typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
  const eventType = event.event;
  const paymentEntity = event.payload?.payment?.entity;

  // Deduplicate only when Razorpay provides a unique event.id (or deterministic header/event id)
  const explicitEventId = event.id || null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (explicitEventId) {
      const dedupeRes = await client.query(
        `
          INSERT INTO webhook_events (provider, event_id, event_type, payload)
          VALUES ('RAZORPAY', $1, $2, $3::jsonb)
          ON CONFLICT (event_id) DO NOTHING
          RETURNING id
        `,
        [explicitEventId, eventType, JSON.stringify(event)]
      );
      if (dedupeRes.rows.length === 0) {
        await client.query("COMMIT");
        return {
          received: true,
          event: eventType,
          event_id: explicitEventId,
          duplicate: true,
        };
      }
    }

    if (eventType === "payment.captured" && paymentEntity?.order_id) {
      const payRes = await client.query(
        "SELECT * FROM payments WHERE razorpay_order_id = $1 FOR UPDATE",
        [paymentEntity.order_id]
      );
      const payment = payRes.rows[0];
      if (payment && payment.status !== "captured") {
        await applyCaptureTx(client, payment, {
          razorpay_payment_id: paymentEntity.id,
          webhook_event_id: explicitEventId,
        });
      }
    } else if (eventType === "payment.failed" && paymentEntity?.order_id) {
      const payRes = await client.query(
        "SELECT * FROM payments WHERE razorpay_order_id = $1 FOR UPDATE",
        [paymentEntity.order_id]
      );
      const payment = payRes.rows[0];
      if (payment && payment.status !== "captured") {
        await client.query(
          `
            UPDATE payments
            SET status = 'failed',
                error_code = $1,
                error_description = $2,
                webhook_event_id = COALESCE($3, webhook_event_id),
                updated_at = NOW()
            WHERE id = $4
          `,
          [
            paymentEntity.error_code || "FAILED",
            paymentEntity.error_description || "Payment failed",
            explicitEventId,
            payment.id,
          ]
        );
        if (!payment.payment_schedule_id) {
          await client.query(
            "UPDATE bookings SET payment_status = 'failed', updated_at = NOW() WHERE id = $1 AND payment_status <> 'paid'",
            [payment.booking_id]
          );
        }
      }
    }

    await client.query("COMMIT");
    return {
      received: true,
      event: eventType,
      ...(explicitEventId ? { event_id: explicitEventId } : {}),
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

export default {
  createPaymentOrder,
  verifyPayment,
  recordPaymentFailure,
  processRefund,
  reconcilePayment,
  demoSimulatePayment,
  getPaymentById,
  getPaymentsByBookingId,
  getMyPayments,
  handleWebhook,
};
