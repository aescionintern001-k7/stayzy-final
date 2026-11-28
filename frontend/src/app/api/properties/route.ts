import { NextResponse } from "next/server";
import { getServerBackendUrl } from "@/lib/api/config";

/**
 * Public property directory endpoint used by property visit & location selectors.
 * Uses the authoritative Express backend (PostgreSQL) only.
 */
export async function GET() {
  try {
    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/properties?limit=50`, {
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Property directory service is unavailable. Please ensure the backend server is running.",
          properties: [],
        },
        { status: 503 }
      );
    }

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errData.message || errData.error || "Failed to fetch properties.",
          properties: [],
        },
        { status: backendRes.status >= 400 ? backendRes.status : 502 }
      );
    }

    const json = await backendRes.json();
    const list = json.data?.properties || json.properties || [];
    const normalized = Array.isArray(list)
      ? list.map((p: any) => ({
          id: p.id,
          name: p.title || p.name,
          slug: p.slug || p.id,
          city: p.city || "Bengaluru",
          address: p.address || "",
        }))
      : [];

    return NextResponse.json({
      success: true,
      properties: normalized,
      source: "express_backend",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch properties.", properties: [] },
      { status: 500 }
    );
  }
}
