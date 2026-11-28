import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";
import { backendPaymentToFrontend } from "@/lib/api/adapters";
import { BackendPayment } from "@/lib/api/types";

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
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/payments/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Payment history service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.message || errData.error || "Unable to load payment history." },
        { status: backendRes.status >= 400 ? backendRes.status : 502, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json();
    const payments: BackendPayment[] = data.data?.payments || [];

    return NextResponse.json(
      {
        success: true,
        payments: payments.map((p) => backendPaymentToFrontend(p)),
        schedules: [],
        refunds: [],
        source: "express_backend",
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to load payment history." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
