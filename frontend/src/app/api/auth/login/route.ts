import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  verifyPassword,
  JWT_COOKIE_NAME,
  LEGACY_SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { backendRoleToFrontend } from "@/lib/api/adapters";

const BACKEND_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, demoType, requiredRole } = body;

    // Handle demo logins if requested
    let targetEmail = email ? email.toLowerCase().trim() : "";
    let targetPassword = password;

    if (demoType === "admin") {
      targetEmail = "admin@stayzy.com";
      targetPassword = "AdminPassword123!";
    } else if (demoType === "customer") {
      targetEmail = "aarav.sharma@example.com";
      targetPassword = "password123";
    }

    // 1. Try authoritative Express backend first
    try {
      const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        const { token, user } = data.data || {};

        if (token && user) {
          const frontendRole = backendRoleToFrontend(user.role);

          if (requiredRole === "ADMIN" && frontendRole !== "ADMIN") {
            return NextResponse.json(
              { error: "Access denied. This account does not possess administrator credentials." },
              { status: 403 }
            );
          }

          const response = NextResponse.json({
            success: true,
            user: {
              id: user.id,
              name: user.full_name || user.name,
              email: user.email,
              phone: user.phone || null,
              role: frontendRole,
            },
            token,
          });

          // Set both JWT cookie and legacy cookie for complete backwards-compatibility
          response.cookies.set(JWT_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
            sameSite: "lax",
          });

          response.cookies.set(LEGACY_SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
            sameSite: "lax",
          });

          return response;
        }
      } else if (backendRes.status === 401 || backendRes.status === 400 || backendRes.status === 403) {
        const errData = await backendRes.json().catch(() => ({}));
        // If it's a real credential failure from the backend, don't fall back to local unless it was a demo trigger
        if (!demoType) {
          return NextResponse.json(
            { error: errData.message || "Invalid email address or password." },
            { status: backendRes.status }
          );
        }
      }
    } catch (backendError) {
      // Express backend is offline or network error, proceed to local fallback
      console.warn("[Auth Login] Express backend not reachable, using local fallback");
    }

    // 2. Local fallback mechanism (ensures dev environment stays fully functional)
    let user: any = null;

    if (demoType === "customer") {
      user = await prisma.user.findFirst({
        where: { role: "CUSTOMER" },
      });
    } else if (demoType === "admin") {
      user = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });
    } else {
      if (!targetEmail || !targetPassword) {
        return NextResponse.json(
          { error: "Please enter your email and password." },
          { status: 400 }
        );
      }

      user = await prisma.user.findUnique({
        where: { email: targetEmail },
      });

      if (!user || !verifyPassword(targetPassword, user.passwordHash)) {
        return NextResponse.json(
          { error: "Invalid email address or password." },
          { status: 401 }
        );
      }
    }

    if (!user) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    if (requiredRole === "ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. This account does not possess administrator credentials." },
        { status: 403 }
      );
    }

    const legacyToken = createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });

    response.cookies.set(JWT_COOKIE_NAME, legacyToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    response.cookies.set(LEGACY_SESSION_COOKIE_NAME, legacyToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
