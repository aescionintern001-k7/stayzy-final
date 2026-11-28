import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";
import { executeExpressBookingWithOrder } from "@/lib/checkout/expressBooking";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      holdToken,
      roomTypeId,
      inventoryUnitId,
      durationType,
      startDate,
      startTime,
      durationCount,
      includeFood = false,
      guestName,
      guestEmail,
      guestPhone,
      guestCount = 1,
      specialRequests,
      termsAccepted,
    } = body;

    if (!termsAccepted) {
      return NextResponse.json(
        { error: "You must accept the Stayzy Booking & Cancellation terms to proceed." },
        { status: 400 }
      );
    }

    if (!guestName || !guestEmail || !guestPhone) {
      return NextResponse.json(
        { error: "Please provide your Full Name, Email Address, and Phone Number." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");
    const idempotencyKey =
      request.headers.get("Idempotency-Key") ||
      (typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined);

    if (!token || !token.includes(".")) {
      return NextResponse.json(
        { error: "Please sign in to complete your booking." },
        { status: 401, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    if (!UUID_REGEX.test(roomTypeId || "") && !UUID_REGEX.test(body.propertyId || "")) {
      return NextResponse.json(
        { error: "Invalid property or room identifier." },
        { status: 400, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    const expressPayload: Record<string, unknown> = {
      duration_type: durationType,
      start_date: startDate,
      start_time: startTime,
      duration_count: Number(durationCount || 1),
      include_food: Boolean(includeFood),
      guests_count: Number(guestCount || 1),
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      ...(specialRequests ? { special_requests: specialRequests } : {}),
      ...(holdToken ? { hold_token: holdToken } : {}),
      ...(UUID_REGEX.test(roomTypeId || "") ? { room_type_id: roomTypeId } : { property_id: body.propertyId }),
      ...(UUID_REGEX.test(inventoryUnitId || "") ? { inventory_unit_id: inventoryUnitId } : {}),
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    };

    const expressResult = await executeExpressBookingWithOrder({
      backendUrl: getServerBackendUrl(),
      token,
      idempotencyKey,
      payload: expressPayload,
    });

    return NextResponse.json(expressResult.body, {
      status: expressResult.status,
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to create booking." },
      { status: 500 }
    );
  }
}
