"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { BotanicalDecorations } from "@/components/common/BotanicalDecorations";
import { StayzyLogo } from "@/components/common/StayzyLogo";
import {
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Lock,
  User,
  FileCheck,
  Home,
  BedDouble,
  ChevronRight,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const holdToken = searchParams.get("holdToken") || "";
  const roomTypeId = searchParams.get("roomTypeId") || "";
  const durationType = searchParams.get("durationType") || "MONTHLY";
  const startDate = searchParams.get("startDate") || "";
  const startTime = searchParams.get("startTime") || "10:00";
  const durationCount = Number(searchParams.get("durationCount") || 1);
  const includeFood = searchParams.get("includeFood") === "true";

  // Guest details form state
  const [guestName, setGuestName] = useState("Aarav Sharma");
  const [guestEmail, setGuestEmail] = useState("aarav.sharma@example.com");
  const [guestPhone, setGuestPhone] = useState("+91 98765 12345");
  const [guestCount, setGuestCount] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Pre-fill from logged-in user if present
  useEffect(() => {
    try {
      const raw = localStorage.getItem("stayzy_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.name) setGuestName(u.name);
        if (u?.email) setGuestEmail(u.email);
        if (u?.phone) setGuestPhone(u.phone);
      }
    } catch {}
  }, []);

  // Pricing & room info state
  const [roomData, setRoomData] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment process state
  const [submitting, setSubmitting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSession, setPaymentSession] = useState<any>(null);
  const [processingWebhook, setProcessingWebhook] = useState(false);

  // 15-minute temporary hold countdown timer
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // 1. Fetch server pricing
        const priceRes = await fetch("/api/pricing/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomTypeId,
            durationType,
            startDate,
            startTime,
            durationCount,
            includeFood,
          }),
        });
        const priceContentType = priceRes.headers.get("content-type") || "";
        const priceData = priceContentType.includes("application/json")
          ? await priceRes.json()
          : { success: false };
        if (!priceData.success) {
          throw new Error(priceData.error || "Failed to calculate booking pricing.");
        }
        setPricing(priceData.breakdown);

        // 2. Fetch room details
        const roomRes = await fetch(`/api/rooms`);
        const roomContentType = roomRes.headers.get("content-type") || "";
        const roomList = roomContentType.includes("application/json")
          ? await roomRes.json()
          : { success: false };
        if (roomList.success) {
          const currentRoom = roomList.rooms.find((r: any) => r.id === roomTypeId);
          setRoomData(currentRoom);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (roomTypeId && startDate) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [roomTypeId, durationType, startDate, startTime, durationCount, includeFood]);

  // Handle Form Submission -> Create Booking & Initiate Payment
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!termsAccepted) {
      setError("Please review and accept the Stayzy Booking & Cancellation terms.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/checkout/create-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdToken,
          roomTypeId,
          durationType,
          startDate,
          startTime,
          durationCount,
          includeFood,
          guestName,
          guestEmail,
          guestPhone,
          guestCount,
          specialRequests,
          termsAccepted,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create booking.");
      }

      setPaymentSession(data);
      setPaymentModalOpen(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Simulate payment completion via signed webhook
  const handleSimulatePaymentWebhook = async (status: "SUCCESS" | "FAILED") => {
    if (!paymentSession) return;
    setProcessingWebhook(true);

    try {
      const payload = JSON.stringify({
        paymentId:
          paymentSession.paymentDetails.paymentId || paymentSession.paymentDetails.transactionRef,
        transactionRef: paymentSession.paymentDetails.transactionRef,
        bookingId: paymentSession.bookingId,
        amount: paymentSession.payableNow,
        status,
      });

      const signature =
        status === "FAILED" && paymentSession.paymentDetails.failedSignature
          ? paymentSession.paymentDetails.failedSignature
          : paymentSession.paymentDetails.signature;

      const res = await fetch("/api/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-stayzy-signature": signature,
        },
        body: payload,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Payment verification failed.");
      }

      if (status === "SUCCESS") {
        toast.success("Payment Successful", "Your booking has been confirmed!");
        router.push(`/booking-confirmation/${paymentSession.bookingId}`);
      } else {
        toast.warning(
          "Payment Unsuccessful",
          "Payment was marked as FAILED as simulated. The booking remains in unpaid status."
        );
        setPaymentModalOpen(false);
      }
    } catch (err: any) {
      toast.error("Payment Error", err.message);
    } finally {
      setProcessingWebhook(false);
    }
  };

  if (loading) {
    return (
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-24 text-center text-[#4A6158]">
        <Loader2 className="w-8 h-8 text-[#064E38] animate-spin mx-auto mb-3" />
        <p className="font-semibold text-sm">Preparing your secure checkout...</p>
      </div>
    );
  }

  const propertyTitle = roomData?.property?.name || roomData?.name || "Selected Stay";
  const propertyLocation =
    roomData?.property?.address ||
    (roomData?.property?.city ? `${roomData.property.city}` : "Koramangala, Bengaluru");

  const taxRatePercent =
    pricing && pricing.baseAmount + (pricing.foodCharge || 0) > 0
      ? Math.round((pricing.taxes / (pricing.baseAmount + (pricing.foodCharge || 0))) * 1000) / 10
      : 12;

  return (
    <div className="relative z-10 max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      {/* Top Bar: Breadcrumb + Brand + Countdown */}
      <div className="mb-7 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="inline-flex items-center gap-1.5 text-xs text-[#5E6E65]"
          >
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 hover:text-[#064E38] font-medium transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-[#087B50]" />
              <span>Home</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#9AA8A1]" />
            <button
              type="button"
              onClick={() => router.push("/rooms")}
              className="hover:text-[#064E38] font-medium transition-colors cursor-pointer"
            >
              Stays
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-[#9AA8A1]" />
            <span className="font-bold text-[#102C2B] truncate max-w-[200px] sm:max-w-xs">
              {propertyTitle}
            </span>
          </nav>

          {/* Compact Official Stayzy Mark */}
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Stayzy Home"
            className="cursor-pointer"
          >
            <StayzyLogo variant="dark" size="sm" />
          </button>
        </div>

        {/* Heading & Countdown Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EAF5E4] border border-[#CBE4C3] text-[11px] font-extrabold uppercase tracking-wider text-[#064E38]">
              INSTANT RESERVATION
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#064E38] tracking-tight leading-[1.12]">
              Review &amp; Complete Your Booking
            </h1>

            <p className="text-xs sm:text-sm text-[#4A6158] font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#087B50] shrink-0" />
              <span>Double-check your details and proceed with secure payment.</span>
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FDF7E7] border border-[#EFE2B8] text-[#6B5010] text-xs font-bold self-start md:self-auto shadow-2xs shrink-0">
            <Clock className="w-4 h-4 text-[#B98515] animate-pulse shrink-0" />
            <span>
              {secondsRemaining > 0 ? (
                <>
                  Booking holds for{" "}
                  <span className="font-mono font-extrabold">{formatTimer(secondsRemaining)}</span>
                </>
              ) : (
                <span className="text-rose-700 font-semibold">Hold Expired — refresh to secure</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmitBooking}
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)] gap-7 lg:gap-8 items-start"
      >
        {/* LEFT COLUMN (~63%) */}
        <div className="space-y-6 min-w-0">
          {/* Card 1: Resident & Contact Details */}
          <section className="bg-white rounded-[24px] border border-[#E9E3D5] p-6 sm:p-8 shadow-[0_10px_30px_-14px_rgba(16,44,43,0.08)] space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#064E38] text-white text-sm font-extrabold flex items-center justify-center shrink-0">
                1
              </span>
              <div className="flex items-center gap-2 text-[#102C2B]">
                <User className="w-5 h-5 text-[#087B50]" />
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Resident &amp; Contact Details
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-xs">
              {/* Row 1: Full Legal Name & Email */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#102C2B] block">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full h-11 px-4 rounded-xl border border-[#E9E3D5] bg-[#FAF6EC]/75 font-semibold text-[#102C2B] placeholder:text-[#8E9C95] focus:outline-hidden focus:ring-2 focus:ring-[#087B50]/25 focus:border-[#087B50]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#102C2B] block">
                  Email Address (for Receipt &amp; PIN)
                </label>
                <input
                  type="email"
                  required
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-11 px-4 rounded-xl border border-[#E9E3D5] bg-[#FAF6EC]/75 font-semibold text-[#102C2B] placeholder:text-[#8E9C95] focus:outline-hidden focus:ring-2 focus:ring-[#087B50]/25 focus:border-[#087B50]"
                />
              </div>

              {/* Row 2: Mobile Phone & Number of Guests */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#102C2B] block">
                  Mobile Phone (for Keyless Access)
                </label>
                <input
                  type="tel"
                  required
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full h-11 px-4 rounded-xl border border-[#E9E3D5] bg-[#FAF6EC]/75 font-semibold text-[#102C2B] placeholder:text-[#8E9C95] focus:outline-hidden focus:ring-2 focus:ring-[#087B50]/25 focus:border-[#087B50]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#102C2B] block">Number of Guests</label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full h-11 px-4 rounded-xl border border-[#E9E3D5] bg-[#FAF6EC]/75 font-semibold text-[#102C2B] focus:outline-hidden focus:ring-2 focus:ring-[#087B50]/25 focus:border-[#087B50]"
                >
                  <option value={1}>1 Guest</option>
                  {(roomData?.maxCapacity || 1) > 1 && <option value={2}>2 Guests</option>}
                  {(roomData?.maxCapacity || 1) > 2 && <option value={3}>3 Guests</option>}
                </select>
              </div>

              {/* Row 3: Special Requests Full Width */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-bold text-[#102C2B] block">
                  Special Requests (Optional)
                </label>
                <input
                  type="text"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. High floor, vegetarian meal preference, late check-in..."
                  className="w-full h-11 px-4 rounded-xl border border-[#E9E3D5] bg-[#FAF6EC]/75 font-medium text-[#102C2B] placeholder:text-[#8E9C95] focus:outline-hidden focus:ring-2 focus:ring-[#087B50]/25 focus:border-[#087B50]"
                />
              </div>
            </div>
          </section>

          {/* Card 2: Terms & House Rules + Primary Payment CTA */}
          <section className="bg-white rounded-[24px] border border-[#E9E3D5] p-6 sm:p-8 shadow-[0_10px_30px_-14px_rgba(16,44,43,0.08)] space-y-5">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#064E38] text-white text-sm font-extrabold flex items-center justify-center shrink-0">
                2
              </span>
              <div className="flex items-center gap-2 text-[#102C2B]">
                <FileCheck className="w-5 h-5 text-[#087B50]" />
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Terms &amp; House Rules
                </h2>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-[18px] bg-[#FAF6EC] border border-[#ECE4D2] space-y-3 text-xs sm:text-[13px] text-[#374B45]">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#087B50] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <p>
                  <strong className="text-[#102C2B]">Security Deposit:</strong> 100% refundable against any damages.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#087B50] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <p>
                  <strong className="text-[#102C2B]">Free Cancellation:</strong> Cancel up to 24 hours before check-in.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#087B50] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <p>
                  <strong className="text-[#102C2B]">Quiet Hours:</strong> 10:30 PM to 6:30 AM for a peaceful stay.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-3 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 rounded accent-[#064E38] mt-0.5 shrink-0 cursor-pointer"
              />
              <span className="text-xs sm:text-[13px] font-semibold text-[#102C2B] leading-relaxed">
                I acknowledge the Stayzy Booking Guidelines, Cancellation Terms, and confirm that the guest details provided are accurate.
              </span>
            </label>

            {/* Primary Payment Button */}
            <button
              type="submit"
              disabled={submitting || secondsRemaining === 0 || !pricing}
              className="w-full h-14 rounded-[14px] bg-gradient-to-r from-[#064E38] to-[#087B50] hover:from-[#053D2C] hover:to-[#066340] text-white font-bold text-sm sm:text-base shadow-[0_10px_24px_-8px_rgba(6,78,56,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Securing Your Stay...</span>
                </>
              ) : secondsRemaining === 0 ? (
                <span>Hold Expired — Please Refresh Page</span>
              ) : (
                <>
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    Pay ₹{(pricing?.payableNow || 0).toLocaleString("en-IN")} &amp; Confirm Stay
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </>
              )}
            </button>
          </section>
        </div>

        {/* RIGHT COLUMN (~37%) — Stay Summary */}
        <aside className="lg:sticky lg:top-8 min-w-0">
          <div className="bg-white rounded-[24px] border border-[#E9E3D5] shadow-[0_14px_38px_-14px_rgba(16,44,43,0.10)] overflow-hidden">
            {/* Light-Green Header */}
            <div className="bg-[#EAF5E4] px-6 py-5 border-b border-[#D5E9CE] flex items-center gap-3">
              <BedDouble className="w-6 h-6 text-[#064E38] shrink-0" />
              <h3 className="text-xl font-extrabold text-[#064E38] tracking-tight">Stay Summary</h3>
            </div>

            <div className="p-6 space-y-5">
              {/* Property Row */}
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-[14px] overflow-hidden shrink-0 bg-[#EAF5E4] border border-[#E9E3D5]">
                  <ImageWithFallback
                    src={
                      roomData?.images?.[0] ||
                      roomData?.property?.coverImage ||
                      "/fallback-room.jpg"
                    }
                    alt={propertyTitle}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-[#064E38] bg-[#EAF5E4] border border-[#CBE4C3] px-2.5 py-0.5 rounded-md">
                    {roomData?.category || "PREMIUM"}
                  </span>
                  <h4 className="text-base font-extrabold text-[#102C2B] leading-snug truncate">
                    {propertyTitle}
                  </h4>
                  <p className="text-xs text-[#4A6158] flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#087B50] shrink-0" />
                    <span className="truncate">{propertyLocation}</span>
                  </p>
                </div>
              </div>

              {/* Booking Details Panel */}
              {pricing && (
                <>
                  <div className="p-4 rounded-[16px] bg-[#FAF6EC] border border-[#ECE4D2] space-y-2.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5E6E65]">Duration Type:</span>
                      <span className="font-extrabold text-[#102C2B] uppercase">
                        {durationType}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5E6E65]">Check-in:</span>
                      <span className="font-bold text-[#102C2B] text-right">
                        {new Date(pricing.startDateTime).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        ,{" "}
                        {new Date(pricing.startDateTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5E6E65]">Check-out:</span>
                      <span className="font-bold text-[#102C2B] text-right">
                        {new Date(pricing.endDateTime).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        ,{" "}
                        {new Date(pricing.endDateTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="space-y-3 text-xs pt-1">
                    <div className="flex justify-between text-[#4A6158]">
                      <span>
                        Base Rent ({pricing.durationCount} {pricing.unitLabel})
                      </span>
                      <span className="font-bold text-[#102C2B]">
                        ₹{pricing.baseAmount.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {pricing.foodCharge > 0 && (
                      <div className="flex justify-between text-[#4A6158]">
                        <span>Home Meals Package</span>
                        <span className="font-bold text-[#102C2B]">
                          ₹{pricing.foodCharge.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-[#4A6158]">
                      <span>Taxes &amp; GST ({taxRatePercent}%)</span>
                      <span className="font-bold text-[#102C2B]">
                        ₹{pricing.taxes.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {pricing.depositAmount > 0 && (
                      <div className="flex items-center justify-between text-[#064E38] font-bold bg-[#EAF5E4] border border-[#CBE4C3] px-3.5 py-2.5 rounded-[12px]">
                        <span className="inline-flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[#087B50] shrink-0" />
                          <span>Refundable Security Deposit</span>
                        </span>
                        <span>₹{pricing.depositAmount.toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    <div className="pt-4 border-t border-[#EFEAE0] flex justify-between items-baseline">
                      <div>
                        <span className="text-base font-extrabold text-[#102C2B]">Due Today</span>
                        {pricing.balanceRemaining > 0 && (
                          <span className="text-[11px] text-[#60736B] block">
                            Scheduled balance: ₹{pricing.balanceRemaining.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <span className="text-3xl font-black text-[#064E38]">
                        ₹{pricing.payableNow.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </form>

      {/* Demo Payment Gateway Modal */}
      {paymentModalOpen && paymentSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 sm:p-8 relative shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 border border-[#E9E3D5]">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5E4] text-[#064E38] border border-[#CBE4C3] text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-[#087B50]" />
                Stayzy Instant Pay Gateway
              </div>
              <h3 className="text-xl font-extrabold text-[#064E38]">
                Stayzy Secure Payment Portal
              </h3>
              <p className="text-xs text-[#5E6E65]">
                Ref: <code>{paymentSession.paymentDetails.transactionRef}</code>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF6EC] border border-[#E9E3D5] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5E6E65]">Booking Ref:</span>
                <span className="font-bold text-[#102C2B]">{paymentSession.bookingReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5E6E65]">Total Amount:</span>
                <span className="font-black text-[#064E38] text-base">
                  ₹{paymentSession.payableNow.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5E6E65]">HMAC Signature:</span>
                <span className="font-mono text-[10px] text-gray-400 truncate max-w-[200px]">
                  {paymentSession.paymentDetails.signature}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#7B8B82] text-center leading-relaxed">
              This triggers a cryptographically signed HMAC-SHA256 server webhook. No actual bank card will be charged.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={processingWebhook}
                onClick={() => handleSimulatePaymentWebhook("SUCCESS")}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#064E38] to-[#087B50] text-white font-bold text-xs hover:from-[#053D2C] hover:to-[#066340] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#EAF5E4]" />
                {processingWebhook ? "Verifying Webhook..." : "Simulate Successful Payment"}
              </button>

              <button
                type="button"
                disabled={processingWebhook}
                onClick={() => handleSimulatePaymentWebhook("FAILED")}
                className="w-full h-10 rounded-xl border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50 transition-colors cursor-pointer"
              >
                Simulate Payment Failure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#FFFCF5] text-[#102C2B] overflow-x-hidden">
      <BotanicalDecorations variant="checkout" />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="relative z-10 max-w-4xl mx-auto px-4 py-24 text-center text-[#4A6158]">
              Loading checkout...
            </div>
          }
        >
          <CheckoutContent />
        </Suspense>
      </main>
    </div>
  );
}
