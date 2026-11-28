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
    const body = await request.json();
    const additionalCount = Number(body?.additionalCount ?? body?.additional_count ?? 1);
    if (!Number.isInteger(additionalCount) || additionalCount < 1 || additionalCount > 24) {
      return NextResponse.json(
        { error: "additionalCount must be an integer between 1 and 24." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

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
      backendRes = await fetch(`${getServerBackendUrl()}/bookings/${id}/extend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          additional_count: additionalCount,
          ...(typeof body?.includeFood === "boolean" ? { include_food: body.includeFood } : {}),
        }),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Booking extension service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to extend booking." },
        { status: backendRes.status >= 400 ? backendRes.status : 502, headers: NO_STORE_HEADERS }
      );
    }

    const b = data.data?.booking || data.data;
    return NextResponse.json(
      {
        success: true,
        booking: b ? backendBookingToFrontend(b) : null,
        message: "Booking extended successfully.",
        source: "express_backend",
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to extend booking." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
