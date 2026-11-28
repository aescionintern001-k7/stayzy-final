import { NextResponse } from "next/server";
import { backendPropertyToFrontendRoom } from "@/lib/api/adapters";
import { getServerBackendUrl } from "@/lib/api/config";
import { BackendProperty } from "@/lib/api/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const locality = searchParams.get("locality");
    const minBudget = searchParams.get("minBudget") ? Number(searchParams.get("minBudget")) : undefined;
    const maxBudget = searchParams.get("maxBudget") ? Number(searchParams.get("maxBudget")) : undefined;
    const availableOnly = searchParams.get("availableOnly") === "true";
    const sortBy = searchParams.get("sortBy") || "recommended";

    const backendQuery = new URLSearchParams();
    if (city && city !== "ALL" && city.trim() !== "") {
      backendQuery.set("city", city.trim());
    }
    if (locality && locality !== "ALL" && locality.trim() !== "") {
      backendQuery.set("location", locality.trim());
    }
    if (minBudget !== undefined && minBudget > 0) {
      backendQuery.set("min_price", String(minBudget));
    }
    if (maxBudget !== undefined && maxBudget > 0) {
      backendQuery.set("max_price", String(maxBudget));
    }
    if (sortBy === "price_asc" || sortBy === "price_desc" || sortBy === "newest") {
      backendQuery.set("sort_by", sortBy);
    }
    backendQuery.set("limit", "50");

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/properties/search?${backendQuery.toString()}`, {
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Room catalog service is unavailable. Please ensure the backend server is running.",
          rooms: [],
          total: 0,
        },
        { status: 503 }
      );
    }

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: errData.message || errData.error || "Failed to fetch rooms from backend.",
          rooms: [],
          total: 0,
        },
        { status: backendRes.status >= 400 ? backendRes.status : 502 }
      );
    }

    const backendData = await backendRes.json();
    const properties: BackendProperty[] = backendData.data?.properties || [];

    const adaptedRooms = properties.map((p) => {
      const adapted = backendPropertyToFrontendRoom(p);
      return {
        ...adapted,
        isAvailable: p.is_available ?? true,
        availableCount: p.is_available ? 3 : 0,
      };
    });

    const filtered = availableOnly ? adaptedRooms.filter((r) => r.isAvailable) : adaptedRooms;

    return NextResponse.json({
      success: true,
      rooms: filtered,
      total: filtered.length,
      source: "express_backend",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch rooms.", rooms: [], total: 0 },
      { status: 500 }
    );
  }
}
