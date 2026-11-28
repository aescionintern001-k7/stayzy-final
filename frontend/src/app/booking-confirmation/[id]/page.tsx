import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { JWT_COOKIE_NAME } from "@/lib/auth";
import { getServerBackendUrl } from "@/lib/api/config";
import { Footer } from "@/components/common/Footer";
import { PrintReceiptButton } from "@/components/common/PrintReceiptButton";
import { StayzyLogo } from "@/components/common/StayzyLogo";
import {
  CheckCircle2,
  CalendarCheck,
  MapPin,
  Clock,
  Printer,
  Calendar,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  User,
  Phone,
  Mail,
  Home,
} from "lucide-react";
export const dynamic = "force-dynamic";

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let booking: any = null;
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (UUID_REGEX.test(id)) {
    try {
      const cookieStore = await cookies();
      const token =
        cookieStore.get(JWT_COOKIE_NAME)?.value || cookieStore.get("token")?.value;
      if (token && token.includes(".")) {
        const res = await fetch(`${getServerBackendUrl()}/bookings/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          const b = json.data?.booking || json.data;
          if (b) {
            booking = {
              id: b.id,
              bookingReference: b.booking_reference || b.id,
              guestEmail: b.guest_email || b.guest?.email || "guest@stayzy.in",
              roomType: { name: b.room_type_name || b.property_title || "Stayzy Suite" },
              inventoryUnit: b.inventory_unit_label ? { identifier: b.inventory_unit_label } : null,
              property: {
                name: b.property_title || "Stayzy Property",
                address: b.property_address || b.property_city || "",
              },
              startTime: new Date(b.start_time || b.check_in_date || Date.now()),
              endTime: new Date(b.end_time || b.check_out_date || Date.now()),
              durationCount: Number(b.duration_count || 1),
              durationType: String(b.duration_type || "MONTHLY"),
              basePrice: Number(b.base_price ?? b.total_price ?? 0),
              foodCharges: Number(b.food_charges ?? 0),
              taxes: Number(b.taxes ?? 0),
              depositAmount: Number(b.deposit_amount ?? 0),
              payableNow: Number(b.payable_now ?? b.total_price ?? 0),
              totalAmount: Number(b.total_price ?? 0),
              balanceRemaining: Number(b.balance_remaining ?? 0),
              paymentStatus: String(b.payment_status || "unpaid").toUpperCase(),
              status: String(b.status || "pending").toUpperCase(),
              keylessPin: b.keyless_pin || null,
              isDemo: Boolean(
                b.is_demo ||
                  b.payment_provider === "DEMO_SIMULATOR" ||
                  String(b.property_title || "").startsWith("[DEMO]") ||
                  String(b.room_type_name || "").startsWith("[DEMO]")
              ),
              paymentSchedules: [],
            };
          }
        }
      }
    } catch {
      // Backend unavailable; do not fall back to SQLite
    }
  }

  if (!booking) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full space-y-8">
        <div className="bg-white rounded-lg border border-[#E8E6DF] p-8 sm:p-12 shadow-card-hover space-y-8">
          {/* Header Banner */}
          <div className="text-center space-y-3 pb-8 border-b border-[#F0EDE4]">
            <div className="flex justify-center pb-2">
              <StayzyLogo variant="dark" size="md" />
            </div>
            <div className="w-16 h-16 rounded-full bg-[#E8F1D5] text-[#123D2B] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="text-xs uppercase font-extrabold tracking-widest text-[#123D2B]">
              Booking Confirmed
            </span>
            {booking.isDemo && (
              <div>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-extrabold tracking-wide">
                  DEMO BOOKING · SIMULATED PAYMENT · NO REAL MONEY CHARGED
                </span>
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#123D2B]">
              You’re all set for Stayzy!
            </h1>
            <p className="text-sm text-[#5E6E65] max-w-md mx-auto">
              A confirmation receipt and keyless check-in instructions have been sent to{" "}
              <strong>{booking.guestEmail}</strong>.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E8E6DF] text-xs font-mono font-bold text-[#192621]">
                <span>Reference:</span>
                <span className="text-[#123D2B] text-sm">{booking.bookingReference}</span>
              </div>
              <PrintReceiptButton />
            </div>
          </div>

          {/* Key Stay Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E8E6DF] space-y-3">
              <h3 className="font-bold text-sm text-[#123D2B] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#123D2B]" />
                Assigned Room & Location
              </h3>
              <div className="space-y-1 text-[#4A5550]">
                <p className="font-extrabold text-sm text-[#192621]">{booking.roomType.name}</p>
                {booking.inventoryUnit && (
                  <p className="text-[#123D2B] font-semibold">
                    Unit: {booking.inventoryUnit.identifier}
                  </p>
                )}
                <p>{booking.property.name}</p>
                <p className="text-[11px] text-[#7B8B82]">{booking.property.address}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E8E6DF] space-y-3">
              <h3 className="font-bold text-sm text-[#123D2B] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#123D2B]" />
                Dates & Timings
              </h3>
              <div className="space-y-1.5 text-[#4A5550]">
                <div>
                  <span className="font-bold text-[#192621] block">Check-in:</span>
                  <span>
                    {booking.startTime.toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    at {booking.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#192621] block">Check-out:</span>
                  <span>
                    {booking.endTime.toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    at {booking.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Receipt Summary */}
          <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-[#E8E6DF] space-y-4 text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-[#E8E6DF]">
              <span className="font-bold text-sm text-[#123D2B]">Payment Receipt</span>
              <span className="px-2.5 py-1 rounded-full bg-[#E8F1D5] text-[#123D2B] font-bold text-[11px]">
                Payment Status: {booking.paymentStatus}
              </span>
            </div>

            <div className="space-y-2 text-[#5E6E65]">
              <div className="flex justify-between">
                <span>Base Rent ({booking.durationCount} {booking.durationType.toLowerCase()}s):</span>
                <span className="font-semibold text-[#192621]">₹{booking.basePrice.toLocaleString("en-IN")}</span>
              </div>
              {booking.foodCharges > 0 && (
                <div className="flex justify-between">
                  <span>Home Meals:</span>
                  <span className="font-semibold text-[#192621]">₹{booking.foodCharges.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST & Taxes (12%):</span>
                <span className="font-semibold text-[#192621]">₹{booking.taxes.toLocaleString("en-IN")}</span>
              </div>
              {booking.depositAmount > 0 && (
                <div className="flex justify-between text-[#123D2B] font-semibold">
                  <span>Security Deposit (100% Refundable):</span>
                  <span>₹{booking.depositAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#E8E6DF] flex justify-between text-sm font-extrabold text-[#123D2B]">
                <span>Total Amount Paid:</span>
                <span>₹{booking.totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#F0EDE4]">
            <Link
              href={`/dashboard/bookings/${booking.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#123D2B] text-white font-bold text-xs hover:bg-[#0E2F21] transition-colors"
            >
              <CalendarCheck className="w-4 h-4" />
              Manage Booking in Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/rooms"
              className="text-xs font-bold text-[#5E6E65] hover:text-[#123D2B]"
            >
              Explore More Rooms
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
