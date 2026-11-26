"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ShieldCheck,
  BadgePercent,
  Headphones,
  User,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Menu,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Utensils,
  Wifi,
  Compass,
  CheckCircle2,
  HelpCircle,
  FileText,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { StayzyLogo } from "@/components/common/StayzyLogo";
import { A_TO_Z_CITIES, QuickCity } from "@/lib/cities-data";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  // All Cities Mega Menu Search & Filter
  const [activeCityLetter, setActiveCityLetter] = useState<string>("A");
  const [cityQuickSearch, setCityQuickSearch] = useState<string>("" );

  const navContainerRef = useRef<HTMLDivElement>(null);
  const prevPathnameRef = useRef(pathname);
  const isPopStateRef = useRef(false);

  // Track browser Back/Forward transitions cleanly so forward navigations always start at top
  useEffect(() => {
    const handlePopState = () => {
      isPopStateRef.current = true;
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Close menus and reset scroll position cleanly on forward route changes
  useEffect(() => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);

    if (prevPathnameRef.current !== pathname) {
      const wasPop = isPopStateRef.current;
      isPopStateRef.current = false;
      prevPathnameRef.current = pathname;

      if (!wasPop && !window.location.hash) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        });
      }
    }
  }, [pathname]);

  // Detect current role from URL or localStorage
  // Resolve current role from authoritative /api/auth/me session
  useEffect(() => {
    let active = true;

    async function syncSessionRole() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!active) return;
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          const data = await res.json();
          if (data?.user?.role) {
            setCurrentRole(data.user.role);
            if (typeof window !== "undefined") {
              localStorage.setItem("stayzy_user", JSON.stringify(data.user));
            }
            return;
          }
          setCurrentRole(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("stayzy_user");
            localStorage.removeItem("stayzy_jwt_token");
            localStorage.removeItem("stayzy_token");
          }
          return;
        }
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem("stayzy_user");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.role) {
              setCurrentRole(parsed.role);
              return;
            }
          }
        }
        setCurrentRole(null);
      } catch {
        if (active) setCurrentRole(null);
      }
    }

    syncSessionRole();
    const handleAuthChanged = () => {
      syncSessionRole();
    };
    window.addEventListener("stayzy_auth_changed", handleAuthChanged);
    return () => {
      active = false;
      window.removeEventListener("stayzy_auth_changed", handleAuthChanged);
    };
  }, [pathname]);

  // Click outside and Escape key to close any open dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDropdown(null);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleDropdown = (name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const closeAllMenus = () => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  };

  // Navigate to authenticated portal or login flow (never spoof roles in localStorage)
  const handleRoleLogin = async (role: "CUSTOMER" | "OWNER" | "ADMIN") => {
    try {
      setSwitching(true);
      closeAllMenus();

      const targetPath =
        role === "ADMIN" ? "/admin" : role === "OWNER" ? "/owner" : "/dashboard";

      if (
        (role === "ADMIN" && currentRole === "ADMIN") ||
        (role === "OWNER" && (currentRole === "OWNER" || currentRole === "ADMIN")) ||
        (role === "CUSTOMER" && currentRole !== null)
      ) {
        router.push(targetPath);
        return;
      }

      if (role === "ADMIN") {
        router.push("/admin/login");
      } else {
        router.push(`/login?redirect=${encodeURIComponent(targetPath)}`);
      }
    } finally {
      setSwitching(false);
    }
  };

  // Filtered cities list for All Cities Mega Menu
  const citiesForDisplay = useMemo(() => {
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

  const isHomeActive = pathname === "/";
  if (pathname === "/checkout") {
    return null;
  }
  const isRoomsActive = pathname.startsWith("/rooms") || pathname === "/explore";
  const isServicesActive = pathname === "/amenities";
  const isCitiesActive = pathname === "/cities";
  const isMoreActive =
    pathname === "/about" ||
    pathname === "/faq" ||
    pathname === "/contact" ||
    pathname === "/cancellation-policy" ||
    pathname === "/terms" ||
    pathname === "/privacy";

  return (
    <>
      {/* 
        ========================================================================
        GLOBAL STAYZY HEADER & NAVIGATION BAR
        - Unified 65px (mobile/tablet) / 109px (desktop lg+) height across all routes
        - Overlays dark Hero video seamlessly on `/` with fixed glass styling
        - Uses sticky top-0 in normal document flow on all other routes so page content
          always begins cleanly below the header with zero overlap or blank gaps
        ========================================================================
      */}
      <header
        ref={navContainerRef}
        className={`left-0 w-full z-50 h-[65px] lg:h-[109px] backdrop-blur-md transition-colors select-none ${
          isHomeActive
            ? "fixed top-0 bg-[#08100c]/80 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
            : "sticky top-0 bg-[#061811]/95 border-b border-emerald-950/60 shadow-[0_6px_24px_rgba(0,0,0,0.22)]"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* ========================================================== */}
          {/* ROW 1: BRAND LOGO + TOP TRUST FEATURES + AUTH & LIST BUTTON */}
          {/* ========================================================== */}
          <div className="h-16 flex items-center justify-between border-b border-white/10">
            {/* Left: Brand Logo */}
            <Link
              href="/"
              onClick={closeAllMenus}
              className="flex items-center gap-2 group shrink-0"
              aria-label="Stayzy Home"
            >
              <StayzyLogo variant="light" size="md" />
            </Link>

            {/* Middle: 3 Top Features / Trust Badges (Exact from Reference) */}
            <div className="hidden lg:flex items-center gap-6 xl:gap-10">
              {/* Feature 1: Verified Rooms */}
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[#00B981] shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#00B981]" strokeWidth={2.3} />
                </div>
                <div className="text-left leading-tight">
                  <div className="text-xs font-bold text-white tracking-wide">Verified Rooms</div>
                  <div className="text-[10px] text-white/70 font-medium">100% Verified Listings</div>
                </div>
              </div>

              {/* Feature 2: Best Prices */}
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[#00B981] shrink-0">
                  <BadgePercent className="w-5 h-5 text-[#00B981]" strokeWidth={2.3} />
                </div>
                <div className="text-left leading-tight">
                  <div className="text-xs font-bold text-white tracking-wide">Best Prices</div>
                  <div className="text-[10px] text-white/70 font-medium">Save More, Live Better</div>
                </div>
              </div>

              {/* Feature 3: 24/7 Support */}
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[#00B981] shrink-0">
                  <Headphones className="w-5 h-5 text-[#00B981]" strokeWidth={2.3} />
                </div>
                <div className="text-left leading-tight">
                  <div className="text-xs font-bold text-white tracking-wide">24/7 Support</div>
                  <div className="text-[10px] text-white/70 font-medium">We&apos;re Always Here</div>
                </div>
              </div>
            </div>

            {/* Right: Divider + Login/Signup + List Your Property Button */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* Vertical subtle divider */}
              <div className="hidden lg:block h-6 w-px bg-white/20 mx-1 shrink-0" />

              {/* Login / Signup Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown("login")}
                  className="flex items-center gap-2 text-white hover:text-emerald-400 font-semibold text-xs sm:text-[13px] py-1.5 px-2 rounded-lg transition-colors cursor-pointer group"
                  aria-expanded={activeDropdown === "login"}
                >
                  <User className="w-4 h-4 text-white group-hover:text-emerald-400 transition-colors" />
                  <span>Login / Signup</span>
                  <ChevronDown
                    className={`w-3 h-3 text-white/70 transition-transform duration-200 ${
                      activeDropdown === "login" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Login / Access Portal Popover */}
                {activeDropdown === "login" && (
                  <div className="absolute right-0 mt-3 w-80 bg-[#0d1612]/98 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/15 p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 border-b border-white/10 mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/40">
                        Select Access Portal
                      </span>
                      {currentRole && (
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          {currentRole}
                        </span>
                      )}
                    </div>

                    {/* 1. Resident / Customer */}
                    <button
                      type="button"
                      onClick={() => handleRoleLogin("CUSTOMER")}
                      disabled={switching}
                      className="w-full p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:bg-[#00B981] group-hover:text-white transition-colors">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-emerald-400">
                            Resident Login
                          </span>
                          {currentRole === "CUSTOMER" && (
                            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40">Active</span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/60 leading-snug line-clamp-1">
                          Bookings, Wi-Fi keys &amp; rent payments
                        </p>
                      </div>
                    </button>

                    {/* 2. Property Owner */}
                    <button
                      type="button"
                      onClick={() => handleRoleLogin("OWNER")}
                      disabled={switching}
                      className="w-full p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <Home className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-amber-400">
                            PG Host / Owner
                          </span>
                          {currentRole === "OWNER" && (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/40">Active</span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/60 leading-snug line-clamp-1">
                          Occupancy, tenant dues &amp; rooms
                        </p>
                      </div>
                    </button>

                    {/* Standard Links */}
                    <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between px-2 text-xs">
                      <Link
                        href="/login"
                        onClick={closeAllMenus}
                        className="text-emerald-400 font-bold hover:underline"
                      >
                        Standard Login &rarr;
                      </Link>
                      <Link
                        href="/register"
                        onClick={closeAllMenus}
                        className="text-white/70 hover:text-white font-medium"
                      >
                        Create Account
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* List Your Property Button (Exact Solid Green Pill Button with Home Icon) */}
              <Link
                href="/owner/properties/new"
                onClick={closeAllMenus}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg bg-[#00B981] hover:bg-[#009B70] text-white font-bold text-xs sm:text-[13px] shadow-[0_2px_12px_rgba(0,185,129,0.35)] transition-all cursor-pointer group shrink-0"
              >
                <Home className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>List Your Property</span>
              </Link>

              {/* Mobile Menu Trigger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                aria-label="Open Mobile Menu"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* ========================================================== */}
          {/* ROW 2: BOTTOM NAVIGATION BAR (Home, PG & Rooms, Hostels...) */}
          {/* ========================================================== */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center justify-between h-11 text-[13px] font-semibold text-white/90 relative"
          >
            <div className="flex items-center gap-6 xl:gap-8 h-full">
              {/* 1. Home (With Green Underline Bar) */}
              <Link
                href="/"
                onClick={closeAllMenus}
                className={`h-full flex items-center gap-1.5 transition-colors relative ${
                  isHomeActive ? "text-white font-bold" : "text-white/85 hover:text-white"
                }`}
              >
                <Home className="w-4 h-4 text-white" />
                <span>Home</span>
                {isHomeActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#00B981] rounded-full" />
                )}
              </Link>

              {/* 2. PG & Rooms ⌄ */}
              <div className="relative h-full flex items-center">
                <button
                  type="button"
                  onClick={() => toggleDropdown("rooms")}
                  className={`h-full flex items-center gap-1 transition-colors cursor-pointer relative ${
                    isRoomsActive ? "text-white font-bold" : "text-white/85 hover:text-white"
                  }`}
                >
                  <span>PG &amp; Rooms</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/70" />
                  {isRoomsActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#00B981] rounded-full" />
                  )}
                </button>

                {/* PG & Rooms Dropdown */}
                {activeDropdown === "rooms" && (
                  <div className="absolute top-full left-0 mt-3 w-72 bg-[#0d1612]/95 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.55)] border border-white/15 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold text-white/40 uppercase tracking-wider border-b border-white/10 mb-1">
                      Room Accommodations
                    </div>
                    <Link
                      href="/rooms?category=PG"
                      onClick={closeAllMenus}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white hover:text-emerald-400 font-bold text-xs transition-colors"
                    >
                      <span>All Verified PGs</span>
                      <span className="text-[10px] text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">100% Verified</span>
                    </Link>
                    <Link
                      href="/rooms?category=PRIVATE"
                      onClick={closeAllMenus}
                      className="block px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-emerald-400 font-semibold text-xs transition-colors"
                    >
                      Private Single Occupancy Rooms
                    </Link>
                    <Link
                      href="/rooms?category=TWIN_SHARING"
                      onClick={closeAllMenus}
                      className="block px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-emerald-400 font-semibold text-xs transition-colors"
                    >
                      Twin Sharing (2 Beds with Attached Bath)
                    </Link>
                    <Link
                      href="/rooms?category=TRIPLE_SHARING"
                      onClick={closeAllMenus}
                      className="block px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-emerald-400 font-semibold text-xs transition-colors"
                    >
                      Triple Sharing Budget Spaces
                    </Link>
                    <Link
                      href="/rooms?foodIncluded=true"
                      onClick={closeAllMenus}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-emerald-400 font-semibold text-xs transition-colors border-t border-white/10 mt-1 pt-2"
                    >
                      <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                      <span>PGs with Daily 3-Meal Dining</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. Hostels ⌄ */}
              <Link
                href="/rooms?category=HOSTEL"
                onClick={closeAllMenus}
                className="flex items-center gap-1 text-white/85 hover:text-white transition-colors py-1"
              >
                <span>Hostels</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </Link>

              {/* 4. Flats ⌄ */}
              <Link
                href="/rooms?category=FLAT"
                onClick={closeAllMenus}
                className="flex items-center gap-1 text-white/85 hover:text-white transition-colors py-1"
              >
                <span>Flats</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </Link>

              {/* 5. Shared Spaces ⌄ */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown("shared")}
                  className="flex items-center gap-1 text-white/85 hover:text-white transition-colors cursor-pointer py-1"
                >
                  <span>Shared Spaces</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/70" />
                </button>

                {activeDropdown === "shared" && (
                  <div className="absolute top-full left-0 mt-3 w-68 bg-[#0d1612]/95 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.55)] border border-white/15 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold text-white/40 uppercase tracking-wider border-b border-white/10 mb-1">
                      Co-Living &amp; Community
                    </div>
                    <Link
                      href="/rooms?category=SHARED"
                      onClick={closeAllMenus}
                      className="block px-3 py-2 rounded-xl hover:bg-white/10 text-white hover:text-emerald-400 font-bold text-xs transition-colors"
                    >
                      All Shared Living Spaces
                    </Link>
                    <Link
                      href="/rooms?category=SHARED"
                      onClick={closeAllMenus}
                      className="block px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-emerald-400 font-semibold text-xs transition-colors"
                    >
                      Tech Hub Executive Residences
                    </Link>
                    <Link
                      href="/rooms?category=SHARED"
                      onClick={closeAllMenus}
                      className="block px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-emerald-400 font-semibold text-xs transition-colors"
                    >
                      Student Friendly Co-Living Hubs
                    </Link>
                  </div>
                )}
              </div>

              {/* 6. Services ⌄ */}
              <div className="relative h-full flex items-center">
                <button
                  type="button"
                  onClick={() => toggleDropdown("services")}
                  className={`h-full flex items-center gap-1 transition-colors cursor-pointer relative ${
                    isServicesActive ? "text-white font-bold" : "text-white/85 hover:text-white"
                  }`}
                >
                  <span>Services</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/70" />
                  {isServicesActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#00B981] rounded-full" />
                  )}
                </button>

                {activeDropdown === "services" && (
                  <div className="absolute top-full left-0 mt-3 w-64 bg-[#0d1612]/95 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.55)] border border-white/15 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold text-white/40 uppercase tracking-wider border-b border-white/10 mb-1">
                      Included Amenities
                    </div>
                    <Link
                      href="/amenities"
                      onClick={closeAllMenus}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-white hover:text-emerald-400 font-bold text-xs transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View All Services</span>
                    </Link>
                    <Link
                      href="/amenities#wifi"
                      onClick={closeAllMenus}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-emerald-400 font-semibold text-xs transition-colors"
                    >
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                      <span>300 Mbps Fiber Wi-Fi</span>
                    </Link>
                    <Link
                      href="/amenities#food"
                      onClick={closeAllMenus}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-emerald-400 font-semibold text-xs transition-colors"
                    >
                      <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Chef-Prepared Meals</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* 7. More ⌄ */}
              <div className="relative h-full flex items-center">
                <button
                  type="button"
                  onClick={() => toggleDropdown("more")}
                  className={`h-full flex items-center gap-1 transition-colors cursor-pointer relative ${
                    isMoreActive ? "text-white font-bold" : "text-white/85 hover:text-white"
                  }`}
                >
                  <span>More</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/70" />
                  {isMoreActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#00B981] rounded-full" />
                  )}
                </button>

                {activeDropdown === "more" && (
                  <div className="absolute top-full left-0 mt-3 w-64 bg-[#0d1612]/95 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.55)] border border-white/15 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold text-white/40 uppercase tracking-wider border-b border-white/10 mb-1">
                      Stayzy Resources
                    </div>
                    <Link
                      href="/about"
                      onClick={closeAllMenus}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-white hover:text-emerald-400 font-bold text-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>About Stayzy Living</span>
                    </Link>
                    <Link
                      href="/faq"
                      onClick={closeAllMenus}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-emerald-400 font-semibold text-xs transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Help Center &amp; FAQs</span>
                    </Link>
                    <Link
                      href="/cancellation-policy"
                      onClick={closeAllMenus}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-emerald-400 font-semibold text-xs transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cancellation &amp; Refund</span>
                    </Link>
                    <Link
                      href="/contact"
                      onClick={closeAllMenus}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-emerald-400 font-semibold text-xs transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Contact Support</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* 8. All Cities ⌄ (With MapPin Icon) */}
            <div className="relative h-full flex items-center">
              <button
                type="button"
                onClick={() => toggleDropdown("cities")}
                className={`h-full flex items-center gap-1.5 transition-colors cursor-pointer relative ${
                  isCitiesActive ? "text-[#00D6A0] font-bold" : "text-white/90 hover:text-emerald-400"
                }`}
              >
                <MapPin className="w-4 h-4 text-[#00B981]" />
                <span className="font-semibold">All Cities</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
                {isCitiesActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#00B981] rounded-full" />
                )}
              </button>

              {/* All Cities Mega Menu */}
              {activeDropdown === "cities" && (
                <div className="absolute top-full right-0 mt-3 w-[92vw] max-w-3xl bg-[#0d1612]/98 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-white/15 p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-white/10 gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white tracking-tight">
                          Explore Verified Destinations (A to Z)
                        </h4>
                        <p className="text-[11px] text-white/60 font-medium">
                          Quick access to 300+ co-living rooms across India
                        </p>
                      </div>
                    </div>

                    {/* Quick filter input */}
                    <div className="relative flex items-center bg-white/5 rounded-xl px-2.5 py-1.5 border border-white/15 focus-within:ring-2 focus-within:ring-[#00B981]">
                      <Search className="w-3.5 h-3.5 text-white/50 mr-1.5" />
                      <input
                        type="text"
                        value={cityQuickSearch}
                        onChange={(e) => setCityQuickSearch(e.target.value)}
                        placeholder="Filter city..."
                        className="w-28 sm:w-36 bg-transparent text-xs text-white placeholder-white/40 focus:outline-none font-medium"
                      />
                      {cityQuickSearch && (
                        <button
                          type="button"
                          onClick={() => setCityQuickSearch("")}
                          className="text-white/50 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Letter Alphabet Filter Strip */}
                  <div className="flex items-center gap-1 overflow-x-auto py-2.5 border-b border-white/10 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCityLetter("ALL");
                        setCityQuickSearch("");
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-extrabold shrink-0 transition-colors ${
                        activeCityLetter === "ALL" && !cityQuickSearch
                          ? "bg-[#00B981] text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      ALL
                    </button>
                    {Object.keys(A_TO_Z_CITIES).map((letter) => {
                      const isSelected = activeCityLetter === letter && !cityQuickSearch;
                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => {
                            setActiveCityLetter(letter);
                            setCityQuickSearch("");
                          }}
                          className={`w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[#00B981] text-white"
                              : "text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>

                  {/* Cities Grid */}
                  <div className="max-h-[260px] overflow-y-auto pr-1 pt-2 overscroll-contain">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {citiesForDisplay.map((c) => (
                        <button
                          key={`${c.name}-${c.country}`}
                          type="button"
                          onClick={() => {
                            router.push(`/rooms?city=${encodeURIComponent(c.name)}`);
                            closeAllMenus();
                          }}
                          className={`text-left p-2 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                            c.hasStays
                              ? "bg-emerald-950/30 border-emerald-500/40 hover:border-[#00B981] hover:bg-emerald-900/40"
                              : "bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10"
                          }`}
                        >
                          <div className="min-w-0 pr-1">
                            <div className="text-xs font-bold text-white group-hover:text-emerald-400 truncate">
                              {c.name}
                            </div>
                            <div className="text-[10px] text-white/50 truncate">
                              {c.region ? `${c.region}, ` : ""}
                              {c.country}
                            </div>
                          </div>
                          {c.hasStays ? (
                            <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-[#00B981] text-white text-[9px] font-black">
                              ✓ Stays
                            </span>
                          ) : (
                            <ChevronRight className="w-3 h-3 text-white/40 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 mt-2 flex items-center justify-between">
                    <Link
                      href="/cities"
                      onClick={closeAllMenus}
                      className="text-xs font-bold text-emerald-400 hover:underline"
                    >
                      View Complete 300+ Cities Page &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* ========================================================== */}
        {/* MOBILE SLIDE-OUT MENU DRAWER                               */}
        {/* ========================================================== */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#0c1410] border-l border-white/15 p-5 flex flex-col justify-between overflow-y-auto text-white shadow-2xl">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <StayzyLogo variant="light" size="sm" />
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Features Strip */}
                <div className="py-4 border-b border-white/10 space-y-3">
                  <div className="flex items-center gap-2.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#00B981]" />
                    <span className="font-semibold text-white/90">Verified Rooms (100% Verified)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs">
                    <BadgePercent className="w-4 h-4 text-[#00B981]" />
                    <span className="font-semibold text-white/90">Best Prices (Save More)</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs">
                    <Headphones className="w-4 h-4 text-[#00B981]" />
                    <span className="font-semibold text-white/90">24/7 Support (Always Here)</span>
                  </div>
                </div>

                {/* Mobile Navigation Links */}
                <div className="py-4 space-y-2 border-b border-white/10 text-sm">
                  <Link
                    href="/"
                    onClick={closeAllMenus}
                    className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-white/5 text-white font-bold"
                  >
                    <Home className="w-4 h-4 text-[#00B981]" />
                    <span>Home</span>
                  </Link>
                  <Link
                    href="/rooms?category=PG"
                    onClick={closeAllMenus}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 text-white/90"
                  >
                    <span>PG &amp; Rooms</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full font-bold">Verified</span>
                  </Link>
                  <Link
                    href="/rooms?category=HOSTEL"
                    onClick={closeAllMenus}
                    className="block py-2 px-3 rounded-lg hover:bg-white/5 text-white/90"
                  >
                    Hostels
                  </Link>
                  <Link
                    href="/rooms?category=FLAT"
                    onClick={closeAllMenus}
                    className="block py-2 px-3 rounded-lg hover:bg-white/5 text-white/90"
                  >
                    Flats
                  </Link>
                  <Link
                    href="/rooms?category=SHARED"
                    onClick={closeAllMenus}
                    className="block py-2 px-3 rounded-lg hover:bg-white/5 text-white/90"
                  >
                    Shared Spaces
                  </Link>
                  <Link
                    href="/amenities"
                    onClick={closeAllMenus}
                    className="block py-2 px-3 rounded-lg hover:bg-white/5 text-white/90"
                  >
                    Services &amp; Amenities
                  </Link>
                  <Link
                    href="/cities"
                    onClick={closeAllMenus}
                    className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/5 text-white/90"
                  >
                    <MapPin className="w-4 h-4 text-[#00B981]" />
                    <span>All Cities</span>
                  </Link>
                </div>

                {/* Mobile Direct Action: List Your Property */}
                <div className="py-4">
                  <Link
                    href="/owner/properties/new"
                    onClick={closeAllMenus}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#00B981] hover:bg-[#009B70] text-white font-bold text-sm shadow-md"
                  >
                    <Home className="w-4 h-4" />
                    <span>List Your Property</span>
                  </Link>
                </div>
              </div>

              {/* Mobile Drawer Footer: Direct Contacts & Role Switch */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-white/70">
                  <a href="tel:+918884518010" className="flex items-center gap-1.5 hover:text-emerald-400">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+91 8884518010</span>
                  </a>
                  <a href="mailto:support@stayzy.in" className="flex items-center gap-1.5 hover:text-emerald-400">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>support@stayzy.in</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
