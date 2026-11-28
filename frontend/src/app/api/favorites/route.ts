import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME, getCurrentUser } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

async function getAuthToken(request: Request): Promise<string | null> {
  const cookieStore = await cookies();
  return (
    cookieStore.get(JWT_COOKIE_NAME)?.value ||
    cookieStore.get("token")?.value ||
    request.headers.get("Authorization")?.replace("Bearer ", "") ||
    null
  );
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const token = await getAuthToken(request);
    if (!user || !token || !token.includes(".")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const res = await fetch(`${getServerBackendUrl()}/users/me/favorites`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status, headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load favorites";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const token = await getAuthToken(request);
    if (!user || !token || !token.includes(".")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const body = await request.json().catch(() => ({}));
    const roomTypeId = body.room_type_id || body.roomTypeId;
    if (!roomTypeId) {
      return NextResponse.json({ error: "room_type_id is required" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const res = await fetch(`${getServerBackendUrl()}/users/me/favorites`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ room_type_id: roomTypeId }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status, headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save favorite";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    const token = await getAuthToken(request);
    if (!user || !token || !token.includes(".")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const { searchParams } = new URL(request.url);
    const roomTypeId = searchParams.get("roomTypeId") || searchParams.get("room_type_id");
    if (!roomTypeId) {
      return NextResponse.json({ error: "roomTypeId is required" }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const res = await fetch(
      `${getServerBackendUrl()}/users/me/favorites/${encodeURIComponent(roomTypeId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status, headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to remove favorite";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
