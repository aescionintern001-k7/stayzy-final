import { NextResponse } from "next/server";
import { JWT_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";
import { backendRoleToFrontend } from "@/lib/api/adapters";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

/**
 * Proxies Firebase Google Sign-In ID token verification to the shared Express
 * backend (PostgreSQL) and issues Stayzy HTTP-only session cookies.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, rememberMe } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Missing Google authentication token." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: idToken.trim() }),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Authentication service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.message || errData.error || "Google token verification failed. Please try again." },
        { status: backendRes.status >= 400 ? backendRes.status : 401, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json();
    const { token, user } = data.data || {};
    if (!token || !user) {
      return NextResponse.json(
        { error: "Invalid Google authentication response from backend." },
        { status: 502, headers: NO_STORE_HEADERS }
      );
    }

    const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.full_name || user.name,
          email: user.email,
          phone: user.phone || null,
          role: backendRoleToFrontend(user.role),
        },
        token,
      },
      { headers: NO_STORE_HEADERS }
    );

    response.cookies.set(JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: cookieMaxAge,
      sameSite: "lax",
    });
    response.cookies.delete(LEGACY_SESSION_COOKIE_NAME);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to complete Google Sign-In." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
