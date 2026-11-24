import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, JWT_COOKIE_NAME } from "@/lib/auth";
import { BackendPayment } from "@/lib/api/types";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Attempt authoritative Express backend
    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (token && token.includes(".")) {
      try {
        const backendRes = await fetch(`${BACKEND_URL}/payments/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          const payments: BackendPayment[] = data.data?.payments || [];
          if (payments.length > 0) {
            return NextResponse.json({
              success: true,
              payments,
              schedules: [],
              refunds: [],
              source: "express_backend",
            });
          }
        }
      } catch (backendErr) {
        console.warn("[Payments API] Express backend unreachable, falling back to local database");
      }
    }

    // 2. Local fallback
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [{ userId: user.id }, { guestEmail: user.email }],
      },
      select: { id: true },
    });

    const bookingIds = bookings.map((b) => b.id);

    const [payments, schedules, refunds] = await Promise.all([
      prisma.payment.findMany({
        where: { bookingId: { in: bookingIds } },
        include: {
          booking: {
            include: {
              roomType: true,
              property: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.paymentSchedule.findMany({
        where: { bookingId: { in: bookingIds } },
        include: {
          booking: {
            include: {
              roomType: true,
              property: true,
            },
          },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.refund.findMany({
        where: { bookingId: { in: bookingIds } },
        include: {
          booking: true,
        },
        orderBy: { requestedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      payments,
      schedules,
      refunds,
      source: "local_prisma",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
