"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Footer } from "@/components/common/Footer";
import { StayzyLogo } from "@/components/common/StayzyLogo";
import { PrintReceiptButton } from "@/components/common/PrintReceiptButton";
import { BotanicalDecorations } from "@/components/common/BotanicalDecorations";
import {
  CheckCircle2,
  CalendarCheck,
  MapPin,
  Clock,
  ArrowRight,
  User,
  ShieldCheck,
} from "lucide-react";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") || "";
  const refParam = searchParams.get("ref") || "STY-CONFIRMED";
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("stayzy_bookings");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const matched = list.find(
            (b: any) =>
              (bookingId && b.id === bookingId) ||
              (refParam && b.bookingReference === refParam)
          );
          if (matched) setBooking(matched);
        }
      }
    } catch {}
  }, [bookingId, refParam]);

  const ref = booking?.bookingReference || refParam;

  return (
    <main className="relative z-10 flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-12 w-full">
      <div className="bg-white rounded-[24px] border border-[#E9E3D5] p-6 sm:p-10 shadow-[0_14px_38px_-14px_rgba(16,44,43,0.10)] space-y-8">
        <div className="text-center space-y-3 pb-7 border-b border-[#EFEAE0]">
          <div className="flex justify-center pb-1">
            <StayzyLogo variant="dark" size="md" />
          </div>

          <div className="w-16 h-16 rounded-full bg-[#EAF5E4] text-[#064E38] flex items-center justify-center mx-auto shadow-xs border border-[#CBE4C3]">
            <CheckCircle2 className="w-9 h-9 text-[#087B50]" />
          </div>

          <span className="inline-block px-3 py-1 rounded-full bg-[#EAF5E4] text-[#064E38] text-[11px] uppercase font-extrabold tracking-widest">
            Booking Confirmed
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-[#064E38]">
            You’re all set for Stayzy!
          </h1>
          <p className="text-sm text-[#4A6158] max-w-md mx-auto">
            {booking?.guestEmail ? (
              <>
                A confirmation receipt and keyless check-in instructions are ready for{" "}
                <strong className="text-[#102C2B]">{booking.guestEmail}</strong>.
              </>
            ) : (
              "Your reservation has been confirmed and keyless check-in instructions are ready in your dashboard."
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FAF6EC] border border-[#E9E3D5] text-xs font-mono font-bold text-[#102C2B]">
              <span>Reference:</span>
              <span className="text-[#064E38] text-sm">{ref}</span>
            </div>
            <PrintReceiptButton />
          </div>
        </div>

        {booking && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="p-5 rounded-2xl bg-[#FAF6EC] border border-[#E9E3D5] space-y-2.5">
              <h2 className="font-bold text-sm text-[#064E38] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#087B50]" />
                Assigned Room &amp; Location
              </h2>
              <div className="space-y-1 text-[#4A6158]">
                <p className="font-extrabold text-sm text-[#102C2B]">
                  {booking.roomType?.name || "Stayzy Residence"}
                </p>
                {booking.inventoryUnit?.identifier && (
                  <p className="text-[#087B50] font-bold">
                    Unit: {booking.inventoryUnit.identifier}
                  </p>
                )}
                <p className="font-semibold text-[#102C2B]">{booking.property?.name}</p>
                <p className="text-[11px]">{booking.property?.address}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF6EC] border border-[#E9E3D5] space-y-2.5">
              <h2 className="font-bold text-sm text-[#064E38] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#087B50]" />
                Dates &amp; Payment Summary
              </h2>
              <div className="space-y-1.5 text-[#4A6158]">
                <div>
                  <span className="font-bold text-[#102C2B]">Check-in: </span>
                  <span>
                    {new Date(booking.startTime).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#102C2B]">Check-out: </span>
                  <span>
                    {new Date(booking.endTime).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="pt-1 flex items-center justify-between border-t border-[#E6DFCF]">
                  <span className="inline-flex items-center gap-1 font-bold text-[#064E38]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#087B50]" />
                    Paid Today
                  </span>
                  <span className="text-base font-black text-[#064E38]">
                    ₹{Number(booking.payableNow || booking.totalAmount || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 p-4 rounded-2xl bg-[#EAF5E4]/65 border border-[#CBE4C3] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#064E38]">
                <User className="w-4 h-4 text-[#087B50]" />
                <span className="font-bold">
                  Resident: {booking.guestName} ({booking.guestPhone})
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white text-[#064E38] font-extrabold text-[11px] border border-[#CBE4C3]">
                {booking.status} • {booking.paymentStatus}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#EFEAE0]">
          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#064E38] to-[#087B50] text-white font-bold text-xs hover:brightness-105 transition-all shadow-sm"
          >
            <CalendarCheck className="w-4 h-4" />
            Go to My Bookings
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/explore"
            className="text-xs font-bold text-[#4A6158] hover:text-[#064E38]"
          >
            Explore More Rooms
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function BookingSuccessPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#FFFCF5] overflow-x-hidden">
      <BotanicalDecorations variant="checkout" />
      <Suspense fallback={<div className="p-12 text-center text-xs text-[#5E6E65]">Loading confirmation...</div>}>
        <CheckoutSuccessContent />
      </Suspense>
      <Footer />
    </div>
  );
}
