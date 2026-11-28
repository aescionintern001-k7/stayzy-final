import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin, JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token || !token.includes(".")) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const query = new URLSearchParams();
    if (status && status !== "ALL") {
      query.set("status", status.toLowerCase());
    }
    const qs = query.toString();

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/admin/payments${qs ? `?${qs}` : ""}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Admin payments service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to load payments." },
        { status: backendRes.status >= 400 ? backendRes.status : 502, headers: NO_STORE_HEADERS }
      );
    }

    const payments = data.data?.payments || [];
    return NextResponse.json(
      {
        success: true,
        payments,
        schedules: [],
        refunds: [],
        totalCollected: payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
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
