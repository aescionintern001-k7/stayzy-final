"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { StayzyLogo } from "@/components/common/StayzyLogo";
import {
  Building2,
  PlusCircle,
  Users,
  CalendarCheck,
  DoorOpen,
  LayoutDashboard,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
} from "lucide-react";

const OWNER_NAV_ITEMS = [
  { label: "Partner Overview", href: "/owner", icon: LayoutDashboard },
  { label: "Upload New PG", href: "/owner/properties/new", icon: PlusCircle },
  { label: "My PG Properties", href: "/owner/properties", icon: Building2 },
  { label: "Tenant Bookings", href: "/owner/bookings", icon: CalendarCheck },
  { label: "Scheduled Visits", href: "/owner/visits", icon: DoorOpen },
] as const;

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileNavOpen(false);
        setProfileMenuOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            return;
          }
        }
        const stored = typeof window !== "undefined" ? localStorage.getItem("stayzy_user") : null;
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          setUser({
            id: "usr-owner-001",
            email: "rajesh.pg@stayzy.com",
            role: "OWNER",
            name: "Rajesh Kumar (PG Partner)",
          });
        }
      } catch {
        setUser({
          id: "usr-owner-001",
          email: "rajesh.pg@stayzy.com",
          role: "OWNER",
          name: "Rajesh Kumar (PG Partner)",
        });
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [pathname, router]);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleSwitchToOwner = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "stayzy_user",
          JSON.stringify({
            id: "usr-owner-001",
            email: "rajesh.pg@stayzy.com",
            name: "Rajesh Kumar (PG Partner)",
            phone: "+91 98450 88990",
            role: "OWNER",
          })
        );
      }
      await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "OWNER" }),
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] bg-[#FAF9F4] flex items-center justify-center text-xs font-semibold text-[#064B35]">
        Loading Stayzy Property Partner Portal...
      </div>
    );
  }

  if (user && user.role !== "OWNER" && user.role !== "ADMIN") {
    return (
      <div className="min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] bg-[#FAF9F4] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-[22px] border border-[#E6EAE2] max-w-md w-full shadow-[0_16px_40px_-14px_rgba(23,37,31,0.12)] space-y-5">
            <div className="w-14 h-14 rounded-[16px] bg-[#E8F4DF] text-[#064B35] border border-[#DCE5D5] flex items-center justify-center mx-auto">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#17251F]">Property Owner Access</h2>
            <p className="text-xs text-[#5F6F67] leading-relaxed">
              You are currently viewing with <strong>{user.role}</strong> permissions ({user.email}). Switch to Property Partner mode to upload and manage your PG buildings.
            </p>
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleSwitchToOwner}
                className="w-full py-3 rounded-[12px] bg-[#064B35] text-white text-xs font-bold hover:bg-[#043827] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Building2 className="w-4 h-4 text-[#E8F4DF]" />
                <span>Enter as Property Owner</span>
              </button>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/admin"
                  className="py-2.5 px-3 rounded-[12px] border border-[#D4DCD0] text-xs font-bold text-[#17251F] hover:bg-[#FAF9F4] flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#009B69]" />
                  <span>Admin Portal</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="py-2.5 px-3 rounded-[12px] border border-[#D4DCD0] text-xs font-bold text-[#17251F] hover:bg-[#FAF9F4] flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-[#5F6F67]" />
                  <span>Resident App</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] bg-[#FAF9F4] text-[#17251F] overflow-x-hidden">
      {/* Subtle Outer Botanical Accent */}
      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none hidden xl:block absolute top-0 left-1/2 -translate-x-24 w-44 h-36 text-[#009B69]/15"
        aria-hidden="true"
      >
        <path
          d="M84 128C68 88 46 52 16 14M66 94C42 88 26 70 30 50C52 54 66 72 66 94ZM92 78C112 68 124 48 116 30C96 36 84 56 92 78Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex gap-6 xl:gap-7 items-start">
        {/* Desktop Deep Forest-Green Sidebar (Unified with Resident Dashboard) */}
        <aside className="hidden lg:flex lg:w-[250px] shrink-0 sticky top-[126px] max-h-[calc(100vh-146px)]">
          <nav
            aria-label="Partner Console Navigation"
            className="w-full bg-[#064B35] text-white rounded-[24px] p-4 shadow-[0_20px_50px_-16px_rgba(6,75,53,0.42)] flex flex-col justify-between gap-4 overflow-y-auto"
          >
            <div>
              <div className="px-2 pt-1 pb-4 flex items-center justify-between gap-2">
                <Link href="/owner" className="inline-flex items-center focus:outline-none">
                  <StayzyLogo variant="light" size="md" />
                </Link>
              </div>

              <div className="px-2.5 pb-2.5 flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#E8F4DF]/75">
                  PARTNER CONSOLE
                </span>
                <span className="px-2 py-0.5 rounded-[9999px] bg-[#E8F4DF]/15 text-[#E8F4DF] text-[9.5px] font-bold">
                  Landlord
                </span>
              </div>

              <div className="space-y-1">
                {OWNER_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-[12px] text-[13px] transition-all duration-200 ${
                        active
                          ? "bg-[#E8F4DF] text-[#064B35] font-bold shadow-xs"
                          : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon
                          className={`w-[17px] h-[17px] ${
                            active ? "text-[#064B35]" : "text-[#E8F4DF]/90"
                          }`}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                      </span>
                      {active && <ChevronRight className="w-4 h-4 text-[#064B35]" />}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-white/12">
                <Link
                  href="/owner/properties/new"
                  className="flex items-center justify-center gap-2 w-full px-3.5 py-2.5 rounded-[12px] text-[13px] font-semibold text-white bg-white/10 hover:bg-white/18 border border-white/15 transition-all duration-200"
                >
                  <PlusCircle className="w-4 h-4 text-[#E8F4DF]" aria-hidden="true" />
                  <span>List New PG</span>
                </Link>
              </div>
            </div>

            {/* Bottom Compact Promotional Card */}
            <div className="relative rounded-[16px] overflow-hidden bg-[#043626] border border-white/12 p-3.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-extrabold text-white leading-tight">
                  Zero Listing
                  <br />
                  Fee Portal
                </p>
                <p className="text-[10.5px] text-[#E8F4DF]/80 mt-1 leading-snug">
                  Verified stays, zero brokerage.
                </p>
              </div>
              <img
                src="/images/rooms/twin-sharing-main.webp?v=5"
                alt="Stayzy partner property"
                className="w-14 h-14 rounded-[10px] object-cover border border-white/15 shrink-0"
              />
            </div>
          </nav>
        </aside>

        {/* Right Main Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {/* Clean Top Navigation Bar */}
          <header className="flex items-center justify-between gap-3 pb-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-2.5 rounded-[12px] bg-white border border-[#E4E8DF] text-[#064B35] hover:bg-[#E8F4DF]/60 transition-colors cursor-pointer"
                aria-label="Open owner menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link href="/owner" className="lg:hidden inline-flex items-center">
                <StayzyLogo variant="dark" size="sm" />
              </Link>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
              <Link
                href="/owner/properties/new"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-[9999px] bg-white border border-[#DCE2D7] text-[12.5px] font-bold text-[#17251F] hover:border-[#009B69]/45 hover:bg-[#E8F4DF]/45 transition-all shadow-2xs whitespace-nowrap shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#064B35] shrink-0" aria-hidden="true" />
                <span>List New PG</span>
              </Link>

              <span className="hidden sm:inline-block w-px h-5 bg-[#E2E6DC]" aria-hidden="true" />

              <Link
                href="/"
                target="_blank"
                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9999px] bg-white border border-[#DCE2D7] text-[12.5px] font-bold text-[#17251F] hover:border-[#009B69]/45 hover:bg-[#E8F4DF]/45 transition-all shadow-2xs whitespace-nowrap shrink-0"
              >
                <span>View Live Website</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#064B35] shrink-0" aria-hidden="true" />
              </Link>

              <span className="hidden md:inline-block w-px h-5 bg-[#E2E6DC]" aria-hidden="true" />

              {user && (
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    aria-expanded={profileMenuOpen}
                    className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-[9999px] hover:bg-white border border-transparent hover:border-[#E4E8DF] transition-all cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-[9999px] bg-[#064B35] text-white flex items-center justify-center font-extrabold text-[13px] shrink-0 shadow-xs">
                      {user.name?.charAt(0)?.toUpperCase() || "P"}
                    </div>
                    <div className="hidden md:block text-left">
                      <span className="text-[13px] font-bold text-[#17251F] block leading-tight">
                        {user.name || "Rajesh Kumar (PG Partner)"}
                      </span>
                      <span className="text-[11px] text-[#5F6F67] block leading-tight">
                        {user.email || "rajesh.pg@stayzy.com"}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[#5F6F67] transition-transform ${
                        profileMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-[16px] border border-[#E4E8DF] shadow-[0_18px_40px_-14px_rgba(23,37,31,0.18)] p-2 z-50">
                      <Link
                        href="/owner/properties"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-semibold text-[#17251F] hover:bg-[#E8F4DF]/60"
                      >
                        <Building2 className="w-4 h-4 text-[#064B35]" />
                        <span>My PG Properties</span>
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Main Owner Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>

      {/* Mobile Owner Navigation Drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-black/55 flex">
          <div className="w-72 bg-[#064B35] text-white h-full p-5 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/15">
                <Link href="/owner" onClick={() => setMobileNavOpen(false)}>
                  <StayzyLogo variant="light" size="sm" />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1.5 rounded-[10px] text-white/80 hover:text-white hover:bg-white/10"
                  aria-label="Close owner menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#E8F4DF]/75">
                PARTNER CONSOLE
              </div>

              <div className="space-y-1">
                {OWNER_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-[12px] text-[13px] transition-all ${
                        active
                          ? "bg-[#E8F4DF] text-[#064B35] font-bold"
                          : "text-white/85 hover:text-white hover:bg-white/10 font-medium"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </span>
                      {active && <ChevronRight className="w-4 h-4 text-[#064B35]" />}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-white/15 space-y-2.5">
              <Link
                href="/owner/properties/new"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[12px] text-xs font-bold bg-[#E8F4DF] text-[#064B35]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>List New PG</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-[10px] text-xs font-medium text-white/75 hover:text-white"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileNavOpen(false)} />
        </div>
      )}
    </div>
  );
}
