import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin, JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token || !token.includes(".")) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403, headers: NO_STORE_HEADERS });
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Admin dashboard service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const resData = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: resData.message || resData.error || "Unable to load admin statistics." },
        { status: backendRes.status >= 400 ? backendRes.status : 502, headers: NO_STORE_HEADERS }
      );
    }

    const data = resData.data || {};
    const properties = data.properties || {};
    const bookings = data.bookings || {};
    const revenue = data.revenue || {};

    let totalRevenue = 0;
    if (Array.isArray(revenue)) {
      totalRevenue = revenue.reduce((sum: number, r: any) => sum + Number(r.gross_revenue || 0), 0);
    } else if (typeof revenue === "object" && revenue !== null) {
      totalRevenue = Number(revenue.gross_revenue || 0);
    }

    return NextResponse.json(
      {
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
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
