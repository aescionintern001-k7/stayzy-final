import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";
import { backendBookingToFrontend } from "@/lib/api/adapters";
import { BackendBooking } from "@/lib/api/types";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token || !token.includes(".")) {
      return NextResponse.json(
        { error: "Please sign in to view your bookings." },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Booking service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.message || errData.error || "Unable to load bookings." },
        { status: backendRes.status >= 400 ? backendRes.status : 502, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json();
    const backendBookings: BackendBooking[] = data.data?.bookings || [];
    const adapted = backendBookings.map((b) => backendBookingToFrontend(b));

    return NextResponse.json(
      {
        success: true,
        bookings: adapted,
        source: "express_backend",
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to load bookings." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
