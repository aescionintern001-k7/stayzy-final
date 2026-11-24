"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BedDouble,
  GraduationCap,
  Building2,
  Users,
  Settings,
  MapPin,
  LayoutGrid,
  PlusCircle,
  Phone,
  Mail,
  User,
  UserCheck,
  Shield,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Menu,
  ArrowRight,
  Wifi,
  Sparkles,
  Compass,
  Utensils,
  CheckCircle2,
  HelpCircle,
  FileText,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { StayzyLogo } from "@/components/common/StayzyLogo";
import { LiquidNavbar, LiquidNavItem } from "@/components/ui/liquid-glass-navbar";
import { A_TO_Z_CITIES, QuickCity } from "@/lib/cities-data";

export function Navbar() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const router = useRouter();
  const toast = useToast();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  // All Cities Mega Menu Search & Filter
  const [activeCityLetter, setActiveCityLetter] = useState<string>("A");
  const [cityQuickSearch, setCityQuickSearch] = useState<string>("");

  const navContainerRef = useRef<HTMLDivElement>(null);

  // Determine active index for LiquidNavbar based on URL route
  const activeNavIndex = useMemo(() => {
    if (pathname === "/") return 0;
    if (pathname.includes("HOSTEL")) return 2;
    if (pathname.includes("FLAT")) return 3;
    if (pathname.includes("SHARED")) return 4;
    if (pathname.startsWith("/rooms")) return 1;
    if (pathname === "/amenities") return 5;
    if (pathname === "/cities") return 6;
    if (pathname === "/faq" || pathname === "/about" || pathname === "/contact") return 7;
    return 0;
  }, [pathname]);

  // Detect current role from URL or localStorage
  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setCurrentRole("ADMIN");
    } else if (pathname.startsWith("/owner")) {
      setCurrentRole("OWNER");
    } else if (pathname.startsWith("/dashboard")) {
      setCurrentRole("CUSTOMER");
    } else {
      const stored = typeof window !== "undefined" ? localStorage.getItem("stayzy_user") : null;
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u?.role) setCurrentRole(u.role);
        } catch {}
      }
    }
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

  // Demo Persona Quick-Switch
  const handleRoleLogin = async (role: "CUSTOMER" | "OWNER" | "ADMIN") => {
    try {
      setSwitching(true);
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
        setCurrentRole(role);
      }

      closeAllMenus();

      toast.success(
        "Persona Activated",
        role === "ADMIN"
          ? "Switched to Super Admin console"
          : role === "OWNER"
          ? "Switched to PG Host portal (Rajesh)"
          : "Switched to Resident view (Aarav)"
      );

      if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "OWNER") {
        router.push("/owner");
      } else {
        router.push("/dashboard");
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

  // Liquid Navbar items with icons, liquid scenes, and routes
  const liquidNavItems: LiquidNavItem[] = useMemo(
    () => [
      {
        label: "Home",
        href: "/",
        icon: <Home className="w-3.5 h-3.5 text-white" />,
        fx: "glow",
      },
      {
        label: "PG & Rooms",
        icon: <BedDouble className="w-3.5 h-3.5 text-white" />,
        fx: "drop",
        onClick: (e) => {
          e.preventDefault();
          toggleDropdown("rooms");
        },
      },
      {
        label: "Hostels",
        href: "/rooms?category=HOSTEL",
        icon: <GraduationCap className="w-3.5 h-3.5 text-white" />,
        fx: "pop",
      },
      {
        label: "Flats",
        href: "/rooms?category=FLAT",
        icon: <Building2 className="w-3.5 h-3.5 text-white" />,
        fx: "plane",
      },
      {
        label: "Shared Spaces",
        icon: <Users className="w-3.5 h-3.5 text-white" />,
        fx: "wave",
        onClick: (e) => {
          e.preventDefault();
          toggleDropdown("shared");
        },
      },
      {
        label: "Services",
        icon: <Settings className="w-3.5 h-3.5 text-white" />,
        fx: "spin",
        onClick: (e) => {
          e.preventDefault();
          toggleDropdown("services");
        },
      },
      {
        label: "All Cities",
        icon: <MapPin className="w-3.5 h-3.5 text-[#00B981]" />,
        fx: "pop",
        onClick: (e) => {
          e.preventDefault();
          toggleDropdown("cities");
        },
      },
      {
        label: "More",
        icon: <LayoutGrid className="w-3.5 h-3.5 text-white" />,
        fx: "spin",
        onClick: (e) => {
          e.preventDefault();
          toggleDropdown("more");
        },
      },
    ],
    []
  );

  return (
    <>
      {/* 
        ========================================================================
        PERMANENTLY FIXED LIQUID GLASS NAVBAR (Stayzy Emerald Edition)
        - position: fixed; top: 0; left: 0; width: 100%; z-index: 50;
        - WebGL liquid waterline shader with stretching droplet, ripples, meniscus
        - Preserves dark translucent glassmorphism & Stayzy green palette
        ========================================================================
      */}
      <header className="fixed top-0 left-0 w-full z-50 pt-2.5 pb-2 px-3 sm:px-6 pointer-events-none select-none">
        <div
          ref={navContainerRef}
          className="max-w-[1440px] mx-auto pointer-events-auto"
        >
          {/* Floating Dark Glassmorphism Rounded Capsule Container */}
          <div className="relative bg-[#0c1410]/55 backdrop-blur-2xl rounded-full border border-white/15 shadow-[0_12px_45px_rgba(0,0,0,0.38)] px-3 sm:px-4 py-1.5 flex items-center justify-between">
            {/* Subtle Ambient Mint/Emerald Glow on capsule tips */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#00B981]/20 via-[#009B70]/10 to-transparent rounded-l-full pointer-events-none -z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#00B981]/20 via-[#009B70]/10 to-transparent rounded-r-full pointer-events-none -z-10" />

            {/* ======================================================== */}
            {/* 1. LEFT: STAYZY BRAND LOGO (Icon + White Wordmark)       */}
            {/* ======================================================== */}
            <Link
              href="/"
              onClick={closeAllMenus}
              className="flex items-center gap-2 group shrink-0 select-none cursor-pointer pr-1 pl-1"
              aria-label="Stayzy Home"
            >
              <StayzyLogo variant="light" size="sm" />
            </Link>

            {/* Translucent Vertical Divider */}
            <div className="hidden xl:block h-5 w-px bg-white/20 mx-1 shrink-0" />

            {/* ======================================================== */}
            {/* 2. MIDDLE: LIQUID GLASS NAVBAR (WebGL Waterline Drop)    */}
            {/* ======================================================== */}
            <div className="hidden xl:flex items-center relative">
              <LiquidNavbar
                items={liquidNavItems}
                active={activeNavIndex}
                onChange={(index, item) => {
                  if (item.href) {
                    closeAllMenus();
                    router.push(item.href);
                  }
                }}
                tone="green"
                sound={false}
                className="bg-transparent! backdrop-blur-none! border-0! shadow-none! p-0"
              />

              {/* 2.1 PG & ROOMS Dropdown Menu */}
              {activeDropdown === "rooms" && (
                <div className="absolute top-full left-16 mt-3 w-72 bg-[#0d1612]/95 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/15 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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

              {/* 2.2 SHARED SPACES Dropdown Menu */}
              {activeDropdown === "shared" && (
                <div className="absolute top-full left-52 mt-3 w-68 bg-[#0d1612]/95 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/15 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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

              {/* 2.3 SERVICES Dropdown Menu */}
              {activeDropdown === "services" && (
                <div className="absolute top-full left-72 mt-3 w-64 bg-[#0d1612]/95 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/15 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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

              {/* 2.4 ALL CITIES Mega Menu */}
              {activeDropdown === "cities" && (
                <div className="absolute top-full -left-20 sm:-left-32 mt-3 w-[92vw] max-w-3xl bg-[#0d1612]/98 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.55)] border border-white/15 p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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

              {/* 2.5 MORE Dropdown Menu */}
              {activeDropdown === "more" && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-[#0d1612]/95 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/15 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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

            {/* Translucent Vertical Divider */}
            <div className="hidden lg:block h-5 w-px bg-white/20 mx-1 shrink-0" />

            {/* ======================================================== */}
            {/* 3. RIGHT: ACTIONS & CONTACT (List, Phone, Email, Login)  */}
            {/* ======================================================== */}
            <div className="flex items-center gap-2 sm:gap-2.5 text-xs font-bold shrink-0">
              {/* 3.1 LIST YOUR PROPERTY (Outlined Pill Button with Plus Icon) */}
              <Link
                href="/owner/properties/new"
                onClick={closeAllMenus}
                className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00B981] text-white bg-black/25 hover:bg-[#00B981]/20 transition-all group shrink-0"
              >
                <div className="w-4 h-4 rounded-full bg-[#00B981]/25 border border-[#00B981] flex items-center justify-center shrink-0">
                  <PlusCircle className="w-3.5 h-3.5 text-[#00B981] group-hover:rotate-90 transition-transform duration-200" />
                </div>
                <div className="text-[10px] font-extrabold leading-[11px] tracking-wide text-left uppercase text-white">
                  <div>LIST YOUR</div>
                  <div>PROPERTY</div>
                </div>
              </Link>

              {/* Translucent Vertical Divider */}
              <div className="hidden lg:block h-5 w-px bg-white/20 mx-0.5 shrink-0" />

              {/* 3.2 DIRECT PHONE SUPPORT */}
              <a
                href="tel:+918884518010"
                className="hidden lg:inline-flex items-center gap-1.5 px-1.5 py-1 text-white hover:text-emerald-400 transition-colors shrink-0 group"
                title="Call Stayzy Support"
              >
                <Phone className="w-3.5 h-3.5 text-white/90 group-hover:text-emerald-400 transition-colors" />
                <div className="text-[10px] font-bold leading-[11px] text-left">
                  <div className="text-white/60 font-semibold">+91</div>
                  <div className="text-white">8884518010</div>
                </div>
              </a>

              {/* Translucent Vertical Divider */}
              <div className="hidden xl:block h-5 w-px bg-white/20 mx-0.5 shrink-0" />

              {/* 3.3 SUPPORT EMAIL */}
              <a
                href="mailto:support@stayzy.in"
                className="hidden xl:inline-flex items-center gap-1.5 px-1.5 py-1 text-white hover:text-emerald-400 transition-colors shrink-0 group"
                title="Email Stayzy Support"
              >
                <Mail className="w-3.5 h-3.5 text-white/90 group-hover:text-emerald-400 transition-colors" />
                <div className="text-[10px] font-bold leading-[11px] text-left">
                  <div className="text-white/60 font-semibold">support</div>
                  <div className="text-white">@stayzy.in</div>
                </div>
              </a>

              {/* Translucent Vertical Divider */}
              <div className="hidden lg:block h-5 w-px bg-white/20 mx-0.5 shrink-0" />

              {/* 3.4 LOGIN / SIGN UP (Solid Green Pill Button + Multi-Role Portal) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleDropdown("login")}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#009B70] hover:bg-[#00B981] text-white shadow-xs transition-all cursor-pointer group shrink-0"
                  aria-expanded={activeDropdown === "login"}
                >
                  <User className="w-3.5 h-3.5 text-white" />
                  <div className="text-[10px] font-extrabold leading-[11px] tracking-wide text-left uppercase text-white">
                    <div>LOGIN / SIGN</div>
                    <div>UP</div>
                  </div>
                  <ChevronDown
                    className={`w-3 h-3 text-white/90 transition-transform duration-200 ${
                      activeDropdown === "login" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Login / Access Portal Popover */}
                {activeDropdown === "login" && (
                  <div className="absolute right-0 mt-3 w-76 bg-[#0d1612]/98 backdrop-blur-2xl text-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.55)] border border-white/15 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                        <Building2 className="w-4 h-4" />
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
                          List PGs, monitor beds &amp; payouts
                        </p>
                      </div>
                    </button>

                    {/* 3. Super Admin */}
                    <button
                      type="button"
                      onClick={() => handleRoleLogin("ADMIN")}
                      disabled={switching}
                      className="w-full p-2.5 rounded-xl hover:bg-white/10 text-left transition-colors flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-500/10 border border-slate-500/30 flex items-center justify-center text-slate-300 shrink-0 group-hover:bg-slate-700 group-hover:text-white transition-colors">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-slate-200">
                            Super Admin Console
                          </span>
                          {currentRole === "ADMIN" && (
                            <span className="text-[10px] font-bold text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-500/40">Active</span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/60 leading-snug line-clamp-1">
                          Operations, users &amp; pricing control
                        </p>
                      </div>
                    </button>

                    <div className="pt-2 border-t border-white/10 mt-2 flex justify-between px-2">
                      <Link
                        href="/login"
                        onClick={closeAllMenus}
                        className="text-emerald-400 hover:underline font-bold text-[11px]"
                      >
                        Standard Sign In &rarr;
                      </Link>
                      <Link
                        href="/register"
                        onClick={closeAllMenus}
                        className="text-white/70 hover:text-white hover:underline font-bold text-[11px]"
                      >
                        Create Account
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* 3.5 MOBILE MENU TOGGLE (Hamburger Icon) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 rounded-full hover:bg-white/10 text-white cursor-pointer transition-colors"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4. RESPONSIVE MOBILE SLIDE-OUT DRAWER                    */}
          {/* ======================================================== */}
          {mobileMenuOpen && (
            <div className="xl:hidden mt-2 rounded-3xl bg-[#0c1410]/95 backdrop-blur-2xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-4 sm:p-5 text-white space-y-4 animate-in slide-in-from-top-3 duration-200">
              {/* Quick Grid Links with Lucide Icons */}
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-white/10">
                <Link
                  href="/"
                  onClick={closeAllMenus}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 hover:text-emerald-400 text-xs font-bold text-white transition-colors"
                >
                  <Home className="w-4 h-4 text-emerald-400" />
                  <span>Home</span>
                </Link>
                <Link
                  href="/rooms?category=PG"
                  onClick={closeAllMenus}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 hover:text-emerald-400 text-xs font-bold text-white transition-colors"
                >
                  <BedDouble className="w-4 h-4 text-emerald-400" />
                  <span>PG &amp; Rooms</span>
                </Link>
                <Link
                  href="/rooms?category=HOSTEL"
                  onClick={closeAllMenus}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 hover:text-emerald-400 text-xs font-bold text-white transition-colors"
                >
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span>Hostels</span>
                </Link>
                <Link
                  href="/rooms?category=FLAT"
                  onClick={closeAllMenus}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 hover:text-emerald-400 text-xs font-bold text-white transition-colors"
                >
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Flats</span>
                </Link>
                <Link
                  href="/rooms?category=SHARED"
                  onClick={closeAllMenus}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 hover:text-emerald-400 text-xs font-bold text-white transition-colors"
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Shared Spaces</span>
                </Link>
                <Link
                  href="/amenities"
                  onClick={closeAllMenus}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 hover:text-emerald-400 text-xs font-bold text-white transition-colors"
                >
                  <Settings className="w-4 h-4 text-emerald-400" />
                  <span>Services</span>
                </Link>
                <Link
                  href="/cities"
                  onClick={closeAllMenus}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-bold text-emerald-300 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>All Cities</span>
                </Link>
                <Link
                  href="/faq"
                  onClick={closeAllMenus}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 hover:text-emerald-400 text-xs font-bold text-white transition-colors"
                >
                  <LayoutGrid className="w-4 h-4 text-emerald-400" />
                  <span>More FAQs</span>
                </Link>
              </div>

              {/* List Your Property & Contact Details */}
              <div className="flex flex-col space-y-2 pb-3 border-b border-white/10">
                <Link
                  href="/owner/properties/new"
                  onClick={closeAllMenus}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#00B981]/15 border border-[#00B981]/30 text-xs font-extrabold text-emerald-300"
                >
                  <span className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    List Your Property
                  </span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </Link>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href="tel:+918884518010"
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 text-[11px] font-bold text-white"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+91 8884518010</span>
                  </a>
                  <a
                    href="mailto:support@stayzy.in"
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 text-[11px] font-bold text-white"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>support@stayzy.in</span>
                  </a>
                </div>
              </div>

              {/* Mobile Fast Role Switcher */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-extrabold uppercase text-white/40 tracking-wider px-1">
                  Direct Portal Access
                </div>
                <button
                  type="button"
                  onClick={() => handleRoleLogin("CUSTOMER")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white"
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Resident Login (Aarav)
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleLogin("OWNER")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    Property Host Login (Rajesh)
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleLogin("ADMIN")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-300" />
                    Super Admin Console
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Spacer for non-home pages so content is not covered by the fixed navbar */}
      {!isHomePage && (
        <div className="h-20 sm:h-22 shrink-0 pointer-events-none" aria-hidden="true" />
      )}
    </>
  );
}
