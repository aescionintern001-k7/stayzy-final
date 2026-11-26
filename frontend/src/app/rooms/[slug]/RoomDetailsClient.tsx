"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Users,
  Wind,
  ShowerHead,
  Utensils,
  Calendar,
  ShieldCheck,
  CheckCircle2,
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
  Building,
  Train,
  Briefcase,
  ShoppingBag,
  Check,
  Home,
  Wifi,
  Zap,
  Dumbbell,
  Sofa,
  Sparkles,
  BedDouble,
  Camera,
  ChevronLeft,
  ChevronRight,
  Tag,
  Clock,
  ChevronRight as BreadcrumbArrow,
} from "lucide-react";
import { DurationType, PricingBreakdown } from "@/lib/types";
import { calculateBookingPricing } from "@/lib/pricing";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { BotanicalDecorations } from "@/components/common/BotanicalDecorations";
import { isRoomSaved, toggleSaveRoom } from "@/lib/favorites";
import { useToast } from "@/components/ui/Toast";

function getAmenityIcon(amenity: string) {
  const lower = amenity.toLowerCase();
  if (lower.includes("wi-fi") || lower.includes("wifi") || lower.includes("internet")) return Wifi;
  if (lower.includes("ac") || lower.includes("air") || lower.includes("cool")) return Wind;
  if (lower.includes("meeting") || lower.includes("work") || lower.includes("desk")) return Users;
  if (lower.includes("housekeeping") || lower.includes("clean")) return Sparkles;
  if (lower.includes("power") || lower.includes("backup") || lower.includes("dg")) return Zap;
  if (lower.includes("gym") || lower.includes("fitness")) return Dumbbell;
  if (lower.includes("lounge") || lower.includes("sofa") || lower.includes("common")) return Sofa;
  if (lower.includes("food") || lower.includes("meal") || lower.includes("kitchen")) return Utensils;
  if (lower.includes("security") || lower.includes("biometric") || lower.includes("cctv")) return ShieldCheck;
  return CheckCircle2;
}

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
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Available duration tabs only for enabled rate plans
  const enabledDurationTypes = (room.ratePlans || []).map((rp: any) => rp.durationType) as DurationType[];
  const initialDuration =
    initialParams?.durationType && enabledDurationTypes.includes(initialParams.durationType as any)
      ? (initialParams.durationType as DurationType)
      : enabledDurationTypes.includes("MONTHLY" as DurationType)
      ? ("MONTHLY" as DurationType)
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

  const activeRatePlan =
    room.ratePlans?.find((rp: any) => rp.durationType === selectedDuration) || room.ratePlans?.[0];

  // Bulletproof client-side pricing with safe server sync
  useEffect(() => {
    if (!startDate || durationCount <= 0 || !activeRatePlan) return;

    setCalculating(true);
    setPricingError(null);

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
        // Safe to ignore since local calculation is active
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

    const checkoutParams = new URLSearchParams();
    checkoutParams.set("holdToken", holdToken);
    checkoutParams.set("roomTypeId", room.id);
    checkoutParams.set("durationType", selectedDuration);
    checkoutParams.set("startDate", startDate);
    checkoutParams.set("startTime", startTime);
    checkoutParams.set("durationCount", String(durationCount));
    if (includeFood) checkoutParams.set("includeFood", "true");

    const checkoutUrl = `/checkout?${checkoutParams.toString()}`;

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
  const propNameLower = (room.property?.name || "").toLowerCase();
  const isHSR = propNameLower.includes("hsr");
  const isIndiranagar = propNameLower.includes("indiranagar");

  const neighborhoodHighlights = isIndiranagar
    ? [
        { icon: Train, label: "Indiranagar Metro Station", dist: "650 meters", time: "8 min walk" },
        { icon: Briefcase, label: "Embassy GolfLinks (EGL)", dist: "3.2 km", time: "12 min cab" },
        { icon: ShoppingBag, label: "100 Feet Road Eateries", dist: "200 meters", time: "2 min walk" },
        { icon: Building, label: "Manipal Hospital", dist: "1.8 km", time: "7 min drive" },
      ]
    : isHSR
    ? [
        { icon: Train, label: "Silk Board Metro Hub", dist: "1.2 km", time: "10 min walk" },
        { icon: Briefcase, label: "Outer Ring Road (ORR) Tech", dist: "2.1 km", time: "8 min cab" },
        { icon: ShoppingBag, label: "HSR BDA Complex & 27th Main", dist: "400 meters", time: "5 min walk" },
        { icon: Building, label: "Narayana Multispeciality", dist: "1.5 km", time: "6 min drive" },
      ]
    : [
        { icon: Train, label: "Sony World Signal Hub", dist: "300 meters", time: "4 min walk" },
        { icon: Briefcase, label: "Koramangala 4th Block Startups", dist: "100 meters", time: "2 min walk" },
        { icon: ShoppingBag, label: "Forum Mall & Nexus", dist: "1.4 km", time: "6 min cab" },
        { icon: Building, label: "St. John's Medical Hospital", dist: "1.8 km", time: "7 min drive" },
      ];

  // Title split so location stands out in emerald green #07965F
  const displayTitle = room.name || room.property?.name || "Stayzy Residence";
  const dashMatch = displayTitle.match(/^(.*?)\s*[—–-]\s*(.+)$/);
  const titleMain = dashMatch ? dashMatch[1] : displayTitle;
  const titleAccent = dashMatch ? dashMatch[2] : room.property?.city || "";

  const categoryBadgeLabel =
    room.category === "PRIVATE"
      ? "PREMIUM PRIVATE CO-LIVING SPACE"
      : room.category === "TWIN_SHARING"
      ? "PREMIUM TWIN-SHARING SPACE"
      : "PREMIUM CO-LIVING SPACE";

  const images: string[] =
    Array.isArray(room.images) && room.images.length > 0 ? room.images : ["/fallback-room.jpg"];

  const amenities: string[] =
    Array.isArray(room.keyAmenities) && room.keyAmenities.length > 0
      ? room.keyAmenities
      : ["High-Speed Wi-Fi", "Split AC", "Daily Housekeeping", "Power Backup"];

  const contactPhone = room.property?.contactPhone || "+91 80 4567 8900";
  const taxRatePercent =
    pricing && pricing.baseAmount + pricing.foodCharge > 0
      ? Math.round((pricing.taxes / (pricing.baseAmount + pricing.foodCharge)) * 1000) / 10
      : 12;

  return (
    <div className="relative min-h-screen bg-[#FCFAF4] text-[#102C2B] overflow-x-hidden">
      <BotanicalDecorations variant="details" />

      <div className="relative z-10 max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-28 lg:pb-14 space-y-6 sm:space-y-7">
        {/* 1. Breadcrumb Pill */}
        <nav
          aria-label="Breadcrumb"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 border border-[#E9E3D5] shadow-[0_2px_8px_rgba(6,75,53,0.05)] text-xs text-[#5E6E65]"
        >
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1 hover:text-[#064B35] font-medium transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-[#07965F]" />
            <span>Home</span>
          </button>
          <BreadcrumbArrow className="w-3 h-3 text-[#9AA8A1]" />
          <button
            type="button"
            onClick={() => router.push("/rooms")}
            className="hover:text-[#064B35] font-medium transition-colors cursor-pointer"
          >
            Stays
          </button>
          <BreadcrumbArrow className="w-3 h-3 text-[#9AA8A1]" />
          <span className="text-[#064B35] font-bold truncate max-w-[200px] sm:max-w-xs">
            {room.property?.name || room.name}
          </span>
        </nav>

        {/* 2. Property Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5E5] border border-[#CBE4C3] text-[#064B35] text-[11px] font-extrabold tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-[#07965F]" />
              <span>{categoryBadgeLabel}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight leading-[1.12] text-[#102C2B]">
              {titleMain}
              {titleAccent ? (
                <>
                  {" "}
                  <span className="text-[#07965F]">— {titleAccent}</span>
                </>
              ) : null}
            </h1>

            <p className="text-sm text-[#4A6158] font-medium flex items-start sm:items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#07965F] shrink-0 mt-0.5 sm:mt-0" />
              <span>
                {room.property?.address}
                {room.property?.city && !room.property?.address?.includes(room.property.city)
                  ? `, ${room.property.city}`
                  : ""}
              </span>
            </p>
          </div>

          {/* Save & Share Aligned Right */}
          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-[0_2px_10px_rgba(6,75,53,0.06)] ${
                isSaved
                  ? "bg-red-50 text-red-600 border-red-200"
                  : "bg-white text-[#064B35] border-[#E5DFD0] hover:bg-[#EAF5E5]/60 hover:border-[#07965F]/40"
              }`}
              title={isSaved ? "Remove from wishlist" : "Save to wishlist"}
            >
              <Heart className={`w-4 h-4 ${isSaved ? "fill-red-600 text-red-600" : "text-[#07965F]"}`} />
              <span>{isSaved ? "Saved" : "Save"}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5DFD0] bg-white text-xs font-bold text-[#064B35] hover:bg-[#EAF5E5]/60 hover:border-[#07965F]/40 transition-all cursor-pointer shadow-[0_2px_10px_rgba(6,75,53,0.06)]"
              title="Share property link"
            >
              <Share2 className="w-4 h-4 text-[#07965F]" />
              <span>Share</span>
            </button>
          </div>
        </header>

        {/* 3. Main Two-Column Layout (~65% Left / ~35% Right, 28px gap) */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.86fr)_minmax(340px,1fr)] gap-7 items-start">
          {/* LEFT COLUMN (~65%) */}
          <div className="space-y-6 min-w-0">
            {/* Horizontal Property Information Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 bg-white rounded-[18px] border border-[#E9E3D5] shadow-[0_6px_22px_-12px_rgba(6,75,53,0.12)] divide-y sm:divide-y-0 sm:divide-x divide-[#EFEAE0]">
              <div className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EAF5E5] text-[#07965F] flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold text-[#60736B]">Occupancy</span>
                  <span className="block text-sm font-extrabold text-[#102C2B] truncate">
                    {room.maxCapacity || 1} {(room.maxCapacity || 1) > 1 ? "Persons" : "Person"}
                  </span>
                </div>
              </div>

              <div className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EAF5E5] text-[#07965F] flex items-center justify-center shrink-0">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold text-[#60736B]">Room Area</span>
                  <span className="block text-sm font-extrabold text-[#102C2B] truncate">
                    {room.sizeSqFt || 180} Sq.ft.
                  </span>
                </div>
              </div>

              <div className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EAF5E5] text-[#07965F] flex items-center justify-center shrink-0">
                  <Wind className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold text-[#60736B]">Cooling</span>
                  <span className="block text-sm font-extrabold text-[#102C2B] truncate">
                    {room.hasAc !== false ? "Split AC" : "Ceiling Fan"}
                  </span>
                </div>
              </div>

              <div className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EAF5E5] text-[#07965F] flex items-center justify-center shrink-0">
                  <ShowerHead className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold text-[#60736B]">Washroom</span>
                  <span className="block text-sm font-extrabold text-[#102C2B] truncate">
                    {room.bathroomType === "COMMON" ? "Common Bath" : "Attached En-suite"}
                  </span>
                </div>
              </div>
            </div>

            {/* A. Property Image Gallery */}
            <div className="space-y-3">
              <div className="relative aspect-[16/9] rounded-[20px] overflow-hidden bg-[#EAF5E5] border border-[#E9E3D5] shadow-[0_10px_28px_-14px_rgba(6,75,53,0.16)] group">
                <ImageWithFallback
                  src={images[selectedPhotoIndex] || images[0]}
                  alt={`${room.name} - Accommodation Photo`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPhotoIndex((prev) => (prev - 1 + images.length) % images.length)
                      }
                      aria-label="Previous photo"
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoIndex((prev) => (prev + 1) % images.length)}
                      aria-label="Next photo"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Bottom-Left Photo Counter */}
                <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-sm text-white text-xs font-bold z-20">
                  <Camera className="w-3.5 h-3.5 text-[#7AE8AE]" />
                  <span>
                    {selectedPhotoIndex + 1} / {images.length}
                  </span>
                </div>

                {/* Bottom-Right View All Photos Button */}
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/75 hover:bg-[#064B35] backdrop-blur-sm text-white text-xs font-bold transition-colors z-20 cursor-pointer border border-white/15 shadow-md"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#7AE8AE]" />
                  <span>View All Photos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* B. About This Space */}
            <section className="bg-white rounded-[20px] border border-[#E9E3D5] p-6 shadow-[0_8px_24px_-14px_rgba(6,75,53,0.10)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#EAF5E5] text-[#07965F] flex items-center justify-center shrink-0">
                      <Home className="w-4 h-4" />
                    </div>
                    <h2 className="text-xl font-extrabold text-[#102C2B] tracking-tight">
                      About this space
                    </h2>
                  </div>

                  <p
                    className={`text-sm text-[#4A6158] leading-relaxed whitespace-pre-line ${
                      !showFullDescription ? "line-clamp-3" : ""
                    }`}
                  >
                    {room.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFullDescription((prev) => !prev)}
                  className="self-start sm:self-center inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EAF5E5] hover:bg-[#D8EED1] border border-[#CBE4C3] text-[#064B35] text-xs font-bold transition-colors shrink-0 cursor-pointer"
                >
                  <span>{showFullDescription ? "Show Less" : "Know More"}</span>
                  <ArrowRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      showFullDescription ? "rotate-90" : ""
                    }`}
                  />
                </button>
              </div>
            </section>

            {/* C. What This Room Includes */}
            <section className="bg-white rounded-[20px] border border-[#E9E3D5] p-6 shadow-[0_8px_24px_-14px_rgba(6,75,53,0.10)] space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF5E5] text-[#07965F] flex items-center justify-center shrink-0">
                  <BedDouble className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-extrabold text-[#102C2B] tracking-tight">
                  What this room includes
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {amenities.map((amenity: string, idx: number) => {
                  const Icon = getAmenityIcon(amenity);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] bg-[#FAF8F2] border border-[#E9E3D5] hover:border-[#07965F]/40 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-[#07965F] shrink-0" />
                      <span className="text-xs font-bold text-[#102C2B] truncate" title={amenity}>
                        {amenity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* D. Transparent Charges & Deposit */}
            <section className="bg-white rounded-[20px] border border-[#E9E3D5] p-6 shadow-[0_8px_24px_-14px_rgba(6,75,53,0.10)] space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF5E5] text-[#07965F] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-extrabold text-[#102C2B] tracking-tight">
                  Transparent Charges &amp; Deposit
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-3.5">
                {/* Warm-cream tariff & utility breakdown */}
                <div className="grid grid-cols-3 divide-x divide-[#E6DFCF] rounded-[14px] bg-[#FAF8F2] border border-[#E9E3D5] p-4">
                  <div className="pr-3">
                    <span className="block text-[11px] font-semibold text-[#60736B]">
                      Base Tariff ({selectedDuration.toLowerCase()})
                    </span>
                    <span className="block text-base font-extrabold text-[#102C2B] mt-1">
                      ₹{(activeRatePlan?.price || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="px-3">
                    <span className="block text-[11px] font-semibold text-[#60736B]">
                      Maintenance &amp; Cleaning
                    </span>
                    <span className="block text-base font-extrabold text-[#102C2B] mt-1">
                      ₹0
                    </span>
                  </div>

                  <div className="pl-3">
                    <span className="block text-[11px] font-semibold text-[#60736B]">
                      Electricity / Metering
                    </span>
                    <span className="block text-xs sm:text-sm font-extrabold text-[#102C2B] mt-1 leading-snug">
                      {activeRatePlan?.electricityRule || "Included"}
                    </span>
                  </div>
                </div>

                {/* Soft pale-green refundable deposit highlight */}
                <div className="rounded-[14px] bg-[#EAF5E5] border border-[#CBE4C3] p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white text-[#07965F] flex items-center justify-center shrink-0 shadow-2xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold text-[#064B35] leading-tight">
                      100% Refundable Deposit
                    </span>
                    <span className="block text-base font-black text-[#064B35] mt-0.5">
                      {activeRatePlan?.depositAmount
                        ? `₹${activeRatePlan.depositAmount.toLocaleString("en-IN")}`
                        : "₹0 (Zero Deposit)"}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#60736B] leading-relaxed">
                Zero brokerage or hidden administrative charges. Security deposits are refunded within 5 business days of checkout inspection.
              </p>
            </section>
          </div>

          {/* RIGHT COLUMN (~35%) — Sticky Booking Panel */}
          <aside className="lg:sticky lg:top-24 min-w-0">
            <div className="bg-white rounded-[22px] border border-[#E5DFD0] shadow-[0_16px_40px_-14px_rgba(6,75,53,0.14)] overflow-hidden">
              {/* Soft Pale-Green Header */}
              <div className="bg-[#EAF5E5] px-6 py-5 border-b border-[#D5E9CE] flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white text-[#07965F] flex items-center justify-center shrink-0 shadow-2xs border border-[#CBE4C3]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#064B35] leading-tight">
                    Reserve Your Stay
                  </h3>
                  <p className="text-xs font-medium text-[#3D6351] mt-0.5">
                    Select your preferred duration.
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* 1. Duration Selector Segmented Control */}
                <div className="flex flex-wrap gap-1 p-1 rounded-[14px] bg-[#F6F4EC] border border-[#E9E3D5]">
                  {enabledDurationTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSelectedDuration(type);
                        if (type === "HOURLY") setDurationCount(3);
                        else setDurationCount(1);
                      }}
                      className={`flex-1 min-w-[64px] py-2 px-2 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${
                        selectedDuration === type
                          ? "bg-[#064B35] text-white shadow-xs"
                          : "text-[#4A6158] hover:text-[#064B35]"
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

                {/* 2. Check-in / Move-in Date */}
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#102C2B] block">
                      {selectedDuration === "HOURLY" ? "Date" : "Check-in / Move-in Date"}
                    </label>
                    <input
                      type="date"
                      min={today}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-[#E2DCCB] bg-[#FAF8F2] text-xs font-semibold text-[#102C2B] focus:outline-hidden focus:ring-2 focus:ring-[#07965F]/25 focus:border-[#07965F]"
                    />
                  </div>

                  {selectedDuration === "HOURLY" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#102C2B] block">Start Time</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full h-11 px-3 rounded-xl border border-[#E2DCCB] bg-[#FAF8F2] text-xs font-semibold text-[#102C2B]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#102C2B] block">Hours</label>
                        <select
                          value={durationCount}
                          onChange={(e) => setDurationCount(Number(e.target.value))}
                          className="w-full h-11 px-3 rounded-xl border border-[#E2DCCB] bg-[#FAF8F2] text-xs font-semibold text-[#102C2B]"
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
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#102C2B] block">Nights</label>
                      <select
                        value={durationCount}
                        onChange={(e) => setDurationCount(Number(e.target.value))}
                        className="w-full h-11 px-3.5 rounded-xl border border-[#E2DCCB] bg-[#FAF8F2] text-xs font-semibold text-[#102C2B]"
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
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#102C2B] block">Weeks</label>
                      <select
                        value={durationCount}
                        onChange={(e) => setDurationCount(Number(e.target.value))}
                        className="w-full h-11 px-3.5 rounded-xl border border-[#E2DCCB] bg-[#FAF8F2] text-xs font-semibold text-[#102C2B]"
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
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#102C2B] block">Calendar Months</label>
                      <select
                        value={durationCount}
                        onChange={(e) => setDurationCount(Number(e.target.value))}
                        className="w-full h-11 px-3.5 rounded-xl border border-[#E2DCCB] bg-[#FAF8F2] text-xs font-semibold text-[#102C2B]"
                      >
                        {[1, 2, 3, 6, 9, 11].map((m) => (
                          <option key={m} value={m}>
                            {m} Calendar Month{m > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedDuration === "YEARLY" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#102C2B] block">Years</label>
                      <select
                        value={durationCount}
                        onChange={(e) => setDurationCount(Number(e.target.value))}
                        className="w-full h-11 px-3.5 rounded-xl border border-[#E2DCCB] bg-[#FAF8F2] text-xs font-semibold text-[#102C2B]"
                      >
                        {[1, 2].map((y) => (
                          <option key={y} value={y}>
                            {y} Year{y > 1 ? "s" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 4. Optional Daily 3-Meal Dining Plan */}
                  {Boolean(
                    (selectedDuration === "MONTHLY" || selectedDuration === "YEARLY") &&
                      activeRatePlan?.foodMonthlyCharge &&
                      activeRatePlan.foodMonthlyCharge > 0
                  ) && (
                    <label className="flex items-center justify-between gap-3 p-3.5 rounded-[14px] bg-[#EAF5E5]/75 border border-[#CBE4C3] cursor-pointer hover:bg-[#EAF5E5] transition-colors">
                      <div className="flex items-start gap-2.5">
                        <Tag className="w-4 h-4 text-[#07965F] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-extrabold text-[#064B35] block">
                            Daily 3-Meal Dining Plan
                          </span>
                          <span className="text-[11px] text-[#4A6158] block mt-0.5">
                            +₹{activeRatePlan.foodMonthlyCharge.toLocaleString("en-IN")}/mo (Breakfast, Lunch, Dinner)
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={includeFood}
                        onChange={(e) => setIncludeFood(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#064B35] shrink-0 cursor-pointer"
                      />
                    </label>
                  )}
                </div>

                {/* 5. Dynamic Pricing Breakdown */}
                {calculating ? (
                  <div className="py-4 text-center text-xs text-[#60736B] animate-pulse">
                    Calculating exact rate &amp; dates...
                  </div>
                ) : pricingError ? (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{pricingError}</span>
                  </div>
                ) : pricing ? (
                  <div className="space-y-2.5 pt-4 border-t border-[#EFEAE0] text-xs">
                    {pricing.monthEndAdjustmentNote && (
                      <div className="p-2.5 rounded-xl bg-[#FAF8F2] text-[#4A6158] text-[11px] flex items-start gap-1.5 border border-[#E9E3D5]">
                        <Info className="w-3.5 h-3.5 text-[#07965F] shrink-0 mt-0.5" />
                        <span>{pricing.monthEndAdjustmentNote}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-[#4A6158]">
                      <span>
                        Base Tariff (₹{pricing.unitPrice.toLocaleString("en-IN")} × {pricing.durationCount})
                      </span>
                      <span className="font-bold text-[#102C2B]">
                        ₹{pricing.baseAmount.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {pricing.foodCharge > 0 && (
                      <div className="flex justify-between text-[#4A6158]">
                        <span>Meals package</span>
                        <span className="font-bold text-[#102C2B]">
                          ₹{pricing.foodCharge.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-[#4A6158]">
                      <span>GST &amp; Service Taxes ({taxRatePercent}%)</span>
                      <span className="font-bold text-[#102C2B]">
                        ₹{pricing.taxes.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {pricing.depositAmount > 0 && (
                      <div className="flex justify-between text-[#07965F] font-bold">
                        <span>Refundable Deposit (100% Back)</span>
                        <span>₹{pricing.depositAmount.toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    <div className="pt-3 mt-1 border-t border-[#EFEAE0] flex justify-between items-baseline">
                      <div>
                        <span className="text-sm font-extrabold text-[#102C2B]">Payable Now</span>
                        {pricing.balanceRemaining > 0 && (
                          <span className="text-[11px] text-[#60736B] block">
                            Remaining balance billed monthly
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-black text-[#064B35]">
                        ₹{pricing.payableNow.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ) : null}

                {holdError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {holdError}
                  </div>
                )}

                {/* 6. Proceed to Book CTA & 7. Security Indicator */}
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleProceedToCheckout}
                    disabled={holding || !pricing || Boolean(pricingError)}
                    className="w-full h-12 rounded-[14px] bg-gradient-to-r from-[#064B35] to-[#07965F] hover:from-[#053D2B] hover:to-[#067C4E] text-white font-bold text-sm shadow-[0_8px_20px_-6px_rgba(6,75,53,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

                  <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-[12px] bg-[#EAF5E5]/70 border border-[#D5E9CE] text-xs font-semibold text-[#064B35]">
                    <ShieldCheck className="w-4 h-4 text-[#07965F] shrink-0" />
                    <span>Secure &amp; Encrypted Payment</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* 4. Full-Width Pale-Green Contact & Support Card */}
        <section className="rounded-[20px] bg-[#EAF5E5] border border-[#CBE4C3] p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_6px_22px_-12px_rgba(6,75,53,0.12)]">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#064B35]">
              Have questions about this stay?
            </h2>
            <p className="text-xs sm:text-sm text-[#3D6351] font-medium">
              Connect directly with the Stayzy property operations desk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`tel:${contactPhone}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#CBE4C3] text-xs font-bold text-[#064B35] hover:bg-[#F6FBF4] transition-colors shadow-2xs"
            >
              <Phone className="w-4 h-4 text-[#07965F]" />
              <span>Call Desk ({contactPhone})</span>
            </a>

            <button
              type="button"
              onClick={() => setVisitModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#CBE4C3] text-xs font-bold text-[#064B35] hover:bg-[#F6FBF4] transition-colors shadow-2xs cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#07965F]" />
              <span>Schedule Walkthrough Visit</span>
            </button>

            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-[11px] font-semibold text-[#5E7368] hover:text-red-600 transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          </div>
        </section>

        {/* 5 & 6. Bottom Two-Column Section: Neighborhood & Transit + House Rules */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6 items-start">
          {/* 5. Neighborhood & Transit */}
          <section className="bg-white rounded-[20px] border border-[#E9E3D5] p-6 shadow-[0_8px_24px_-14px_rgba(6,75,53,0.10)] space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#07965F]" />
              <h2 className="text-base sm:text-lg font-extrabold text-[#102C2B]">
                Neighborhood &amp; Transit
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {neighborhoodHighlights.map((n, idx) => {
                const Icon = n.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-[14px] bg-[#FAF8F2] border border-[#E9E3D5] flex items-start gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#EAF5E5] text-[#07965F] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#102C2B] block leading-snug">
                        {n.label}
                      </span>
                      <span className="text-[11px] text-[#4A6158] block mt-0.5">{n.dist}</span>
                      <span className="text-[10.5px] text-[#60736B] block">({n.time})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 6. House Rules & Check-in Timings */}
          <section className="bg-white rounded-[20px] border border-[#E9E3D5] p-6 shadow-[0_8px_24px_-14px_rgba(6,75,53,0.10)] space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#07965F]" />
              <h2 className="text-base sm:text-lg font-extrabold text-[#102C2B]">
                House Rules &amp; Check-in Timings
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-[14px] bg-[#FAF8F2] border border-[#E9E3D5]">
                <span className="block text-[11px] font-semibold text-[#60736B]">
                  Standard Check-in
                </span>
                <span className="block text-sm font-extrabold text-[#102C2B] mt-0.5">
                  {room.property?.checkInTime || "12:00 PM"}
                </span>
              </div>
              <div className="p-3.5 rounded-[14px] bg-[#FAF8F2] border border-[#E9E3D5]">
                <span className="block text-[11px] font-semibold text-[#60736B]">
                  Standard Check-out
                </span>
                <span className="block text-sm font-extrabold text-[#102C2B] mt-0.5">
                  {room.property?.checkOutTime || "11:00 AM"}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFEAE0] space-y-1.5 text-xs text-[#4A6158]">
              <p>
                <strong className="text-[#102C2B]">Gate Timings:</strong> Biometric entry enabled 24/7; quiet hours 10:30 PM – 6:30 AM.
              </p>
              <p>
                <strong className="text-[#102C2B]">Guest Policy:</strong> Day visitors welcome in the ground lounge until 8:00 PM.
              </p>
              <p>
                <strong className="text-[#102C2B]">Premises:</strong> 100% smoke-free indoors; designated outdoor zone available.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8">
          <div className="flex justify-between items-center text-white pb-4 max-w-7xl mx-auto w-full">
            <span className="text-sm font-semibold">
              Photo {selectedPhotoIndex + 1} of {images.length}
            </span>
            <button
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-pointer"
              aria-label="Close photo gallery"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="relative flex-1 w-full max-h-[80vh] flex items-center justify-center">
            <ImageWithFallback
              src={images[selectedPhotoIndex] || images[0]}
              alt={room.name}
              fill
              className="object-contain"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto justify-center pt-4 max-w-7xl mx-auto w-full">
            {images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedPhotoIndex(idx)}
                className={`relative w-20 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  selectedPhotoIndex === idx ? "border-white" : "border-transparent opacity-60"
                }`}
              >
                <ImageWithFallback src={img} alt={`Thumb ${idx + 1}`} fill className="object-cover" />
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
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-[#064B35] mb-1">
              Visit {room.property?.name || room.name}
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
                      propertyId: room.property?.slug || room.property?.id,
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
                className="w-full h-11 rounded-xl bg-[#064B35] text-white font-bold text-xs hover:bg-[#053D2B] mt-2 cursor-pointer shadow-sm"
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
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 cursor-pointer"
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
                  className="px-5 py-2 rounded-xl bg-[#064B35] text-white text-xs font-bold cursor-pointer"
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
                  <h3 className="text-lg font-bold text-[#064B35]">Report Listing Issue</h3>
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
                  className="w-full h-11 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 cursor-pointer"
                >
                  Submit Audit Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky Booking Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E9E3D5] px-4 py-3 shadow-lg flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-[#60736B] uppercase tracking-wider block font-semibold">
            {selectedDuration.toLowerCase()} rate
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-[#064B35]">
              ₹{pricing ? pricing.payableNow.toLocaleString("en-IN") : (activeRatePlan?.price || 0).toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-[#60736B] font-medium">
              {pricing?.unitLabel || (selectedDuration === "HOURLY" ? "/hr" : selectedDuration === "DAILY" ? "/day" : "/mo")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVisitModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-[#D5D2C7] text-[#064B35] text-xs font-bold hover:bg-[#FAF8F2] transition-colors cursor-pointer"
          >
            Visit
          </button>
          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={holding || !pricing || Boolean(pricingError)}
            className="px-5 py-2.5 rounded-xl bg-[#064B35] text-white text-xs font-bold hover:bg-[#053D2B] transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
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
