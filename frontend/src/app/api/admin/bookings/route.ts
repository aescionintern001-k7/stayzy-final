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
    const durationType = searchParams.get("durationType");

    // 1. Attempt authoritative Express backend
    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (token && token.includes(".")) {
      try {
        const backendRes = await fetch(`${BACKEND_URL}/admin/bookings`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          const bookings = data.data?.bookings || [];
          if (bookings.length > 0) {
            return NextResponse.json({
              success: true,
              bookings,
              source: "express_backend",
            });
          }
        }
      } catch (backendErr) {
        console.warn("[Admin Bookings API] Express backend unreachable, using local fallback");
      }
    }

    // 2. Local fallback
    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (durationType && durationType !== "ALL") where.durationType = durationType;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        property: true,
        roomType: true,
        inventoryUnit: {
          include: { room: true },
        },
        payments: true,
        refunds: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, bookings, source: "local_prisma" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
