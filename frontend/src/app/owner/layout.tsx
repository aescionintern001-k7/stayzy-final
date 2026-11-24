"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DemoBanner } from "@/components/common/DemoBanner";
import {
  Building2,
  PlusCircle,
  Users,
  CalendarCheck,
  DoorOpen,
  DollarSign,
  LayoutDashboard,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

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
      } catch (err) {
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
      <div className="min-h-screen bg-white flex items-center justify-center text-xs font-semibold text-[#5E6E65]">
        Loading Stayzy Property Partner Portal...
      </div>
    );
  }

  // If user is logged in as Customer, show prompt to access Owner portal
  if (user && user.role !== "OWNER" && user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <DemoBanner />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-lg border border-[#E8E6DF] max-w-md w-full shadow-card space-y-5">
            <div className="w-14 h-14 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center mx-auto shadow-sm">
              <Building2 className="w-7 h-7 text-amber-800" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#123D2B]">Property Owner Access</h2>
            <p className="text-xs text-[#5E6E65] leading-relaxed">
              You are currently viewing with <strong>{user.role}</strong> permissions ({user.email}). Switch to Property Partner mode to upload and manage your PG buildings.
            </p>
            <div className="pt-2 space-y-2.5">
              <button
                onClick={handleSwitchToOwner}
                className="w-full py-3 rounded-lg bg-[#123D2B] text-white text-xs font-bold hover:bg-[#0E2F21] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Building2 className="w-4 h-4 text-amber-300" />
                Enter as Property Owner
              </button>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/admin"
                  className="py-2.5 px-3 rounded-lg border border-[#D5D2C7] text-xs font-bold text-[#123D2B] hover:bg-[#FAF8F5] flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
                  Admin Portal
                </Link>
                <Link
                  href="/dashboard"
                  className="py-2.5 px-3 rounded-lg border border-[#D5D2C7] text-xs font-bold text-[#123D2B] hover:bg-[#FAF8F5] flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-[#5E6E65]" />
                  Resident App
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ownerNavItems = [
    { label: "Partner Overview", href: "/owner", icon: LayoutDashboard },
    { label: "+ Upload New PG", href: "/owner/properties/new", icon: PlusCircle, highlight: true },
    { label: "My PG Properties", href: "/owner/properties", icon: Building2 },
    { label: "Tenant Bookings", href: "/owner/bookings", icon: CalendarCheck },
    { label: "Scheduled Visits", href: "/owner/visits", icon: DoorOpen },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <DemoBanner />

      {/* Owner Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#123D2B] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 rounded-md text-white hover:bg-white/10"
              aria-label="Toggle owner menu"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/owner" className="flex items-center gap-2.5">
              <img
                src="/stayzy-logo.png"
                alt="Stayzy Logo"
                className="h-8 w-auto object-contain brightness-0 invert drop-shadow-sm rounded-md"
              />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400 text-[#123D2B] tracking-wide uppercase">
                Property Partner
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/owner/properties/new"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-[#123D2B] text-xs font-extrabold hover:bg-slate-100 transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
              <span>List New PG</span>
            </Link>

            <Link
              href="/"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              <span>View Live Website</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/20 text-xs">
              <span className="text-white font-semibold">{user?.name || "Rajesh Kumar"}</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Sign out of Partner Console"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Owner Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 max-h-[calc(100vh-6.5rem)] overflow-y-auto space-y-4">
            <div className="bg-white rounded-lg border border-[#E8E6DF] p-3 shadow-xs">
              <div className="px-3 py-2.5 mb-1 border-b border-[#F0EDE4] flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[#7B8B82] uppercase tracking-wider">
                  Partner Console
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Landlord Mode
                </span>
              </div>
              <nav className="space-y-1">
                {ownerNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-bold transition-all ${
                        item.highlight && !isActive
                          ? "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                          : isActive
                          ? "bg-[#123D2B] text-white shadow-xs"
                          : "text-[#4A5550] hover:text-[#123D2B] hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive
                              ? "text-emerald-300"
                              : item.highlight
                              ? "text-amber-700"
                              : "text-[#7B8B82]"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Quick Upload Banner */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-[#123D2B] to-[#1E543C] text-white space-y-2 shadow-xs">
              <span className="text-xs font-bold flex items-center gap-1.5 text-white">
                <Building2 className="w-4 h-4 text-amber-300" />
                Zero Listing Fee
              </span>
              <p className="text-[11px] text-[#C1D2C5] leading-relaxed">
                Upload your PG property with genuine room photos and start receiving verified booking requests within hours.
              </p>
              <Link
                href="/owner/properties/new"
                className="inline-block mt-1 w-full text-center py-2 rounded-md bg-white text-[#123D2B] text-xs font-bold hover:bg-slate-100 transition-colors shadow-xs"
              >
                Upload Property Now
              </Link>
            </div>
          </aside>

          {/* Main Owner Content */}
          <main className="lg:col-span-9">{children}</main>
        </div>
      </div>
    </div>
  );
}
