"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui";
import {
  Building2,
  PlusCircle,
  MapPin,
  ExternalLink,
  CheckCircle2,
  BedDouble,
  Users,
  Search,
} from "lucide-react";

export default function OwnerPropertiesListPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchProps() {
      try {
        setLoading(true);
        const res = await fetch("/api/owner/properties");
        const d = await res.json();
        if (d.properties) setProperties(d.properties);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchProps();
  }, []);

  const filtered = properties.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E6DF]">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#123D2B] bg-[#E8F1D5] px-2.5 py-1 rounded-md">
            Portfolio Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123D2B] tracking-tight mt-1.5">
            My PG Properties
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E65] mt-1">
            View, manage, and add new PG buildings to your co-living portfolio.
          </p>
        </div>

        <Link
          href="/owner/properties/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#123D2B] text-white text-xs font-bold hover:bg-[#0E2F21] shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-[#E8F1D5]" />
          <span>Upload New PG</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#E8E6DF] shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7B8B82]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties by name, city, or locality..."
            className="w-full h-10 pl-9 pr-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
          />
        </div>
        <div className="text-xs font-bold text-[#5E6E65]">
          {filtered.length} Properties Registered
        </div>
      </div>

      {/* Properties Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-[#E8E6DF] overflow-hidden p-4 space-y-4">
              <Skeleton className="h-48 w-full rounded-md" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E8E6DF] p-12 text-center max-w-lg mx-auto">
          <Building2 className="w-12 h-12 text-[#7B8B82] mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-[#192621]">No properties found</h3>
          <p className="text-xs text-[#5E6E65] mt-1 mb-5">
            {search ? "No properties match your search criteria." : "You haven't listed any PG properties yet."}
          </p>
          <Link
            href="/owner/properties/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#123D2B] text-white text-xs font-bold hover:bg-[#0E2F21]"
          >
            <PlusCircle className="w-4 h-4 text-[#E8F1D5]" />
            <span>List Your First Property</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-lg border border-[#E8E6DF] overflow-hidden shadow-xs hover:shadow-card-hover transition-all flex flex-col justify-between"
            >
              <div className="relative h-48 w-full">
                <img
                  src={p.coverImage || p.images?.[0]}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-[#123D2B]/95 text-white text-[10px] font-extrabold uppercase">
                    {p.city}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                    Verified
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#192621]">{p.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#5E6E65] mt-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#123D2B] shrink-0" />
                    <span>{p.address}</span>
                  </div>
                  <p className="text-xs text-[#7B8B82] mt-2 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F0EDE4] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#7B8B82] uppercase font-bold block">
                      Tariff Starts
                    </span>
                    <span className="text-sm font-extrabold text-[#123D2B]">
                      ₹{p.monthlyRentStart || "11,000"} / mo
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/rooms`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#123D2B] hover:underline"
                    >
                      View Listing
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
