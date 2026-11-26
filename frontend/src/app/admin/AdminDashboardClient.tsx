"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  DollarSign,
  Users,
  BedDouble,
  CalendarCheck,
  Clock,
  PlusCircle,
  CheckCircle2,
  X,
  RefreshCw,
  MapPin,
  Calendar,
  Eye,
  Hourglass,
  DoorOpen,
  Layers,
  Tag,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type SparkColor = "emerald" | "violet" | "sky" | "amber" | "rose" | "teal";

const SPARK_THEME: Record<
  SparkColor,
  { iconBg: string; iconText: string; stroke: string; fill: string }
> = {
  emerald: {
    iconBg: "bg-[#E2F7EB]",
    iconText: "text-[#009B69]",
    stroke: "#009B69",
    fill: "rgba(0, 155, 105, 0.14)",
  },
  violet: {
    iconBg: "bg-[#EDE9FE]",
    iconText: "text-[#7C3AED]",
    stroke: "#7C3AED",
    fill: "rgba(124, 58, 237, 0.13)",
  },
  sky: {
    iconBg: "bg-[#E0F2FE]",
    iconText: "text-[#0284C7]",
    stroke: "#0284C7",
    fill: "rgba(2, 132, 199, 0.13)",
  },
  amber: {
    iconBg: "bg-[#FEF3C7]",
    iconText: "text-[#D97706]",
    stroke: "#D97706",
    fill: "rgba(217, 119, 6, 0.13)",
  },
  rose: {
    iconBg: "bg-[#FFE4E6]",
    iconText: "text-[#E11D48]",
    stroke: "#E11D48",
    fill: "rgba(225, 29, 72, 0.13)",
  },
  teal: {
    iconBg: "bg-[#CCFBF1]",
    iconText: "text-[#0D9488]",
    stroke: "#0D9488",
    fill: "rgba(13, 148, 136, 0.13)",
  },
};

