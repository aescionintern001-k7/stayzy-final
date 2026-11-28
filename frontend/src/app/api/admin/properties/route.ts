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
      backendRes = await fetch(`${getServerBackendUrl()}/admin/properties`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Admin properties service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to load properties." },
        { status: backendRes.status >= 400 ? backendRes.status : 502, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        properties: data.data?.properties || [],
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

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const token = await getAdminToken(request);
    if (!token) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const body = await request.json();
    const {
      id,
      name,
      tagline,
      description,
      address,
      city,
      state,
      pincode,
      contactPhone,
      contactEmail,
      rules,
      checkInTime,
      checkOutTime,
      coverImage,
      pricePerNight,
    } = body;

    if (!name || !address || !contactPhone || !contactEmail) {
      return NextResponse.json(
        { error: "Name, address, contact phone, and contact email are required." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const baseUrl = getServerBackendUrl();
    const targetUrl = id ? `${baseUrl}/properties/${encodeURIComponent(id)}` : `${baseUrl}/properties`;
    const method = id ? "PATCH" : "POST";

    const payload: Record<string, unknown> = {
      title: String(name).trim(),
      description:
        description && String(description).trim().length >= 10
          ? String(description).trim()
          : `${String(name).trim()} residence in ${city || "Bengaluru"}`,
      address: String(address).trim(),
      city: city || "Bengaluru",
      state: state || "Karnataka",
      postal_code: pincode || "560034",
      ...(tagline !== undefined ? { tagline } : {}),
      ...(rules !== undefined ? { rules } : {}),
      ...(checkInTime ? { check_in_time: checkInTime } : {}),
      ...(checkOutTime ? { check_out_time: checkOutTime } : {}),
      ...(coverImage && /^https?:\/\//i.test(String(coverImage)) ? { images: [String(coverImage).trim()] } : {}),
    };

    if (!id) {
      payload.property_type = "apartment";
      payload.room_type = "private_room";
      payload.country = "India";
      payload.price_per_night = Number(pricePerNight || 1000);
    }

    let backendRes: Response;
    try {
      backendRes = await fetch(targetUrl, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Admin properties service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to save property." },
        { status: backendRes.status >= 400 ? backendRes.status : 400, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        property: data.data?.property || data.data,
        message: id ? "Property updated successfully." : "Property created successfully.",
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
