import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";
import { backendBookingToFrontend } from "@/lib/api/adapters";
import { BookingDetailsView } from "./BookingDetailsView";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SingleBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (UUID_REGEX.test(id)) {
    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value || cookieStore.get("token")?.value;

    if (!token || !token.includes(".")) {
      notFound();
    }

    let res: Response;
    try {
      res = await fetch(`${getServerBackendUrl()}/bookings/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      return (
        <div className="bg-white rounded-3xl border border-[#E8E6DF] p-8 text-center space-y-3">
          <h1 className="text-lg font-extrabold text-[#123D2B]">
            Booking service temporarily unavailable
          </h1>
          <p className="text-xs text-[#5E6E65]">
            Unable to load booking details right now. Please try again shortly.
          </p>
          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-[#123D2B] text-white text-xs font-bold"
          >
            Back to Bookings
          </Link>
        </div>
      );
    }

    if (res.status === 401 || res.status === 403 || res.status === 404) {
      notFound();
    }

    if (!res.ok) {
      return (
        <div className="bg-white rounded-3xl border border-[#E8E6DF] p-8 text-center space-y-3">
          <h1 className="text-lg font-extrabold text-[#123D2B]">
            Unable to load booking details
          </h1>
          <p className="text-xs text-[#5E6E65]">
            Please refresh the page or return to your bookings list.
          </p>
          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-[#123D2B] text-white text-xs font-bold"
          >
            Back to Bookings
          </Link>
        </div>
      );
    }

    const json = await res.json();
    const rawBooking = json?.data?.booking || json?.booking || json?.data;
    if (!rawBooking) {
      notFound();
    }

    const adapted = backendBookingToFrontend(rawBooking);
    return <BookingDetailsView booking={adapted} />;
  }

  notFound();
}
