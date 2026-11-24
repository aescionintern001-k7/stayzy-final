import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, JWT_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { role } = await request.json(); // "CUSTOMER" | "OWNER" | "ADMIN"
    const validRole = role === "ADMIN" ? "ADMIN" : role === "OWNER" ? "OWNER" : "CUSTOMER";

    // In production, prevent persona switching
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Persona switching is disabled in production environments." },
        { status: 403 }
      );
    }

    let targetUser = await prisma.user.findFirst({
      where: { role: validRole },
    });

    if (!targetUser) {
      if (validRole === "OWNER") {
        targetUser = await prisma.user.create({
          data: {
            email: "rajesh.pg@stayzy.com",
            name: "Rajesh Kumar (PG Partner)",
            phone: "+91 98450 88990",
            role: "OWNER",
            passwordHash: "stayzy_owner_2026",
          },
        });
      } else if (validRole === "ADMIN") {
        targetUser = await prisma.user.create({
          data: {
            email: "admin@stayzy.com",
            name: "Stayzy Ops Admin",
            phone: "+91 80 4567 8900",
            role: "ADMIN",
            passwordHash: "stayzy_admin_2026",
          },
        });
      } else {
        targetUser = await prisma.user.create({
          data: {
            email: "aarav.sharma@example.com",
            name: "Aarav Sharma",
            phone: "+91 98765 12345",
            role: "CUSTOMER",
            passwordHash: "stayzy_guest_2026",
          },
        });
      }
    }

    const token = createSessionToken(targetUser);
    const response = NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });

    response.cookies.set(JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set(LEGACY_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
