import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, JWT_COOKIE_NAME } from "@/lib/auth";
import { backendBookingToFrontend } from "@/lib/api/adapters";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { reason = "Customer requested cancellation" } = body;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. If ID is a UUID, attempt to cancel on authoritative Express backend
    if (UUID_REGEX.test(id)) {
      const cookieStore = await cookies();
      const token =
        cookieStore.get(JWT_COOKIE_NAME)?.value ||
        cookieStore.get("token")?.value ||
        request.headers.get("Authorization")?.replace("Bearer ", "");

      if (token && token.includes(".")) {
        try {
          const backendRes = await fetch(`${BACKEND_URL}/bookings/${id}/cancel`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reason }),
          });

          if (backendRes.ok) {
            const data = await backendRes.json();
            const b = data.data?.booking || data.data;
            return NextResponse.json({
              success: true,
              booking: b ? backendBookingToFrontend(b) : null,
              message: "Booking has been cancelled successfully.",
              source: "express_backend",
            });
          }
        } catch (backendErr) {
          console.warn("[Cancel Booking] Express backend cancel failed, falling back to local");
        }
      }
    }

    // 2. Local fallback
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (user.role !== "ADMIN" && booking.userId !== user.id && booking.guestEmail !== user.email) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json({ error: "Booking is already cancelled." }, { status: 400 });
    }

    const now = new Date();
    const hoursToStart = (booking.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let eligibleRefund = 0;
    if (booking.paymentStatus === "PAID") {
      if (hoursToStart > 48) {
        eligibleRefund = booking.totalAmount;
      } else if (hoursToStart > 24) {
        eligibleRefund = Math.round(booking.basePrice * 0.5 + booking.depositAmount);
      } else {
        eligibleRefund = booking.depositAmount;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancellationReason: reason,
          cancellationRequestedAt: now,
          paymentStatus: eligibleRefund > 0 ? "PARTIALLY_REFUNDED" : booking.paymentStatus,
        },
      });

      if (eligibleRefund > 0) {
        await tx.refund.create({
          data: {
            bookingId: b.id,
            amount: eligibleRefund,
            reason: `Cancellation request: ${reason} (${hoursToStart > 48 ? "Standard full window" : "Short notice policy"})`,
            status: "REQUESTED",
          },
        });
      }

      await tx.bookingItem.deleteMany({
        where: { bookingId: b.id },
      });

      return b;
    });

    return NextResponse.json({
      success: true,
      booking: updated,
      eligibleRefund,
      message: `Booking has been cancelled. Refund of ₹${eligibleRefund.toLocaleString("en-IN")} requested.`,
      source: "local_prisma",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
