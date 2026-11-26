import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_TIME_SLOTS = new Set([
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "10:00 AM - 12:00 PM",
  "11:00 AM - 01:00 PM",
  "12:00 PM - 03:00 PM",
  "03:00 PM - 06:00 PM",
  "06:00 PM - 08:00 PM",
]);

function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const localTen = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(localTen)) return null;
  return `+91 ${localTen.slice(0, 5)} ${localTen.slice(5)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      customerName,
      customerEmail,
      customerPhone,
      preferredDate,
      timeSlot,
      notes,
    } = body;

    const trimmedName = typeof customerName === "string" ? customerName.trim() : "";
    const trimmedEmail = typeof customerEmail === "string" ? customerEmail.trim() : "";
    const trimmedPhone = typeof customerPhone === "string" ? customerPhone.trim() : "";
    const trimmedSlot = typeof timeSlot === "string" ? timeSlot.trim() : "";

    if (!propertyId || !trimmedName || !trimmedPhone || !preferredDate || !trimmedSlot) {
      return NextResponse.json(
        { error: "Please fill in location, date, time slot, full name, and mobile phone." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeIndianPhone(trimmedPhone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit Indian mobile number (with or without +91)." },
        { status: 400 }
      );
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TIME_SLOTS.has(trimmedSlot)) {
      return NextResponse.json(
        { error: "Selected walkthrough slot must fall within 10 AM to 7 PM operating hours." },
        { status: 400 }
      );
    }

    const parsedDate = new Date(preferredDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid preferred date provided." }, { status: 400 });
    }
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    if (parsedDate < todayMidnight) {
      return NextResponse.json(
        { error: "Preferred walkthrough date cannot be in the past." },
        { status: 400 }
      );
    }

    // Resolve either primary key ID or URL slug to guarantee valid Property foreign key
    const matchedProperty = await prisma.property.findFirst({
      where: {
        OR: [{ id: propertyId }, { slug: propertyId }],
      },
      select: { id: true, name: true, city: true, address: true },
    });

    if (!matchedProperty) {
      return NextResponse.json(
        { error: "Selected property location was not found. Please pick a valid Stayzy residence." },
        { status: 400 }
      );
    }

    const visit = await prisma.visitRequest.create({
      data: {
        propertyId: matchedProperty.id,
        customerName: trimmedName,
        customerEmail: trimmedEmail,
        customerPhone: normalizedPhone,
        preferredDate: parsedDate,
        timeSlot: trimmedSlot,
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
        status: "SCHEDULED",
      },
    });

    return NextResponse.json({
      success: true,
      visit: {
        ...visit,
        propertyName: matchedProperty.name,
        propertyCity: matchedProperty.city,
      },
      message: "Visit successfully scheduled! Our Community Host will call you shortly to confirm.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to schedule visit." }, { status: 500 });
  }
}
