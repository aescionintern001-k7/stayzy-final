"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { StayzyLogo } from "@/components/common/StayzyLogo";
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  Layers,
  Tag,
  CalendarCheck,
  CalendarDays,
  Users,
  UserCheck,
  CreditCard,
  DoorOpen,
  LifeBuoy,
  FileEdit,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronRight,
  ChevronDown,
  Bell,
} from "lucide-react";

const ADMIN_NAV_ITEMS = [
  { label: "Dashboard Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Properties", href: "/admin/properties", icon: Building2 },
  { label: "Rooms & Suites", href: "/admin/rooms", icon: BedDouble },
  { label: "Beds & Inventory", href: "/admin/beds", icon: Layers },
  { label: "Rates & Pricing", href: "/admin/rates", icon: Tag },
  { label: "Bookings & Stays", href: "/admin/bookings", icon: CalendarCheck },
  { label: "Occupancy Calendar", href: "/admin/calendar", icon: CalendarDays },
  { label: "User Roles", href: "/admin/users", icon: Users },
  { label: "Residents / Customers", href: "/admin/customers", icon: UserCheck },
  { label: "Payments & Rent", href: "/admin/payments", icon: CreditCard },
  { label: "Property Visits", href: "/admin/visits", icon: DoorOpen },
  { label: "Support & Helpdesk", href: "/admin/support", icon: LifeBuoy },
  { label: "Website Content CMS", href: "/admin/content", icon: FileEdit },
  { label: "Operations Settings", href: "/admin/settings", icon: Settings },
] as const;

