import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin, JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid booking identifier." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const { status } = await request.json();
    if (!status) {
      return NextResponse.json({ error: "Status is required." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/admin/bookings/${id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: String(status).toLowerCase() }),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Admin booking status service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to update booking status." },
        { status: backendRes.status >= 400 ? backendRes.status : 400, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        booking: data.data?.booking || data.data,
        message: `Booking status updated to ${status}.`,
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
