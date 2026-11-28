import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin, JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

async function getAdminToken(request: Request): Promise<string | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(JWT_COOKIE_NAME)?.value ||
    cookieStore.get("token")?.value ||
    request.headers.get("Authorization")?.replace("Bearer ", "");
  return token && token.includes(".") ? token : null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const token = await getAdminToken(request);
    if (!token) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403, headers: NO_STORE_HEADERS });
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/admin/beds`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Admin beds service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to load beds." },
        { status: backendRes.status >= 400 ? backendRes.status : 502, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, rooms: data.data?.rooms || data.data?.beds || [], source: "express_backend" },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const token = await getAdminToken(request);
    if (!token) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const body = await request.json();
    const { action, unitId, roomId, identifier, isBed, status } = body;

    let payload: Record<string, unknown>;
    if (action === "ADD_UNIT") {
      if (!roomId || !identifier) {
        return NextResponse.json({ error: "Room ID and identifier are required." }, { status: 400, headers: NO_STORE_HEADERS });
      }
      payload = {
        action: "ADD_UNIT",
        room_id: roomId,
        identifier: String(identifier).trim(),
        is_bed: Boolean(isBed),
      };
    } else if (action === "UPDATE_STATUS") {
      if (!unitId || !status) {
        return NextResponse.json({ error: "Unit ID and status are required." }, { status: 400, headers: NO_STORE_HEADERS });
      }
      payload = {
        action: "UPDATE_STATUS",
        inventory_unit_id: unitId,
        status: String(status).toLowerCase(),
      };
    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/admin/beds`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Admin beds service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to update unit." },
        { status: backendRes.status >= 400 ? backendRes.status : 400, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        unit: data.data?.unit || data.data,
        message: data.message || "Unit updated successfully.",
        source: "express_backend",
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
