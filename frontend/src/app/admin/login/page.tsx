"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/common/Footer";
import { Shield, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, requiredRole: "ADMIN" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Admin authentication failed.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
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
      if (res.ok && data.success) {
        router.push("/admin");
        router.refresh();
      } else {
        throw new Error(data.error || "Demo admin login failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] flex flex-col bg-white">
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="bg-white rounded-lg border border-[#E8E6DF] p-8 max-w-md w-full shadow-card-hover space-y-6">
          <div className="text-center space-y-2">
            <img
              src="/stayzy-logo.png"
              alt="Stayzy Logo"
              className="h-12 w-auto mx-auto object-contain rounded-md"
            />
            <h1 className="text-2xl font-extrabold text-[#123D2B]">
              Property Manager Portal
            </h1>
            <p className="text-xs text-[#5E6E65]">
              Authorized Stayzy administrative and operations login.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-md bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Admin Quick Access */}
          <div className="p-4 rounded-md bg-[#FAF8F5] border border-[#E8E6DF] space-y-2.5">
            <span className="text-[11px] font-bold text-[#123D2B] uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#123D2B]" />
              Super Admin Direct Access
            </span>
            <button
              type="button"
              onClick={handleDemoAdminLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-md bg-[#123D2B] text-white text-xs font-bold hover:bg-[#0E2F21] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Shield className="w-4 h-4 text-emerald-300" />
              Sign In as Stayzy Super Admin
            </button>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[#5E6E65]">Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7B8B82] absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@stayzy.com"
                  className="w-full h-11 pl-9 pr-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[#5E6E65]">Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7B8B82] absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-9 pr-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-md bg-[#123D2B] text-white font-bold text-xs hover:bg-[#0E2F21] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>{loading ? "Authenticating..." : "Enter Operations Console"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-[#5E6E65] border-t border-[#F0EDE4]">
            <Link href="/login" className="font-bold text-[#123D2B] hover:underline">
              Switch to Resident Customer Login
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
