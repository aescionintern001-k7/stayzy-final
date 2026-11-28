import { NextResponse } from "next/server";
import { getServerBackendUrl } from "@/lib/api/config";

export async function GET() {
  try {
    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/cms`, {
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Content service is unavailable. Please ensure the backend server is running.",
        },
        { status: 503 }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || data.error || "Unable to load site content.",
        },
        { status: backendRes.status >= 400 ? backendRes.status : 502 }
      );
    }

    return NextResponse.json({
      success: true,
      content: data.data?.content || data.data || {},
      source: "express_backend",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Unable to load site content." },
      { status: 500 }
    );
  }
}
