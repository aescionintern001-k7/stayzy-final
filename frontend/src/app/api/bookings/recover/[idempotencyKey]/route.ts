import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME, getCurrentUser } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

export async function GET(
  request: Request,
  context: { params: Promise<{ idempotencyKey: string }> }
) {
  try {
    const user = await getCurrentUser();
    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!user || !token || !token.includes(".")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const { idempotencyKey } = await context.params;
    if (!idempotencyKey || idempotencyKey.trim().length < 8) {
      return NextResponse.json(
        { success: false, error: "Valid idempotencyKey is required" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const backendRes = await fetch(
        `${getServerBackendUrl()}/bookings/recover/${encodeURIComponent(idempotencyKey.trim())}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        }
      );

      const data = await backendRes.json().catch(() => ({}));
      if (!backendRes.ok) {
        return NextResponse.json(
          {
            success: false,
            error: data.message || data.error || "Booking not found for recovery key",
          },
          { status: backendRes.status, headers: NO_STORE_HEADERS }
        );
      }

      const booking = data.data?.booking || data.booking || data.data;
      return NextResponse.json(
        { success: true, booking, source: "express_backend" },
        { status: 200, headers: NO_STORE_HEADERS }
      );
    } catch (err: unknown) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return NextResponse.json(
        {
          success: false,
          error: isTimeout
            ? "Booking recovery request timed out"
            : "Booking recovery service is temporarily unavailable",
        },
        { status: isTimeout ? 504 : 503, headers: NO_STORE_HEADERS }
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Booking recovery failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