function KpiSparkCard({
  label,
  value,
  subtext,
  icon: Icon,
  theme,
}: {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  theme: SparkColor;
}) {
  const colors = SPARK_THEME[theme];
  return (
    <div className="relative bg-white rounded-[18px] border border-[#E6EAE2] p-4 pb-8 shadow-[0_10px_28px_-16px_rgba(20,37,30,0.10)] overflow-hidden">
      <div className="flex items-start gap-2.5">
        <div
          className={`w-9 h-9 rounded-[11px] ${colors.iconBg} ${colors.iconText} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div className="min-w-0">
          <span className="text-[11px] font-bold text-[#5F6F67] block truncate">{label}</span>
          <div className="text-[20px] xl:text-[22px] font-extrabold text-[#14251E] tracking-tight leading-tight mt-0.5">
            {value}
          </div>
          <span className="text-[10.5px] font-semibold text-[#5F6F67] block mt-0.5 truncate">
            {subtext}
          </span>
        </div>
      </div>

      {/* Subtle Bottom Trend Curve */}
      <svg
        viewBox="0 0 180 34"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-7"
        aria-hidden="true"
      >
        <path
          d="M0 24 Q 30 14, 60 22 T 120 18 T 180 8 L 180 34 L 0 34 Z"
          fill={colors.fill}
        />
        <path
          d="M0 24 Q 30 14, 60 22 T 120 18 T 180 8"
          fill="none"
          stroke={colors.stroke}
          strokeWidth="1.6"
          strokeOpacity="0.65"
        />
      </svg>
    </div>
  );
}

export function AdminDashboardClient() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "inventory" | "rates" | "visits">(
    "overview"
  );
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [stats, setStats] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [offlineForm, setOfflineForm] = useState({
    propertyId: "stayzy-haven-koramangala",
    roomTypeId: "",
    inventoryUnitId: "",
    durationType: "DAILY",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    totalAmount: 1800,
    depositAmount: 500,
    notes: "",
  });

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    inventoryUnitId: "",
    reason: "MAINTENANCE",
    startTime: new Date().toISOString().split("T")[0],
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
  });

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      setUnauthorized(false);

      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        setUnauthorized(true);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentBookings(data.recentBookings || []);
        setRecentVisits(data.recentVisits || []);
        setProperties(data.properties || []);
      } else {
        setError(data.error);
      }

      const ratesRes = await fetch("/api/admin/rates");
      const ratesData = await ratesRes.json();
      if (ratesData.success) {
        setRoomTypes(ratesData.roomTypes || []);
        if (ratesData.roomTypes?.[0]) {
          setOfflineForm((prev) => ({
            ...prev,
            roomTypeId: ratesData.roomTypes[0].id,
          }));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSwitchToAdmin = async () => {
    await fetch("/api/auth/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "ADMIN" }),
    });
    window.location.reload();
  };

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Status Updated", `Booking is now ${status}.`);
        loadDashboard();
      } else {
        toast.error("Update Failed", data.error);
      }
    } catch (err: any) {
      toast.error("Operation Failed", err.message);
    }
  };

  const handleCreateOfflineBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offlineForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create offline booking.");
      }
      toast.success("Booking Created", data.message || "Manual booking has been recorded.");
      setOfflineModalOpen(false);
      loadDashboard();
    } catch (err: any) {
      toast.error("Failed to Create Booking", err.message);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blockForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create block.");
      }
      toast.success("Block Created", data.message || "Inventory block applied.");
      setBlockModalOpen(false);
      loadDashboard();
    } catch (err: any) {
      toast.error("Failed to Create Block", err.message);
    }
  };

  const handleToggleRatePlan = async (ratePlanId: string, isEnabled: boolean) => {
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratePlanId, isEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          "Rate Plan Updated",
          isEnabled ? "Rate plan activated." : "Rate plan disabled."
        );
        loadDashboard();
      }
    } catch (err: any) {
      toast.error("Rate Plan Error", err.message);
    }
  };

  if (unauthorized) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5 bg-white rounded-[22px] border border-[#E6EAE2] shadow-xs">
        <div className="w-16 h-16 rounded-[18px] bg-[#064B35] text-[#E8F4DF] flex items-center justify-center mx-auto shadow-sm">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#14251E]">Admin Authorization Required</h1>
        <p className="text-xs text-[#5F6F67] max-w-md mx-auto">
          Your session does not currently hold administrator credentials. Switch to the Stayzy
          Property Manager profile below.
        </p>
        <button
          type="button"
          onClick={handleSwitchToAdmin}
          className="px-6 py-3 rounded-[12px] bg-[#064B35] text-white text-xs font-bold hover:bg-[#043827] transition-colors cursor-pointer"
        >
          Switch to Stayzy Admin Profile
        </button>
      </div>
    );
  }

  const filteredBookings =
    statusFilter === "ALL"
      ? recentBookings
      : recentBookings.filter((b) => b.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* 1. Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-[9999px] bg-[#E8F4DF] text-[#064B35] text-[11px] font-bold">
            Property Manager Console
          </span>
          <h1 className="text-[26px] sm:text-[32px] font-extrabold text-[#14251E] tracking-tight mt-2 leading-tight">
            Stayzy Operations Dashboard
          </h1>
          <p className="text-[13px] text-[#5F6F67] mt-1 font-medium">
            Real database aggregates, inventory control, and rate plan management.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setOfflineModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#064B35] hover:bg-[#043827] text-white text-[12.5px] font-bold shadow-[0_8px_18px_-6px_rgba(6,75,53,0.45)] transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#E8F4DF]" aria-hidden="true" />
            <span>New Offline Booking</span>
          </button>
          <button
            type="button"
            onClick={loadDashboard}
            className="w-10 h-10 rounded-[12px] border border-[#DCE2D7] bg-white text-[#064B35] hover:bg-[#EDF5E9] flex items-center justify-center transition-colors cursor-pointer"
            title="Refresh database totals"
            aria-label="Refresh database totals"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-[14px] bg-red-50 border border-red-200 text-red-700 text-xs font-semibold"
        >
          {error}
        </div>
      )}

      {/* 2. Six Real Database KPI Cards with Sparkline Curves */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          <KpiSparkCard
            label="Total Revenue"
            value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
            subtext="Paid bookings"
            icon={DollarSign}
            theme="emerald"
          />
          <KpiSparkCard
            label="Total Bookings"
            value={stats.totalBookingsCount}
            subtext="In database"
            icon={CalendarCheck}
            theme="violet"
          />
          <KpiSparkCard
            label="Active Residents"
            value={stats.checkedInCount + stats.confirmedCount}
            subtext="Confirmed / In-house"
            icon={Users}
            theme="sky"
          />
          <KpiSparkCard
            label="Total Units"
            value={stats.totalUnitsCount}
            subtext="Beds & suites"
            icon={BedDouble}
            theme="amber"
          />
          <KpiSparkCard
            label="Pending Visits"
            value={stats.pendingVisitsCount}
            subtext="Tour inquiries"
            icon={Clock}
            theme="rose"
          />
          <KpiSparkCard
            label="Checkout Holds"
            value={stats.activeHoldsCount}
            subtext="Active 15m locks"
            icon={CheckCircle2}
            theme="teal"
          />
        </div>
      )}

      {/* 3. Rounded Pill Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2.5">
        {[
          { id: "overview", label: "Overview & Bookings", icon: CalendarCheck },
          { id: "inventory", label: "Room & Bed Units", icon: Layers },
          { id: "rates", label: "Rates & Duration Toggles", icon: Tag },
          { id: "visits", label: "Scheduled Tours", icon: DoorOpen },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-[9999px] text-[12.5px] font-bold transition-all cursor-pointer ${
                active
                  ? "bg-[#064B35] text-white shadow-xs"
                  : "bg-white text-[#36463E] border border-[#E4E8DF] hover:border-[#009B69]/45 hover:text-[#064B35]"
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Guest Bookings */}
      {activeTab === "overview" && (
        <section className="bg-white rounded-[20px] border border-[#E6EAE2] p-5 sm:p-6 shadow-[0_12px_32px_-16px_rgba(20,37,30,0.08)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-[#EDF5E9] text-[#064B35] flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-[16px] font-extrabold text-[#14251E]">All Guest Bookings</h2>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter guest bookings by status"
              className="h-9 px-3 rounded-[10px] border border-[#DCE2D7] bg-[#FAF9F4] text-xs font-bold text-[#14251E] outline-none focus:border-[#009B69] cursor-pointer"
            >
              <option value="ALL">All Statuses ({recentBookings.length})</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="rounded-[14px] border border-[#E6EAE2] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#EDF5E9] text-[#17251F] border-b border-[#DCE5D5]">
                    <th className="py-3.5 px-4 font-bold">Reference</th>
                    <th className="py-3.5 px-4 font-bold">Guest</th>
                    <th className="py-3.5 px-4 font-bold">Room / Unit</th>
                    <th className="py-3.5 px-4 font-bold">Duration</th>
                    <th className="py-3.5 px-4 font-bold">Check-in / Out</th>
                    <th className="py-3.5 px-4 font-bold">Amount</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EA]">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#5F6F67] font-medium">
                        No bookings match the selected status.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-[#FAF9F4]/75 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-[8px] bg-[#E8F4DF] text-[#064B35] font-mono font-bold text-[11px]">
                            {b.bookingReference}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#14251E]">{b.guestName}</div>
                          <div className="text-[11px] text-[#5F6F67]">{b.guestPhone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#14251E]">{b.roomType?.name}</div>
                          <div className="text-[11px] text-[#009B69] font-medium">
                            {b.inventoryUnit?.identifier || "Auto-assigned"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-1 rounded-[8px] bg-[#EDF5E9] text-[#064B35] font-bold text-[11px]">
                            {b.durationType} ({b.durationCount})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[11.5px] text-[#36463E]">
                          <div>In: {new Date(b.startTime).toLocaleDateString("en-IN")}</div>
                          <div className="text-[#5F6F67]">
                            Out: {new Date(b.endTime).toLocaleDateString("en-IN")}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-[#14251E]">
                          ₹{b.totalAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[9999px] text-[10.5px] font-bold ${
                              b.status === "CHECKED_IN"
                                ? "bg-[#D9F2E4] text-[#064B35]"
                                : b.status === "CONFIRMED"
                                ? "bg-[#E8F4DF] text-[#064B35]"
                                : b.status === "CHECKED_OUT"
                                ? "bg-[#F1F5F2] text-[#4C5C54]"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-[9999px] ${
                                b.status === "CANCELLED"
                                  ? "bg-red-600"
                                  : b.status === "CHECKED_OUT"
                                  ? "bg-gray-500"
                                  : "bg-[#009B69]"
                              }`}
                            />
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/admin/bookings/${b.id}`}
                              className="w-8 h-8 rounded-[9999px] border border-[#DCE2D7] bg-white hover:bg-[#EDF5E9] text-[#064B35] flex items-center justify-center transition-colors"
                              title="View booking details"
                              aria-label="View booking details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            {b.status === "CONFIRMED" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(b.id, "CHECKED_IN")}
                                className="px-2.5 py-1.5 rounded-[8px] bg-[#064B35] text-white text-[11px] font-bold hover:bg-[#043827] cursor-pointer"
                              >
                                Check-In
                              </button>
                            )}
                            {b.status === "CHECKED_IN" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(b.id, "CHECKED_OUT")}
                                className="px-2.5 py-1.5 rounded-[8px] bg-[#4C5C54] text-white text-[11px] font-bold hover:bg-[#36463E] cursor-pointer"
                              >
                                Check-Out
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Tab 2: Inventory & Maintenance */}
      {activeTab === "inventory" && (
        <div className="space-y-5">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h2 className="text-[17px] font-extrabold text-[#14251E]">Rooms &amp; Beds Status</h2>
            <button
              type="button"
              onClick={() => setBlockModalOpen(true)}
              className="px-4 py-2 rounded-[12px] bg-[#064B35] hover:bg-[#043827] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Block Unit for Maintenance
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {properties.map((prop) => (
              <div
                key={prop.id}
                className="bg-white rounded-[20px] border border-[#E6EAE2] p-5 space-y-4 shadow-xs"
              >
                <div className="flex items-center gap-2 pb-3 border-b border-[#EEF2EA]">
                  <MapPin className="w-4 h-4 text-[#009B69]" />
                  <h3 className="font-extrabold text-sm text-[#14251E]">{prop.name}</h3>
                </div>

                <div className="space-y-3">
                  {prop.roomTypes.map((rt: any) => (
                    <div
                      key={rt.id}
                      className="p-4 rounded-[14px] bg-[#FAF9F4] border border-[#E6EAE2] space-y-2"
                    >
                      <div className="flex justify-between text-xs font-bold text-[#14251E]">
                        <span>{rt.name}</span>
                        <span className="text-[#5F6F67]">{rt.category}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {rt.rooms.map((r: any) =>
                          r.inventoryUnits.map((u: any) => (
                            <div
                              key={u.id}
                              className={`p-2 rounded-[10px] border text-[11px] font-medium flex items-center justify-between ${
                                u.status === "AVAILABLE"
                                  ? "bg-white border-[#E6EAE2] text-[#14251E]"
                                  : "bg-red-50 border-red-200 text-red-700"
                              }`}
                            >
                              <span>{u.identifier}</span>
                              <span
                                className={`text-[10px] font-bold ${
                                  u.status === "AVAILABLE" ? "text-[#009B69]" : "text-red-700"
                                }`}
                              >
                                {u.status === "AVAILABLE" ? "Available" : "Occupied"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Rate Plans & Durations */}
      {activeTab === "rates" && (
        <div className="space-y-5">
          <h2 className="text-[17px] font-extrabold text-[#14251E]">
            Configure Allowed Durations &amp; Base Tariffs
          </h2>

          <div className="space-y-5">
            {roomTypes.map((rt) => (
              <div
                key={rt.id}
                className="bg-white rounded-[20px] border border-[#E6EAE2] p-5 space-y-4 shadow-xs"
              >
                <div className="flex justify-between items-center pb-3 border-b border-[#EEF2EA]">
                  <div>
                    <h3 className="font-extrabold text-base text-[#14251E]">{rt.name}</h3>
                    <p className="text-xs text-[#5F6F67]">{rt.property.name}</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-[9999px] bg-[#E8F4DF] text-[#064B35]">
                    {rt.category}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {rt.ratePlans.map((rp: any) => (
                    <div
                      key={rp.id}
                      className="p-4 rounded-[14px] border border-[#E6EAE2] bg-[#FAF9F4] space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-[#064B35]">{rp.durationType}</span>
                        <input
                          type="checkbox"
                          checked={rp.isEnabled}
                          onChange={(e) => handleToggleRatePlan(rp.id, e.target.checked)}
                          className="w-4 h-4 rounded accent-[#009B69] cursor-pointer"
                        />
                      </div>
                      <div className="text-lg font-extrabold text-[#14251E]">
                        ₹{rp.price.toLocaleString("en-IN")}
                      </div>
                      <p className="text-[10.5px] text-[#5F6F67]">
                        Deposit: ₹{rp.depositAmount.toLocaleString("en-IN")}
                      </p>
                      <span
                        className={`text-[10.5px] font-bold block ${
                          rp.isEnabled ? "text-[#009B69]" : "text-gray-400"
                        }`}
                      >
                        {rp.isEnabled ? "Duration Active" : "Disabled"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Scheduled Tour Visits */}
      {activeTab === "visits" && (
        <section className="bg-white rounded-[20px] border border-[#E6EAE2] p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-[16px] font-extrabold text-[#14251E]">Property Tour Requests</h2>
          <div className="rounded-[14px] border border-[#E6EAE2] overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#EDF5E9] text-[#17251F] border-b border-[#DCE5D5]">
                  <th className="py-3.5 px-4 font-bold">Customer</th>
                  <th className="py-3.5 px-4 font-bold">Phone</th>
                  <th className="py-3.5 px-4 font-bold">Preferred Date &amp; Slot</th>
                  <th className="py-3.5 px-4 font-bold">Property</th>
                  <th className="py-3.5 px-4 font-bold">Notes</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EA]">
                {recentVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-[#FAF9F4]">
                    <td className="py-3.5 px-4 font-bold text-[#14251E]">{v.customerName}</td>
                    <td className="py-3.5 px-4 text-[#36463E]">{v.customerPhone}</td>
                    <td className="py-3.5 px-4 text-[#36463E]">
                      {new Date(v.preferredDate).toLocaleDateString("en-IN")} • {v.timeSlot}
                    </td>
                    <td className="py-3.5 px-4 font-medium">{v.property?.name || "Stayzy Haven"}</td>
                    <td className="py-3.5 px-4 text-[#5F6F67]">{v.notes || "—"}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-[9999px] text-[10.5px] font-bold bg-[#E8F4DF] text-[#064B35]">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal: New Offline Booking Entry */}
      {offlineModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[22px] max-w-lg w-full p-6 sm:p-8 relative shadow-2xl border border-[#E6EAE2] space-y-4">
            <button
              type="button"
              onClick={() => setOfflineModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-[10px] text-[#5F6F67] hover:bg-[#FAF9F4] cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-extrabold text-[#14251E]">
              Manual / Offline Booking Entry
            </h3>

            <form onSubmit={handleCreateOfflineBooking} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#36463E] block mb-1">Room Type</label>
                <select
                  value={offlineForm.roomTypeId}
                  onChange={(e) => {
                    const selected = roomTypes.find((r) => r.id === e.target.value);
                    const firstUnit = selected?.rooms?.[0]?.inventoryUnits?.[0]?.id || "";
                    setOfflineForm({
                      ...offlineForm,
                      roomTypeId: e.target.value,
                      inventoryUnitId: firstUnit,
                    });
                  }}
                  className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#36463E] block mb-1">Target Bed / Unit</label>
                <select
                  value={offlineForm.inventoryUnitId}
                  onChange={(e) =>
                    setOfflineForm({ ...offlineForm, inventoryUnitId: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                >
                  {properties.flatMap((p) =>
                    p.roomTypes.flatMap((rt: any) =>
                      rt.rooms.flatMap((r: any) =>
                        r.inventoryUnits.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {p.name} — {rt.name} — {u.identifier}
                          </option>
                        ))
                      )
                    )
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#36463E] block mb-1">Guest Name</label>
                  <input
                    required
                    value={offlineForm.guestName}
                    onChange={(e) =>
                      setOfflineForm({ ...offlineForm, guestName: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#36463E] block mb-1">Guest Phone</label>
                  <input
                    required
                    value={offlineForm.guestPhone}
                    onChange={(e) =>
                      setOfflineForm({ ...offlineForm, guestPhone: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#36463E] block mb-1">Check-in</label>
                  <input
                    type="date"
                    required
                    value={offlineForm.startDate}
                    onChange={(e) =>
                      setOfflineForm({ ...offlineForm, startDate: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#36463E] block mb-1">Check-out</label>
                  <input
                    type="date"
                    required
                    value={offlineForm.endDate}
                    onChange={(e) =>
                      setOfflineForm({ ...offlineForm, endDate: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#36463E] block mb-1">Total Tariff (₹)</label>
                  <input
                    type="number"
                    required
                    value={offlineForm.totalAmount}
                    onChange={(e) =>
                      setOfflineForm({ ...offlineForm, totalAmount: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#36463E] block mb-1">Deposit (₹)</label>
                  <input
                    type="number"
                    value={offlineForm.depositAmount}
                    onChange={(e) =>
                      setOfflineForm({ ...offlineForm, depositAmount: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-[12px] bg-[#064B35] text-white font-bold text-xs hover:bg-[#043827] mt-2 cursor-pointer"
              >
                Confirm Offline Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Maintenance Block */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[22px] max-w-md w-full p-6 sm:p-8 relative shadow-2xl border border-[#E6EAE2] space-y-4">
            <button
              type="button"
              onClick={() => setBlockModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-[10px] text-[#5F6F67] hover:bg-[#FAF9F4] cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-extrabold text-[#14251E]">
              Block Unit (Maintenance/Cleaning)
            </h3>

            <form onSubmit={handleCreateBlock} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#36463E] block mb-1">Select Unit</label>
                <select
                  value={blockForm.inventoryUnitId}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, inventoryUnitId: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                >
                  <option value="">-- Choose Unit --</option>
                  {properties.flatMap((p) =>
                    p.roomTypes.flatMap((rt: any) =>
                      rt.rooms.flatMap((r: any) =>
                        r.inventoryUnits.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {p.name} — {u.identifier}
                          </option>
                        ))
                      )
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#36463E] block mb-1">Reason</label>
                <select
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                  className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                >
                  <option value="MAINTENANCE">Maintenance / Repairs</option>
                  <option value="CLEANING">Deep Sanitization &amp; Cleaning</option>
                  <option value="OFFLINE_HOLD">Internal Management Hold</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#36463E] block mb-1">From</label>
                  <input
                    type="date"
                    required
                    value={blockForm.startTime}
                    onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#36463E] block mb-1">To</label>
                  <input
                    type="date"
                    required
                    value={blockForm.endTime}
                    onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                    className="w-full h-10 px-3 rounded-[12px] border border-[#D4DCD0] bg-[#FAF9F4]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-[12px] bg-[#064B35] text-white font-bold text-xs hover:bg-[#043827] mt-2 cursor-pointer"
              >
                Apply Availability Block
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
