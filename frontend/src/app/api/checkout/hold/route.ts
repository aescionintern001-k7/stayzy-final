import { NextResponse } from "next/server";
import { createInventoryHold, releaseInventoryHold } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { calculateBookingPricing } from "@/lib/pricing";
import { DurationType } from "@/lib/types";

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
      guestEmail,
    } = body;

    let ratePlan: any = null;
    try {
      ratePlan = await prisma.ratePlan.findUnique({
        where: {
          roomTypeId_durationType: {
            roomTypeId,
            durationType: durationType as string,
          },
        },
      });
    } catch {
      ratePlan = null;
    }

    if (!ratePlan || !ratePlan.isEnabled) {
      const BACKEND_URL =
        process.env.API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_BACKEND_API_URL ||
        "http://localhost:5000/api/v1";

      try {
        const propRes = await fetch(`${BACKEND_URL}/properties/${roomTypeId}`, { cache: "no-store" });
        if (propRes.ok) {
          const propData = await propRes.json();
          const property = propData.data?.property || propData.data;
          const rts = property?.room_types || [];
          for (const rt of rts) {
            const plan = (rt.rate_plans || []).find(
              (rp: any) => rp.duration_type === durationType && rp.is_enabled !== false
            );
            if (plan) {
              ratePlan = {
                id: plan.id,
                durationType: plan.duration_type,
                price: Number(plan.price),
                depositAmount: Number(plan.deposit_amount || 0),
                foodMonthlyCharge: Number(plan.food_monthly_charge || 0),
                minDuration: Number(plan.min_duration || 1),
                maxDuration: plan.max_duration ? Number(plan.max_duration) : null,
                isEnabled: plan.is_enabled ?? true,
                allowedHoursStart: plan.allowed_hours_start || "08:00",
                allowedHoursEnd: plan.allowed_hours_end || "22:00",
                electricityRule: plan.electricity_rule || "Included in rent",
                notes: plan.notes || null,
              };
              break;
            }
          }
        }
      } catch {
        // Fallback failed
      }
    }

    if (!ratePlan || !ratePlan.isEnabled) {
      return NextResponse.json(
        { error: "Selected duration is not available for this room." },
        { status: 400 }
      );
    }

    const calcResult = calculateBookingPricing({
      ratePlan,
      durationType: durationType as DurationType,
      durationCount: Number(durationCount),
      startDateStr: startDate,
      startTimeStr: startTime,
    });

    if (!calcResult.success) {
      return NextResponse.json({ error: calcResult.error }, { status: 400 });
    }

    const start = new Date(calcResult.breakdown.startDateTime);
    const end = new Date(calcResult.breakdown.endDateTime);

    const holdResult = await createInventoryHold({
      roomTypeId,
      inventoryUnitId,
      durationType,
      startTime: start,
      endTime: end,
      guestEmail,
    });

    if (!holdResult.success) {
      return NextResponse.json({ error: holdResult.error }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      token: holdResult.token,
      expiresAt: holdResult.expiresAt,
      unit: holdResult.unit,
      pricing: calcResult.breakdown,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Hold token is required." }, { status: 400 });
    }

    await releaseInventoryHold(token);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
