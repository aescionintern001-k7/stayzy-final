import { NextResponse } from "next/server";
import {
  createSessionToken,
  JWT_COOKIE_NAME,
  LEGACY_SESSION_COOKIE_NAME,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerBackendUrl } from "@/lib/api/config";
import { backendRoleToFrontend } from "@/lib/api/adapters";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, phone, password, demoType, requiredRole, rememberMe } = body;

    const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
    const isDemoAllowed =
      process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    let targetEmail = email ? String(email).toLowerCase().trim() : "";
    let targetPassword = password ? String(password) : "";

    if (demoType) {
      if (!isDemoAllowed) {
        return NextResponse.json(
          { error: "Demo login is disabled in this environment." },
          { status: 403, headers: NO_STORE_HEADERS }
        );
      }
      if (demoType === "admin") {
        targetEmail = "admin@stayzy.com";
        targetPassword = "AdminPassword123!";
      } else if (demoType === "customer") {
        targetEmail = "aarav.sharma@example.com";
        targetPassword = "password123";
      } else if (demoType === "owner") {
        targetEmail = "host@stayzy.com";
        targetPassword = "password123";
      }
    }

    if (!targetEmail && phone) {
      return NextResponse.json(
        { error: "Phone password login requires an email-linked account on the shared backend." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (!targetEmail || !targetPassword) {
      return NextResponse.json(
        { error: "Please enter your email and password." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    let backendRes: Response | null = null;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
        cache: "no-store",
      });
    } catch {
      backendRes = null;
    }

    if (!backendRes || !backendRes.ok) {
      // Fallback: check local Prisma user store (for accounts registered in SQLite/Prisma)
      const prismaUser = await prisma.user.findUnique({
        where: { email: targetEmail },
      });

      if (prismaUser && verifyPassword(targetPassword, prismaUser.passwordHash)) {
        if (requiredRole === "ADMIN" && prismaUser.role !== "ADMIN") {
          return NextResponse.json(
            { error: "Access denied. This account does not possess administrator credentials." },
            { status: 403, headers: NO_STORE_HEADERS }
          );
        }

        const localToken = createSessionToken(prismaUser);
        const response = NextResponse.json(
          {
            success: true,
            user: {
              id: prismaUser.id,
              name: prismaUser.name,
              email: prismaUser.email,
              phone: prismaUser.phone || null,
              role: prismaUser.role,
            },
            token: localToken,
          },
          { headers: NO_STORE_HEADERS }
        );

        response.cookies.set(JWT_COOKIE_NAME, localToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: cookieMaxAge,
          sameSite: "lax",
        });
        response.cookies.delete(LEGACY_SESSION_COOKIE_NAME);
        return response;
      }

      if (!backendRes) {
        return NextResponse.json(
          { error: "Authentication service is unavailable. Please ensure the backend server is running." },
          { status: 503, headers: NO_STORE_HEADERS }
        );
      }

      const errData = await backendRes.json().catch(() => ({}));
      const errRes = NextResponse.json(
        { error: errData.message || errData.error || "Invalid email address or password." },
        { status: backendRes.status >= 400 ? backendRes.status : 401, headers: NO_STORE_HEADERS }
      );
      errRes.cookies.delete(JWT_COOKIE_NAME);
      errRes.cookies.delete("token");
      errRes.cookies.delete(LEGACY_SESSION_COOKIE_NAME);
      return errRes;
    }

    const data = await backendRes.json();
    const { token, user } = data.data || {};
    if (!token || !user) {
      return NextResponse.json(
        { error: "Invalid authentication response from backend." },
        { status: 502, headers: NO_STORE_HEADERS }
      );
    }

    const frontendRole = backendRoleToFrontend(user.role);
    if (requiredRole === "ADMIN" && frontendRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. This account does not possess administrator credentials." },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.full_name || user.name,
          email: user.email,
          phone: user.phone || null,
          role: frontendRole,
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
      { error: error?.message || "Unable to sign in." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
