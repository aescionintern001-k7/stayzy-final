import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      roomTypeId,
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

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
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

    const preferredDateYmd = /^\d{4}-\d{2}-\d{2}$/.test(String(preferredDate).trim())
      ? String(preferredDate).trim()
      : parsedDate.toISOString().split("T")[0];

    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    const payload: Record<string, unknown> = {
      ...(UUID_REGEX.test(String(propertyId))
        ? { property_id: propertyId }
        : { room_slug: String(propertyId) }),
      ...(roomTypeId && UUID_REGEX.test(String(roomTypeId)) ? { room_type_id: roomTypeId } : {}),
      customer_name: trimmedName,
      customer_phone: normalizedPhone,
      customer_email: trimmedEmail,
      preferred_date: preferredDateYmd,
      time_slot: trimmedSlot,
      ...(notes ? { notes: String(notes).trim() } : {}),
    };

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/visits/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && token.includes(".") ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Visit scheduling service is unavailable. Please ensure the backend server is running." },
        { status: 503 }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to schedule visit." },
        { status: backendRes.status >= 400 ? backendRes.status : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      visit: data.data?.visit || data.data || data.visit,
      message: data.message || "Visit scheduled successfully.",
      source: "express_backend",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to schedule visit." },
      { status: 500 }
    );
  }
}
