import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME, getCurrentUser } from "@/lib/auth";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { razorpay_order_id, error_code, error_description } = body;

    if (!razorpay_order_id) {
      return NextResponse.json(
        { error: "razorpay_order_id is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Authentication token required" }, { status: 401 });
    }

    const backendRes = await fetch(`${BACKEND_URL}/payments/fail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id,
        error_code,
        error_description,
      }),
    });

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

