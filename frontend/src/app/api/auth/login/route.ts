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
    const { email, phone, password, demoType, requiredRole, rememberMe } = body;

    const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

    // Handle demo logins if requested
    let targetEmail = email ? email.toLowerCase().trim() : "";
    let targetPhoneDigits = phone ? String(phone).replace(/\D/g, "") : "";
    if (targetPhoneDigits.length > 10) {
      targetPhoneDigits = targetPhoneDigits.slice(-10);
    }
    let targetPassword = password;

    if (demoType === "admin") {
      targetEmail = "admin@stayzy.com";
      targetPassword = "AdminPassword123!";
    } else if (demoType === "customer") {
      targetEmail = "aarav.sharma@example.com";
      targetPassword = "password123";
    }

    // 1. Try authoritative Express backend first when logging in via email
    if (targetEmail) {
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

            response.cookies.set(JWT_COOKIE_NAME, token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              path: "/",
              maxAge: cookieMaxAge,
              sameSite: "lax",
            });

            response.cookies.set(LEGACY_SESSION_COOKIE_NAME, token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              path: "/",
              maxAge: cookieMaxAge,
              sameSite: "lax",
            });

            return response;
          }
        } else if (backendRes.status === 401 || backendRes.status === 400 || backendRes.status === 403) {
          const errData = await backendRes.json().catch(() => ({}));
          if (!demoType) {
            return NextResponse.json(
              { error: errData.message || "Invalid email address or password." },
              { status: backendRes.status }
            );
          }
        }
      } catch {
        console.warn("[Auth Login] Express backend not reachable, using local fallback");
      }
    }

    // 2. Local Prisma database authentication (email or phone)
    let user: any = null;

    if (demoType === "customer") {
      user = await prisma.user.findFirst({
        where: { role: "CUSTOMER" },
      });
    } else if (demoType === "admin") {
      user = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });
    } else if (targetPhoneDigits) {
      if (targetPhoneDigits.length < 10 || !targetPassword) {
        return NextResponse.json(
          { error: "Please enter a valid phone number and password." },
          { status: 400 }
        );
      }

      const candidates = await prisma.user.findMany({
        where: { phone: { not: null } },
      });
      user =
        candidates.find(
          (u) => (u.phone || "").replace(/\D/g, "").slice(-10) === targetPhoneDigits
        ) || null;

      if (!user || !verifyPassword(targetPassword, user.passwordHash)) {
        return NextResponse.json(
          { error: "Invalid phone number or password." },
          { status: 401 }
        );
      }
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
      maxAge: cookieMaxAge,
      sameSite: "lax",
    });

    response.cookies.set(LEGACY_SESSION_COOKIE_NAME, legacyToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: cookieMaxAge,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
