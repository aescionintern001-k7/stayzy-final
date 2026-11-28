import { NextResponse } from "next/server";
import { backendPropertyToFrontendRoom } from "@/lib/api/adapters";
import { getServerBackendUrl } from "@/lib/api/config";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/properties/${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Room details service is unavailable. Please ensure the backend server is running." },
        { status: 503 }
      );
    }

    if (backendRes.status === 404) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.message || errData.error || "Failed to fetch room details." },
        { status: backendRes.status >= 400 ? backendRes.status : 502 }
      );
    }

    const data = await backendRes.json();
    const property = data.data?.property || data.data;
    if (!property) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    const adapted = backendPropertyToFrontendRoom(property);
    return NextResponse.json({
      success: true,
      room: adapted,
      source: "express_backend",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch room details." }, { status: 500 });
  }
}
