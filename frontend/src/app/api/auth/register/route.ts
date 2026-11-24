import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  hashPassword,
  JWT_COOKIE_NAME,
  LEGACY_SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { backendRoleToFrontend } from "@/lib/api/adapters";

const BACKEND_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Please provide your full name, email, and a password." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Try authoritative Express backend first
    try {
      const backendRes = await fetch(`${BACKEND_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name.trim(),
          email: cleanEmail,
          password,
          role: "guest",
        }),
      });

      if (backendRes.ok) {
        // Auto-login to obtain JWT
        const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        if (loginRes.ok) {
          const loginData = await loginRes.json();
          const { token, user } = loginData.data || {};

          const response = NextResponse.json({
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
          });

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
      } else if (backendRes.status === 409) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in instead." },
          { status: 409 }
        );
      } else if (backendRes.status === 400) {
        const errData = await backendRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: errData.message || "Invalid registration data." },
          { status: 400 }
        );
      }
    } catch (backendError) {
      console.warn("[Auth Register] Express backend unreachable, falling back to local database");
    }

    // 2. Local fallback
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in instead." },
        { status: 409 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        role: "CUSTOMER",
        passwordHash: hashPassword(password),
      },
    });

    const token = createSessionToken(newUser);

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: "CUSTOMER",
      },
      message: "Registration successful!",
    });

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
