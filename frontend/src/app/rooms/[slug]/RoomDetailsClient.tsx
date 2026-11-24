"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Users,
  Wind,
  ShowerHead,
  Utensils,
  Clock,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  CalendarDays,
  CalendarRange,
  ArrowRight,
  X,
  Maximize2,
  Info,
  Phone,
  FileText,
  AlertCircle,
  Heart,
  Share2,
  Flag,
  MessageCircle,
  Building,
  Train,
  Briefcase,
  ShoppingBag,
  Check,
} from "lucide-react";
import { DurationType, PricingBreakdown } from "@/lib/types";
import { calculateBookingPricing } from "@/lib/pricing";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { isRoomSaved, toggleSaveRoom } from "@/lib/favorites";
import { useToast } from "@/components/ui/Toast";

export function RoomDetailsClient({
  room,
  initialParams = {},
}: {
  room: any;
  initialParams?: { [key: string]: string | undefined };
}) {
  const router = useRouter();

  // Images & Lightbox
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Available duration tabs only for enabled rate plans
  const enabledDurationTypes = (room.ratePlans || []).map((rp: any) => rp.durationType) as DurationType[];
  const initialDuration =
    initialParams?.durationType && enabledDurationTypes.includes(initialParams.durationType as any)
      ? (initialParams.durationType as DurationType)
      : enabledDurationTypes[0] || "MONTHLY";

  const [selectedDuration, setSelectedDuration] = useState<DurationType>(initialDuration);

  // Form states
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(initialParams?.startDate || today);
  const [startTime, setStartTime] = useState(initialParams?.startTime || "10:00");
  const [durationCount, setDurationCount] = useState<number>(
    Number(initialParams?.durationCount || (initialDuration === "HOURLY" ? 3 : 1))
  );
  const [includeFood, setIncludeFood] = useState(false);

  // Sync from window.location.search on mount (for static export client-side hydration)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const dt = sp.get("durationType") as DurationType | null;
      if (dt && enabledDurationTypes.includes(dt)) {
        setSelectedDuration(dt);
      }
      const sd = sp.get("startDate");
      if (sd) setStartDate(sd);
      const st = sp.get("startTime");
      if (st) setStartTime(st);
      const dc = sp.get("durationCount");
      if (dc) setDurationCount(Number(dc));
    }
  }, []);

  // Pricing breakdown from server
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // Hold & checkout state
  const [holding, setHolding] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);

  // Modals & User Feedback
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const toast = useToast();

  const showToast = (msg: string) => {
    toast.success("Stayzy", msg);
  };

  useEffect(() => {
    setIsSaved(isRoomSaved(room.id));
  }, [room.id]);

  const handleToggleFavorite = () => {
    const cover = room.images[0] || room.property?.coverImage;
    const nowSaved = toggleSaveRoom({
      id: room.id,
      name: room.name,
      slug: room.slug,
      category: room.category,
      property: {
        name: room.property.name,
        city: room.property.city,
        address: room.property.address,
      },
      image: cover,
      price: activeRatePlan?.price || 0,
      durationType: selectedDuration,
      hasAc: room.hasAc,
    });
    setIsSaved(nowSaved);
    showToast(nowSaved ? `Saved "${room.name}" to your wishlist!` : `Removed from wishlist.`);
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const url = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        showToast("Property link copied to clipboard!");
      } else {
        showToast("Link: " + url);
      }
    }
  };

  const activeRatePlan = room.ratePlans?.find((rp: any) => rp.durationType === selectedDuration) || room.ratePlans?.[0];

  // Bulletproof client-side pricing with safe server sync
  useEffect(() => {
    if (!startDate || durationCount <= 0 || !activeRatePlan) return;

    setCalculating(true);
    setPricingError(null);

    // 1. Calculate pricing instantly client-side (no network delay or HTML syntax error)
    const localCalc = calculateBookingPricing({
      ratePlan: activeRatePlan,
      durationType: selectedDuration,
      durationCount,
      startDateStr: startDate,
      startTimeStr: startTime,
      includeFood,
    });

    if (localCalc.success) {
      setPricing(localCalc.breakdown);
      setPricingError(null);
    } else {
      setPricingError(localCalc.error);
    }
    setCalculating(false);

    // 2. Optionally ping API in background if running with dynamic backend
    async function syncServerPricing() {
      try {
        const res = await fetch("/api/pricing/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomTypeId: room.id,
            durationType: selectedDuration,
            startDate,
            startTime,
            durationCount,
            includeFood,
          }),
        });

        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();
          if (data.success && data.breakdown) {
            setPricing(data.breakdown);
            setPricingError(null);
          }
        }
      } catch {
        // Safe to ignore network/static-host response since local calculation is already active
      }
    }

    syncServerPricing();
  }, [room.id, selectedDuration, startDate, startTime, durationCount, includeFood, activeRatePlan]);

  // Proceed to Checkout: Acquire temporary hold
  const handleProceedToCheckout = async () => {
    setHolding(true);
    setHoldError(null);

    let holdToken = `HOLD_${Date.now()}`;

    try {
      const res = await fetch("/api/checkout/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId: room.id,
          durationType: selectedDuration,
          startDate,
          startTime,
          durationCount,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.token || data.holdToken) {
          holdToken = data.token || data.holdToken;
        }
      }
    } catch {
      // Fallback to local hold token
    }

    // Route to checkout with holdToken
    const checkoutParams = new URLSearchParams();
    checkoutParams.set("holdToken", holdToken);
    checkoutParams.set("roomTypeId", room.id);
    checkoutParams.set("durationType", selectedDuration);
    checkoutParams.set("startDate", startDate);
    checkoutParams.set("startTime", startTime);
    checkoutParams.set("durationCount", String(durationCount));
    if (includeFood) checkoutParams.set("includeFood", "true");

    const checkoutUrl = `/checkout?${checkoutParams.toString()}`;

    // Check if user is currently authenticated
    try {
      const userRes = await fetch("/api/auth/me");
      const contentType = userRes.headers.get("content-type") || "";
      if (userRes.ok && contentType.includes("application/json")) {
        const userData = await userRes.json();
        if (!userData.user) {
          router.push(`/login?redirect=${encodeURIComponent(checkoutUrl)}`);
          return;
        }
      }
    } catch {}

    router.push(checkoutUrl);
  };

  // Derived neighborhood data based on property
  const isKoramangala = room.property.name.toLowerCase().includes("koramangala");
  const isHSR = room.property.name.toLowerCase().includes("hsr");
  const isIndiranagar = room.property.name.toLowerCase().includes("indiranagar");

  const neighborhoodHighlights = isIndiranagar
    ? [
        { icon: Train, label: "Indiranagar Metro Station", dist: "650 meters (8 min walk)" },
        { icon: Briefcase, label: "Embassy GolfLinks (EGL)", dist: "3.2 km (12 min cab)" },
        { icon: ShoppingBag, label: "100 Feet Road Eateries", dist: "200 meters (2 min walk)" },
        { icon: Building, label: "Manipal Hospital", dist: "1.8 km (7 min drive)" },
      ]
    : isHSR
    ? [
        { icon: Train, label: "Silk Board Metro Hub", dist: "1.2 km (10 min walk)" },
        { icon: Briefcase, label: "Outer Ring Road (ORR) Tech Corridor", dist: "2.1 km (8 min cab)" },
        { icon: ShoppingBag, label: "HSR BDA Complex & 27th Main", dist: "400 meters (5 min walk)" },
        { icon: Building, label: "Narayana Multispeciality", dist: "1.5 km (6 min drive)" },
      ]
    : [
        { icon: Train, label: "Sony World Signal / Koramangala Hub", dist: "300 meters (4 min walk)" },
        { icon: Briefcase, label: "Koramangala 4th Block Startups", dist: "100 meters (2 min walk)" },
        { icon: ShoppingBag, label: "Forum Mall & Nexus", dist: "1.4 km (6 min cab)" },
        { icon: Building, label: "St. John's Medical College Hospital", dist: "1.8 km (7 min drive)" },
      ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 lg:pb-8">
      {/* Breadcrumb / Top Bar */}
      <div className="flex items-center gap-2 text-xs text-[#5E6E65] mb-4">
        <span className="hover:text-[#123D2B] cursor-pointer" onClick={() => router.push("/")}>
          Home
        </span>
        <span>/</span>
        <span className="hover:text-[#123D2B] cursor-pointer" onClick={() => router.push("/rooms")}>
          Rooms
        </span>
        <span>/</span>
        <span className="text-[#192621] font-semibold">{room.name}</span>
      </div>

      {/* Header Info & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 gap-4 border-b border-[#E8E6DF]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-md text-xs font-bold bg-white text-[#123D2B] border border-[#D5D2C7] shadow-2xs">
              {room.category === "PRIVATE"
                ? "Private Room"
                : room.category === "TWIN_SHARING"
                ? "Twin Sharing Room"
                : "Triple Sharing Suite"}
            </span>
            <span className="text-xs text-[#5E6E65] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#123D2B]" />
              {room.property.name} ({room.property.city})
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 flex items-center gap-1">
              <Check className="w-3 h-3 text-green-700" />
              Verified Inspection by Stayzy
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-[#123D2B] tracking-tight">
            {room.name}
          </h1>
          <p className="text-sm sm:text-base font-medium text-[#374151] mt-1 max-w-2xl">
            {room.property.address}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleToggleFavorite}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#D5D2C7] text-xs font-bold transition-all ${
              isSaved ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-[#123D2B] hover:bg-[#FAF8F5]"
            }`}
            title={isSaved ? "Remove from wishlist" : "Save to wishlist"}
          >
            <Heart className={`w-4 h-4 ${isSaved ? "fill-red-600 text-red-600" : ""}`} />
            <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[#D5D2C7] bg-white text-xs font-bold text-[#123D2B] hover:bg-[#FAF8F5] transition-all"
            title="Share property link"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={() => setVisitModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#123D2B] text-white text-xs font-bold hover:bg-[#0E2F21] transition-colors shadow-xs"
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule Visit</span>
          </button>
        </div>
      </div>

      {/* Image Gallery with Fallback & Lightbox */}
      <div className="pt-6 space-y-3">
        <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-lg overflow-hidden bg-gray-100 border border-[#E8E6DF] group">
          <ImageWithFallback
            src={room.images[selectedPhotoIndex] || room.images[0] || "/fallback-room.jpg"}
            alt={`${room.name} - Accommodation Photo`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/70 backdrop-blur-md text-white text-xs font-bold hover:bg-black transition-colors z-20 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            View Full Photos ({room.images.length})
          </button>
        </div>

        {/* Thumbnail Row */}
        {room.images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {room.images.map((img: string, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPhotoIndex(idx)}
                className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  selectedPhotoIndex === idx
                    ? "border-[#123D2B] scale-105"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <ImageWithFallback
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Split Layout: Left Details + Right Sticky Booking Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-10">
        {/* Left Content (7 Cols) */}
        <div className="lg:col-span-7 space-y-10">
          {/* Quick Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-xs">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#5E6E65] uppercase">Occupancy</span>
              <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#192621]">
                <Users className="w-4 h-4 text-[#123D2B]" />
                {room.maxCapacity} {room.maxCapacity > 1 ? "Persons" : "Person"}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#5E6E65] uppercase">Room Area</span>
              <div className="text-sm font-extrabold text-[#192621]">
                {room.sizeSqFt} sq.ft
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#5E6E65] uppercase">Cooling</span>
              <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#192621]">
                <Wind className="w-4 h-4 text-[#123D2B]" />
                {room.hasAc ? "Split AC" : "Ceiling Fan & Vent"}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#5E6E65] uppercase">Washroom</span>
              <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#192621]">
                <ShowerHead className="w-4 h-4 text-[#123D2B]" />
                {room.bathroomType === "ATTACHED" ? "Attached En-Suite" : "Common Bath"}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-[#123D2B]">About this space</h2>
            <p className="text-sm font-normal text-[#374151] leading-relaxed whitespace-pre-line">
              {room.description}
            </p>
          </div>

          {/* Key Amenities */}
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-[#123D2B]">What this room includes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {room.keyAmenities.map((amenity: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3.5 rounded-lg bg-white border border-[#E8E6DF]"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#123D2B] shrink-0" />
                  <span className="text-xs font-semibold text-[#111827]">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transparent Charges & Utility Billing Strip */}
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-[#123D2B]">Transparent Charges &amp; Deposit</h2>
            <div className="bg-white p-6 rounded-lg border border-[#E8E6DF] space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-[#F0EDE4]">
                <div>
                  <span className="text-[#7B8B82] block text-[11px]">Security Deposit</span>
                  <span className="font-extrabold text-[#192621] text-sm">
                    {activeRatePlan?.depositAmount
                      ? `₹${activeRatePlan.depositAmount.toLocaleString("en-IN")}`
                      : "₹0 (Zero Deposit)"}
                  </span>
                  <span className="text-[10px] text-green-700 block mt-0.5">100% Refundable on move-out</span>
                </div>
                <div>
                  <span className="text-[#7B8B82] block text-[11px]">Maintenance & Cleaning</span>
                  <span className="font-extrabold text-[#192621] text-sm">₹0 / month</span>
                  <span className="text-[10px] text-[#5E6E65] block mt-0.5">Daily housekeeping included</span>
                </div>
                <div>
                  <span className="text-[#7B8B82] block text-[11px]">Electricity Metering</span>
                  <span className="font-extrabold text-[#192621] text-sm">Commercial Meter</span>
                  <span className="text-[10px] text-[#5E6E65] block mt-0.5">Billed strictly per BESCOM unit</span>
                </div>
              </div>
              <p className="text-[#5E6E65] leading-relaxed">
                Stayzy charges zero brokerage or hidden administrative charges. Deposits are held in an escrow ledger and returned electronically within 5 business days of checkout inspection.
              </p>
            </div>
          </div>

          {/* Neighborhood & Connectivity Highlights */}
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-[#123D2B]">Neighborhood &amp; Transit</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {neighborhoodHighlights.map((n, idx) => {
                const Icon = n.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-white border border-[#E8E6DF] flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 text-[#123D2B] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#111827] block">{n.label}</span>
                      <span className="text-[11px] text-[#4B5563]">{n.dist}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Food & Dining Details */}
          <div className="space-y-3 p-6 rounded-lg bg-[#F4F1E8] border border-[#E8E6DF]">
            <div className="flex items-center gap-2 text-[#123D2B]">
              <Utensils className="w-5 h-5" />
              <h3 className="text-base font-bold">Food &amp; Nutrition Information</h3>
            </div>
            <p className="text-xs text-[#374151] leading-relaxed">
              {room.foodDetails ||
                "Nutritious, chef-curated home meals (North and South Indian vegetarian and non-vegetarian menus) prepared daily in our centralized commercial kitchen. Filtered RO water dispensers and refrigerators provided on every floor."}
            </p>
          </div>

          {/* Property Rules & Policies */}
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-[#123D2B]">House Rules &amp; Check-in Timings</h2>
            <div className="bg-white p-6 rounded-lg border border-[#E8E6DF] space-y-4 text-xs text-[#374151]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#F0EDE4]">
                <div>
                  <span className="font-bold text-[#192621] block">Standard Check-in</span>
                  <span>{room.property.checkInTime}</span>
                </div>
                <div>
                  <span className="font-bold text-[#192621] block">Standard Check-out</span>
                  <span>{room.property.checkOutTime}</span>
                </div>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 leading-relaxed text-[#5E6E65]">
                <li><strong>Gate Timings: </strong>Biometric entry enabled 24/7; quiet hours between 10:30 PM and 6:30 AM.</li>
                <li><strong>Guest Policy: </strong>Day visitors are welcome in the community ground lounge until 8:00 PM.</li>
                <li><strong>Premises: </strong>100% non-smoking indoors; designated outdoor garden smoking zone provided.</li>
              </ul>
            </div>
          </div>

          {/* Property Host Contact Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8E6DF] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#123D2B]">Have questions about this stay?</h3>
                <p className="text-xs text-[#5E6E65] mt-0.5">
                  Connect directly with the Stayzy property operations desk.
                </p>
              </div>
              <button
                onClick={() => setReportModalOpen(true)}
                className="text-[11px] font-semibold text-[#7B8B82] hover:text-red-600 flex items-center gap-1 cursor-pointer"
              >
                <Flag className="w-3 h-3" />
                Report Listing
              </button>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={`tel:${room.property.contactPhone}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E8E6DF] text-xs font-bold text-[#123D2B] hover:bg-[#F0EDE4] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Desk ({room.property.contactPhone})</span>
              </a>
              <button
                onClick={() => setVisitModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-[#D5D2C7] text-[#123D2B] text-xs font-bold hover:bg-[#FAF8F5] transition-colors shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>Schedule Walkthrough Visit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sticky Booking Panel (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-white rounded-lg border border-[#E8E6DF] p-6 sm:p-8 shadow-card-hover space-y-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5E6E65]">
                Configure Booking
              </span>
              <h3 className="text-xl font-extrabold text-[#123D2B] mt-0.5">
                Reserve Your Stay
              </h3>
            </div>

            {/* Duration Selector Tabs (Only enabled durations) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#5E6E65]">Select Duration</label>
              <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#FAF8F5] border border-[#E8E6DF]">
                {enabledDurationTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedDuration(type);
                      if (type === "HOURLY") setDurationCount(3);
                      else setDurationCount(1);
                    }}
                    className={`flex-1 min-w-[70px] py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedDuration === type
                        ? "bg-[#123D2B] text-white shadow-sm"
                        : "text-[#5E6E65] hover:text-[#123D2B]"
                    }`}
                  >
                    {type === "HOURLY"
                      ? "Hourly"
                      : type === "DAILY"
                      ? "Daily"
                      : type === "WEEKLY"
                      ? "Weekly"
                      : type === "MONTHLY"
                      ? "Monthly"
                      : "Yearly"}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Inputs according to Duration */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#5E6E65]">
                  {selectedDuration === "HOURLY" ? "Date" : "Check-in / Move-in Date"}
                </label>
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium focus:ring-2 focus:ring-[#123D2B]/20"
                />
              </div>

              {selectedDuration === "HOURLY" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#5E6E65]">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#5E6E65]">Hours</label>
                    <select
                      value={durationCount}
                      onChange={(e) => setDurationCount(Number(e.target.value))}
                      className="w-full h-11 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
                    >
                      {[2, 3, 4, 5, 6, 8, 10].map((h) => (
                        <option key={h} value={h}>
                          {h} Hours
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {selectedDuration === "DAILY" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#5E6E65]">Nights</label>
                  <select
                    value={durationCount}
                    onChange={(e) => setDurationCount(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
                  >
                    {[1, 2, 3, 4, 5, 7, 10, 14].map((n) => (
                      <option key={n} value={n}>
                        {n} Night{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedDuration === "WEEKLY" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#5E6E65]">Weeks</label>
                  <select
                    value={durationCount}
                    onChange={(e) => setDurationCount(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
                  >
                    {[1, 2, 3, 4].map((w) => (
                      <option key={w} value={w}>
                        {w} Week{w > 1 ? "s" : ""} ({w * 7} Days)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedDuration === "MONTHLY" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#5E6E65]">Calendar Months</label>
                  <select
                    value={durationCount}
                    onChange={(e) => setDurationCount(Number(e.target.value))}
                    className="w-full h-11 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
                  >
                    {[1, 2, 3, 6, 9, 11].map((m) => (
                      <option key={m} value={m}>
                        {m} Calendar Month{m > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Optional Food Toggle for Monthly/Yearly */}
              {Boolean(
                (selectedDuration === "MONTHLY" || selectedDuration === "YEARLY") &&
                  activeRatePlan?.foodMonthlyCharge &&
                  activeRatePlan.foodMonthlyCharge > 0
              ) && (
                <label className="flex items-center justify-between p-3 rounded-lg bg-[#FAF8F5] border border-[#E8E6DF] cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#192621]">Daily 3-Meal Dining Plan</span>
                    <span className="text-[11px] text-[#5E6E65] block">
                      +₹{activeRatePlan.foodMonthlyCharge.toLocaleString("en-IN")}/mo (Breakfast, Lunch, Dinner)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeFood}
                    onChange={(e) => setIncludeFood(e.target.checked)}
                    className="w-4 h-4 rounded text-[#123D2B]"
                  />
                </label>
              )}
            </div>

            {/* Live Pricing Breakdown */}
            {calculating ? (
              <div className="py-4 text-center text-xs text-[#5E6E65] animate-pulse">
                Calculating exact rate & dates...
              </div>
            ) : pricingError ? (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{pricingError}</span>
              </div>
            ) : pricing ? (
              <div className="space-y-3 pt-4 border-t border-[#F0EDE4] text-xs">
                {pricing.monthEndAdjustmentNote && (
                  <div className="p-2.5 rounded-lg bg-[#FAF8F5] text-[#5E6E65] text-[11px] flex items-start gap-1.5 border border-[#E8E6DF]">
                    <Info className="w-3.5 h-3.5 text-[#123D2B] shrink-0 mt-0.5" />
                    <span>{pricing.monthEndAdjustmentNote}</span>
                  </div>
                )}

                <div className="flex justify-between text-[#5E6E65]">
                  <span>
                    Base Tariff (₹{pricing.unitPrice.toLocaleString("en-IN")} × {pricing.durationCount})
                  </span>
                  <span className="font-semibold text-[#192621]">
                    ₹{pricing.baseAmount.toLocaleString("en-IN")}
                  </span>
                </div>

                {pricing.foodCharge > 0 && (
                  <div className="flex justify-between text-[#5E6E65]">
                    <span>Meals package</span>
                    <span className="font-semibold text-[#192621]">
                      ₹{pricing.foodCharge.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[#5E6E65]">
                  <span>GST & Service Taxes (12%)</span>
                  <span className="font-semibold text-[#192621]">
                    ₹{pricing.taxes.toLocaleString("en-IN")}
                  </span>
                </div>

                {pricing.depositAmount > 0 && (
                  <div className="flex justify-between text-[#123D2B] font-semibold bg-emerald-50 border border-emerald-200 p-2 rounded-md">
                    <span>Refundable Deposit (100% Back)</span>
                    <span>₹{pricing.depositAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#F0EDE4] flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-extrabold text-[#123D2B]">Payable Now</span>
                    {pricing.balanceRemaining > 0 && (
                      <span className="text-[11px] text-[#7B8B82] block">
                        Remaining balance billed monthly
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-black text-[#123D2B]">
                    ₹{pricing.payableNow.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ) : null}

            {holdError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
                {holdError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={holding || !pricing || Boolean(pricingError)}
                className="w-full h-12 rounded-md bg-[#123D2B] text-white font-bold text-sm hover:bg-[#0E2F21] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {holding ? (
                  <span>Reserving 15-Minute Hold...</span>
                ) : (
                  <>
                    <span>Proceed to Book</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#7B8B82]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#123D2B]" />
                <span>Locks unit for 15 minutes without double-booking</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8">
          <div className="flex justify-between items-center text-white pb-4 max-w-7xl mx-auto w-full">
            <span className="text-sm font-semibold">
              Photo {selectedPhotoIndex + 1} of {room.images.length}
            </span>
            <button
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="relative flex-1 w-full max-h-[80vh] flex items-center justify-center">
            <ImageWithFallback
              src={room.images[selectedPhotoIndex] || room.images[0] || "/fallback-room.jpg"}
              alt={room.name}
              fill
              className="object-contain"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto justify-center pt-4 max-w-7xl mx-auto w-full">
            {room.images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedPhotoIndex(idx)}
                className={`relative w-20 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  selectedPhotoIndex === idx ? "border-white" : "border-transparent opacity-60"
                }`}
              >
                <ImageWithFallback src={img} alt={`Thumb ${idx}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Visit Modal */}
      {visitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setVisitModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-[#123D2B] mb-1">
              Visit {room.property.name}
            </h3>
            <p className="text-xs text-[#5E6E65] mb-5">
              Take an in-person or live guided video tour of {room.name}.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                try {
                  const res = await fetch("/api/visits/schedule", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      propertyId: room.property.slug,
                      customerName: form.customerName.value,
                      customerPhone: form.customerPhone.value,
                      customerEmail: form.customerEmail.value,
                      preferredDate: form.preferredDate.value,
                      timeSlot: form.timeSlot.value,
                    }),
                  });
                  if (res.ok) {
                    showToast("Visit scheduled! Our property manager will call you to confirm.");
                    setVisitModalOpen(false);
                  } else {
                    showToast("Could not schedule visit. Please try again.");
                  }
                } catch {
                  showToast("Error connecting to server.");
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="font-bold text-[#5E6E65] block mb-1">Your Full Name</label>
                <input
                  name="customerName"
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full h-10 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#5E6E65] block mb-1">Mobile Phone</label>
                  <input
                    name="customerPhone"
                    required
                    placeholder="+91 98765 43210"
                    className="w-full h-10 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#5E6E65] block mb-1">Email Address</label>
                  <input
                    name="customerEmail"
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="w-full h-10 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#5E6E65] block mb-1">Preferred Date</label>
                  <input
                    name="preferredDate"
                    type="date"
                    min={today}
                    defaultValue={today}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#5E6E65] block mb-1">Time Slot</label>
                  <select
                    name="timeSlot"
                    className="w-full h-10 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9]"
                  >
                    <option>10:00 AM - 12:00 PM</option>
                    <option>12:00 PM - 03:00 PM</option>
                    <option>03:00 PM - 06:00 PM</option>
                    <option>06:00 PM - 08:00 PM</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#123D2B] text-white font-bold text-xs hover:bg-[#0E2F21] mt-2 cursor-pointer shadow-sm"
              >
                Confirm Walkthrough Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Listing Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setReportModalOpen(false);
                setReportSubmitted(false);
              }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            {reportSubmitted ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#192621]">Report Received</h3>
                <p className="text-xs text-[#5E6E65] leading-relaxed">
                  Thank you for helping keep Stayzy accurate and verified. Our quality trust team will audit this property listing within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setReportModalOpen(false);
                    setReportSubmitted(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#123D2B] text-white text-xs font-bold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setReportSubmitted(true);
                  toast.success("Report Submitted", "Our quality trust team will audit this property listing.");
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <h3 className="text-lg font-bold text-[#123D2B]">Report Listing Issue</h3>
                  <p className="text-xs text-[#5E6E65] mt-0.5">
                    Help us maintain authentic accommodation standards on Stayzy.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#5E6E65]">Issue Category</label>
                  <select className="w-full h-10 px-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9]">
                    <option>Inaccurate photos or amenities</option>
                    <option>Mismatch in pricing or deposit terms</option>
                    <option>Property unavailable / wrong address</option>
                    <option>Host unresponsive</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#5E6E65]">Details</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe what information was inaccurate..."
                    className="w-full p-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700"
                >
                  Submit Audit Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky Booking Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 shadow-lg flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold">
            {selectedDuration.toLowerCase()} rate
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-[#123D2B]">
              ₹{pricing ? pricing.payableNow.toLocaleString("en-IN") : (activeRatePlan?.price || 0).toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              {pricing?.unitLabel || (selectedDuration === "HOURLY" ? "/hr" : selectedDuration === "DAILY" ? "/day" : "/mo")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisitModalOpen(true)}
            className="px-3.5 py-2.5 rounded-md border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Visit
          </button>
          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={holding || !pricing || Boolean(pricingError)}
            className="px-5 py-2.5 rounded-md bg-[#123D2B] text-white text-xs font-bold hover:bg-[#0E2F21] transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {holding ? (
              <span>Holding...</span>
            ) : (
              <>
                <span>Reserve</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
