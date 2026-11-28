import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin, JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, private" };

const DEFAULT_SETTINGS = {
  propertyName: "Stayzy Living",
  timezone: "Asia/Kolkata",
  currency: "INR",
  currencySymbol: "₹",
  gstRatePercent: 12,
  cleaningBufferMinutes: 60,
  holdExpiryMinutes: 15,
  defaultCheckInTime: "12:00 PM",
  defaultCheckOutTime: "11:00 AM",
  supportEmail: "support@stayzy.in",
  supportPhone: "+91 80 4567 8900",
  demoModeActive: true,
  enableSignedWebhooks: true,
};

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
      backendRes = await fetch(`${getServerBackendUrl()}/admin/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Admin settings service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to load settings." },
        { status: backendRes.status >= 400 ? backendRes.status : 502, headers: NO_STORE_HEADERS }
      );
    }

    const remoteSettings = data.data?.settings?.platform_config || data.data?.settings || data.data || {};
    const settings = { ...DEFAULT_SETTINGS, ...(typeof remoteSettings === "object" ? remoteSettings : {}) };

    return NextResponse.json({ success: true, settings, source: "express_backend" }, { headers: NO_STORE_HEADERS });
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

    let backendRes: Response;
    try {
      backendRes = await fetch(`${getServerBackendUrl()}/admin/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: "platform_config",
          value: body,
          is_public: true,
        }),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Admin settings service is unavailable. Please ensure the backend server is running." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Unable to save settings." },
        { status: backendRes.status >= 400 ? backendRes.status : 400, headers: NO_STORE_HEADERS }
      );
    }

    const saved = data.data?.setting?.value || data.data?.settings || { ...DEFAULT_SETTINGS, ...body };
    return NextResponse.json(
      { success: true, settings: saved, message: "Settings saved successfully.", source: "express_backend" },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
