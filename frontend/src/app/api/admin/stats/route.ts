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

    // 1. Attempt authoritative Express backend admin dashboard
    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (token && token.includes(".")) {
      try {
        const backendRes = await fetch(`${BACKEND_URL}/admin/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (backendRes.ok) {
          const resData = await backendRes.json();
          const data = resData.data || {};
          const users = data.users || {};
          const properties = data.properties || {};
          const bookings = data.bookings || {};
          const revenue = data.revenue || {};

          // Calculate gross revenue from currency array if present
          let totalRevenue = 0;
          if (Array.isArray(revenue)) {
            totalRevenue = revenue.reduce((sum: number, r: any) => sum + Number(r.gross_revenue || 0), 0);
          } else if (typeof revenue === "object" && revenue !== null) {
            totalRevenue = Number(revenue.gross_revenue || 0);
          }

          return NextResponse.json({
            success: true,
            stats: {
              totalRevenue,
              totalBookingsCount: bookings.total_bookings || 0,
              checkedInCount: bookings.completed_bookings || 0,
              confirmedCount: bookings.confirmed_bookings || 0,
              totalUnitsCount: properties.total_properties || 0,
              activeHoldsCount: bookings.pending_bookings || 0,
              pendingVisitsCount: 0,
            },
            backendDashboard: data,
            recentBookings: [],
            recentVisits: [],
            properties: [],
            source: "express_backend",
          });
        }
      } catch (backendErr) {
        console.warn("[Admin Stats API] Express backend unreachable, using local fallback");
      }
    }

    // 2. Local fallback
    const [
      totalBookingsCount,
      confirmedBookings,
      totalUnitsCount,
      visitRequests,
      activeHoldsCount,
      recentBookings,
      properties,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.findMany({
        where: { paymentStatus: "PAID" },
        select: { totalAmount: true, status: true },
      }),
      prisma.inventoryUnit.count(),
      prisma.visitRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { property: true },
      }),
      prisma.inventoryHold.count({
        where: { expiresAt: { gt: new Date() } },
      }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          property: true,
          roomType: true,
          inventoryUnit: true,
        },
      }),
      prisma.property.findMany({
        include: {
          roomTypes: {
            include: {
              rooms: {
                include: {
                  inventoryUnits: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalRevenue = confirmedBookings.reduce((acc, b) => acc + b.totalAmount, 0);
    const checkedInCount = confirmedBookings.filter((b) => b.status === "CHECKED_IN").length;
    const confirmedCount = confirmedBookings.filter((b) => b.status === "CONFIRMED").length;
    const pendingVisitsCount = visitRequests.filter((v) => v.status === "SCHEDULED").length;

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue,
        totalBookingsCount,
        checkedInCount,
        confirmedCount,
        totalUnitsCount,
        activeHoldsCount,
        pendingVisitsCount,
      },
      recentBookings,
      recentVisits: visitRequests,
      properties,
      source: "local_prisma",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN_REQUIRED") {
      return NextResponse.json(
        { error: "Admin access required. Please toggle to Admin profile." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
