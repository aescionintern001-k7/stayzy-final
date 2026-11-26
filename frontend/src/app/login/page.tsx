"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Footer } from "@/components/common/Footer";
import { Lock, Mail, ArrowRight, UserCheck, Shield, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed.");
      }

      // If user is ADMIN and redirect was default, route to /admin
      toast.success("Welcome back!", `Signed in as ${data.user?.name || "Resident"}`);
      if (data.user?.role === "ADMIN" && redirect === "/dashboard") {
        router.push("/admin");
      } else {
        router.push(redirect);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoCustomerLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoType: "customer" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Resident Access Granted", "Signed in as Aarav Sharma");
        router.push(redirect);
        router.refresh();
      } else {
        throw new Error(data.error || "Demo login failed");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 w-full">
      <div className="bg-white rounded-lg border border-[#E8E6DF] p-8 shadow-card-hover space-y-6">
        <div className="text-center space-y-2">
          <img
            src="/stayzy-logo.png"
            alt="Stayzy Logo"
            className="h-12 w-auto mx-auto object-contain rounded-md"
          />
          <h1 className="text-2xl font-extrabold text-[#123D2B]">Welcome back</h1>
          <p className="text-xs text-[#5E6E65]">
            Sign in to manage your stays, extend reservations, and view receipts.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-md bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1-Click Resident Access */}
        <div className="p-4 rounded-md bg-[#FAF8F5] border border-[#E8E6DF] space-y-2.5">
          <span className="text-[11px] font-bold text-[#123D2B] uppercase tracking-wider flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
            Instant Resident Access
          </span>
          <button
            type="button"
            onClick={handleDemoCustomerLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-[#123D2B] text-white text-xs font-bold hover:bg-[#0E2F21] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <UserCheck className="w-4 h-4" />
            Sign in as Resident (Aarav Sharma)
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-[#5E6E65]">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#7B8B82] absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-11 pl-9 pr-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="font-bold text-[#5E6E65]">Password</label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-semibold text-[#123D2B] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
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
            <span>{loading ? "Signing In..." : "Sign In to Stayzy"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-[#5E6E65] space-y-2 border-t border-[#F0EDE4]">
          <p>
            Don’t have an account?{" "}
            <Link
              href={`/register?redirect=${encodeURIComponent(redirect)}`}
              className="font-bold text-[#123D2B] hover:underline"
            >
              Create Account
            </Link>
          </p>
          <p className="text-[11px]">
            Are you a property manager?{" "}
            <Link href="/admin/login" className="font-bold text-[#123D2B] hover:underline">
              Admin Portal Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] flex flex-col bg-white">
      <main className="flex-1 flex items-center justify-center py-10 px-4">
        <Suspense fallback={<div className="py-20 text-center text-xs">Loading login...</div>}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
