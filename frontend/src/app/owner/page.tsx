"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  PlusCircle,
  Users,
  DoorOpen,
  TrendingUp,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export default function OwnerDashboardPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOwnerData() {
      try {
        setLoading(true);
        const [propsRes, visitsRes, bookingsRes, authRes] = await Promise.all([
          fetch("/api/owner/properties"),
          fetch("/api/owner/visits"),
          fetch("/api/owner/bookings"),
          fetch("/api/auth/me"),
        ]);

        if (propsRes.ok) {
          const d = await propsRes.json();
          if (d.properties) setProperties(d.properties);
        }
        if (visitsRes.ok) {
          const d = await visitsRes.json();
          if (d.visits) setVisits(d.visits);
        }
        if (bookingsRes.ok) {
          const d = await bookingsRes.json();
          if (d.bookings) setBookings(d.bookings);
        }
        if (authRes.ok) {
          const a = await authRes.json();
          if (a.user) setUser(a.user);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadOwnerData();
  }, []);

  const totalBeds = properties.length * 24;
  const occupiedBeds = bookings.length ? Math.min(bookings.length * 8, totalBeds) : 0;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const partnerFirstName = user?.name?.split(" ")[0] || "Partner";

  return (
    <div className="space-y-6">
      {/* 1. Welcome Hero Banner (Unified Soft Ivory + Pale Green + Crisp Interior Photo) */}
      <section className="relative rounded-[22px] border border-[#DCE5D5] bg-gradient-to-r from-[#F4FAF0] via-[#EDF5E6] to-[#F7FBF3] overflow-hidden shadow-[0_14px_36px_-18px_rgba(6,75,53,0.14)] grid grid-cols-1 lg:grid-cols-12 min-h-[235px]">
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="pointer-events-none hidden sm:block absolute bottom-0 left-0 w-24 h-24 text-[#009B69]/20 z-10"
          aria-hidden="true"
        >
          <path
            d="M8 114C20 82 36 52 58 24M24 90C10 74 10 54 24 44C36 54 38 74 24 90ZM42 64C58 58 68 42 62 28C46 32 38 48 42 64Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <div className="relative z-10 lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center space-y-3.5">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[9999px] bg-white border border-[#E2E8DC] text-[12px] font-bold text-[#17251F] shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-[#009B69]" aria-hidden="true" />
              <span>Verified PG Partner Hub</span>
            </span>
          </div>

          <h1 className="text-[26px] sm:text-[34px] font-extrabold text-[#17251F] tracking-tight leading-[1.15]">
            Welcome back, <span className="text-[#009B69]">{partnerFirstName}!</span>
          </h1>

          <p className="text-[13.5px] sm:text-[14.5px] text-[#4C5C54] font-medium leading-relaxed max-w-[500px]">
            Manage your co-living properties, monitor tenant occupancy, view prospective resident
            visits, and list new rooms across Bengaluru.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/owner/properties/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#064B35] hover:bg-[#043827] text-white text-[13px] font-bold shadow-[0_8px_18px_-6px_rgba(6,75,53,0.45)] transition-all duration-200 w-full sm:w-auto"
            >
              <PlusCircle className="w-4 h-4 text-[#E8F4DF]" aria-hidden="true" />
              <span>List New PG Property</span>
            </Link>

            <Link
              href="/owner/properties"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] bg-white hover:bg-[#FAF9F4] text-[#17251F] border border-[#D7DDD2] text-[13px] font-bold transition-all duration-200 w-full sm:w-auto"
            >
              <span>View All Properties ({properties.length})</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#064B35]" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="relative lg:col-span-5 min-h-[200px] lg:min-h-full overflow-hidden">
          <img
            src="/images/rooms/twin-sharing-main.webp?v=5"
            alt="Stayzy verified partner property interior"
            className="w-full h-full object-cover object-center"
          />
          <div
            className="hidden lg:block absolute inset-y-0 left-0 w-24 pointer-events-none"
            style={{
              background: "linear-gradient(to right, #EFF6E8 0%, rgba(239, 246, 232, 0) 100%)",
            }}
          />
        </div>
      </section>

      {/* 2. KPI Stats Grid (Unified Clean White Rounded Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white p-5 rounded-[20px] border border-[#E6EAE2] shadow-[0_10px_28px_-16px_rgba(23,37,31,0.08)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5F6F67]">
              Listed Properties
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#EDF5E9] text-[#064B35] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-extrabold text-[#17251F] leading-tight">
            {loading ? "—" : properties.length}
          </div>
          <span className="text-[11.5px] text-[#009B69] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            100% Verified &amp; Active
          </span>
        </div>

        <div className="bg-white p-5 rounded-[20px] border border-[#E6EAE2] shadow-[0_10px_28px_-16px_rgba(23,37,31,0.08)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5F6F67]">
              Total Bed Inventory
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#EDF5E9] text-[#064B35] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-extrabold text-[#064B35] leading-tight">
            {loading ? "—" : `${totalBeds} Beds`}
          </div>
          <span className="text-[11.5px] text-[#5F6F67]">Across all room categories</span>
        </div>

        <div className="bg-white p-5 rounded-[20px] border border-[#E6EAE2] shadow-[0_10px_28px_-16px_rgba(23,37,31,0.08)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5F6F67]">
              Occupancy Rate
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#EDF5E9] text-[#009B69] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-extrabold text-[#009B69] leading-tight">
            {loading ? "—" : `${occupancyRate}%`}
          </div>
          <span className="text-[11.5px] text-[#5F6F67]">
            {occupiedBeds} of {totalBeds} beds occupied
          </span>
        </div>

        <div className="bg-white p-5 rounded-[20px] border border-[#E6EAE2] shadow-[0_10px_28px_-16px_rgba(23,37,31,0.08)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5F6F67]">
              Walkthrough Visits
            </span>
            <div className="w-8 h-8 rounded-[10px] bg-[#FEF3C7] text-[#92400E] flex items-center justify-center">
              <DoorOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-[28px] font-extrabold text-[#B45309] leading-tight">
            {loading ? "—" : visits.length}
          </div>
          <span className="text-[11.5px] text-[#92400E] font-bold">Upcoming tenant tours</span>
        </div>
      </div>

      {/* 3. My Uploaded PG Properties Grid */}
      <section className="bg-white rounded-[20px] border border-[#E6EAE2] shadow-[0_12px_32px_-16px_rgba(23,37,31,0.08)] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 bg-[#F2F7EC] border-b border-[#E6EAE2] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-extrabold text-[#17251F]">
              My Uploaded PG Properties
            </h2>
            <p className="text-xs text-[#5F6F67]">
              Your active buildings listed on Stayzy public catalog.
            </p>
          </div>
          <Link
            href="/owner/properties/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-[#064B35] text-white text-xs font-bold hover:bg-[#043827] transition-colors shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#E8F4DF]" />
            <span>Add Property</span>
          </Link>
        </div>

        <div className="p-5 sm:p-6">
          {properties.length === 0 && !loading ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-bold text-[#17251F]">No properties listed yet</p>
              <Link
                href="/owner/properties/new"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#064B35] underline"
              >
                Upload your first PG property
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {properties.slice(0, 4).map((p: any) => (
                <div
                  key={p.id}
                  className="rounded-[18px] border border-[#E6EAE2] bg-[#FAF9F4] overflow-hidden flex flex-col justify-between hover:shadow-[0_16px_32px_-14px_rgba(6,75,53,0.14)] hover:border-[#009B69]/40 transition-all duration-200"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-[#EDF5E9]">
                    <img
                      src={p.coverImage || p.images?.[0] || "/images/rooms/private-room-main.webp?v=5"}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-[9999px] bg-[#064B35]/90 text-white text-[10.5px] font-bold uppercase tracking-wider">
                      {p.city} • {p.status || "APPROVED"}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <h3 className="text-[15.5px] font-extrabold text-[#17251F]">{p.name}</h3>
                      <div className="text-xs text-[#5F6F67] flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-[#009B69] shrink-0" />
                        <span className="truncate">{p.address}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#EEF2EA] flex items-center justify-between text-xs">
                      <span className="font-extrabold text-[#064B35]">
                        Starting ₹{p.monthlyRentStart || "11,500"} / mo
                      </span>
                      <Link
                        href="/rooms"
                        className="text-[#009B69] hover:text-[#064B35] font-bold hover:underline flex items-center gap-1"
                      >
                        <span>View in Catalog</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Scheduled Tenant Visits Section */}
      <section className="bg-white rounded-[20px] border border-[#E6EAE2] shadow-[0_12px_32px_-16px_rgba(23,37,31,0.08)] overflow-hidden">
        <div className="px-5 sm:px-6 py-4 bg-[#F2F7EC] border-b border-[#E6EAE2] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-white border border-[#DCE5D5] text-[#064B35] flex items-center justify-center">
              <DoorOpen className="w-4 h-4" />
            </div>
            <h2 className="text-[16px] font-extrabold text-[#17251F]">
              Prospective Tenant Visits
            </h2>
          </div>
          <Link
            href="/owner/visits"
            className="text-xs font-bold text-[#009B69] hover:text-[#064B35] hover:underline"
          >
            View All ({visits.length})
          </Link>
        </div>

        <div className="p-5 sm:p-6 space-y-3">
          {visits.length === 0 && !loading ? (
            <p className="text-xs text-[#5F6F67] text-center py-6">
              No scheduled walkthrough visits at the moment.
            </p>
          ) : (
            visits.slice(0, 3).map((v: any) => (
              <div
                key={v.id}
                className="p-4 rounded-[14px] bg-[#FAF9F4] border border-[#E6EAE2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-extrabold text-[#17251F] text-sm">
                    {v.fullName || "Prospective Tenant"}
                  </div>
                  <div className="text-[#5F6F67] text-[11.5px] mt-0.5">
                    {v.email} • {v.phone}
                  </div>
                  <div className="text-[#5F6F67] text-[11.5px] mt-0.5">
                    Note: {v.notes || "Requested afternoon walkthrough."}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="sm:text-right">
                    <div className="font-bold text-[#064B35]">{v.visitDate}</div>
                    <div className="text-[11px] text-[#5F6F67]">{v.visitTime}</div>
                  </div>
                  <span className="px-3 py-1 rounded-[9999px] bg-[#D9EED0] text-[#064B35] text-[10.5px] font-extrabold uppercase">
                    {v.status || "CONFIRMED"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
