"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Phone,
  Home,
  Heart,
  Headphones,
  AlertCircle,
  Loader2,
  UserCheck,
} from "lucide-react";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { app } from "@/lib/firebase";
import { StayzyLogo } from "@/components/common/StayzyLogo";
import { Footer } from "@/components/common/Footer";
import { useToast } from "@/components/ui/Toast";

type LoginMethod = "email" | "phone";

const COUNTRY_CODES = [
  { code: "+91", label: "IN +91" },
  { code: "+1", label: "US +1" },
  { code: "+44", label: "UK +44" },
  { code: "+971", label: "UAE +971" },
];

const STAYZY_BENEFITS = [
  {
    icon: Home,
    text: "Access your bookings and stay details",
  },
  {
    icon: Heart,
    text: "Manage your favorites and preferences",
  },
  {
    icon: Headphones,
    text: "Get instant support whenever you need it",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [method, setMethod] = useState<LoginMethod>("email");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore remembered email if previously opted in
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("stayzy_remembered_email");
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  const routeAfterLogin = (user: any) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("stayzy_user", JSON.stringify(user));
        if (rememberMe && method === "email" && email.trim()) {
          localStorage.setItem("stayzy_remembered_email", email.trim().toLowerCase());
        } else if (!rememberMe) {
          localStorage.removeItem("stayzy_remembered_email");
        }
        window.dispatchEvent(new Event("stayzy_auth_changed"));
      }
    } catch {}

    toast.success("Welcome back!", `Signed in as ${user?.name || "Resident"}`);
    if (user?.role === "ADMIN" && redirect === "/dashboard") {
      router.push("/admin");
    } else if (user?.role === "OWNER" && redirect === "/dashboard") {
      router.push("/owner");
    } else {
      router.push(redirect);
    }
    router.refresh();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (method === "email") {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError("Please enter a valid email address.");
        return;
      }
    } else {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) {
        setError("Please enter a valid 10-digit mobile number.");
        return;
      }
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const payload =
        method === "email"
          ? { email: email.trim().toLowerCase(), password, rememberMe }
          : { phone: `${countryCode}${phone.replace(/\D/g, "")}`, password, rememberMe };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.user) {
        throw new Error(data.error || "Invalid credentials. Please check and try again.");
      }

      routeAfterLogin(data.user);
    } catch (err: any) {
      setError(err.message || "Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, rememberMe }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.user) {
        throw new Error(data.error || "Google authentication failed.");
      }

      routeAfterLogin(data.user);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/popup-closed-by-user") {
        setError("Google sign-in popup was closed before completion.");
      } else if (code === "auth/operation-not-allowed") {
        setError("Google sign-in is not yet enabled in Firebase Console. Please use Email or Phone login.");
      } else {
        setError(err?.message || "Unable to sign in with Google right now.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemoCustomerLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demoType: "customer", rememberMe }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        routeAfterLogin(data.user);
      } else {
        throw new Error(data.error || "Demo login failed.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="login-page-heading"
      className="relative flex-1 w-full overflow-hidden bg-[#F4FBF7] flex items-center justify-center px-4 sm:px-6 lg:px-10 py-8 sm:py-12"
    >
      {/* Subtle Pale Mint Architectural Corner Circles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-28 -left-24 w-[380px] h-[380px] rounded-[9999px] bg-[#E8F8EF]" />
        <div className="absolute -bottom-32 -right-24 w-[420px] h-[420px] rounded-[9999px] bg-[#E8F8EF]" />
      </div>

      {/* Centered Split-Screen Authentication Card */}
      <div className="relative z-10 w-full max-w-[1080px] rounded-[26px] sm:rounded-[28px] bg-[#FFFFFF] border border-[#E2E8F0] shadow-[0_24px_64px_rgba(0,61,43,0.12),0_4px_16px_rgba(16,24,40,0.05)] overflow-hidden grid grid-cols-1 lg:grid-cols-[45fr_55fr]">
        {/* ================================================================ */}
        {/* LEFT SECTION (45%): FOREST-GREEN BRANDING + SHARP BEDROOM PHOTO  */}
        {/* ================================================================ */}
        <div className="relative bg-[#003B28] text-white p-6 sm:p-8 lg:p-9 flex flex-col justify-between min-h-[260px] lg:min-h-[580px] overflow-hidden">
          {/* Sharp Stayzy Bedroom Photography */}
          <img
            src="/images/stayzy-booking-bedroom.webp"
            alt="Stayzy luxury co-living bedroom suite"
            className="absolute inset-0 h-full w-full object-cover object-right pointer-events-none select-none"
            loading="eager"
            decoding="sync"
          />

          {/* Controlled Dark Forest-Green Directional Overlay for High Text Contrast */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(106deg, rgba(0,59,40,0.96) 0%, rgba(0,77,50,0.90) 44%, rgba(0,59,40,0.48) 76%, rgba(0,59,40,0.22) 100%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#003B28]/85 to-transparent"
          />

          {/* Top Logo */}
          <div className="relative z-10">
            <StayzyLogo variant="light" size="md" />
          </div>

          {/* Center Welcome Copy & 3 Benefits */}
          <div className="relative z-10 my-5 lg:my-auto space-y-5">
            <div>
              <p className="text-[32px] sm:text-[40px] lg:text-[44px] font-extrabold leading-[1.06] tracking-tight text-white">
                Welcome <br />
                <span className="text-[#00D6A0]">Back!</span>
              </p>
              <p className="mt-2.5 text-[13.5px] sm:text-[15px] text-[#E8F8EF] font-medium leading-relaxed max-w-[300px]">
                Your perfect stay is just a login away.
              </p>
            </div>

            <ul className="space-y-3 pt-1">
              {STAYZY_BENEFITS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="w-8 h-8 rounded-[9999px] bg-[#009B65]/40 border border-[#00D6A0]/40 flex items-center justify-center text-white shrink-0"
                    >
                      <Icon className="w-4 h-4" strokeWidth={2.1} />
                    </span>
                    <span className="text-[12.5px] sm:text-[13px] font-medium text-white/95 leading-snug">
                      {item.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Subtle Bottom Architectural City Skyline Outline */}
          <svg
            aria-hidden="true"
            viewBox="0 0 360 58"
            fill="none"
            className="relative z-10 hidden sm:block w-[270px] h-auto opacity-45 mt-2 -mb-2 pointer-events-none"
          >
            <path
              d="M4 54V30H24V54M30 54V18H54V54M60 54V26H82V54M92 54V10H122V54M128 54V22H154V54M162 54V32H186V54M194 54V14H224V54M232 54V28H254V54M2 54H270"
              stroke="#00D6A0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M99 18H105M109 18H115M99 26H105M109 26H115M99 34H105M109 34H115M202 22H208M212 22H218M202 30H208M212 30H218"
              stroke="#00D6A0"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* ================================================================ */}
        {/* RIGHT SECTION (55%): CLEAN WHITE AUTHENTICATION FORM             */}
        {/* ================================================================ */}
        <div className="bg-[#FFFFFF] p-6 sm:p-9 lg:p-11 flex flex-col justify-between">
          <div>
            {/* Top-Right Sign Up Prompt */}
            <div className="flex justify-end mb-4 sm:mb-5">
              <p className="text-[12.5px] sm:text-[13px] text-[#64748B] font-medium">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/register?redirect=${encodeURIComponent(redirect)}`}
                  className="font-bold text-[#009B65] hover:text-[#004D32] transition-colors inline-flex items-center gap-1"
                >
                  <span>Sign Up</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </p>
            </div>

            {/* Form Title & Subtitle */}
            <div className="mb-6">
              <h1
                id="login-page-heading"
                className="text-[26px] sm:text-[32px] font-extrabold text-[#101828] tracking-tight leading-[1.15]"
              >
                Login to Stayzy
              </h1>
              <p className="mt-1 text-[13.5px] sm:text-[14.5px] text-[#64748B] font-normal">
                Continue your journey with us.
              </p>
            </div>

            {/* Email Login / Phone Login Segmented Tabs */}
            <div
              role="tablist"
              aria-label="Login method"
              className="grid grid-cols-2 gap-1.5 p-1 rounded-[14px] bg-[#F1F5F9] border border-[#E2E8F0]/80 mb-5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={method === "email"}
                onClick={() => {
                  setMethod("email");
                  setError(null);
                }}
                className={`h-10 rounded-[10px] text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  method === "email"
                    ? "bg-[#009B65] text-white shadow-xs"
                    : "text-[#101828]/80 hover:text-[#101828]"
                }`}
              >
                <Mail className="w-4 h-4" strokeWidth={2.1} />
                <span>Email Login</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={method === "phone"}
                onClick={() => {
                  setMethod("phone");
                  setError(null);
                }}
                className={`h-10 rounded-[10px] text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  method === "phone"
                    ? "bg-[#009B65] text-white shadow-xs"
                    : "text-[#101828]/80 hover:text-[#101828]"
                }`}
              >
                <Phone className="w-4 h-4" strokeWidth={2.1} />
                <span>Phone Login</span>
              </button>
            </div>

            {/* Inline Error Alert */}
            {error && (
              <div
                role="alert"
                className="mb-4 p-3.5 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-[12.5px] font-semibold flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Authentication Form */}
            <form onSubmit={handleLogin} noValidate className="space-y-4">
              {method === "email" ? (
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-[13px] font-bold text-[#101828] mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative flex items-center h-12 rounded-[12px] border border-[#E2E8F0] bg-white px-3.5 focus-within:border-[#009B65] focus-within:ring-2 focus-within:ring-[#00D6A0]/25 transition-all">
                    <Mail className="w-[18px] h-[18px] text-[#64748B] shrink-0 mr-2.5" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full bg-transparent text-[14px] font-medium text-[#101828] placeholder:text-[#64748B]/75 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="login-phone"
                    className="block text-[13px] font-bold text-[#101828] mb-1.5"
                  >
                    Mobile Number
                  </label>
                  <div className="flex items-center h-12 rounded-[12px] border border-[#E2E8F0] bg-white focus-within:border-[#009B65] focus-within:ring-2 focus-within:ring-[#00D6A0]/25 transition-all overflow-hidden">
                    <select
                      aria-label="Country code"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="h-full pl-3 pr-1.5 bg-[#F8FAFC] border-r border-[#E2E8F0] text-[13px] font-bold text-[#101828] focus:outline-none cursor-pointer"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center flex-1 px-3 min-w-0">
                      <Phone className="w-[17px] h-[17px] text-[#64748B] shrink-0 mr-2.5" />
                      <input
                        id="login-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full bg-transparent text-[14px] font-medium text-[#101828] placeholder:text-[#64748B]/75 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Password Field + Visibility Toggle */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-[13px] font-bold text-[#101828] mb-1.5"
                >
                  Password
                </label>
                <div className="relative flex items-center h-12 rounded-[12px] border border-[#E2E8F0] bg-white px-3.5 focus-within:border-[#009B65] focus-within:ring-2 focus-within:ring-[#00D6A0]/25 transition-all">
                  <Lock className="w-[18px] h-[18px] text-[#64748B] shrink-0 mr-2.5" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-transparent text-[14px] font-medium text-[#101828] placeholder:text-[#64748B]/75 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="ml-2 p-1.5 rounded-[8px] text-[#64748B] hover:text-[#101828] hover:bg-[#F1F5F9] transition-colors cursor-pointer shrink-0"
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between gap-3 pt-0.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] accent-[#009B65] cursor-pointer"
                  />
                  <span className="text-[13px] font-medium text-[#101828]">
                    Remember Me
                  </span>
                </label>

                <Link
                  href="/forgot-password"
                  className="text-[13px] font-semibold text-[#009B65] hover:text-[#004D32] hover:underline underline-offset-2 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Primary Login CTA Button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full h-12 rounded-[9999px] bg-gradient-to-r from-[#009B65] to-[#004D32] hover:brightness-105 disabled:opacity-65 text-white font-bold text-[15px] shadow-[0_10px_24px_rgba(0,155,101,0.28)] flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer mt-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center my-5">
              <div className="flex-1 h-[1px] bg-[#E2E8F0]" />
              <span className="px-3 text-[12px] font-medium text-[#64748B]">
                Or continue with
              </span>
              <div className="flex-1 h-[1px] bg-[#E2E8F0]" />
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full h-11 rounded-[9999px] border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#CBD5E1] disabled:opacity-65 text-[#101828] text-[13.5px] font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#009B65]" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Legal Notice */}
            <p className="mt-4 text-center text-[11.5px] text-[#64748B] leading-relaxed">
              By continuing, you agree to our{" "}
              <Link
                href="/terms"
                className="font-semibold text-[#009B65] hover:text-[#004D32] hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-semibold text-[#009B65] hover:text-[#004D32] hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          {/* Subtle Resident Quick-Demo & Admin Portal Links (Preserves Existing Access) */}
          <div className="mt-5 pt-3.5 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
            <button
              type="button"
              onClick={handleDemoCustomerLogin}
              disabled={loading || googleLoading}
              className="inline-flex items-center gap-1.5 font-semibold text-[#004D32] hover:text-[#009B65] transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#009B65]" />
              <span>Quick Resident Access (Demo)</span>
            </button>

            <Link
              href="/admin/login"
              className="font-semibold text-[#64748B] hover:text-[#004D32] transition-colors"
            >
              Admin Portal Login &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] flex flex-col bg-[#F4FBF7]">
      <main className="flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center py-20 text-xs font-medium text-[#64748B]">
              Loading Stayzy sign-in...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
