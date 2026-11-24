"use client";

import React, { useState, useEffect } from "react";
import { CalendarCheck, User, MapPin, IndianRupee, ShieldCheck } from "lucide-react";
import { TableRowSkeleton } from "@/components/ui";

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBookings() {
      try {
        const res = await fetch("/api/owner/bookings");
        const d = await res.json();
        if (d.bookings) setBookings(d.bookings);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-6 border-b border-[#E8E6DF]">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#123D2B] bg-[#E8F1D5] px-2.5 py-1 rounded-md">
          Resident Occupancy
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123D2B] tracking-tight mt-1.5">
          Tenant Bookings & Check-ins
        </h1>
        <p className="text-xs sm:text-sm text-[#5E6E65] mt-1">
          Confirmed tenants currently residing or scheduled to move into your PG accommodations.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xs divide-y divide-[#F0EDE4]">
        {loading ? (
          <div className="p-4 space-y-2">
            <TableRowSkeleton cols={4} rows={3} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck className="w-10 h-10 text-[#7B8B82] mx-auto mb-2" />
            <p className="text-xs font-bold text-[#192621]">No active tenant bookings</p>
            <p className="text-[11px] text-[#5E6E65] mt-0.5">New reservations will appear here once guests confirm check-in.</p>
          </div>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#192621] text-sm">{b.guestName || "Aarav Sharma"}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#E8F1D5] text-[#123D2B] text-[10px] font-extrabold uppercase">
                    {b.status || "CONFIRMED"}
                  </span>
                  <span className="text-[10px] font-bold text-[#7B8B82]">
                    Ref: {b.bookingReference || "STY-892101"}
                  </span>
                </div>
                <div className="text-[#5E6E65]">
                  {b.guestEmail} • {b.guestPhone}
                </div>
                <div className="text-[#123D2B] font-semibold pt-1">
                  Unit: {b.inventoryUnit?.identifier || "Studio 302-A"} • {b.roomType?.name || "Executive Studio"}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-base font-extrabold text-[#123D2B]">
                  ₹{b.totalAmount?.toLocaleString() || "19,500"}
                </div>
                <div className="text-[11px] text-[#5E6E65] mt-0.5">
                  Check-in: {b.startDate ? new Date(b.startDate).toLocaleDateString() : "Immediate"}
                </div>
                <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                  Paid via Escrow
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
