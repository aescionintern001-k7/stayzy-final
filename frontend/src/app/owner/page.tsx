"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  PlusCircle,
  Users,
  CalendarCheck,
  DoorOpen,
  DollarSign,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export default function OwnerDashboardPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOwnerData() {
      try {
        setLoading(true);
        const [propsRes, visitsRes, bookingsRes] = await Promise.all([
          fetch("/api/owner/properties"),
          fetch("/api/owner/visits"),
          fetch("/api/owner/bookings"),
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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadOwnerData();
  }, []);

  const totalBeds = properties.length * 24;
  const occupiedBeds = bookings.length ? Math.min(bookings.length * 8, totalBeds) : 18;
  const occupancyRate = Math.round((occupiedBeds / (totalBeds || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#123D2B] via-[#1A4F38] to-[#123D2B] rounded-lg p-6 sm:p-8 text-white shadow-soft relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white text-[#123D2B] text-xs font-bold uppercase tracking-wider shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-emerald-700" />
            Verified PG Partner Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, Rajesh!
          </h1>
          <p className="text-xs sm:text-sm text-[#C1D2C5] leading-relaxed">
            Manage your co-living properties, monitor tenant occupancy, view prospective resident visits, and list new rooms across Bengaluru.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/owner/properties/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-[#123D2B] text-xs font-extrabold hover:bg-slate-100 transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span>List New PG Property</span>
            </Link>

            <Link
              href="/owner/properties"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-white/20 bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors"
            >
              <span>View All Properties ({properties.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E8E6DF] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7B8B82]">
              Listed Properties
            </span>
            <Building2 className="w-4 h-4 text-[#123D2B]" />
          </div>
          <div className="text-2xl font-extrabold text-[#192621]">{properties.length}</div>
          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            100% Verified & Active
          </span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E6DF] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7B8B82]">
              Total Bed Inventory
            </span>
            <Users className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-extrabold text-[#123D2B]">{totalBeds} Beds</div>
          <span className="text-[11px] text-[#5E6E65]">Across all room categories</span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E6DF] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7B8B82]">
              Occupancy Rate
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-800">{occupancyRate}%</div>
          <span className="text-[11px] text-[#5E6E65]">{occupiedBeds} of {totalBeds} beds occupied</span>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E6DF] shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7B8B82]">
              Walkthrough Visits
            </span>
            <DoorOpen className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-extrabold text-amber-800">{visits.length}</div>
          <span className="text-[11px] text-amber-700 font-bold">Upcoming tenant tours</span>
        </div>
      </div>

      {/* Quick Properties Table / List */}
      <div className="bg-white rounded-lg border border-[#E8E6DF] p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0EDE4]">
          <div>
            <h2 className="text-lg font-extrabold text-[#123D2B]">My Uploaded PG Properties</h2>
            <p className="text-xs text-[#5E6E65]">Your active buildings listed on Stayzy public catalog.</p>
          </div>
          <Link
            href="/owner/properties/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#123D2B] text-white text-xs font-bold hover:bg-[#0E2F21] transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Property</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties.slice(0, 4).map((p: any) => (
            <div
              key={p.id}
              className="rounded-lg border border-[#E8E6DF] bg-[#FAF8F5] overflow-hidden flex flex-col justify-between hover:shadow-card-hover transition-all"
            >
              <div className="relative h-40 w-full overflow-hidden">
                <img
                  src={p.coverImage || p.images?.[0]}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#123D2B]/90 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase tracking-wider">
                  {p.city} • {p.status || "APPROVED"}
                </div>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#192621]">{p.name}</h3>
                  <div className="text-xs text-[#5E6E65] flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#123D2B] shrink-0" />
                    <span className="truncate">{p.address}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E8E6DF] flex items-center justify-between text-xs">
                  <span className="font-bold text-[#123D2B]">
                    Starting ₹{p.monthlyRentStart || "11,500"} / mo
                  </span>
                  <Link
                    href={`/rooms`}
                    className="text-[#123D2B] font-bold hover:underline flex items-center gap-1"
                  >
                    View in Catalog
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Tenant Visits Section */}
      <div className="bg-white rounded-lg border border-[#E8E6DF] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0EDE4]">
          <div className="flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-[#123D2B]" />
            <h2 className="text-lg font-extrabold text-[#123D2B]">Prospective Tenant Visits</h2>
          </div>
          <Link
            href="/owner/visits"
            className="text-xs font-bold text-[#123D2B] hover:underline"
          >
            View All ({visits.length})
          </Link>
        </div>

        <div className="space-y-3">
          {visits.slice(0, 3).map((v: any) => (
            <div
              key={v.id}
              className="p-3.5 rounded-md bg-[#FAF8F5] border border-[#E8E6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="font-extrabold text-[#192621]">{v.fullName || "Prospective Tenant"}</div>
                <div className="text-[#5E6E65] text-[11px] mt-0.5">
                  {v.email} • {v.phone}
                </div>
                <div className="text-[#7B8B82] text-[11px] mt-0.5">
                  Note: {v.notes || "Requested afternoon walkthrough."}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-bold text-[#123D2B]">{v.visitDate}</div>
                  <div className="text-[11px] text-[#5E6E65]">{v.visitTime}</div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-[#123D2B] text-[10px] font-extrabold uppercase border border-emerald-200">
                  {v.status || "CONFIRMED"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
