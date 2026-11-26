import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  hashPassword,
  JWT_COOKIE_NAME,
  LEGACY_SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { firebaseConfig } from "@/lib/firebase";

/**
 * Verifies a Firebase Google Sign-In ID token via Google's Identity Toolkit
 * lookup endpoint and issues a Stayzy HTTP-only session cookie.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, rememberMe } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Missing Google authentication token." },
        { status: 400 }
      );
    }

    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
        firebaseConfig.apiKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: "Google token verification failed. Please try again." },
        { status: 401 }
      );
    }

    const verifyData = await verifyRes.json();
    const firebaseUser = verifyData?.users?.[0];
    const verifiedEmail = firebaseUser?.email?.toLowerCase().trim();

    if (!verifiedEmail) {
      return NextResponse.json(
        { error: "No verified email was returned by Google." },
        { status: 401 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { email: verifiedEmail },
    });

    if (!user) {
      const displayName =
        firebaseUser?.displayName?.trim() || verifiedEmail.split("@")[0];
      user = await prisma.user.create({
        data: {
          name: displayName,
          email: verifiedEmail,
          passwordHash: hashPassword(crypto.randomBytes(24).toString("hex")),
          role: "CUSTOMER",
        },
      });
    }

    const token = createSessionToken(user);
    const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;

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
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to complete Google Sign-In." },
      { status: 500 }
    );
  }
}

