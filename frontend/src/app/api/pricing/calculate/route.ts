import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateBookingPricing, RatePlanData } from "@/lib/pricing";
import { DurationType } from "@/lib/types";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  "http://localhost:5000/api/v1";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    // 1. Authoritative Express backend pricing calculation (PostgreSQL source of truth)
    try {
      const backendRes = await fetch(
        `${BACKEND_URL}/bookings/calculate-pricing`,
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

      if (backendRes.ok) {
        const backendData = await backendRes.json();
        if (backendData.data?.breakdown && backendData.data?.ratePlan) {
          return NextResponse.json({
            success: true,
            breakdown: backendData.data.breakdown,
            ratePlan: backendData.data.ratePlan,
            source: "express_backend",
          });
        }
      }
    } catch (err) {
      // Backend request failed or unreachable; continue to next strategy
    }

    // 2. If roomTypeId is a UUID, attempt to query backend property details directly
    if (UUID_REGEX.test(roomTypeId)) {
      try {
        const propRes = await fetch(`${BACKEND_URL}/properties/${roomTypeId}`, {
          cache: "no-store",
        });

        if (propRes.ok) {
          const propData = await propRes.json();
          const property = propData.data?.property || propData.data;
          const roomTypes = property?.room_types || [];

          // Find first matching rate plan for durationType
          let matchedPlan: any = null;
          for (const rt of roomTypes) {
            const plan = (rt.rate_plans || []).find(
              (rp: any) =>
                rp.duration_type === durationType && rp.is_enabled !== false
            );
            if (plan) {
              matchedPlan = plan;
              break;
            }
          }

          if (matchedPlan) {
            const ratePlanData: RatePlanData = {
              durationType: matchedPlan.duration_type,
              price: Number(matchedPlan.price),
              isEnabled: matchedPlan.is_enabled ?? true,
              minDuration: Number(matchedPlan.min_duration || 1),
              maxDuration: matchedPlan.max_duration
                ? Number(matchedPlan.max_duration)
                : null,
              allowedHoursStart: matchedPlan.allowed_hours_start || "08:00",
              allowedHoursEnd: matchedPlan.allowed_hours_end || "22:00",
              depositAmount: Number(matchedPlan.deposit_amount || 0),
              foodMonthlyCharge: Number(matchedPlan.food_monthly_charge || 0),
              electricityRule:
                matchedPlan.electricity_rule || "Included in rent",
              notes: matchedPlan.notes || null,
            };

            const calcResult = calculateBookingPricing({
              ratePlan: ratePlanData,
              durationType,
              durationCount,
              startDateStr: startDate,
              startTimeStr: startTime,
              includeFood,
            });

            if (calcResult.success) {
              return NextResponse.json({
                success: true,
                breakdown: calcResult.breakdown,
                ratePlan: {
                  minDuration: ratePlanData.minDuration,
                  maxDuration: ratePlanData.maxDuration,
                  allowedHoursStart: ratePlanData.allowedHoursStart,
                  allowedHoursEnd: ratePlanData.allowedHoursEnd,
                  depositAmount: ratePlanData.depositAmount,
                  electricityRule: ratePlanData.electricityRule,
                  notes: ratePlanData.notes,
                },
                source: "express_backend_property",
              });
            }
          }
        }
      } catch (err) {
        // Continue to local prisma fallback
      }
    }

    // 3. Fallback to local Prisma (SQLite) for offline dev/demo
    try {
      const ratePlan = await prisma.ratePlan.findFirst({
        where: {
          roomTypeId,
          durationType: durationType as string,
        },
      });

      if (ratePlan) {
        const calcResult = calculateBookingPricing({
          ratePlan,
          durationType: durationType as DurationType,
          durationCount: Number(durationCount),
          startDateStr: startDate,
          startTimeStr: startTime,
          includeFood: Boolean(includeFood),
        });

        if (calcResult.success) {
          return NextResponse.json({
            success: true,
            breakdown: calcResult.breakdown,
            ratePlan: {
              minDuration: ratePlan.minDuration,
              maxDuration: ratePlan.maxDuration,
              allowedHoursStart: ratePlan.allowedHoursStart,
              allowedHoursEnd: ratePlan.allowedHoursEnd,
              depositAmount: ratePlan.depositAmount,
              electricityRule: ratePlan.electricityRule,
              notes: ratePlan.notes,
            },
            source: "local_prisma",
          });
        }
      }
    } catch {
      // Local database query error
    }

    return NextResponse.json(
      { error: `Duration "${durationType}" is not offered for this room.` },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
