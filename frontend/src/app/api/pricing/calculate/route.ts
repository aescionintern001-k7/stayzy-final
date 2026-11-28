import { NextResponse } from "next/server";
import { getServerBackendUrl } from "@/lib/api/config";
import { DurationType } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const roomTypeId =
      body.roomTypeId ||
      body.room_type_id ||
      body.propertyId ||
      body.property_id;
    const durationType = (
      body.durationType ||
      body.duration_type ||
      "MONTHLY"
    ).toUpperCase() as DurationType;
    const startDate =
      body.startDate || body.start_date || body.check_in_date;
    const startTime = body.startTime || body.start_time || "10:00";
    const durationCount = Number(
      body.durationCount || body.duration_count || 1
    );
    const includeFood = Boolean(
      body.includeFood ?? body.include_food ?? false
    );

    if (!roomTypeId || !durationType || !startDate) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (roomTypeId, durationType, startDate).",
        },
        { status: 400 }
      );
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(
        `${getServerBackendUrl()}/bookings/calculate-pricing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_type_id: roomTypeId,
            duration_type: durationType,
            start_date: startDate,
            start_time: startTime,
            duration_count: durationCount,
            include_food: includeFood,
          }),
          cache: "no-store",
        }
      );
    } catch {
      return NextResponse.json(
        { error: "Pricing calculation service is unavailable. Please ensure the backend server is running." },
        { status: 503 }
      );
    }

    const backendData = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: backendData.message || backendData.error || "Unable to calculate pricing." },
        { status: backendRes.status >= 400 ? backendRes.status : 400 }
      );
    }

    if (!backendData.data?.breakdown || !backendData.data?.ratePlan) {
      return NextResponse.json(
        { error: "Invalid pricing response from backend." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      breakdown: backendData.data.breakdown,
      ratePlan: backendData.data.ratePlan,
      source: "express_backend",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
