import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser, JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";
import { backendUserToFrontend } from "@/lib/api/adapters";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (token && token.includes(".")) {
      try {
        const backendRes = await fetch(`${getServerBackendUrl()}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          if (data.data?.user) {
            return NextResponse.json(
              {
                success: true,
                user: backendUserToFrontend(data.data.user),
              },
              { headers: NO_STORE_HEADERS }
            );
          }
        }
      } catch {
        // Fallback to verified getCurrentUser below
      }
    }

    const user = await getCurrentUser();
    return NextResponse.json(
      {
        success: true,
        user: user || null,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
