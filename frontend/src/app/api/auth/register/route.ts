import { NextResponse } from "next/server";
import { JWT_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";
import { backendRoleToFrontend } from "@/lib/api/adapters";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Please provide your full name, email, and a password." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const backendUrl = getServerBackendUrl();

    let backendRes: Response;
    try {
      backendRes = await fetch(`${backendUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: String(name).trim(),
          email: cleanEmail,
          password,
          role: "guest",
        }),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Registration service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      const status = backendRes.status === 409 ? 409 : backendRes.status >= 400 ? backendRes.status : 400;
      return NextResponse.json(
        {
          error:
            status === 409
              ? "An account with this email already exists. Please log in instead."
              : errData.message || errData.error || "Invalid registration data.",
        },
        { status, headers: NO_STORE_HEADERS }
      );
    }

    const loginRes = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password }),
      cache: "no-store",
    });

    if (!loginRes.ok) {
      return NextResponse.json(
        { error: "Account created, please log in with your email and password." },
        { status: 201, headers: NO_STORE_HEADERS }
      );
    }

    const loginData = await loginRes.json();
    const { token, user } = loginData.data || {};
    if (!token || !user) {
      return NextResponse.json(
        { error: "Account created, please log in." },
        { status: 201, headers: NO_STORE_HEADERS }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.full_name || name,
          email: user.email,
          phone: user.phone || phone || null,
          role: backendRoleToFrontend(user.role),
        },
        token,
        message: "Registration successful!",
      },
      { headers: NO_STORE_HEADERS }
    );

    response.cookies.set(JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    response.cookies.delete(LEGACY_SESSION_COOKIE_NAME);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to register." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
