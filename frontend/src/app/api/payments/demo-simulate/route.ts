import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME, getCurrentUser } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { booking_id, razorpay_order_id, outcome = "SUCCESS" } = body;

    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Authentication token required" }, { status: 401 });
    }

    const backendRes = await fetch(`${getServerBackendUrl()}/payments/demo-simulate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        booking_id,
        razorpay_order_id,
        outcome,
      }),
    });

    const data = await backendRes.json();
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Payment simulation failed" },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Payment simulation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
