import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";
import { backendBookingToFrontend } from "@/lib/api/adapters";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

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

    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token || !token.includes(".")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid booking identifier." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/bookings/${id}/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Booking cancellation service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to cancel booking." },
        { status: backendRes.status >= 400 ? backendRes.status : 502, headers: NO_STORE_HEADERS }
      );
    }

    const b = data.data?.booking || data.data;
    return NextResponse.json(
      {
        success: true,
        booking: b ? backendBookingToFrontend(b) : null,
        message: "Booking has been cancelled successfully.",
        source: "express_backend",
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to cancel booking." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