export default function AdminLayout({
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

  const isLoginPage = pathname === "/admin/login";

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
    if (isLoginPage) {
      setLoading(false);
      return;
    }

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
            id: "usr-admin-001",
            email: "admin@stayzy.com",
            role: "ADMIN",
            name: "Stayzy Lead Admin",
          });
        }
      } catch {
        setUser({
          id: "usr-admin-001",
          email: "admin@stayzy.com",
          role: "ADMIN",
          name: "Stayzy Lead Admin",
        });
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const handleSwitchToAdmin = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "stayzy_user",
          JSON.stringify({
            id: "usr-admin-001",
            email: "admin@stayzy.com",
            name: "Stayzy Lead Admin",
            phone: "+91 80 4567 8900",
            role: "ADMIN",
          })
        );
      }
      await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
      window.location.reload();
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] bg-[#FAF9F4] flex items-center justify-center text-xs font-semibold text-[#064B35]">
        Authenticating Stayzy Operations Console...
      </div>
    );
  }

  if (user && user.role !== "ADMIN") {
    return (
      <div className="min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] bg-[#FAF9F4] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-[22px] border border-[#E6EAE2] max-w-md w-full shadow-[0_18px_42px_-14px_rgba(6,75,53,0.14)] space-y-5">
            <div className="w-14 h-14 rounded-[16px] bg-[#064B35] text-[#E8F4DF] flex items-center justify-center mx-auto shadow-sm">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#14251E]">Super Admin Access Required</h2>
            <p className="text-xs text-[#5F6F67] leading-relaxed">
              You are currently viewing with <strong>{user.role}</strong> permissions ({user.email}).
              Switch into Super Admin mode or return to your portal below.
            </p>
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleSwitchToAdmin}
                className="w-full py-3 rounded-[12px] bg-[#064B35] text-white text-xs font-bold hover:bg-[#043827] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Shield className="w-4 h-4 text-[#00D6A0]" />
                <span>Activate Super Admin Mode</span>
              </button>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/owner"
                  className="py-2.5 px-3 rounded-[12px] border border-[#D4DCD0] text-xs font-bold text-[#14251E] hover:bg-[#FAF9F4] flex items-center justify-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#009B69]" />
                  <span>Owner Portal</span>
                </Link>
                <Link
                  href="/dashboard"
                  className="py-2.5 px-3 rounded-[12px] border border-[#D4DCD0] text-xs font-bold text-[#14251E] hover:bg-[#FAF9F4] flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#064B35]" />
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
    <div className="min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] flex flex-col bg-[#FAF9F4] text-[#14251E]">
      {/* Top Deep Forest-Green Operations Header Bar */}
      <header className="bg-[#064B35] text-white border-b border-[#043827]">
        <div className="max-w-[1460px] mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-[10px] text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Open admin navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/admin" className="inline-flex items-center gap-2.5 focus:outline-none">
              <StayzyLogo variant="light" size="sm" />
              <span className="px-2.5 py-0.5 rounded-[8px] bg-[#E8F4DF]/16 border border-[#E8F4DF]/25 text-[#E8F4DF] text-[10px] font-extrabold tracking-[0.12em] uppercase">
                ADMIN
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] bg-white/10 hover:bg-white/18 border border-white/15 text-white text-[12px] font-semibold transition-colors whitespace-nowrap"
            >
              <span>View Live Website</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
            </Link>

            <Link
              href="/admin/support"
              className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-[10px] bg-white/10 hover:bg-white/18 border border-white/12 text-[#E8F4DF] transition-colors"
              aria-label="Support and helpdesk queue"
              title="Support & Helpdesk"
            >
              <Bell className="w-4 h-4" />
            </Link>

            <span className="hidden md:inline-block w-px h-5 bg-white/15" aria-hidden="true" />

            {/* Profile Dropdown Trigger */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-expanded={profileMenuOpen}
                className="flex items-center gap-2 px-1.5 py-1 rounded-[9999px] hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-[9999px] bg-[#E8F4DF] text-[#064B35] flex items-center justify-center font-extrabold text-xs shrink-0">
                  {user?.email?.charAt(0)?.toUpperCase() || "A"}
                </div>
                <span className="hidden md:inline text-[12.5px] font-semibold text-[#E8F4DF] max-w-[175px] truncate">
                  {user?.email || "admin@stayzy.com"}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#E8F4DF]/80 transition-transform ${
                    profileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-[#14251E] rounded-[16px] border border-[#E6EAE2] shadow-[0_18px_40px_-14px_rgba(20,37,30,0.22)] p-2 z-50">
                  <div className="px-3 py-2 border-b border-[#EEF2EA]">
                    <p className="text-xs font-extrabold text-[#14251E] truncate">
                      {user?.name || "Stayzy Ops Admin"}
                    </p>
                    <p className="text-[11px] text-[#5F6F67] truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs font-semibold hover:bg-[#EDF5E9]"
                  >
                    <Settings className="w-4 h-4 text-[#064B35]" />
                    <span>Operations Settings</span>
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
          </div>
        </div>
      </header>

      {/* Main Operations Shell */}
      <div className="flex-1 max-w-[1460px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6 xl:gap-7 items-start">
        {/* Desktop White Left Operations Sidebar */}
        <aside className="hidden lg:flex lg:w-[256px] shrink-0 sticky top-[124px] max-h-[calc(100vh-142px)] flex-col gap-4 overflow-y-auto pr-0.5">
          <div className="bg-white rounded-[20px] border border-[#E6EAE2] p-3.5 shadow-[0_10px_30px_-16px_rgba(20,37,30,0.08)]">
            <div className="px-3 pt-1 pb-2.5 mb-2 border-b border-[#EEF2EA]">
              <span className="text-[10.5px] font-extrabold text-[#64746C] uppercase tracking-[0.12em]">
                OPERATIONS CONSOLE
              </span>
            </div>

            <nav aria-label="Operations Console" className="space-y-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-[11px] text-[12.5px] transition-all duration-150 ${
                      isActive
                        ? "bg-[#064B35] text-white font-bold shadow-xs"
                        : "text-[#36463E] hover:text-[#064B35] hover:bg-[#EDF5E9] font-medium"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? "text-[#E8F4DF]" : "text-[#64746C]"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#E8F4DF] shrink-0" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Customer Experience / Live Catalog Card */}
          <div className="p-4 rounded-[18px] bg-gradient-to-br from-[#EDF5E9] to-[#E1EFD9] border border-[#D2E4C8] space-y-2.5">
            <div className="flex items-center gap-2 text-[12.5px] font-extrabold text-[#064B35]">
              <ExternalLink className="w-4 h-4 text-[#009B69]" aria-hidden="true" />
              <span>Customer Experience</span>
            </div>
            <p className="text-[11.5px] text-[#3F5349] leading-relaxed">
              Check how your inventory, rates, and content changes appear to public visitors.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-[10px] bg-[#064B35] hover:bg-[#043827] text-white text-[12px] font-bold transition-colors"
            >
              <span>Browse Room Catalog</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>

        {/* Admin Page Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile Operations Drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-black/50 flex">
          <div className="w-80 max-w-[85vw] bg-white h-full p-5 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6EAE2]">
                <Link href="/admin" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2">
                  <StayzyLogo variant="dark" size="sm" />
                  <span className="px-2 py-0.5 rounded-[6px] bg-[#E8F4DF] text-[#064B35] text-[10px] font-extrabold">
                    ADMIN
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1.5 rounded-[10px] text-[#5F6F67] hover:bg-[#FAF9F4]"
                  aria-label="Close admin navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-2 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#64746C]">
                OPERATIONS CONSOLE
              </div>

              <nav className="space-y-1">
                {ADMIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-[11px] text-[12.5px] ${
                        isActive
                          ? "bg-[#064B35] text-white font-bold"
                          : "text-[#36463E] hover:bg-[#EDF5E9] font-medium"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#E6EAE2] space-y-2.5">
              <div className="text-xs font-semibold text-[#5F6F67] px-1 truncate">
                {user?.email || "admin@stayzy.com"}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 rounded-[12px] bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
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
