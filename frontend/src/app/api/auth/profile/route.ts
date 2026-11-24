import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword, JWT_COOKIE_NAME } from "@/lib/auth";

const BACKEND_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, currentPassword, newPassword } = body;

    // Check if we have an Express backend JWT
    const cookieStore = await cookies();
    const token = cookieStore.get(JWT_COOKIE_NAME)?.value || cookieStore.get("token")?.value;

    if (token && token.includes(".")) {
      try {
        const updatePayload: any = {};
        if (name) updatePayload.full_name = name.trim();
        if (phone) updatePayload.phone = phone.trim();

        const backendRes = await fetch(`${BACKEND_URL}/users/me`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        });

        if (backendRes.ok) {
          const resData = await backendRes.json();
          const u = resData.data?.user || resData.data;
          return NextResponse.json({
            success: true,
            user: {
              id: u.id,
              name: u.full_name || name,
              email: u.email,
              phone: u.phone || phone,
              role: currentUser.role,
            },
            message: "Profile updated successfully.",
          });
        }
      } catch (err) {
        console.warn("[Profile Update] Express backend update failed, attempting local fallback");
      }
    }

    // Local DB fallback
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();

    if (newPassword) {
      if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
        return NextResponse.json(
          { error: "Incorrect current password." },
          { status: 400 }
        );
      }
      updateData.passwordHash = hashPassword(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
      },
      message: "Profile updated successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
