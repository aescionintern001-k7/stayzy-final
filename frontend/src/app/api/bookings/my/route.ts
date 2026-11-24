import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, JWT_COOKIE_NAME } from "@/lib/auth";
import { backendBookingToFrontend } from "@/lib/api/adapters";
import { BackendBooking } from "@/lib/api/types";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to view your bookings." },
        { status: 401 }
      );
    }

    // 1. Attempt authoritative Express backend
    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (token && token.includes(".")) {
      try {
        const backendRes = await fetch(`${BACKEND_URL}/bookings`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          const backendBookings: BackendBooking[] = data.data?.bookings || [];

          if (backendBookings.length > 0) {
            const adapted = backendBookings.map((b) => backendBookingToFrontend(b));
            return NextResponse.json({
              success: true,
              bookings: adapted,
              source: "express_backend",
            });
          }
        }
      } catch (backendErr) {
        console.warn("[Bookings API] Express backend unreachable, falling back to local database");
      }
    }

    // 2. Local database fallback
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [{ userId: user.id }, { guestEmail: user.email }],
      },
      include: {
        property: true,
        roomType: true,
        inventoryUnit: true,
        payments: true,
        paymentSchedules: {
          orderBy: { dueDate: "asc" },
        },
        refunds: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      bookings,
      source: "local_prisma",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
