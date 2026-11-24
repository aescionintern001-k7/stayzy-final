"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DemoBanner } from "@/components/common/DemoBanner";
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
} from "lucide-react";

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

  // If on login page, render children directly without the admin chrome
  const isLoginPage = pathname === "/admin/login";

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
        // Fallback in demo mode
        const stored = typeof window !== "undefined" ? localStorage.getItem("stayzy_user") : null;
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          setUser({ id: "usr-admin-001", email: "admin@stayzy.com", role: "ADMIN", name: "Stayzy Lead Admin" });
        }
      } catch (err) {
        setUser({ id: "usr-admin-001", email: "admin@stayzy.com", role: "ADMIN", name: "Stayzy Lead Admin" });
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
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
      <div className="min-h-screen bg-white flex items-center justify-center text-xs font-semibold text-[#5E6E65]">
        Authenticating Stayzy Property Manager session...
      </div>
    );
  }

  if (user && user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <DemoBanner />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-lg border border-[#E8E6DF] max-w-md w-full shadow-card space-y-5">
            <div className="w-14 h-14 rounded-lg bg-[#123D2B] text-emerald-300 flex items-center justify-center mx-auto shadow-md">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#123D2B]">Super Admin Access Required</h2>
            <p className="text-xs text-[#5E6E65] leading-relaxed">
              You are currently viewing with <strong>{user.role}</strong> permissions ({user.email}). Use the switcher above or click below to enter as Super Admin.
            </p>
            <div className="pt-2 space-y-2.5">
              <button
                onClick={handleSwitchToAdmin}
                className="w-full py-3 rounded-lg bg-[#123D2B] text-white text-xs font-bold hover:bg-[#0E2F21] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Shield className="w-4 h-4 text-emerald-300" />
                Activate Super Admin Mode
              </button>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/owner"
                  className="py-2.5 px-3 rounded-lg border border-[#D5D2C7] text-xs font-bold text-[#123D2B] hover:bg-[#FAF8F5] flex items-center justify-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  Owner Portal
                </Link>
                <Link
                  href="/dashboard"
                  className="py-2.5 px-3 rounded-lg border border-[#D5D2C7] text-xs font-bold text-[#123D2B] hover:bg-[#FAF8F5] flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Resident App
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Dashboard Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Properties", href: "/admin/properties", icon: Building2 },
    { label: "Rooms & Suites", href: "/admin/rooms", icon: BedDouble },
    { label: "Beds & Inventory", href: "/admin/beds", icon: Layers },
    { label: "Rates & Pricing", href: "/admin/rates", icon: Tag },
    { label: "Bookings & Stays", href: "/admin/bookings", icon: CalendarCheck },
    { label: "Occupancy Calendar", href: "/admin/calendar", icon: CalendarDays },
    { label: "User Roles (Admin, Owner, Resident)", href: "/admin/users", icon: Users },
    { label: "Residents / Customers", href: "/admin/customers", icon: UserCheck },
    { label: "Payments & Rent", href: "/admin/payments", icon: CreditCard },
    { label: "Property Visits", href: "/admin/visits", icon: DoorOpen },
    { label: "Support & Helpdesk", href: "/admin/support", icon: LifeBuoy },
    { label: "Website Content CMS", href: "/admin/content", icon: FileEdit },
    { label: "Operations Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <DemoBanner />

      {/* Admin Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#123D2B] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 rounded-xl text-white hover:bg-white/10"
              aria-label="Toggle admin menu"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/admin" className="flex items-center gap-2.5">
              <img
                src="/stayzy-logo.png"
                alt="Stayzy Logo"
                className="h-8 w-auto object-contain brightness-0 invert drop-shadow-sm rounded-md"
              />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E8F1D5] text-[#123D2B] tracking-wide uppercase">
                Admin
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              <span>View Live Website</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </Link>

            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/20 text-xs">
              <span className="text-[#E8F1D5] font-semibold">{user?.email || "admin@stayzy.com"}</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Sign out of Admin Console"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body with Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 max-h-[calc(100vh-6.5rem)] overflow-y-auto space-y-4">
            <div className="bg-white rounded-lg border border-[#E8E6DF] p-3 shadow-xs">
              <div className="px-3 py-2.5 mb-1 border-b border-[#F0EDE4]">
                <span className="text-[10px] font-extrabold text-[#7B8B82] uppercase tracking-wider">
                  Operations Console
                </span>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-bold transition-all ${
                        isActive
                          ? "bg-[#123D2B] text-[#E8F1D5] shadow-xs"
                          : "text-[#4A5550] hover:text-[#123D2B] hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? "text-[#E8F1D5]" : "text-[#7B8B82]"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#E8F1D5]" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Quick Public Site Link */}
            <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E8E6DF] space-y-2">
              <span className="text-[11px] font-bold text-[#123D2B] flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#123D2B]" />
                Customer Experience
              </span>
              <p className="text-[11px] text-[#5E6E65] leading-relaxed">
                Check how your inventory, rates, and content changes appear to public visitors.
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#123D2B] hover:underline"
              >
                Browse Room Catalog <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </aside>

          {/* Mobile Navigation Drawer */}
          {mobileNavOpen && (
            <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex">
              <div className="w-4/5 max-w-sm bg-white h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#E8E6DF]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#123D2B] text-[#E8F1D5] font-black flex items-center justify-center">
                        S
                      </div>
                      <span className="font-extrabold text-[#123D2B]">Stayzy Operations</span>
                    </div>
                    <button
                      onClick={() => setMobileNavOpen(false)}
                      className="p-1.5 rounded-lg text-[#5E6E65] hover:bg-[#FAF8F5]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <nav className="space-y-1">
                    {navItems.map((item) => {
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
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                            isActive
                              ? "bg-[#123D2B] text-[#E8F1D5]"
                              : "text-[#4A5550] hover:bg-[#FAF8F5]"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                <div className="pt-4 border-t border-[#E8E6DF] space-y-2">
                  <div className="text-xs font-semibold text-[#5E6E65]">
                    Logged in as {user?.email}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
              <div className="flex-1" onClick={() => setMobileNavOpen(false)} />
            </div>
          )}

          {/* Admin Page Content */}
          <main className="lg:col-span-9 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
