import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      roomTypeId,
      inventoryUnitId,
      durationType,
      startDate,
      startTime,
      durationCount = 1,
      includeFood = false,
      guestEmail,
    } = body;

    if (!UUID_REGEX.test(roomTypeId || "")) {
      return NextResponse.json(
        { error: "Invalid room identifier." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token || !token.includes(".")) {
      return NextResponse.json(
        { error: "Please sign in to reserve a room hold." },
        { status: 401 }
      );
    }

    let res: Response;
    try {
      res = await fetch(`${getServerBackendUrl()}/holds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_type_id: roomTypeId,
          ...(UUID_REGEX.test(inventoryUnitId || "") ? { inventory_unit_id: inventoryUnitId } : {}),
          duration_type: durationType,
          start_date: startDate,
          ...(startTime ? { start_time: startTime } : {}),
          duration_count: Number(durationCount),
          include_food: Boolean(includeFood),
          ...(guestEmail ? { guest_email: guestEmail } : {}),
        }),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Booking hold service is temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to reserve room hold." },
        { status: res.status }
      );
    }

    const hold = data.data?.hold || data.hold || data.data;
    const holdToken = hold?.hold_token || hold?.token;
    if (!holdToken) {
      return NextResponse.json(
        { error: "Invalid hold response from backend." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      source: "express_backend",
      token: holdToken,
      expiresAt: hold.expires_at,
      unit: hold.unit || null,
      pricing: data.data?.pricing || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to reserve room hold." },
      { status: 500 }
    );
  }
}
