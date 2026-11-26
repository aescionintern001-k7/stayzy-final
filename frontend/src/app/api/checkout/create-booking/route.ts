import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findAvailableUnits } from "@/lib/inventory";
import { calculateBookingPricing } from "@/lib/pricing";
import { PaymentAdapter } from "@/lib/payments/adapter";
import { getCurrentUser } from "@/lib/auth";
import { DurationType } from "@/lib/types";
import crypto from "crypto";

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

    // 1. Verify hold if token passed
    let unitId = inventoryUnitId;
    if (holdToken) {
      const hold = await prisma.inventoryHold.findUnique({
        where: { token: holdToken },
      });

      if (hold && hold.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Your 15-minute checkout reservation hold has expired. Please reselect your dates." },
          { status: 410 }
        );
      }
      if (hold) {
        unitId = hold.inventoryUnitId || unitId;
      }
    }

    // 2. Fetch roomType and property
    let roomType: any = null;
    try {
      roomType = await prisma.roomType.findUnique({
        where: { id: roomTypeId },
        include: {
          property: true,
          ratePlans: {
            where: { durationType: durationType as string },
          },
        },
      });
    } catch {
      roomType = null;
    }

    if (!roomType || !roomType.ratePlans?.[0]) {
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
          if (property) {
            const rts = property.room_types || [];
            let matchedPlan: any = null;
            let matchedRt: any = null;
            for (const rt of rts) {
              const plan = (rt.rate_plans || []).find(
                (rp: any) => rp.duration_type === durationType && rp.is_enabled !== false
              );
              if (plan) {
                matchedPlan = plan;
                matchedRt = rt;
                break;
              }
            }

            if (matchedPlan) {
              // Ensure corresponding Property & RoomType exist in local Prisma DB to satisfy FK constraints
              await prisma.property.upsert({
                where: { id: property.id },
                update: {},
                create: {
                  id: property.id,
                  name: property.title || "Stayzy Property",
                  slug: property.id,
                  description: property.description || property.title || "Stayzy Property",
                  address: property.address || "Bengaluru",
                  city: property.city || "Bengaluru",
                  state: property.state || "Karnataka",
                  pincode: property.pincode || "560001",
                  contactPhone: property.host?.phone || "+91 98765 43210",
                  contactEmail: property.host?.email || "support@stayzy.com",
                  coverImage: (Array.isArray(property.images) && property.images[0]) || "/fallback-room.jpg",
                  images: JSON.stringify(Array.isArray(property.images) ? property.images : []),
                },
              });

              const rtId = matchedRt?.id || property.id;
              await prisma.roomType.upsert({
                where: { id: rtId },
                update: {},
                create: {
                  id: rtId,
                  propertyId: property.id,
                  name: matchedRt?.name || property.title || "Stayzy Room",
                  slug: rtId,
                  category: "PRIVATE",
                  description: property.description || property.title || "Stayzy Room",
                  keyAmenities: JSON.stringify(Array.isArray(property.amenities) ? property.amenities : []),
                  images: JSON.stringify(Array.isArray(property.images) ? property.images : []),
                },
              });

              roomType = {
                id: rtId,
                name: matchedRt?.name || property.title,
                propertyId: property.id,
                maxCapacity: matchedRt?.max_capacity || property.max_guests || 4,
                property: {
                  id: property.id,
                  name: property.title,
                },
                ratePlans: [
                  {
                    id: matchedPlan.id,
                    durationType: matchedPlan.duration_type,
                    price: Number(matchedPlan.price),
                    depositAmount: Number(matchedPlan.deposit_amount || 0),
                    foodMonthlyCharge: Number(matchedPlan.food_monthly_charge || 0),
                    minDuration: Number(matchedPlan.min_duration || 1),
                    maxDuration: matchedPlan.max_duration ? Number(matchedPlan.max_duration) : null,
                    isEnabled: matchedPlan.is_enabled ?? true,
                    allowedHoursStart: matchedPlan.allowed_hours_start || "08:00",
                    allowedHoursEnd: matchedPlan.allowed_hours_end || "22:00",
                    electricityRule: matchedPlan.electricity_rule || "Included in rent",
                    notes: matchedPlan.notes || null,
                  },
                ],
              };
            }
          }
        }
      } catch {
        // Fallback failed
      }
    }

    if (!roomType || !roomType.ratePlans?.[0]) {
      return NextResponse.json(
        { error: "Selected room or rate plan could not be located." },
        { status: 404 }
      );
    }

    const ratePlan = roomType.ratePlans[0];

    // 3. Recalculate price strictly on the server
    const pricing = calculateBookingPricing({
      ratePlan,
      durationType: durationType as DurationType,
      durationCount: Number(durationCount),
      startDateStr: startDate,
      startTimeStr: startTime,
      includeFood: Boolean(includeFood),
    });

    if (!pricing.success) {
      return NextResponse.json({ error: pricing.error }, { status: 400 });
    }

    const { breakdown } = pricing;

    // Check guest count within capacity
    if (guestCount > roomType.maxCapacity) {
      return NextResponse.json(
        { error: `Maximum guest capacity for this room is ${roomType.maxCapacity}.` },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUser();
    let prismaUserId: string | null = null;
    if (currentUser?.id) {
      const existingUser = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { id: true },
      });
      prismaUserId = existingUser?.id || null;
    }

    // 4. Generate unique human-readable booking reference
    const refCode = crypto.randomBytes(3).toString("hex").toUpperCase();
    const bookingReference = `STY-${new Date().getFullYear()}-${refCode}`;

    const startDateTime = new Date(breakdown.startDateTime);
    const endDateTime = new Date(breakdown.endDateTime);

    if (unitId) {
      const existingUnit = await prisma.inventoryUnit.findUnique({
        where: { id: unitId },
        select: { id: true },
      });
      if (!existingUnit) {
        unitId = undefined;
      }
    }

    if (!unitId) {
      const availableUnits = await findAvailableUnits(roomType.id, startDateTime, endDateTime);
      if (availableUnits.length > 0) {
        unitId = availableUnits[0].unitId;
      }
    }

    // 5. Create Booking in atomic transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingReference,
          userId: prismaUserId,
          propertyId: roomType.propertyId,
          roomTypeId: roomType.id,
          inventoryUnitId: unitId,
          durationType,
          startTime: startDateTime,
          endTime: endDateTime,
          durationCount: Number(durationCount),
          guestCount: Number(guestCount),
          guestName,
          guestEmail,
          guestPhone,
          specialRequests: specialRequests || null,
          basePrice: breakdown.baseAmount,
          foodCharges: breakdown.foodCharge,
          taxes: breakdown.taxes,
          depositAmount: breakdown.depositAmount,
          totalAmount: breakdown.totalAmount,
          payableNow: breakdown.payableNow,
          balanceRemaining: breakdown.balanceRemaining,
          status: "PENDING",
          paymentStatus: "UNPAID",
        },
      });

      // If yearly installment schedule exists, persist schedules
      if (breakdown.schedule && breakdown.schedule.length > 0) {
        for (const item of breakdown.schedule) {
          await tx.paymentSchedule.create({
            data: {
              bookingId: newBooking.id,
              dueDate: new Date(item.dueDate),
              amount: item.amount,
              description: item.description,
              status: "PENDING",
            },
          });
        }
      }

      return newBooking;
    });

    // 6. Initiate Payment
    const paymentInit = await PaymentAdapter.initiatePayment({
      bookingId: booking.id,
      amount: breakdown.payableNow,
      currency: "INR",
      customerEmail: guestEmail,
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      payableNow: breakdown.payableNow,
      currency: "INR",
      paymentDetails: paymentInit,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
