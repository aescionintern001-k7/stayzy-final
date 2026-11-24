import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser, JWT_COOKIE_NAME } from "@/lib/auth";
import { backendUserToFrontend } from "@/lib/api/adapters";

const BACKEND_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (token && token.includes(".")) {
      try {
        const backendRes = await fetch(`${BACKEND_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          if (data.data?.user) {
            return NextResponse.json({
              success: true,
              user: backendUserToFrontend(data.data.user),
            });
          }
        }
      } catch (err) {
        // Backend unavailable; fallback to decoding token or getCurrentUser
      }
    }

    const user = await getCurrentUser();
    return NextResponse.json({
      success: true,
      user: user || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
