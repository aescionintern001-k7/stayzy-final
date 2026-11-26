"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Footer } from "@/components/common/Footer";
import {
  CheckCircle2,
  CalendarCheck,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "STY-CONFIRMED";

  return (
    <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full">
      <div className="bg-white rounded-3xl border border-[#E8E6DF] p-8 sm:p-12 shadow-card-hover space-y-8">
        <div className="text-center space-y-3 pb-8 border-b border-[#F0EDE4]">
          <div className="w-16 h-16 rounded-full bg-[#E8F1D5] text-[#123D2B] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="text-xs uppercase font-extrabold tracking-widest text-[#123D2B]">
            Booking Confirmed
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#123D2B]">
            You’re all set for Stayzy!
          </h1>
          <p className="text-sm text-[#5E6E65] max-w-md mx-auto">
            Your reservation has been confirmed and keyless check-in instructions are ready in your dashboard.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E8E6DF] text-xs font-mono font-bold text-[#192621]">
            <span>Reference:</span>
            <span className="text-[#123D2B] text-sm">{ref}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#F0EDE4]">
          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#123D2B] text-white font-bold text-xs hover:bg-[#0E2F21] transition-colors"
          >
            <CalendarCheck className="w-4 h-4" />
            Go to My Bookings
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/explore"
            className="text-xs font-bold text-[#5E6E65] hover:text-[#123D2B]"
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
    <div className="min-h-screen flex flex-col bg-white">
      <Suspense fallback={<div className="p-12 text-center text-xs text-[#5E6E65]">Loading confirmation...</div>}>
        <CheckoutSuccessContent />
      </Suspense>
      <Footer />
    </div>
  );
}
