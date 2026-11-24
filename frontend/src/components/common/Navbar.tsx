"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  Building2,
  Menu,
  X,
  Phone,
  Mail,
  User,
  UserCheck,
  ChevronDown,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { StayzyLogo } from "@/components/common/StayzyLogo";

export function Navbar() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const router = useRouter();
  const toast = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLoginDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle transparent header on home hero scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 450);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

      // Close dropdown
      setLoginDropdownOpen(false);
      setMobileMenuOpen(false);

      toast.success(
        "Persona Activated",
        role === "ADMIN"
          ? "Switched to Super Admin console"
          : role === "OWNER"
          ? "Switched to PG Host portal (Rajesh)"
          : "Switched to Resident view (Aarav)"
      );

      // Route to destination dashboard
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

  if (isHomePage && !scrolled) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 text-[#111827] shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <Link href="/" className="group cursor-pointer shrink-0">
            <StayzyLogo size="md" />
          </Link>

          {/* Middle Navigation Links (Accessible on All Pages) */}
          <nav className="hidden xl:flex items-center gap-5 text-[13px] font-bold text-gray-700">
            <Link
              href="/"
              className={`hover:text-[#00B86B] transition-colors py-1 ${pathname === "/" ? "text-[#00B86B] border-b-2 border-[#00B86B]" : ""}`}
            >
              Home
            </Link>
            <Link
              href="/rooms?category=PG"
              className="hover:text-[#00B86B] transition-colors py-1"
            >
              PG &amp; Rooms
            </Link>
            <Link
              href="/rooms?category=HOSTEL"
              className="hover:text-[#00B86B] transition-colors py-1"
            >
              Hostels
            </Link>
            <Link
              href="/rooms?category=FLAT"
              className="hover:text-[#00B86B] transition-colors py-1"
            >
              Flats
            </Link>
            <Link
              href="/rooms?category=SHARED"
              className="hover:text-[#00B86B] transition-colors py-1"
            >
              Shared Spaces
            </Link>
            <Link
              href="/amenities"
              className={`hover:text-[#00B86B] transition-colors py-1 ${pathname === "/amenities" ? "text-[#00B86B] border-b-2 border-[#00B86B]" : ""}`}
            >
              Services
            </Link>
            <Link
              href="/cities"
              className={`hover:text-[#00B86B] transition-colors py-1 flex items-center gap-1 ${pathname === "/cities" ? "text-[#00B86B] border-b-2 border-[#00B86B]" : ""}`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>All Cities</span>
            </Link>
            <Link
              href="/faq"
              className={`hover:text-[#00B86B] transition-colors py-1 ${pathname === "/faq" ? "text-[#00B86B]" : ""}`}
            >
              More
            </Link>
          </nav>

          {/* Right Action Bar (Zolo Screenshots 2 & 5: List Property, Phone, Email, Login) */}
          <div className="hidden md:flex items-center gap-6 text-xs font-bold text-gray-700">
            {/* List Your Property */}
            <Link
              href="/owner/properties/new"
              className="text-gray-700 hover:text-emerald-600 transition-colors font-extrabold uppercase tracking-wide"
            >
              List Your Property
            </Link>

            {/* Direct Phone Support */}
            <a
              href="tel:+918884518010"
              className="inline-flex items-center gap-1.5 text-gray-600 hover:text-emerald-600 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>+91 8884518010</span>
            </a>

            {/* Support Email */}
            <a
              href="mailto:support@stayzy.in"
              className="hidden lg:inline-flex items-center gap-1.5 text-gray-600 hover:text-emerald-600 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <span>support@stayzy.in</span>
            </a>

            {/* Unified 3-in-1 Login Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                aria-expanded={loginDropdownOpen}
                aria-haspopup="true"
              >
                <User className="w-3.5 h-3.5" />
                <span>LOGIN / SIGN UP</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${loginDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Login Portal Popover Menu */}
              {loginDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-lg bg-white border border-gray-200 shadow-xl p-2 z-50 text-[#111827] space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                      Select Access Portal
                    </span>
                  </div>

                  {/* 1. Resident / Customer */}
                  <button
                    type="button"
                    onClick={() => handleRoleLogin("CUSTOMER")}
                    disabled={switching}
                    className="w-full p-2.5 rounded-md hover:bg-emerald-50 text-left transition-colors flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-emerald-700">
                          Resident Login
                        </span>
                        {currentRole === "CUSTOMER" && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">Active</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-snug line-clamp-1">
                        Bookings, payments &amp; Wi-Fi keys
                      </p>
                    </div>
                  </button>

                  {/* 2. Property Owner */}
                  <button
                    type="button"
                    onClick={() => handleRoleLogin("OWNER")}
                    disabled={switching}
                    className="w-full p-2.5 rounded-md hover:bg-amber-50 text-left transition-colors flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-amber-700">
                          Property Owner Login
                        </span>
                        {currentRole === "OWNER" && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Active</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-snug line-clamp-1">
                        List PGs, monitor rooms &amp; beds
                      </p>
                    </div>
                  </button>

                  {/* 3. Super Admin */}
                  <button
                    type="button"
                    onClick={() => handleRoleLogin("ADMIN")}
                    disabled={switching}
                    className="w-full p-2.5 rounded-md hover:bg-slate-100 text-left transition-colors flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800 shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-slate-900">
                          Super Admin Login
                        </span>
                        {currentRole === "ADMIN" && (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">Active</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-snug line-clamp-1">
                        Operations, users &amp; pricing control
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-[#111827]" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 bg-white text-[#111827] px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-md">
          {/* Navigation Links */}
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-gray-100">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg bg-gray-50 text-xs font-bold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Home
            </Link>
            <Link
              href="/cities"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg bg-emerald-50 text-xs font-bold text-emerald-800 flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>All Cities (A-Z)</span>
            </Link>
            <Link
              href="/rooms?category=PG"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg bg-gray-50 text-xs font-bold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700"
            >
              PG &amp; Rooms
            </Link>
            <Link
              href="/rooms?category=HOSTEL"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg bg-gray-50 text-xs font-bold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Hostels
            </Link>
            <Link
              href="/rooms?category=FLAT"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg bg-gray-50 text-xs font-bold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Flats
            </Link>
            <Link
              href="/rooms?category=SHARED"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg bg-gray-50 text-xs font-bold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Shared Spaces
            </Link>
            <Link
              href="/amenities"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg bg-gray-50 text-xs font-bold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Services
            </Link>
            <Link
              href="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg bg-gray-50 text-xs font-bold text-gray-800 hover:bg-emerald-50 hover:text-emerald-700"
            >
              Help &amp; FAQs
            </Link>
          </div>

          <div className="flex flex-col space-y-2 border-b border-gray-100 pb-3">
            <Link
              href="/owner/properties/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 py-2 text-sm font-extrabold text-emerald-600"
            >
              <Building2 className="w-4 h-4" />
              <span>List Your Property</span>
            </Link>
            <a
              href="tel:+918884518010"
              className="flex items-center gap-2 py-1.5 text-xs font-semibold text-gray-700"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>+91 8884518010</span>
            </a>
            <a
              href="mailto:support@stayzy.in"
              className="flex items-center gap-2 py-1.5 text-xs font-semibold text-gray-700"
            >
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>support@stayzy.in</span>
            </a>
          </div>

          {/* Unified Mobile Login Portals Card */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 block px-1">
              Select Login Portal
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => handleRoleLogin("CUSTOMER")}
                className="w-full flex items-center justify-between p-2.5 rounded-md bg-white hover:bg-emerald-50 text-xs font-bold text-gray-900 border border-gray-200"
              >
                <span className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Resident Login
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <button
                type="button"
                onClick={() => handleRoleLogin("OWNER")}
                className="w-full flex items-center justify-between p-2.5 rounded-md bg-white hover:bg-amber-50 text-xs font-bold text-gray-900 border border-gray-200"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  Property Owner Login
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <button
                type="button"
                onClick={() => handleRoleLogin("ADMIN")}
                className="w-full flex items-center justify-between p-2.5 rounded-md bg-white hover:bg-slate-100 text-xs font-bold text-gray-900 border border-gray-200"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-800" />
                  Super Admin Login
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
