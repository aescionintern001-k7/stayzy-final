import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isUnitAvailable } from "@/lib/inventory";
import { addCalendarMonths, addCalendarYears } from "@/lib/pricing";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const additionalCount = Number(body?.additionalCount ?? 1);
    if (!Number.isInteger(additionalCount) || additionalCount < 1 || additionalCount > 365) {
      return NextResponse.json(
        { error: "additionalCount must be a positive integer." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        roomType: {
          include: {
            ratePlans: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404, headers: NO_STORE_HEADERS });
    }

    const isAdmin = user.role === "ADMIN";
    const isOwner =
      booking.userId === user.id ||
      (!!booking.guestEmail &&
        booking.guestEmail.toLowerCase() === user.email.toLowerCase());
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: "Access denied. You do not own this booking." },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot extend a cancelled booking." }, { status: 400 });
    }

    const currentEnd = new Date(booking.endTime);
    let newEnd: Date;
    let extensionRate = 0;

    const ratePlan = booking.roomType.ratePlans.find(
      (r) => r.durationType === booking.durationType
    );

    if (!ratePlan) {
      return NextResponse.json({ error: "Rate plan for extension not found." }, { status: 400 });
    }

    if (booking.durationType === "HOURLY") {
      newEnd = new Date(currentEnd.getTime() + additionalCount * 60 * 60 * 1000);
      extensionRate = ratePlan.price * additionalCount;
    } else if (booking.durationType === "DAILY") {
      newEnd = new Date(currentEnd.getTime() + additionalCount * 24 * 60 * 60 * 1000);
      extensionRate = ratePlan.price * additionalCount;
    } else if (booking.durationType === "WEEKLY") {
      newEnd = new Date(currentEnd.getTime() + additionalCount * 7 * 24 * 60 * 60 * 1000);
      extensionRate = ratePlan.price * additionalCount;
    } else if (booking.durationType === "MONTHLY") {
      const { resultDate } = addCalendarMonths(currentEnd, additionalCount);
      newEnd = resultDate;
      newEnd.setHours(11, 0, 0);
      extensionRate = (ratePlan.price + (ratePlan.foodMonthlyCharge || 0)) * additionalCount;
    } else if (booking.durationType === "YEARLY") {
      const { resultDate } = addCalendarYears(currentEnd, 1);
      newEnd = resultDate;
      newEnd.setHours(11, 0, 0);
      extensionRate = (ratePlan.price + (ratePlan.foodMonthlyCharge || 0)) * 12;
    } else {
      return NextResponse.json({ error: "Unsupported duration for extension." }, { status: 400 });
    }

    // Recheck availability for the extended window [currentEnd, newEnd]
    if (booking.inventoryUnitId) {
      const available = await isUnitAvailable(
        booking.inventoryUnitId,
        currentEnd,
        newEnd
      );

      if (!available) {
        return NextResponse.json(
          {
            error:
              "The room or bed is booked or blocked for the requested extension period.",
          },
          { status: 409 }
        );
      }
    }

    const additionalTax = Math.round(extensionRate * 0.12);
    const additionalTotal = extensionRate + additionalTax;

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id },
        data: {
          endTime: newEnd,
          durationCount: booking.durationCount + additionalCount,
          basePrice: booking.basePrice + extensionRate,
          taxes: booking.taxes + additionalTax,
          totalAmount: booking.totalAmount + additionalTotal,
          payableNow: booking.payableNow + additionalTotal,
        },
      });

      // Update booking item
      if (booking.inventoryUnitId) {
        await tx.bookingItem.updateMany({
          where: { bookingId: b.id },
          data: { endTime: newEnd },
        });
      }

      // Record extension payment
      await tx.payment.create({
        data: {
          bookingId: b.id,
          amount: additionalTotal,
          currency: "INR",
          status: "SUCCESS",
          provider: "DEMO_ADAPTER",
          transactionRef: `TXN_EXT_${Date.now()}`,
          isDemo: true,
        },
      });

      return b;
    });

    return NextResponse.json(
      {
        success: true,
        booking: updated,
        additionalTotal,
        newEndTime: newEnd.toISOString(),
        message: `Booking successfully extended! New checkout: ${newEnd.toLocaleDateString("en-IN")}.`,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to extend booking.";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
