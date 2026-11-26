"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  Layers,
  Loader2,
} from "lucide-react";
import { StayzyLogo } from "@/components/common/StayzyLogo";

const ADMIN_HIGHLIGHTS = [
  {
    icon: Building2,
    text: "Monitor multi-property occupancy & bed inventory",
  },
  {
    icon: Layers,
    text: "Manage bookings, rate plans & walkthrough tours",
  },
  {
    icon: ShieldCheck,
    text: "Role-verified Super Admin access & audit controls",
  },
] as const;

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid administrator email address.");
      return;
    }
    if (!password) {
      setError("Please enter your administrator password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          requiredRole: "ADMIN",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Admin authentication failed.");
      }

      if (typeof window !== "undefined" && data.user) {
        localStorage.setItem("stayzy_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("stayzy_auth_changed"));
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Unable to verify admin credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdminLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoType: "admin" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Demo admin login failed.");
      }

      if (typeof window !== "undefined" && data.user) {
        localStorage.setItem("stayzy_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("stayzy_auth_changed"));
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Unable to launch demo admin session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] bg-[#F4FBF7] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
      {/* Subtle Ambient Corner Circles */}
      <div
        className="pointer-events-none absolute -top-28 -left-28 w-80 h-80 rounded-[9999px] bg-[#E8F8EF]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-24 w-96 h-96 rounded-[9999px] bg-[#E8F8EF]"
        aria-hidden="true"
      />

      {/* Centered Split-Screen Operations Authentication Card */}
      <main className="relative z-10 w-full max-w-[1060px] bg-white rounded-[26px] border border-[#E2E8F0] shadow-[0_24px_64px_-16px_rgba(6,75,53,0.16)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Branded Concierge Panel (45% -> 5 cols on 12-col or custom lg:grid-cols-[46%_54%]) */}
        <section className="relative lg:col-span-5 min-h-[340px] lg:min-h-[600px] bg-[#003B28] text-white flex flex-col justify-between p-7 sm:p-9 overflow-hidden">
          <img
            src="/images/stayzy-admin-lobby.webp"
            alt="Stayzy luxury concierge management lounge"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Subtle Directional Forest-Green Readability Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(125deg, rgba(0, 59, 40, 0.94) 0%, rgba(6, 75, 53, 0.84) 55%, rgba(6, 75, 53, 0.35) 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-36 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(0, 59, 40, 0.92) 0%, rgba(0, 59, 40, 0) 100%)",
            }}
          />

          {/* Top Logo & Role Pill */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <Link href="/" className="inline-flex items-center focus:outline-none">
              <StayzyLogo variant="light" size="md" />
            </Link>
            <span className="px-3 py-1 rounded-[9999px] border border-[#00D6A0]/45 bg-[#003B28]/70 text-[#E8F8EF] text-[10px] font-extrabold tracking-[0.14em] uppercase">
              OPERATIONS
            </span>
          </div>

          {/* Center Headlines & Highlights */}
          <div className="relative z-10 my-8 lg:my-auto space-y-5">
            <div className="space-y-2.5">
              <h1 className="text-[28px] sm:text-[34px] font-extrabold leading-[1.1] tracking-tight text-white">
                Property Manager{" "}
                <span className="text-[#00D6A0] block">Operations Portal</span>
              </h1>
              <p className="text-[13.5px] sm:text-[14px] text-[#E8F8EF]/90 leading-relaxed font-medium">
                Centralized command over Stayzy residences, room inventory, tariffs, and resident
                operations.
              </p>
            </div>

            <ul className="space-y-3 pt-1">
              {ADMIN_HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-[10px] bg-[#003B28]/70 border border-[#00D6A0]/35 flex items-center justify-center shrink-0 text-[#00D6A0]">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span className="text-[13px] font-medium text-white/95 leading-snug">
                      {item.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Subtle Bottom Architectural Label */}
          <div className="relative z-10 pt-2 border-t border-white/15 flex items-center justify-between text-[11.5px] text-[#E8F8EF]/80 font-medium">
            <span>Stayzy Operations Suite</span>
            <span className="text-[#00D6A0] font-bold">v2.6 Enterprise</span>
          </div>
        </section>

        {/* Right Form Panel (55% -> 7 cols) */}
        <section className="lg:col-span-7 p-6 sm:p-10 xl:p-12 flex flex-col justify-between bg-white">
          <div className="flex items-center justify-end text-[12.5px] text-[#64748B] font-medium mb-6">
            <span>Resident account?&nbsp;</span>
            <Link
              href="/login"
              className="font-bold text-[#009B65] hover:text-[#004D32] hover:underline inline-flex items-center gap-1"
            >
              <span>Customer Login</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="w-full max-w-[430px] mx-auto space-y-5 my-auto">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[9999px] bg-[#E8F8EF] text-[#004D32] text-[11px] font-bold">
                <Shield className="w-3.5 h-3.5 text-[#009B65]" aria-hidden="true" />
                <span>Authorized Personnel Only</span>
              </div>
              <h2 className="text-[26px] sm:text-[30px] font-extrabold text-[#101828] tracking-tight leading-tight">
                Sign In to Admin
              </h2>
              <p className="text-[13.5px] text-[#64748B] font-medium">
                Enter your administrator credentials to launch the console.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-[14px] bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} noValidate className="space-y-4">
              {/* Admin Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-email"
                  className="block text-[12.5px] font-bold text-[#101828]"
                >
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail
                    className="w-[18px] h-[18px] text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@stayzy.com"
                    className="w-full h-[50px] pl-11 pr-4 rounded-[14px] border border-[#E2E8F0] bg-white text-[14px] font-medium text-[#101828] placeholder:text-[#94A3B8] outline-none focus:border-[#009B65] focus:ring-4 focus:ring-[#009B65]/12 transition-all"
                  />
                </div>
              </div>

              {/* Admin Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-password"
                  className="block text-[12.5px] font-bold text-[#101828]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="w-[18px] h-[18px] text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter administrator password"
                    className="w-full h-[50px] pl-11 pr-12 rounded-[14px] border border-[#E2E8F0] bg-white text-[14px] font-medium text-[#101828] placeholder:text-[#94A3B8] outline-none focus:border-[#009B65] focus:ring-4 focus:ring-[#009B65]/12 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-[10px] text-[#64748B] hover:text-[#004D32] hover:bg-[#E8F8EF]/70 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <Eye className="w-[18px] h-[18px]" />
                    ) : (
                      <EyeOff className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] rounded-[14px] bg-gradient-to-r from-[#009B65] to-[#004D32] hover:from-[#00AC70] hover:to-[#003B28] text-white font-bold text-[14.5px] shadow-[0_10px_24px_-8px_rgba(0,155,101,0.5)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Operations Console</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Super Admin Access Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-[#E2E8F0]" />
              </div>
              <div className="relative flex justify-center text-[11.5px]">
                <span className="bg-white px-3 text-[#64748B] font-semibold">
                  Quick Demo Access
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoAdminLogin}
              disabled={loading}
              className="w-full h-[46px] rounded-[14px] border border-[#DCE5DF] bg-[#FAFDFB] hover:bg-[#E8F8EF] hover:border-[#009B65]/45 text-[#004D32] font-bold text-[13px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
            >
              <Shield className="w-4 h-4 text-[#009B65]" aria-hidden="true" />
              <span>Sign In as Stayzy Super Admin (Demo)</span>
            </button>
          </div>

          {/* Security Footer */}
          <div className="mt-8 pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#64748B] font-medium">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#009B65]" aria-hidden="true" />
              <span>Role-Verified Operations Session</span>
            </span>
            <Link href="/owner" className="text-[#004D32] font-semibold hover:underline">
              PG Partner Portal &rarr;
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
