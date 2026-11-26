"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Filter,
  X,
  SlidersHorizontal,
  MapPin,
  Users,
  Wind,
  ShowerHead,
  Utensils,
  ArrowRight,
  RotateCcw,
  Check,
  Heart,
  Share2,
  CheckCircle2,
  BedDouble,
  ShieldCheck,
  Calendar,
  Layers,
  Star,
} from "lucide-react";
import { DurationType, RoomCategory, BathroomType } from "@/lib/types";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { isRoomSaved, toggleSaveRoom } from "@/lib/favorites";
import { RoomCard } from "@/components/rooms/RoomCard";
import { useToast } from "@/components/ui/Toast";
import { RoomCardSkeleton } from "@/components/ui/Skeleton";

const getBudgetConfig = (duration: DurationType) => {
  switch (duration) {
    case "HOURLY": return { min: 100, max: 1000, step: 25 };
    case "DAILY": return { min: 500, max: 3000, step: 100 };
    case "WEEKLY": return { min: 2000, max: 20000, step: 500 };
    case "YEARLY": return { min: 50000, max: 500000, step: 10000 };
    case "MONTHLY":
    default:
      return { min: 5000, max: 50000, step: 1000 };
  }
};

export function RoomCatalog() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filters from URL or defaults
  const initialDuration =
    (searchParams.get("durationType") as DurationType) ||
    (searchParams.get("schedule") as DurationType) ||
    "MONTHLY";

  const [durationType, setDurationType] = useState<DurationType>(initialDuration);
  const [stayMode, setStayMode] = useState<"ALL" | "MONTHLY" | "SHORT">(
    initialDuration === "MONTHLY" || initialDuration === "YEARLY"
      ? "MONTHLY"
      : initialDuration
      ? "SHORT"
      : "ALL"
  );
  const [city, setCity] = useState<string>(searchParams.get("city") || "ALL");
  const [locality, setLocality] = useState<string>(searchParams.get("locality") || "ALL");
  const [genderEligibility, setGenderEligibility] = useState<string>(
    searchParams.get("gender") || "ALL"
  );
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") || new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState(searchParams.get("startTime") || "10:00");
  const [durationCount, setDurationCount] = useState(
    Number(searchParams.get("durationCount") || (searchParams.get("durationType") === "HOURLY" ? 3 : 1))
  );
  const [category, setCategory] = useState<RoomCategory | "ALL">(
    (searchParams.get("category") as any) || "ALL"
  );
  const [hasAc, setHasAc] = useState(searchParams.get("hasAc") === "true");
  const [bathroomType, setBathroomType] = useState<BathroomType | "ALL">(
    (searchParams.get("bathroomType") as any) || "ALL"
  );
  const [foodIncluded, setFoodIncluded] = useState(searchParams.get("foodIncluded") === "true");
  const [availableOnly, setAvailableOnly] = useState(searchParams.get("availableOnly") === "true");
  const [maxBudget, setMaxBudget] = useState<number>(
    searchParams.get("maxBudget") ? Number(searchParams.get("maxBudget")) : 40000
  );
  const [sortBy, setSortBy] = useState<"recommended" | "price_asc" | "price_desc" | "newest">(
    (searchParams.get("sortBy") as any) || "recommended"
  );

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const toast = useToast();
  const [savedRoomIds, setSavedRoomIds] = useState<string[]>([]);

  // Refresh saved IDs
  const refreshSavedStatus = () => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("stayzy_saved_rooms");
        if (raw) {
          const list = JSON.parse(raw);
          setSavedRoomIds(list.map((r: any) => r.id));
        }
      } catch {}
    }
  };

  useEffect(() => {
    refreshSavedStatus();
    window.addEventListener("stayzy_favorites_updated", refreshSavedStatus);
    return () => window.removeEventListener("stayzy_favorites_updated", refreshSavedStatus);
  }, []);

  // Sync URL changes to state (e.g. from footer locality clicks or navbar)
  useEffect(() => {
    const rawDuration =
      (searchParams.get("durationType") as DurationType) ||
      (searchParams.get("schedule") as DurationType);
    if (rawDuration) setDurationType(rawDuration);
    const rawLocality = searchParams.get("locality");
    if (rawLocality) setLocality(rawLocality);
    const rawCity = searchParams.get("city");
    if (rawCity) setCity(rawCity);
    const rawCat = searchParams.get("category");
    if (rawCat) setCategory(rawCat as any);
  }, [searchParams]);

  const showToast = (msg: string) => {
    toast.success("Wishlist Updated", msg);
  };

  // Fetch rooms on filter change
  useEffect(() => {
    async function fetchRooms() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        query.set("durationType", durationType);
        query.set("startDate", startDate);
        query.set("startTime", startTime);
        query.set("durationCount", String(durationCount));
        if (locality !== "ALL") query.set("locality", locality);
        if (city !== "ALL") query.set("city", city);
        if (category !== "ALL") query.set("category", category);
        if (hasAc) query.set("hasAc", "true");
        if (bathroomType !== "ALL") query.set("bathroomType", bathroomType);
        if (foodIncluded) query.set("foodIncluded", "true");
        if (availableOnly) query.set("availableOnly", "true");
        query.set("maxBudget", String(maxBudget));
        query.set("sortBy", sortBy);

        const res = await fetch(`/api/rooms?${query.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.rooms)) {
          let list = data.rooms;

          // 1. Dynamic rate plan mapping based on selected durationType
          list = list.map((r: any) => {
            const plans = r.allRatePlans || r.ratePlans || [];
            const plan = plans.find((p: any) => p.durationType === durationType) || r.currentRatePlan || plans[0];
            return {
              ...r,
              currentRatePlan: plan || r.currentRatePlan,
            };
          });

          // 2. City Filter
          if (city && city !== "ALL") {
            list = list.filter((r: any) =>
              r.property?.city?.toLowerCase() === city.toLowerCase() ||
              r.property?.name?.toLowerCase().includes(city.toLowerCase())
            );
          }

          // 3. Locality Filter (Strict match against address or name)
          if (locality && locality !== "ALL") {
            list = list.filter((r: any) => {
              const text = `${r.property?.name || ""} ${r.property?.address || ""} ${r.displayLocality || ""}`.toLowerCase();
              return text.includes(locality.toLowerCase());
            });
          }

          // 4. Room Configuration (Private, Twin, Triple)
          if (category && category !== "ALL") {
            list = list.filter((r: any) => r.category === category);
          }

          // 5. Gender / Community Filter
          if (genderEligibility && genderEligibility !== "ALL") {
            list = list.filter((r: any) => r.genderEligibility === genderEligibility);
          }

          // 6. AC Filter
          if (hasAc) {
            list = list.filter((r: any) => r.hasAc);
          }

          // 7. Bathroom Type Filter
          if (bathroomType && bathroomType !== "ALL") {
            list = list.filter((r: any) => r.bathroomType === bathroomType);
          }

          // 8. Food Included Filter
          if (foodIncluded) {
            list = list.filter((r: any) => r.foodIncluded);
          }

          // 9. Available Only Filter
          if (availableOnly) {
            list = list.filter((r: any) => (r.availableCount || 0) > 0 || r.isAvailable);
          }

          // 10. Max Budget Filter
          const budgetConfig = getBudgetConfig(durationType);
          if (maxBudget < budgetConfig.max) {
            list = list.filter((r: any) => {
              const price = r.currentRatePlan?.price || 0;
              return price <= maxBudget;
            });
          }

          // 11. Sorting
          if (sortBy === "price_asc") {
            list.sort((a: any, b: any) => (a.currentRatePlan?.price || 0) - (b.currentRatePlan?.price || 0));
          } else if (sortBy === "price_desc") {
            list.sort((a: any, b: any) => (b.currentRatePlan?.price || 0) - (a.currentRatePlan?.price || 0));
          } else if (sortBy === "newest") {
            list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          }

          setRooms(list);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRooms();
  }, [
    durationType,
    city,
    locality,
    genderEligibility,
    startDate,
    startTime,
    durationCount,
    category,
    hasAc,
    bathroomType,
    foodIncluded,
    availableOnly,
    maxBudget,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setDurationType("MONTHLY");
    setStayMode("ALL");
    setLocality("ALL");
    setGenderEligibility("ALL");
    setStartDate(new Date().toISOString().split("T")[0]);
    setStartTime("10:00");
    setDurationCount(1);
    setCategory("ALL");
    setHasAc(false);
    setBathroomType("ALL");
    setFoodIncluded(false);
    setAvailableOnly(false);
    setMaxBudget(50000);
    setSortBy("recommended");
  };

  const handleToggleFavorite = (room: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
      price: room.currentRatePlan.price,
      durationType,
      hasAc: room.hasAc,
    });

    refreshSavedStatus();
    showToast(nowSaved ? `Saved "${room.name}" to your wishlist!` : `Removed from wishlist.`);
  };

  const handleShare = (room: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/rooms/${room.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast("Property link copied to clipboard!");
    } else {
      showToast("Link: " + url);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header (Showing X properties in City) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <span>Home</span>
            <span>&gt;</span>
            <span className="text-emerald-600 font-bold">{locality !== "ALL" ? locality : city !== "ALL" ? city : "Bengaluru"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#111827] tracking-tight">
            Showing {rooms.length} properties in {locality !== "ALL" ? locality : city !== "ALL" ? city : "Bengaluru"}
          </h1>
          <p className="text-sm sm:text-base font-medium text-gray-600 mt-1.5 max-w-2xl">
            Live prices, verified amenities, and instant room availability with zero brokerage.
          </p>
        </div>

        {/* Top Controls: Mobile Filter Button & Sorting */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-800 shadow-xs"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            Filters
          </button>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 hidden sm:inline">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500/20 shadow-xs cursor-pointer"
            >
              <option value="recommended">Recommended (Best Match)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Listings</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Sidebar Filters (Sticky on Left) + Room Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-6">
        {/* Desktop Sidebar Filters: Zolo Clean Design */}
        <aside className="hidden lg:block lg:col-span-1 relative">
          <div className="sticky top-[128px] max-h-[calc(100vh-8.75rem)] overflow-y-auto pr-1 overscroll-contain">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-600" />
                Filters
              </span>
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-gray-500 hover:text-emerald-600 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {/* 1. Stay Mode Quick Switch (Short vs Monthly) */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Stay Type
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setStayMode("MONTHLY");
                    setDurationType("MONTHLY");
                  }}
                  className={`py-2 text-xs font-black rounded-md transition-all ${
                    durationType === "MONTHLY" || durationType === "YEARLY"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Monthly PG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStayMode("SHORT");
                    setDurationType("DAILY");
                  }}
                  className={`py-2 text-xs font-black rounded-md transition-all ${
                    durationType === "HOURLY" || durationType === "DAILY" || durationType === "WEEKLY"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Daily Stay
                </button>
              </div>

              {/* Specific Duration Pill Selector */}
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as DurationType[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDurationType(d);
                      if (d === "HOURLY") setDurationCount(3);
                      else setDurationCount(1);
                      setMaxBudget(getBudgetConfig(d).max);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all flex items-center justify-between cursor-pointer border ${
                      durationType === d
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                        : "bg-white border-gray-200 text-gray-700 hover:border-emerald-500 hover:bg-emerald-50/40"
                    }`}
                  >
                    <span>
                      {d === "HOURLY"
                        ? "Hourly (Work / Rest)"
                        : d === "DAILY"
                        ? "Daily (Overnight)"
                        : d === "WEEKLY"
                        ? "Weekly Package"
                        : d === "MONTHLY"
                        ? "Monthly PG Stay"
                        : "Yearly Lease"}
                    </span>
                    {durationType === d && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. City & Locality Filter */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                  Target City
                </label>
                <Link href="/cities" className="text-[11px] font-bold text-emerald-600 hover:underline">
                  All Cities &rarr;
                </Link>
              </div>
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setLocality("ALL");
                }}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-800 cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Hubs &amp; Cities</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Gurugram">Gurugram (Delhi-NCR)</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Pune">Pune</option>
                <option value="Chennai">Chennai</option>
              </select>

              {city === "Bengaluru" && (
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">
                    Locality (Bengaluru)
                  </label>
                  <select
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-800 cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="ALL">All Localities</option>
                    <option value="Koramangala">Koramangala (4th Block)</option>
                    <option value="HSR Layout">HSR Layout (Sector 2)</option>
                    <option value="Indiranagar">Indiranagar (100 Ft Rd)</option>
                  </select>
                </div>
              )}
            </div>

            {/* 3. Room Sharing Type */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Room Sharing Type
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-800 cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Sharing Types</option>
                <option value="PRIVATE">Private Room (1 Bed)</option>
                <option value="TWIN_SHARING">2 Sharing (Twin Beds)</option>
                <option value="TRIPLE_SHARING">3 Sharing (Triple Beds)</option>
              </select>
            </div>

            {/* 4. Gender / Living Policy */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Gender Eligibility
              </label>
              <select
                value={genderEligibility}
                onChange={(e) => setGenderEligibility(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-800 cursor-pointer focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Genders</option>
                <option value="COLIVING">Unisex PG</option>
                <option value="FEMALE">Women&apos;s PG</option>
                <option value="MALE">Men&apos;s PG</option>
              </select>
            </div>

            {/* 5. Comforts & Amenities Checkboxes */}
            <div className="space-y-2.5 pt-2 border-t border-gray-100">
              <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Amenities
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAc}
                    onChange={(e) => setHasAc(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-600 accent-emerald-600"
                  />
                  <span>Air Conditioned (AC)</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bathroomType === "ATTACHED"}
                    onChange={(e) => setBathroomType(e.target.checked ? "ATTACHED" : "ALL")}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-600 accent-emerald-600"
                  />
                  <span>Attached Washroom</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={foodIncluded}
                    onChange={(e) => setFoodIncluded(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-600 accent-emerald-600"
                  />
                  <span>Meals Included</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-600 accent-emerald-600"
                  />
                  <span className="text-emerald-700 font-black">Available to Move-In Now</span>
                </label>
              </div>
            </div>

            {/* 6. Dynamic Budget Slider */}
            {(() => {
              const cfg = getBudgetConfig(durationType);
              return (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs font-bold text-gray-600">
                    <span>Max Budget</span>
                    <span className="text-emerald-700 font-black">₹{maxBudget.toLocaleString("en-IN")}</span>
                  </div>
                  <input
                    type="range"
                    min={cfg.min}
                    max={cfg.max}
                    step={cfg.step}
                    value={Math.min(maxBudget, cfg.max)}
                    onChange={(e) => setMaxBudget(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                    <span>₹{cfg.min.toLocaleString("en-IN")}</span>
                    <span>₹{cfg.max.toLocaleString("en-IN")}+</span>
                  </div>
                </div>
              );
            })()}
            </div>
          </div>
        </aside>

        {/* Room Listings (3 Columns) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active Filter Chips Bar with Clear Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-[#111827]">Active Filters:</span>
            <span className="px-3 py-1 rounded-md bg-white border border-emerald-600 text-emerald-700 text-xs font-extrabold shadow-2xs">
              {durationType} Rate
            </span>
            {locality !== "ALL" && (
              <button
                type="button"
                onClick={() => setLocality("ALL")}
                className="px-2.5 py-1 rounded-md bg-white border border-[#D5D2C7] text-[#192621] text-xs font-semibold inline-flex items-center gap-1 hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer"
                title="Remove locality filter"
              >
                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{locality}</span>
                <X className="w-3 h-3 opacity-60" />
              </button>
            )}
            {category !== "ALL" && (
              <button
                type="button"
                onClick={() => setCategory("ALL")}
                className="px-2.5 py-1 rounded-md bg-white border border-[#D5D2C7] text-[#192621] text-xs font-semibold inline-flex items-center gap-1 hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer"
                title="Remove room category filter"
              >
                <span>{category === "PRIVATE" ? "Private Room" : category === "TWIN_SHARING" ? "Twin Sharing" : "Triple Sharing"}</span>
                <X className="w-3 h-3 opacity-60" />
              </button>
            )}
            {genderEligibility !== "ALL" && (
              <button
                type="button"
                onClick={() => setGenderEligibility("ALL")}
                className="px-2.5 py-1 rounded-md bg-white border border-[#D5D2C7] text-[#192621] text-xs font-semibold inline-flex items-center gap-1 hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer"
                title="Remove community filter"
              >
                <span>{genderEligibility === "COLIVING" ? "Co-Living" : genderEligibility === "FEMALE" ? "Women Only" : "Men Only"}</span>
                <X className="w-3 h-3 opacity-60" />
              </button>
            )}
            {hasAc && (
              <button
                type="button"
                onClick={() => setHasAc(false)}
                className="px-2.5 py-1 rounded-md bg-white border border-[#D5D2C7] text-[#192621] text-xs font-semibold inline-flex items-center gap-1 hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer"
                title="Remove AC filter"
              >
                <span>AC</span>
                <X className="w-3 h-3 opacity-60" />
              </button>
            )}
            {bathroomType === "ATTACHED" && (
              <button
                type="button"
                onClick={() => setBathroomType("ALL")}
                className="px-2.5 py-1 rounded-md bg-white border border-[#D5D2C7] text-[#192621] text-xs font-semibold inline-flex items-center gap-1 hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer"
                title="Remove Attached Bath filter"
              >
                <span>Attached Bath</span>
                <X className="w-3 h-3 opacity-60" />
              </button>
            )}
            {foodIncluded && (
              <button
                type="button"
                onClick={() => setFoodIncluded(false)}
                className="px-2.5 py-1 rounded-md bg-white border border-[#D5D2C7] text-[#192621] text-xs font-semibold inline-flex items-center gap-1 hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer"
                title="Remove meals filter"
              >
                <span>Meals Included</span>
                <X className="w-3 h-3 opacity-60" />
              </button>
            )}
            {availableOnly && (
              <button
                type="button"
                onClick={() => setAvailableOnly(false)}
                className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1 hover:bg-emerald-700 transition-colors cursor-pointer"
                title="Remove availability filter"
              >
                <span>Available Now</span>
                <X className="w-3 h-3 opacity-70" />
              </button>
            )}
            <span className="text-xs text-[#5E6E65] ml-auto font-bold">
              {rooms.length} {rooms.length === 1 ? "stay" : "stays"} available
            </span>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <RoomCardSkeleton key={n} />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            /* Clear Empty State */
            <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center space-y-5 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <MapPin className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#111827]">
                  {city !== "ALL"
                    ? `No Active Stays in ${city} Yet`
                    : locality !== "ALL"
                    ? `No Stays Found in ${locality}`
                    : "No Rooms Match These Filters"}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 max-w-lg mx-auto leading-relaxed mt-1.5">
                  {city !== "ALL"
                    ? `We are onboarding verified PGs and co-living partners in ${city}. In the meantime, explore available stays across our primary hubs:`
                    : "We couldn’t find accommodations matching your exact criteria. Try resetting your filters or selecting one of our top destinations below."}
                </p>
              </div>

              {/* Quick Tech Hub Recommendation Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 max-w-lg mx-auto">
                {[
                  { name: "Bengaluru", count: 18 },
                  { name: "Mumbai", count: 2 },
                  { name: "Gurugram", count: 2 },
                  { name: "Hyderabad", count: 2 },
                  { name: "Pune", count: 2 },
                  { name: "Chennai", count: 2 },
                ].map((hub) => (
                  <button
                    key={hub.name}
                    type="button"
                    onClick={() => {
                      setCity(hub.name);
                      setLocality("ALL");
                      setCategory("ALL");
                    }}
                    className="px-3 py-1.5 rounded-full bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    {hub.name} ({hub.count})
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                >
                  Reset All Filters
                </button>
                <Link
                  href="/cities"
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all"
                >
                  Browse Worldwide Cities Directory &rarr;
                </Link>
              </div>
            </div>
          ) : (
            /* Room Cards Grid with Promotional Banners */
            <div className="space-y-6">
              {/* Top Promo Banner */}
              <div className="rounded-xl bg-gradient-to-r from-emerald-100 via-emerald-50 to-teal-50 p-6 sm:p-7 text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-200 shadow-xs">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-950">
                    Stress-Free Life
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-emerald-800">
                    Come to Stayzy and we&apos;ll take care of the rest!
                  </p>
                </div>
                <div className="shrink-0 bg-white/90 backdrop-blur-xs px-4 py-2 rounded-lg border border-emerald-300/60 shadow-2xs flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  <span className="text-xs font-black text-gray-900 tracking-wide uppercase">
                    Outstanding Service
                  </span>
                </div>
              </div>

              {/* Room Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rooms.map((room, idx) => (
                  <React.Fragment key={room.id}>
                    <RoomCard
                      room={room}
                      durationType={durationType}
                      onFavoriteToggle={refreshSavedStatus}
                    />

                    {/* Middle Emerald Promo Banner after 4th card */}
                    {idx === 3 && (
                      <div className="md:col-span-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                        <div className="space-y-1 text-center sm:text-left">
                          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                            Easy to Book
                          </h3>
                          <p className="text-xs sm:text-sm font-medium text-white/90">
                            Pre-book now with 100% Refundable Deposit &amp; Instant Move-in.
                          </p>
                        </div>
                        <div className="shrink-0">
                          <span className="text-xs font-black uppercase tracking-wider bg-white text-emerald-700 px-4 py-2 rounded-lg shadow-sm">
                            Fully Refundable
                          </span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-sm bg-white h-full p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDE4]">
              <h3 className="text-base font-bold text-gray-900">Filter Rooms</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#5E6E65]">Duration</label>
              <select
                value={durationType}
                onChange={(e) => setDurationType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
              >
                <option value="HOURLY">Hourly (1-10 Hours)</option>
                <option value="DAILY">Daily (1-14 Days)</option>
                <option value="WEEKLY">Weekly (1-4 Weeks)</option>
                <option value="MONTHLY">Monthly PG (1-11 Months)</option>
                <option value="YEARLY">Yearly Agreement</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#5E6E65]">Target City</label>
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setLocality("ALL");
                }}
                className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
              >
                <option value="ALL">All Hubs &amp; Cities</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Gurugram">Gurugram (Delhi-NCR)</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Pune">Pune</option>
                <option value="Chennai">Chennai</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#5E6E65]">Locality</label>
              <select
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
              >
                <option value="ALL">All Localities</option>
                <option value="Koramangala">Koramangala</option>
                <option value="HSR Layout">HSR Layout</option>
                <option value="Indiranagar">Indiranagar</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#5E6E65]">Room Type</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
              >
                <option value="ALL">All Categories</option>
                <option value="PRIVATE">Private Room</option>
                <option value="TWIN_SHARING">Twin Sharing</option>
                <option value="TRIPLE_SHARING">Triple Sharing</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#5E6E65]">Amenities</label>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasAc}
                    onChange={(e) => setHasAc(e.target.checked)}
                  />
                  <span>Air Conditioning (AC)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={foodIncluded}
                    onChange={(e) => setFoodIncluded(e.target.checked)}
                  />
                  <span>Daily Home Meals</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                  />
                  <span className="font-bold text-emerald-700">Available to Move-In Now</span>
                </label>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={handleResetFilters}
                className="flex-1 py-2.5 rounded-md border border-[#D5D2C7] text-xs font-bold"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
