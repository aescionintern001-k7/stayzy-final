"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  ChevronDown,
  ChevronRight,
  Star,
  ShieldCheck,
  Building2,
  Headphones,
  User,
  Home,
  CheckCircle2,
  Navigation,
  X,
  Plus,
  Compass,
  Sparkles,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { StayzyLogo } from "@/components/common/StayzyLogo";
import { A_TO_Z_CITIES, QuickCity } from "@/lib/cities-data";

export function Hero() {
  const router = useRouter();
  const toast = useToast();

  // Search states
  const [destination, setDestination] = useState("");
  const [destFocused, setDestFocused] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Nearby");
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);
  const [stayType, setStayType] = useState<"MONTHLY" | "DAILY">("MONTHLY");

  // Selection states
  const [checkInDate, setCheckInDate] = useState("Mon, 23 Nov");
  const [checkOutDate, setCheckOutDate] = useState("Tue, 24 Nov");
  const [roomsCount, setRoomsCount] = useState(1);
  const [guestsCount, setGuestsCount] = useState(1);

  // Nav dropdown states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // City Mega Menu States
  const [activeCityLetter, setActiveCityLetter] = useState<string>("A");
  const [cityQuickSearch, setCityQuickSearch] = useState<string>("");

  const citiesForDisplay = React.useMemo(() => {
    if (cityQuickSearch.trim()) {
      const q = cityQuickSearch.trim().toLowerCase();
      const all: QuickCity[] = Object.values(A_TO_Z_CITIES).flat();
      return all.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          (c.region && c.region.toLowerCase().includes(q))
      );
    }
    if (activeCityLetter === "ALL") {
      return Object.values(A_TO_Z_CITIES).flat();
    }
    return A_TO_Z_CITIES[activeCityLetter] || [];
  }, [activeCityLetter, cityQuickSearch]);

  // Refs for click outside
  const searchBarRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Close open popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchBarRef.current && !searchBarRef.current.contains(target)) {
        setNearbyOpen(false);
        setDatePickerOpen(false);
        setGuestPickerOpen(false);
        setDestFocused(false);
      }
      if (headerRef.current && !headerRef.current.contains(target)) {
        setActiveDropdown(null);
        setLoginDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Quick switch role / demo login
  const handleRoleLogin = (role: "CUSTOMER" | "OWNER" | "ADMIN") => {
    const demoUserMap: Record<string, any> = {
      CUSTOMER: {
        id: "usr-customer-001",
        email: "aarav.sharma@example.com",
        name: "Aarav Sharma",
        phone: "+91 98765 12345",
        role: "CUSTOMER",
      },
      OWNER: {
        id: "usr-owner-001",
        email: "rajesh.pg@stayzy.com",
        name: "Rajesh Kumar (PG Partner)",
        phone: "+91 98450 88990",
        role: "OWNER",
      },
      ADMIN: {
        id: "usr-admin-001",
        email: "admin@stayzy.com",
        name: "Stayzy Lead Admin",
        phone: "+91 80 4567 8900",
        role: "ADMIN",
      },
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("stayzy_user", JSON.stringify(demoUserMap[role]));
    }
    setLoginDropdownOpen(false);
    toast.success("Persona Activated", `Switched to ${role} portal`);
    if (role === "ADMIN") router.push("/admin");
    else if (role === "OWNER") router.push("/owner");
    else router.push("/dashboard");
  };

  // Submit search query
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.set("locality", destination.trim());
    if (selectedCity && selectedCity !== "Nearby") params.set("city", selectedCity);
    params.set("durationType", stayType);
    params.set("rooms", roomsCount.toString());
    params.set("guests", guestsCount.toString());
    router.push(`/rooms?${params.toString()}`);
  };

  const popularCorridors = [
    { name: "Nearby (Current Loc)", city: "Nearby" },
    { name: "Koramangala, Bangalore", city: "Bangalore" },
    { name: "HSR Layout, Bangalore", city: "Bangalore" },
    { name: "Indiranagar, Bangalore", city: "Bangalore" },
    { name: "Whitefield, Bangalore", city: "Bangalore" },
    { name: "Gachibowli, Hyderabad", city: "Hyderabad" },
    { name: "Hitec City, Hyderabad", city: "Hyderabad" },
    { name: "OMR IT Corridor, Chennai", city: "Chennai" },
    { name: "Powai, Mumbai", city: "Mumbai" },
    { name: "Cyber City, Gurgaon", city: "Gurgaon" },
  ];

  return (
    <div className="relative w-full min-h-[780px] lg:min-h-[880px] flex flex-col justify-between overflow-hidden bg-[#0c130e] text-white">
      {/* ======================================================== */}
      {/* 1. BACKGROUND PHOTOGRAPH & PRECISE GRADIENT OVERLAYS    */}
      {/* ======================================================== */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
        {/* Crisp Luxury Living Room Background Image */}
        <img
          src="/hero-bg.jpg"
          alt="Stayzy Luxury Co-Living Penthouse"
          className="w-full h-full object-cover object-right sm:object-center transform scale-[1.01]"
        />

        {/* Master Dark Left-to-Right Gradient Overlay (Exact Section H formula) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(12, 18, 13, 0.82) 0%, rgba(18, 20, 17, 0.60) 42%, rgba(18, 20, 17, 0.18) 100%)",
          }}
        />

        {/* Top Vignette for Transparent Header & Navigation Legibility */}
        <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-black/75 via-black/35 to-transparent pointer-events-none" />

        {/* Bottom Ambient Gradient for Seamless Organic Curve Integration */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />
      </div>

      {/* ======================================================== */}
      {/* 2. TOP HEADER (TRANSPARENT, ~78-82px HIGH)               */}
      {/* ======================================================== */}
      <header
        ref={headerRef}
        className="relative z-50 w-full max-w-[1480px] mx-auto px-4 sm:px-8 lg:px-12 pt-4 lg:pt-5 overflow-visible"
      >
        <div className="flex items-center justify-between gap-4 pb-3.5 border-b border-white/15">
          {/* Left: Brand Logo & Wordmark (Exact User Reference Asset) */}
          <Link href="/" className="group cursor-pointer shrink-0">
            <StayzyLogo size="md" />
          </Link>

          {/* Middle: 3 Trust Value Propositions */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs font-semibold">
            {/* Item 1: Verified Rooms */}
            <div className="flex items-center gap-2.5 group">
              <ShieldCheck className="w-5 h-5 text-[#00B86B] shrink-0" strokeWidth={2.2} />
              <div className="leading-tight text-left">
                <div className="font-extrabold text-white text-[13px]">Verified Rooms</div>
                <div className="text-[10px] text-white/70 font-medium tracking-wide">
                  100% Verified Listings
                </div>
              </div>
            </div>

            <div className="w-px h-6 bg-white/20" />

            {/* Item 2: Best Prices */}
            <div className="flex items-center gap-2.5 group">
              <Building2 className="w-5 h-5 text-[#00B86B] shrink-0" strokeWidth={2.2} />
              <div className="leading-tight text-left">
                <div className="font-extrabold text-white text-[13px]">Best Prices</div>
                <div className="text-[10px] text-white/70 font-medium tracking-wide">
                  Save More, Live Better
                </div>
              </div>
            </div>

            <div className="w-px h-6 bg-white/20" />

            {/* Item 3: 24/7 Support */}
            <div className="flex items-center gap-2.5 group">
              <Headphones className="w-5 h-5 text-[#00B86B] shrink-0" strokeWidth={2.2} />
              <div className="leading-tight text-left">
                <div className="font-extrabold text-white text-[13px]">24/7 Support</div>
                <div className="text-[10px] text-white/70 font-medium tracking-wide">
                  We're Always Here
                </div>
              </div>
            </div>
          </div>

          {/* Right: Login / Signup & List Your Property */}
          <div className="flex items-center gap-4 text-xs font-bold shrink-0">
            {/* Subtle separator before actions */}
            <div className="hidden lg:block w-px h-6 bg-white/20" />

            {/* Login / Signup */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                className="hidden sm:inline-flex items-center gap-2 text-white hover:text-white/80 transition-colors cursor-pointer py-1.5 px-2"
              >
                <User className="w-4 h-4 text-white" strokeWidth={2.2} />
                <span className="text-[13px] font-semibold">Login / Signup</span>
              </button>

              {/* Login dropdown */}
              {loginDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 p-2 z-[100] text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-gray-100 font-bold text-gray-500 uppercase text-[10px]">
                    Select Access Role
                  </div>
                  <button
                    onClick={() => handleRoleLogin("CUSTOMER")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 hover:text-emerald-800 font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>Resident Portal (Aarav)</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">User</span>
                  </button>
                  <button
                    onClick={() => handleRoleLogin("OWNER")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 hover:text-emerald-800 font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>PG Host Portal (Rajesh)</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Host</span>
                  </button>
                  <button
                    onClick={() => handleRoleLogin("ADMIN")}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 hover:text-emerald-800 font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>Super Admin Console</span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Admin</span>
                  </button>
                  <div className="pt-1.5 border-t border-gray-100 mt-1 flex justify-between px-3 py-1">
                    <Link href="/login" className="text-emerald-700 hover:underline font-bold text-[11px]">
                      Regular Sign In
                    </Link>
                    <Link href="/register" className="text-gray-600 hover:underline font-bold text-[11px]">
                      Create Account
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Bright Emerald "List Your Property" Action Button */}
            <Link
              href="/owner/properties/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00B86B] hover:bg-[#00A35E] active:scale-95 text-white font-extrabold text-[13px] shadow-md transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 text-white" strokeWidth={2.2} />
              <span>List Your Property</span>
            </Link>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. NAVIGATION BAR ROW (UNDER HEADER)                     */}
        {/* ======================================================== */}
        <nav className="relative z-50 flex items-center justify-between py-2.5 text-[13px] font-semibold text-white overflow-visible">
          <div className="flex items-center gap-6 sm:gap-8 whitespace-nowrap overflow-visible">
            {/* 1. Home — Active with bright green underline */}
            <Link
              href="/"
              className="relative py-1.5 flex items-center gap-1.5 text-white font-bold cursor-pointer group"
            >
              <Home className="w-4 h-4 text-white" strokeWidth={2.2} />
              <span>Home</span>
              <div className="absolute -bottom-1.5 inset-x-0 h-[2.5px] bg-[#00B86B] rounded-full" />
            </Link>

            {/* 2. PG & Rooms */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "rooms" ? null : "rooms")
                }
                className="flex items-center gap-1 hover:text-white/80 transition-colors cursor-pointer py-1.5"
              >
                <span>PG & Rooms</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </button>
              {activeDropdown === "rooms" && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 p-3 z-[100] text-xs space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    PG Stays &amp; Rooms
                  </div>
                  <Link
                    href="/rooms?category=PG"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-900 hover:text-emerald-800 font-bold transition-colors"
                  >
                    <span>All PG Accommodations</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Verified</span>
                  </Link>
                  <Link
                    href="/rooms?category=PRIVATE"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Private Single Occupancy Rooms
                  </Link>
                  <Link
                    href="/rooms?category=TWIN_SHARING"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Twin Sharing (2 Beds with Attached Bath)
                  </Link>
                  <Link
                    href="/rooms?category=TRIPLE_SHARING"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Triple Sharing Budget Rooms
                  </Link>
                  <Link
                    href="/rooms?foodIncluded=true"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors border-t border-gray-100 mt-1 pt-2"
                  >
                    PGs with Daily 3-Meal Dining
                  </Link>
                </div>
              )}
            </div>

            {/* 3. Hostels */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "hostels" ? null : "hostels")
                }
                className="flex items-center gap-1 hover:text-white/80 transition-colors cursor-pointer py-1.5"
              >
                <span>Hostels</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </button>
              {activeDropdown === "hostels" && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 p-3 z-[100] text-xs space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Hostel Living
                  </div>
                  <Link
                    href="/rooms?category=HOSTEL"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-900 hover:text-emerald-800 font-bold transition-colors"
                  >
                    <span>All Hostels &amp; Dorms</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">12+ Stays</span>
                  </Link>
                  <Link
                    href="/rooms?category=HOSTEL"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Student &amp; College Campus Hostels
                  </Link>
                  <Link
                    href="/rooms?category=HOSTEL"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Working Professional Hostels
                  </Link>
                  <Link
                    href="/rooms?category=HOSTEL&hasAc=true"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Air-Conditioned Pods &amp; Dormitories
                  </Link>
                </div>
              )}
            </div>

            {/* 4. Flats */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "flats" ? null : "flats")
                }
                className="flex items-center gap-1 hover:text-white/80 transition-colors cursor-pointer py-1.5"
              >
                <span>Flats</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </button>
              {activeDropdown === "flats" && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 p-3 z-[100] text-xs space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Flats &amp; Apartments
                  </div>
                  <Link
                    href="/rooms?category=FLAT"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-900 hover:text-emerald-800 font-bold transition-colors"
                  >
                    <span>All Flats &amp; Apartments</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">15+ Stays</span>
                  </Link>
                  <Link
                    href="/rooms?category=FLAT"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Furnished Studio Apartments
                  </Link>
                  <Link
                    href="/rooms?category=FLAT"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    1 BHK &amp; 2 BHK Managed Flats
                  </Link>
                  <Link
                    href="/rooms?category=FLAT"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Luxury Penthouses &amp; Suites
                  </Link>
                </div>
              )}
            </div>

            {/* 5. Shared Spaces */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "shared" ? null : "shared")
                }
                className="flex items-center gap-1 hover:text-white/80 transition-colors cursor-pointer py-1.5"
              >
                <span>Shared Spaces</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </button>
              {activeDropdown === "shared" && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 p-3 z-[100] text-xs space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Community &amp; Sharing
                  </div>
                  <Link
                    href="/rooms?category=SHARED"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-900 hover:text-emerald-800 font-bold transition-colors"
                  >
                    All Shared Spaces
                  </Link>
                  <Link
                    href="/rooms?category=TWIN_SHARING"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Twin Sharing Suites
                  </Link>
                  <Link
                    href="/rooms?category=TRIPLE_SHARING"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Triple Sharing Social Pods
                  </Link>
                  <Link
                    href="/rooms?durationType=HOURLY"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors border-t border-gray-100 mt-1 pt-2"
                  >
                    Hourly Day-Stay &amp; Work Pods
                  </Link>
                </div>
              )}
            </div>

            {/* 6. Services */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "services" ? null : "services")
                }
                className="flex items-center gap-1 hover:text-white/80 transition-colors cursor-pointer py-1.5"
              >
                <span>Services</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </button>
              {activeDropdown === "services" && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 p-3 z-[100] text-xs space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Amenities &amp; Hospitality
                  </div>
                  <Link
                    href="/amenities"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-900 hover:text-emerald-800 font-bold transition-colors"
                  >
                    Chef-Curated Meals &amp; Dining
                  </Link>
                  <Link
                    href="/amenities"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    300 Mbps Enterprise Wi-Fi
                  </Link>
                  <Link
                    href="/amenities"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Daily Housekeeping &amp; Laundry
                  </Link>
                  <Link
                    href="/amenities"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    24/7 Security &amp; Smart Biometrics
                  </Link>
                </div>
              )}
            </div>

            {/* 7. More */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === "more" ? null : "more")
                }
                className="flex items-center gap-1 hover:text-white/80 transition-colors cursor-pointer py-1.5"
              >
                <span>More</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </button>
              {activeDropdown === "more" && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 p-3 z-[100] text-xs space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    Stayzy Resources
                  </div>
                  <Link
                    href="/about"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-900 hover:text-emerald-800 font-bold transition-colors"
                  >
                    About Stayzy Living
                  </Link>
                  <Link
                    href="/faq"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Help Center &amp; FAQs
                  </Link>
                  <Link
                    href="/cancellation-policy"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Cancellation &amp; Refund Policy
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 rounded-xl hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    Contact Support
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 8. All Cities Selector — FULL A-Z MEGA MENU */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === "cities" ? null : "cities")
              }
              className="flex items-center gap-1.5 hover:text-white/80 transition-colors cursor-pointer py-1.5 whitespace-nowrap ml-4 text-[13px] font-bold"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>All Cities</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/70" />
            </button>

            {/* A to Z City Directory Mega-Menu Modal / Popover */}
            {activeDropdown === "cities" && (
              <div className="absolute top-full right-0 mt-2 w-[92vw] max-w-3xl bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-200 p-5 z-[100] animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-gray-100 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 tracking-tight">
                        Worldwide Cities Directory (A to Z)
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium">
                        Instant browse 300+ co-living destinations &amp; tech hubs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quick filter input */}
                    <div className="relative flex items-center bg-gray-50 rounded-xl px-2.5 py-1.5 border border-gray-200 focus-within:ring-2 focus-within:ring-[#00B86B]">
                      <Search className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                      <input
                        type="text"
                        value={cityQuickSearch}
                        onChange={(e) => setCityQuickSearch(e.target.value)}
                        placeholder="Filter city..."
                        className="w-28 sm:w-36 bg-transparent text-xs text-gray-900 placeholder-gray-400 focus:outline-none font-medium"
                      />
                      {cityQuickSearch && (
                        <button
                          type="button"
                          onClick={() => setCityQuickSearch("")}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <Link
                      href="/cities"
                      onClick={() => setActiveDropdown(null)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#00B86B] hover:bg-[#00A35E] text-white text-xs font-extrabold shadow-xs flex items-center gap-1.5 shrink-0 transition-all"
                    >
                      <span>Full Directory (/cities)</span>
                      <span>&rarr;</span>
                    </Link>
                  </div>
                </div>

                {/* Alphabetical strip (A through Z) */}
                <div className="flex items-center justify-between overflow-x-auto scrollbar-none py-2 gap-1 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCityLetter("ALL");
                      setCityQuickSearch("");
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer whitespace-nowrap ${
                      activeCityLetter === "ALL" && !cityQuickSearch
                        ? "bg-[#00B86B] text-white shadow-xs"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    All
                  </button>
                  {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => {
                    const isSelected = activeCityLetter === letter && !cityQuickSearch;
                    const hasCities = !!A_TO_Z_CITIES[letter]?.length;
                    return (
                      <button
                        key={letter}
                        type="button"
                        disabled={!hasCities}
                        onClick={() => {
                          setActiveCityLetter(letter);
                          setCityQuickSearch("");
                        }}
                        className={`min-w-[24px] sm:min-w-[28px] h-7 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? "bg-[#00B86B] text-white shadow-xs font-black"
                            : hasCities
                            ? "text-gray-700 hover:text-[#00B86B] hover:bg-emerald-50"
                            : "text-gray-300 cursor-not-allowed"
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>

                {/* Section title & count */}
                <div className="flex items-center justify-between pt-2.5 pb-1.5 px-0.5">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {cityQuickSearch
                      ? `Matching "${cityQuickSearch}" (${citiesForDisplay.length})`
                      : activeCityLetter === "ALL"
                      ? `All Indexed Cities (${citiesForDisplay.length})`
                      : `Cities starting with ${activeCityLetter} (${citiesForDisplay.length})`}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    Click any city to view verified rooms
                  </span>
                </div>

                {/* Cities 4-Column Grid */}
                <div className="max-h-[300px] overflow-y-auto pr-1 pt-1 overscroll-contain">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {citiesForDisplay.map((c) => (
                      <button
                        key={`${c.name}-${c.country}`}
                        type="button"
                        onClick={() => {
                          router.push(`/rooms?city=${encodeURIComponent(c.name)}`);
                          setActiveDropdown(null);
                        }}
                        className={`text-left p-2.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                          c.hasStays
                            ? "bg-emerald-50/50 border-emerald-200 hover:border-[#00B86B] hover:bg-emerald-50"
                            : "bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50/80"
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <div className="text-xs font-bold text-gray-900 group-hover:text-[#00B86B] truncate">
                            {c.name}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {c.region ? `${c.region}, ` : ""}
                            {c.country}
                          </div>
                        </div>
                        {c.hasStays ? (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black">
                            ✓ Stays
                          </span>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#00B86B] group-hover:translate-x-0.5 transition-all shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {citiesForDisplay.length === 0 && (
                    <div className="text-center py-10 text-xs text-gray-500">
                      No indexed cities found matching &ldquo;{cityQuickSearch}&rdquo;.
                      <div className="mt-3">
                        <Link
                          href="/cities"
                          onClick={() => setActiveDropdown(null)}
                          className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all inline-block"
                        >
                          View All 300+ Cities on Full Directory Page &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* ======================================================== */}
      {/* 4. HERO CENTER: HEADLINE, SUBTITLE, SEARCH PANEL & STATS */}
      {/* ======================================================== */}
      <main className="relative z-20 w-full max-w-[1480px] mx-auto px-4 sm:px-8 lg:px-12 pt-8 pb-16 lg:py-16 my-auto">
        <div className="max-w-3xl space-y-4 sm:space-y-5 text-left">
          {/* Main Headline (Exact screenshot line arrangement & colors) */}
          <h1 className="text-4xl sm:text-6xl lg:text-[72px] font-black text-white tracking-tight leading-[1.05] drop-shadow-lg font-sans">
            Smart, Comfortable <br />
            Living. <br />
            <span className="text-[#00C875] drop-shadow-[0_2px_16px_rgba(0,200,117,0.35)]">
              Tailored For You.
            </span>
          </h1>

          {/* Supporting Description (Exact screenshot copy) */}
          <p className="text-base sm:text-lg lg:text-[19px] text-white/95 font-normal max-w-2xl leading-relaxed drop-shadow-md">
            Explore thousands of verified private rooms and shared spaces with chef-prepared meals,
            300 Mbps Wi-Fi, and zero brokerage across top tech hubs.
          </p>
        </div>

        {/* ======================================================== */}
        {/* 5. PROPERTY SEARCH PANEL (EXACT SCREENSHOT LAYOUT)       */}
        {/* ======================================================== */}
        <div ref={searchBarRef} className="mt-8 lg:mt-10 max-w-[1310px]">
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.30)] border border-white/60 flex flex-col md:flex-row items-stretch md:items-center gap-2 text-gray-800 transition-all"
          >
            {/* Field 1: Destination ("Where to?") */}
            <div className="flex-1 relative flex items-center gap-3 px-3 py-2">
              <Search className="w-5 h-5 text-gray-400 shrink-0" strokeWidth={2.2} />
              <input
                type="text"
                value={destination}
                onFocus={() => setDestFocused(true)}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Where to?"
                className="w-full text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-hidden bg-transparent"
              />

              {/* Autocomplete Corridor Popover */}
              {destFocused && (
                <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-50 text-xs space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase">
                    Popular localities
                  </div>
                  {popularCorridors.slice(1, 7).map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onMouseDown={() => {
                        setDestination(item.name);
                        setSelectedCity(item.city);
                        setDestFocused(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-gray-700 font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Field 2: Nearby Outlined Green Selector Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNearbyOpen(!nearbyOpen);
                  setDatePickerOpen(false);
                  setGuestPickerOpen(false);
                  setDestFocused(false);
                }}
                className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-[#00B86B] bg-[#F0FDF4] border border-[#00B86B] hover:bg-emerald-100/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#00B86B]" />
                  <span>{selectedCity}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#00B86B]" />
              </button>

              {nearbyOpen && (
                <div className="absolute top-full left-0 mt-3 w-60 bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-50 space-y-1 text-xs">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase">
                    Select Location / Corridor
                  </div>
                  {popularCorridors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setSelectedCity(c.city);
                        if (c.city !== "Nearby") setDestination(c.name);
                        setNearbyOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-gray-700 font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>{c.name}</span>
                      {selectedCity === c.city && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00B86B]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-8 bg-gray-200" />

            {/* Field 3: Date Selection (Mon, 23 Nov – Tue, 24 Nov) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setDatePickerOpen(!datePickerOpen);
                  setNearbyOpen(false);
                  setGuestPickerOpen(false);
                  setDestFocused(false);
                }}
                className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-700">
                    {checkInDate} – {checkOutDate}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {datePickerOpen && (
                <div className="absolute top-full left-0 mt-3 w-76 bg-white rounded-xl shadow-2xl border border-gray-100 p-3.5 z-50 space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="font-bold text-gray-800">Stay Type</span>
                    <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setStayType("MONTHLY")}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          stayType === "MONTHLY"
                            ? "bg-white text-emerald-800 shadow-xs"
                            : "text-gray-500"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setStayType("DAILY")}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          stayType === "DAILY"
                            ? "bg-white text-emerald-800 shadow-xs"
                            : "text-gray-500"
                        }`}
                      >
                        Daily
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Check-In</label>
                      <input
                        type="date"
                        defaultValue="2026-11-23"
                        onChange={(e) => {
                          if (e.target.value) {
                            const d = new Date(e.target.value);
                            setCheckInDate(
                              d.toLocaleDateString("en-US", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })
                            );
                          }
                        }}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Check-Out</label>
                      <input
                        type="date"
                        defaultValue="2026-11-24"
                        onChange={(e) => {
                          if (e.target.value) {
                            const d = new Date(e.target.value);
                            setCheckOutDate(
                              d.toLocaleDateString("en-US", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })
                            );
                          }
                        }}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 mt-1"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(false)}
                    className="w-full py-2 bg-[#00B86B] hover:bg-[#00A35E] text-white font-bold rounded-lg text-xs"
                  >
                    Apply Dates
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-8 bg-gray-200" />

            {/* Field 4: Room & Guest Selector ("1 Room, 1 Guest") */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setGuestPickerOpen(!guestPickerOpen);
                  setNearbyOpen(false);
                  setDatePickerOpen(false);
                  setDestFocused(false);
                }}
                className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-700">
                    {roomsCount} Room, {guestsCount} Guest{guestsCount > 1 ? "s" : ""}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {guestPickerOpen && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-3.5 z-50 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800">Rooms</div>
                      <div className="text-[10px] text-gray-400">Total rooms needed</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRoomsCount(Math.max(1, roomsCount - 1))}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm w-4 text-center">{roomsCount}</span>
                      <button
                        type="button"
                        onClick={() => setRoomsCount(Math.min(5, roomsCount + 1))}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-2.5">
                    <div>
                      <div className="font-bold text-gray-800">Guests</div>
                      <div className="text-[10px] text-gray-400">Adults & students</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGuestsCount(Math.max(1, guestsCount - 1))}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm w-4 text-center">{guestsCount}</span>
                      <button
                        type="button"
                        onClick={() => setGuestsCount(Math.min(10, guestsCount + 1))}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setGuestPickerOpen(false)}
                    className="w-full py-2 bg-[#00B86B] hover:bg-[#00A35E] text-white font-bold rounded-lg text-xs"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Field 5: Large Bright Green Search Action Button */}
            <button
              type="submit"
              className="px-8 py-3.5 rounded-xl bg-[#00B86B] hover:bg-[#00A35E] active:scale-95 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
              <span>Search</span>
            </button>
          </form>
        </div>

        {/* ======================================================== */}
        {/* 6. TRUST INDICATORS & STATISTICS ROW                     */}
        {/* ======================================================== */}
        <div className="mt-8 flex flex-wrap items-center justify-start gap-4 sm:gap-6 text-[13px] font-bold text-white/95 drop-shadow-md">
          {/* Happy Tenants */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00B86B]" strokeWidth={2.2} />
            <span>75k+ Happy Tenants</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* Cities */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00B86B]" strokeWidth={2.2} />
            <span>35+ Cities</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* Properties Listed */}
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-[#00B86B]" strokeWidth={2.2} />
            <span>1000+ Properties Listed</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* App Rating */}
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#00B86B] fill-[#00B86B]" strokeWidth={1.5} />
            <span>4.8★ App Rating</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* Since 2019 */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#00B86B]" strokeWidth={2.2} />
            <span>Since 2019</span>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 7. ORGANIC WHITE BOTTOM WAVE (TRANSITION TO REST OF PAGE)*/}
      {/* ======================================================== */}
      <div className="relative z-20 w-full overflow-hidden leading-none -mb-px">
        <svg
          viewBox="0 0 1440 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-12 sm:h-16 lg:h-22 text-white preserve-3d"
          preserveAspectRatio="none"
        >
          {/* Exact Organic Curve: High on left, dips in center, slight rise on right */}
          <path
            d="M0 45 C 320 90, 720 85, 1020 50 C 1220 28, 1360 40, 1440 60 L 1440 90 L 0 90 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {/* ======================================================== */}
      {/* 8. FLOATING CUSTOMER SUPPORT CHAT BUTTON (BOTTOM-RIGHT)   */}
      {/* ======================================================== */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link
          href="/dashboard/support"
          aria-label="Customer Support Live Chat"
          className="w-14 h-14 rounded-full bg-[#00B86B] hover:bg-[#00A35E] active:scale-95 shadow-2xl flex items-center justify-center text-white transition-all cursor-pointer group hover:shadow-[0_8px_25px_rgba(0,184,107,0.45)]"
        >
          {/* Chat bubble icon with two conversation dots */}
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
            <path d="M12 2C6.477 2 2 6.141 2 11.25c0 2.87 1.42 5.438 3.652 7.106-.178.966-.677 2.658-1.573 3.626 1.957-.22 3.69-1.026 4.773-1.802.997.288 2.052.445 3.148.445 5.523 0 10-4.141 10-9.25S17.523 2 12 2zm-3 10a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
