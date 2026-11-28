"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import {
  CalendarCheck,
  MapPin,
  Clock,
  CreditCard,
  Headset,
  ArrowRight,
  CheckCircle2,
  FileText,
  Compass,
  Calendar,
  Bed,
  Eye,
  LifeBuoy,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [bookingsRes, paymentsRes, authRes] = await Promise.all([
          fetch("/api/bookings/my"),
          fetch("/api/payments/my"),
          fetch("/api/auth/me"),
        ]);
        const bData = await bookingsRes.json();
        const pData = await paymentsRes.json();
        const aData = await authRes.json();

        if (aData.user) {
          setUser(aData.user);
        }

        if (bData.success) {
          setData({
            bookings: bData.bookings || [],
            payments: pData.payments || [],
            schedules: pData.schedules || [],
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-[20px] p-12 text-center text-xs font-semibold text-[#5F6F67] border border-[#E6EAE2] shadow-xs">
        Loading your resident dashboard...
      </div>
    );
  }

  const now = new Date();
  const bookings = data?.bookings || [];
  const payments = data?.payments || [];
  const schedules = data?.schedules || [];

  const currentStay = bookings.find(
    (b: any) =>
      new Date(b.startTime) <= now &&
      new Date(b.endTime) >= now &&
      b.status !== "CANCELLED"
  );

  const upcomingStay = bookings.find(
    (b: any) => new Date(b.startTime) > now && b.status !== "CANCELLED"
  );

  const activeOrUpcomingStay = currentStay || upcomingStay;

  const nextPayment =
    schedules.find((s: any) => s.status === "PENDING" && new Date(s.dueDate) >= now) ||
    schedules.find((s: any) => s.status === "PENDING");

  const totalPaid = payments
    .filter((p: any) => p.status === "COMPLETED" || p.status === "SUCCESS" || p.status === "captured")
    .reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);

  const pendingDues = schedules
    .filter((s: any) => s.status === "PENDING")
    .reduce((sum: number, s: any) => sum + Number(s.amount ?? 0), 0);

  const depositHeld = bookings
    .filter((b: any) => b.status === "CONFIRMED")
    .reduce((sum: number, b: any) => sum + Number(b.securityDeposit ?? b.depositAmount ?? 0), 0);

  let currentStayImage = "/images/rooms/private-room-main.webp?v=5";
  if (activeOrUpcomingStay) {
    try {
      const imgs = JSON.parse(activeOrUpcomingStay.roomType?.images || "[]");
      currentStayImage =
        imgs[0] ||
        activeOrUpcomingStay.property?.coverImage ||
        "/images/rooms/private-room-main.webp?v=5";
    } catch {
      currentStayImage =
        activeOrUpcomingStay.property?.coverImage || "/images/rooms/private-room-main.webp?v=5";
    }
  }

  const residentGreetingName = user?.name?.split(" ")[0] || "Resident";

  const daysUntilDue = nextPayment
    ? Math.max(
        0,
        Math.ceil(
          (new Date(nextPayment.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* 1. Wide Split Welcome Hero Banner */}
      <section className="relative rounded-[22px] border border-[#DCE5D5] bg-gradient-to-r from-[#F4FAF0] via-[#EDF5E6] to-[#F7FBF3] overflow-hidden shadow-[0_14px_36px_-18px_rgba(6,75,53,0.14)] grid grid-cols-1 lg:grid-cols-12 min-h-[235px]">
        {/* Decorative Botanical Accent Bottom-Left */}
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

        {/* Left Copy Column */}
        <div className="relative z-10 lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center space-y-3.5">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[9999px] bg-white border border-[#E2E8DC] text-[12px] font-bold text-[#17251F] shadow-2xs">
              <span className="w-2 h-2 rounded-[9999px] bg-[#009B69]" aria-hidden="true" />
              <span>Stayzy Resident Portal</span>
            </span>
          </div>

          <h1 className="text-[26px] sm:text-[34px] font-extrabold text-[#17251F] tracking-tight leading-[1.15]">
            Welcome back, <span className="text-[#009B69]">{residentGreetingName}!</span>
          </h1>

          <p className="text-[13.5px] sm:text-[14.5px] text-[#4C5C54] font-medium leading-relaxed max-w-[490px]">
            Manage your bookings, explore amenities, and make the most of your Stayzy experience.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/rooms"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#064B35] hover:bg-[#043827] text-white text-[13px] font-bold shadow-[0_8px_18px_-6px_rgba(6,75,53,0.45)] transition-all duration-200 w-full sm:w-auto"
            >
              <CalendarCheck className="w-4 h-4 text-[#E8F4DF]" aria-hidden="true" />
              <span>Book Another Stay</span>
            </Link>
            <Link
              href="/dashboard/support"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] bg-white hover:bg-[#FAF9F4] text-[#17251F] border border-[#D7DDD2] text-[13px] font-bold transition-all duration-200 w-full sm:w-auto"
            >
              <Headset className="w-4 h-4 text-[#064B35]" aria-hidden="true" />
              <span>Help &amp; Support Desk</span>
            </Link>
          </div>
        </div>

        {/* Right Crisp Bedroom Interior Photograph */}
        <div className="relative lg:col-span-5 min-h-[200px] lg:min-h-full overflow-hidden">
          <img
            src="/images/rooms/private-room-main.webp?v=5"
            alt="Stayzy luxury co-living room interior"
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

      {/* 2. Two-Column Core Cards: Current Active Stay & Next Payment Due */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Card (7 cols): Current Active Stay */}
        <section className="lg:col-span-7 bg-white rounded-[20px] border border-[#E6EAE2] shadow-[0_12px_32px_-16px_rgba(23,37,31,0.08)] overflow-hidden flex flex-col justify-between">
          {/* Pale-Mint Card Header */}
          <div className="px-5 sm:px-6 py-4 bg-[#F2F7EC] border-b border-[#E6EAE2] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[12px] bg-white border border-[#DCE5D5] text-[#064B35] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[12.5px] font-extrabold uppercase tracking-[0.08em] text-[#17251F]">
                  {currentStay
                    ? "CURRENT ACTIVE STAY"
                    : upcomingStay
                    ? "UPCOMING RESERVATION"
                    : "CURRENT ACTIVE STAY"}
                </h2>
                <p className="text-[11.5px] text-[#5F6F67] font-medium">
                  {activeOrUpcomingStay
                    ? `${currentStay ? "Till" : "Move-In"} – ${new Date(
                        currentStay ? currentStay.endTime : upcomingStay.startTime
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`
                    : "No active reservation yet"}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-[9999px] bg-[#D9EED0] text-[#064B35] text-[11px] font-extrabold tracking-wide uppercase">
              {currentStay ? "ACTIVE" : upcomingStay ? "CONFIRMED" : "CLEAR"}
            </span>
          </div>

          {activeOrUpcomingStay ? (
            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                <div className="relative w-full sm:w-48 aspect-[16/10] rounded-[14px] overflow-hidden shrink-0 border border-[#E6EAE2] bg-[#FAF9F4]">
                  <ImageWithFallback
                    src={currentStayImage}
                    alt={activeOrUpcomingStay.roomType?.name || "Room"}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <h3 className="text-[19px] sm:text-[21px] font-extrabold text-[#17251F] leading-snug">
                    {activeOrUpcomingStay.roomType?.name}
                  </h3>
                  <p className="text-[13px] text-[#5F6F67] font-medium flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#009B69] shrink-0" aria-hidden="true" />
                    <span className="truncate">{activeOrUpcomingStay.property?.name}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#EDF5E9] border border-[#DCE5D5] text-[12px] font-bold text-[#064B35]">
                      <Bed className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        Assigned:{" "}
                        {activeOrUpcomingStay.inventoryUnit?.identifier || "Unit Confirmed"}
                      </span>
                    </span>
                    {currentStay?.keylessCode && (
                      <span className="inline-flex items-center px-2.5 py-1.5 rounded-[10px] bg-[#FAF9F4] border border-[#E6EAE2] text-[11.5px] font-mono font-bold text-[#17251F]">
                        PIN: {currentStay.keylessCode}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Link
                  href={`/dashboard/bookings/${activeOrUpcomingStay.id}`}
                  className="inline-flex items-center justify-center gap-2 h-[44px] px-4 rounded-[12px] border border-[#D4DCD0] bg-white hover:bg-[#FAF9F4] text-[#17251F] text-[13px] font-bold transition-colors"
                >
                  <Eye className="w-4 h-4 text-[#064B35]" aria-hidden="true" />
                  <span>View Details</span>
                </Link>
                <Link
                  href={`/dashboard/bookings/${activeOrUpcomingStay.id}`}
                  className="inline-flex items-center justify-center gap-2 h-[44px] px-4 rounded-[12px] bg-[#064B35] hover:bg-[#043827] text-white text-[13px] font-bold transition-colors shadow-xs"
                >
                  <FileText className="w-4 h-4 text-[#E8F4DF]" aria-hidden="true" />
                  <span>Download Receipt</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-[14px] bg-[#EDF5E9] border border-[#DCE5D5] flex items-center justify-center text-[#064B35]">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#17251F]">No active or upcoming bookings</h3>
                <p className="text-xs text-[#5F6F67] max-w-sm mx-auto">
                  Explore verified co-living stays across top hubs with instant bed reservation.
                </p>
              </div>
              <Link
                href="/rooms"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#064B35] text-white font-bold text-xs hover:bg-[#043827]"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Stays</span>
              </Link>
            </div>
          )}
        </section>

        {/* Right Card (5 cols): Next Payment Due */}
        <section className="relative lg:col-span-5 bg-white rounded-[20px] border border-[#E6EAE2] shadow-[0_12px_32px_-16px_rgba(23,37,31,0.08)] p-5 sm:p-6 flex flex-col justify-between gap-5 overflow-hidden">
          {/* Subtle Right Botanical Accent */}
          <svg
            viewBox="0 0 100 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 right-0 w-20 h-24 text-[#009B69]/15"
            aria-hidden="true"
          >
            <path
              d="M95 10C72 34 54 62 34 102M68 42C52 38 40 24 46 10C62 12 72 26 68 42ZM52 72C36 68 24 54 30 40C46 42 56 56 52 72Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EEF2EA]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[#EDF5E9] text-[#064B35] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" aria-hidden="true" />
                </div>
                <h2 className="text-[12.5px] font-extrabold uppercase tracking-[0.08em] text-[#17251F]">
                  NEXT PAYMENT DUE
                </h2>
              </div>
              <span
                className={`px-3 py-1 rounded-[9999px] text-[11px] font-extrabold uppercase ${
                  nextPayment
                    ? "bg-[#FEF3C7] text-[#92400E]"
                    : "bg-[#D9EED0] text-[#064B35]"
                }`}
              >
                {nextPayment ? "DUE SOON" : "UP TO DATE"}
              </span>
            </div>

            {nextPayment ? (
              <div className="space-y-3">
                <div>
                  <span className="text-[12px] font-semibold text-[#5F6F67] block">Amount Due</span>
                  <span className="text-[34px] sm:text-[38px] font-extrabold text-[#17251F] tracking-tight leading-tight">
                    ₹{nextPayment.amount.toLocaleString("en-IN")}
                  </span>
                  <p className="text-[12.5px] text-[#5F6F67] font-medium mt-1">
                    {nextPayment.description}
                    {daysUntilDue > 0 ? ` — ${daysUntilDue} days remaining` : ""}
                  </p>
                </div>

                {/* Soft Pale-Green Due Date Panel */}
                <div className="p-3.5 rounded-[14px] bg-[#EDF5E9] border border-[#DCE5D5] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-white border border-[#DCE5D5] flex items-center justify-center text-[#064B35] shrink-0">
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-[#4C5C54] block">
                      Due Date:
                    </span>
                    <span className="text-[13.5px] font-extrabold text-[#17251F]">
                      {new Date(nextPayment.dueDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2 text-[#064B35] font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-[#009B69]" />
                  <span>All rent &amp; dues settled</span>
                </div>
                <p className="text-[13px] text-[#5F6F67] leading-relaxed">
                  Your monthly co-living tariff, GST, and deposits are completely up to date.
                </p>
                <div className="p-3.5 rounded-[14px] bg-[#EDF5E9] border border-[#DCE5D5] flex items-center justify-between text-xs font-bold text-[#064B35]">
                  <span>Total Paid To Date</span>
                  <span>₹{totalPaid.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/dashboard/payments"
            className="relative z-10 inline-flex items-center justify-center gap-2 w-full h-[46px] rounded-[12px] bg-[#064B35] hover:bg-[#043827] text-white text-[13.5px] font-bold shadow-[0_8px_18px_-6px_rgba(6,75,53,0.45)] transition-all duration-200"
          >
            <span>{nextPayment ? "Make Payment" : "View Payment History"}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </section>
      </div>

      {/* 3. Payment Summary Strip (Dynamic Database Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white rounded-[18px] border border-[#E6EAE2] p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6F67] block">
            Total Paid To Date
          </span>
          <span className="text-2xl font-extrabold text-[#064B35] block">
            ₹{totalPaid.toLocaleString("en-IN")}
          </span>
          <span className="text-[11.5px] text-[#5F6F67]">Verified Stayzy payment receipts</span>
        </div>

        <div className="bg-white rounded-[18px] border border-[#E6EAE2] p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6F67] block">
            Upcoming Dues
          </span>
          <span className="text-2xl font-extrabold text-[#17251F] block">
            ₹{pendingDues.toLocaleString("en-IN")}
          </span>
          <span className="text-[11.5px] text-[#5F6F67]">Scheduled monthly co-living tariffs</span>
        </div>

        <div className="bg-white rounded-[18px] border border-[#E6EAE2] p-5 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6F67] block">
            Security Deposit Held
          </span>
          <span className="text-2xl font-extrabold text-[#064B35] block">
            ₹{depositHeld.toLocaleString("en-IN")}
          </span>
          <span className="text-[11.5px] text-[#5F6F67]">100% refundable upon move-out</span>
        </div>
      </div>

      {/* 4. Recent Bookings History */}
      <div className="bg-white rounded-[20px] border border-[#E6EAE2] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-[#EEF2EA]">
          <h2 className="text-[16px] font-extrabold text-[#17251F]">Recent Bookings</h2>
          <Link
            href="/dashboard/bookings"
            className="text-xs font-bold text-[#009B69] hover:text-[#064B35] hover:underline"
          >
            View All ({bookings.length})
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#5F6F67] space-y-2">
            <p>You have not made any bookings yet.</p>
            <Link
              href="/rooms"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#064B35] underline"
            >
              Browse rooms &amp; book your first stay
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#EEF2EA]">
            {bookings.slice(0, 4).map((b: any) => (
              <div
                key={b.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-[#17251F] text-sm">
                      {b.roomType?.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-[8px] bg-[#FAF9F4] border border-[#E6EAE2] text-[10.5px] font-mono text-[#5F6F67]">
                      {b.bookingReference}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-[9999px] text-[10.5px] font-bold ${
                        b.status === "CONFIRMED"
                          ? "bg-[#E8F4DF] text-[#064B35]"
                          : b.status === "COMPLETED"
                          ? "bg-blue-100 text-blue-800"
                          : b.status === "CANCELLED"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="text-[#5F6F67] text-xs">
                    {b.durationType} stay • {new Date(b.startTime).toLocaleDateString("en-IN")} to{" "}
                    {new Date(b.endTime).toLocaleDateString("en-IN")} • {b.property?.name}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-extrabold text-sm text-[#064B35]">
                    ₹{Number(b.totalAmount ?? b.totalPrice ?? 0).toLocaleString("en-IN")}
                  </span>
                  <Link
                    href={`/dashboard/bookings/${b.id}`}
                    className="px-3.5 py-1.5 rounded-[10px] border border-[#D4DCD0] font-bold text-xs text-[#17251F] hover:bg-[#FAF9F4] transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Support Quick Help Banner */}
      <div className="bg-white rounded-[20px] border border-[#E6EAE2] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-[14px] bg-[#EDF5E9] text-[#064B35] flex items-center justify-center shrink-0">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-extrabold text-[#17251F]">
              Need help with your stay, housekeeping, or keys?
            </h3>
            <p className="text-xs text-[#5F6F67] mt-0.5">
              Our 24/7 community host desk and maintenance engineers are ready to assist you.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/support"
          className="px-5 py-2.5 rounded-[12px] bg-[#064B35] text-white text-xs font-bold hover:bg-[#043827] transition-colors shrink-0 shadow-xs w-full sm:w-auto text-center"
        >
          Open Support Ticket
        </Link>
      </div>
    </div>
  );
}
