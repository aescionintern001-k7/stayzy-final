"use client";

import React, { useState, useEffect } from "react";
import { DoorOpen, Calendar, Clock, Phone, Mail, CheckCircle2, User } from "lucide-react";
import { TableRowSkeleton } from "@/components/ui";

export default function OwnerVisitsPage() {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVisits() {
      try {
        const res = await fetch("/api/owner/visits");
        const d = await res.json();
        if (d.visits) setVisits(d.visits);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadVisits();
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-6 border-b border-[#E8E6DF]">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#123D2B] bg-[#E8F1D5] px-2.5 py-1 rounded-md">
          Lead Inquiries
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123D2B] tracking-tight mt-1.5">
          Scheduled Walkthrough Visits
        </h1>
        <p className="text-xs sm:text-sm text-[#5E6E65] mt-1">
          Prospective tenants who requested an in-person walkthrough tour of your PG properties.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[#E8E6DF] shadow-xs divide-y divide-[#F0EDE4]">
        {loading ? (
          <div className="p-4 space-y-2">
            <TableRowSkeleton cols={4} rows={3} />
          </div>
        ) : visits.length === 0 ? (
          <div className="p-12 text-center">
            <DoorOpen className="w-10 h-10 text-[#7B8B82] mx-auto mb-2" />
            <p className="text-xs font-bold text-[#192621]">No scheduled property visits</p>
            <p className="text-[11px] text-[#5E6E65] mt-0.5">Prospects who book in-person tours will appear here.</p>
          </div>
        ) : (
          visits.map((v) => (
            <div key={v.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-[#192621]">{v.fullName}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#E8F1D5] text-[#123D2B] text-[10px] font-extrabold uppercase">
                    {v.status || "CONFIRMED"}
                  </span>
                </div>
                <div className="text-xs text-[#5E6E65] flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#123D2B]" />
                    {v.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#123D2B]" />
                    {v.email}
                  </span>
                </div>
                <p className="text-xs text-[#7B8B82] pt-1">
                  Requested Space: <strong>{v.property?.name || "Stayzy PG"}</strong> • Note: {v.notes || "None"}
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-extrabold text-[#123D2B] flex items-center gap-1 sm:justify-end">
                  <Calendar className="w-4 h-4 text-[#123D2B]" />
                  {v.visitDate}
                </div>
                <div className="text-xs text-[#5E6E65] flex items-center gap-1 sm:justify-end mt-0.5">
                  <Clock className="w-3 h-3 text-[#7B8B82]" />
                  {v.visitTime}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
