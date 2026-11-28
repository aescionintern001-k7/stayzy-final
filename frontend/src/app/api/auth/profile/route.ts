import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";
import { backendUserToFrontend } from "@/lib/api/adapters";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

async function getAuthToken(request: Request): Promise<string | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(JWT_COOKIE_NAME)?.value ||
    cookieStore.get("token")?.value ||
    request.headers.get("Authorization")?.replace("Bearer ", "");
  return token && token.includes(".") ? token : null;
}

export async function GET(request: Request) {
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Profile service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const resData = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: resData.message || resData.error || "Unauthorized" },
        { status: backendRes.status, headers: NO_STORE_HEADERS }
      );
    }

    const u = resData.data?.user || resData.data;
    if (!u) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: backendUserToFrontend(u),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to load profile." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = await getAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const body = await request.json();
    const { name, phone, currentPassword, newPassword } = body;
    const backendUrl = getServerBackendUrl();

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password." },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }

      let pwRes: Response;
      try {
        pwRes = await fetch(`${backendUrl}/users/me/password`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
          cache: "no-store",
        });
      } catch {
        return NextResponse.json(
          { error: "Profile service is unavailable. Please ensure the backend server is running." },
          { status: 503, headers: NO_STORE_HEADERS }
        );
      }

      if (!pwRes.ok) {
        const pwErr = await pwRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: pwErr.message || pwErr.error || "Unable to update password." },
          { status: pwRes.status >= 400 ? pwRes.status : 400, headers: NO_STORE_HEADERS }
        );
      }
    }

    const updatePayload: Record<string, string> = {};
    if (name) updatePayload.full_name = String(name).trim();
    if (phone !== undefined && String(phone).trim() !== "") updatePayload.phone = String(phone).trim();

    let backendRes: Response;
    try {
      if (Object.keys(updatePayload).length > 0) {
        backendRes = await fetch(`${backendUrl}/users/me`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
          cache: "no-store",
        });
      } else {
        backendRes = await fetch(`${backendUrl}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });
      }
    } catch {
      return NextResponse.json(
        { error: "Profile service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const resData = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: resData.message || resData.error || "Unable to update profile." },
        { status: backendRes.status >= 400 ? backendRes.status : 400, headers: NO_STORE_HEADERS }
      );
    }

    const u = resData.data?.user || resData.data;
    return NextResponse.json(
      {
        success: true,
        user: u ? backendUserToFrontend(u) : null,
        message: "Profile updated successfully.",
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to update profile." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
