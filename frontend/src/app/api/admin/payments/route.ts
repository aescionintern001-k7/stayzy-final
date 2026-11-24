import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin, JWT_COOKIE_NAME } from "@/lib/auth";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // 1. Attempt authoritative Express backend
    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (token && token.includes(".")) {
      try {
        const backendRes = await fetch(`${BACKEND_URL}/admin/payments`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          const payments = data.data?.payments || [];
          if (payments.length > 0) {
            return NextResponse.json({
              success: true,
              payments,
              schedules: [],
              refunds: [],
              totalCollected: payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
              source: "express_backend",
            });
          }
        }
      } catch (backendErr) {
        console.warn("[Admin Payments API] Express backend unreachable, using local fallback");
      }
    }

    // 2. Local fallback
    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const [payments, schedules, refunds] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              property: true,
              roomType: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.paymentSchedule.findMany({
        include: {
          booking: {
            include: {
              property: true,
              roomType: true,
            },
          },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.refund.findMany({
        include: {
          booking: true,
        },
        orderBy: { requestedAt: "desc" },
      }),
    ]);

    const totalCollected = payments
      .filter((p) => p.status === "SUCCESS")
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      success: true,
      payments,
      schedules,
      refunds,
      totalCollected,
      source: "local_prisma",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
