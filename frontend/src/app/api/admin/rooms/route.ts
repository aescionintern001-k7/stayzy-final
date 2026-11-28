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
      backendRes = await fetch(`${getServerBackendUrl()}/admin/rooms`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Admin rooms service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to load admin rooms." },
        { status: backendRes.status >= 400 ? backendRes.status : 502, headers: NO_STORE_HEADERS }
      );
    }

    const roomTypes = data.data?.room_types || data.data?.roomTypes || data.data?.rooms || [];
    return NextResponse.json(
      { success: true, roomTypes, source: "express_backend" },
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
    const {
      propertyId,
      name,
      slug,
      category,
      description,
      sizeSqFt,
      baseCapacity,
      maxCapacity,
      hasAc,
      bathroomType,
      foodIncluded,
      foodDetails,
      keyAmenities,
      images,
    } = body;

    if (!propertyId || !name || !category) {
      return NextResponse.json(
        { error: "Property ID, room name, and category are required." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const payload: Record<string, unknown> = {
      property_id: propertyId,
      name: String(name).trim(),
      ...(slug ? { slug: String(slug).trim() } : {}),
      category,
      description: description || "",
      size_sq_ft: Number(sizeSqFt) || 220,
      base_capacity: Number(baseCapacity) || 1,
      max_capacity: Number(maxCapacity) || 2,
      has_ac: Boolean(hasAc),
      bathroom_type: bathroomType || "ATTACHED",
      food_included: Boolean(foodIncluded),
      ...(foodDetails ? { food_details: String(foodDetails) } : {}),
      amenities: Array.isArray(keyAmenities) ? keyAmenities : [],
      images: Array.isArray(images) ? images : [],
    };

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/admin/rooms`, {
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
        { error: "Admin rooms service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to save room type." },
        { status: backendRes.status >= 400 ? backendRes.status : 400, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        roomType: data.data?.room_type || data.data?.roomType || data.data,
        message: "Room type saved successfully.",
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
