"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Home,
  Headset,
  Loader2,
} from "lucide-react";
import { StayzyLogo } from "@/components/common/StayzyLogo";
import { Footer } from "@/components/common/Footer";
import { useToast } from "@/components/ui/Toast";

const TRUST_CARDS = [
  {
    icon: Home,
    value: "350+",
    label: "Verified Properties",
  },
  {
    icon: ShieldCheck,
    value: "Zero",
    label: "Brokerage",
  },
  {
    icon: Headset,
    value: "24/7",
    label: "Resident Support",
  },
] as const;

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const phoneDigits = phone.replace(/\D/g, "").slice(-10);

  const isNameValid = cleanName.length >= 2;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const isPhoneValid = phoneDigits.length === 10;
  const isPasswordValid = password.length >= 6;
  const isConfirmValid = confirmPassword.length > 0 && confirmPassword === password;

  const isFormValid =
    isNameValid &&
    isEmailValid &&
    isPhoneValid &&
    isPasswordValid &&
    isConfirmValid &&
    agreeTerms;

  const handlePhoneChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setPhone(digitsOnly);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    if (!isNameValid) {
      setError("Please enter your full legal name (at least 2 characters).");
      return;
    }
    if (!isEmailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isPhoneValid) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!isPasswordValid) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (!isConfirmValid) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }
    if (!agreeTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail.toLowerCase(),
          phone: `+91${phoneDigits}`,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed. Please try again.");
      }

      if (typeof window !== "undefined" && data.user) {
        localStorage.setItem("stayzy_user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("stayzy_auth_changed"));
      }

      toast.success("Welcome to Stayzy!", "Your account has been created successfully.");
      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Unable to create your account right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] flex flex-col bg-[#F3FAF6]">
      <main className="flex-1 flex flex-col lg:flex-row w-full min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] overflow-hidden">
        {/* Left Side: 52% Brand Experience Section */}
        <section className="relative w-full lg:w-[52%] min-h-[420px] sm:min-h-[470px] lg:min-h-full bg-[#003D2B] overflow-hidden flex flex-col justify-between p-6 sm:p-10 xl:p-14 text-white">
          {/* Sharp Luxury Bedroom Photography */}
          <img
            src="/images/stayzy-booking-bedroom.webp"
            alt="Luxury furnished Stayzy co-living bedroom"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Subtle Directional Emerald Readability Gradient (keeps right-side interior crisp) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(105deg, rgba(0, 61, 43, 0.94) 0%, rgba(6, 75, 53, 0.80) 48%, rgba(6, 75, 53, 0.25) 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-44 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(0, 61, 43, 0.92) 0%, rgba(0, 61, 43, 0) 100%)",
            }}
          />

          {/* Top Logo */}
          <div className="relative z-10 animate-fade-in">
            <Link href="/" className="inline-flex items-center focus:outline-none">
              <StayzyLogo variant="light" size="md" />
            </Link>
          </div>

          {/* Center Brand Copy & Trust Indicator Cards */}
          <div className="relative z-10 my-8 lg:my-auto max-w-[540px] space-y-6 animate-fade-in">
            <div className="inline-flex items-center px-3.5 py-1.5 rounded-[9999px] border border-[#00D6A0]/45 bg-[#003D2B]/65 text-[#E5F7EE] text-[11px] font-bold tracking-[0.14em] uppercase">
              START YOUR STAYZY JOURNEY
            </div>

            <div className="space-y-3.5">
              <h1 className="text-[32px] sm:text-[42px] xl:text-[48px] font-extrabold leading-[1.08] tracking-tight text-white">
                Your Next Chapter
                <br />
                Starts With <span className="text-[#00D6A0]">Better</span>
                <br />
                Living.
              </h1>
              <p className="text-[14px] sm:text-[15.5px] leading-relaxed text-[#E5F7EE]/90 max-w-[440px] font-medium">
                Discover verified co-living spaces, comfortable rooms and a community designed around
                your lifestyle.
              </p>
            </div>

            {/* Three Glass Trust Indicator Cards */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 pt-1">
              {TRUST_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-[16px] bg-[#003D2B]/55 backdrop-blur-sm border border-white/15 px-3 py-3.5 sm:px-4 sm:py-4 text-center flex flex-col items-center justify-center gap-1.5 transition-all duration-200 hover:border-[#00D6A0]/50 hover:bg-[#003D2B]/70"
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#00D6A0]" aria-hidden="true" />
                    <div className="text-[17px] sm:text-[20px] font-extrabold text-white leading-tight">
                      {card.value}
                    </div>
                    <div className="text-[11px] sm:text-[12px] text-[#E5F7EE]/85 font-medium leading-snug">
                      {card.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Brand Tagline */}
          <div className="relative z-10 pt-2">
            <p className="font-serif italic text-[17px] sm:text-[20px] text-[#E5F7EE]/95 tracking-wide">
              &ldquo;Find your space. Feel at home. Live better.&rdquo;
            </p>
            <svg
              viewBox="0 0 260 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-44 sm:w-52 h-2.5 mt-1 text-[#00D6A0]/70"
              aria-hidden="true"
            >
              <path
                d="M2 8.5C68 2.5 168 1.5 258 6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </section>

        {/* Right Side: 48% Registration Form Panel */}
        <section className="relative w-full lg:w-[48%] bg-gradient-to-br from-[#F4FBF7] via-[#EDF8F2] to-[#E5F7EE] flex items-center justify-center p-4 sm:p-7 xl:p-10 overflow-hidden">
          {/* Subtle Mint-Green Decorative Corner Shapes */}
          <div
            className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-[9999px] bg-[#00D6A0]/15"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-28 -right-20 w-80 h-80 rounded-[9999px] bg-[#009B68]/14"
            aria-hidden="true"
          />

          {/* Small Decorative Dot Pattern Near Top-Right */}
          <div
            className="pointer-events-none hidden sm:grid grid-cols-5 gap-2.5 absolute top-6 right-6 opacity-45"
            aria-hidden="true"
          >
            {Array.from({ length: 20 }).map((_, idx) => (
              <span
                key={idx}
                className="w-1.5 h-1.5 rounded-[9999px] bg-[#009B68]/45 block"
              />
            ))}
          </div>

          {/* Warm Ivory Registration Card */}
          <div className="relative z-10 w-full max-w-[490px] bg-[#FCFAF5] rounded-[24px] border border-[#E5E5DD] shadow-[0_24px_60px_-15px_rgba(6,75,53,0.16)] px-6 py-7 sm:px-9 sm:py-8 overflow-hidden animate-fade-in">
            {/* Subtle Card Corner Mint Accents */}
            <div
              className="pointer-events-none absolute -top-12 -left-12 w-28 h-28 rounded-[9999px] bg-[#E5F7EE]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -top-12 -right-12 w-28 h-28 rounded-[9999px] bg-[#E5F7EE]"
              aria-hidden="true"
            />

            {/* Card Header */}
            <div className="relative z-10 text-center space-y-2 mb-6">
              <div className="flex justify-center">
                <Link href="/" className="inline-flex items-center focus:outline-none">
                  <StayzyLogo variant="dark" size="md" />
                </Link>
              </div>
              <h2 className="text-[26px] sm:text-[28px] font-extrabold text-[#064B35] tracking-tight leading-tight">
                Create Your Account
              </h2>
              <p className="text-[13.5px] text-[#64736C] font-medium">
                Join Stayzy and discover a better way to live.
              </p>
            </div>

            {/* Inline Error Banner */}
            {error && (
              <div
                role="alert"
                className="relative z-10 mb-4 p-3.5 rounded-[14px] bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2.5 border border-red-200"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} noValidate className="relative z-10 space-y-3.5">
              {/* 1. Full Legal Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-name"
                  className="block text-[12.5px] font-bold text-[#172923]"
                >
                  Full Legal Name
                </label>
                <div className="relative">
                  <User
                    className="w-[18px] h-[18px] text-[#64736C] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="register-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => markTouched("name")}
                    placeholder="Enter your full name"
                    className={`w-full h-[50px] pl-11 pr-4 rounded-[14px] border bg-white text-[14px] font-medium text-[#172923] placeholder:text-[#94A39C] outline-none transition-all duration-200 ${
                      touched.name && !isNameValid
                        ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : "border-[#E5E5DD] focus:border-[#009B68] focus:ring-4 focus:ring-[#009B68]/12"
                    }`}
                  />
                </div>
                {touched.name && !isNameValid && (
                  <p className="text-[11.5px] text-red-600 font-medium">
                    Please enter at least 2 characters.
                  </p>
                )}
              </div>

              {/* 2. Email Address */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-email"
                  className="block text-[12.5px] font-bold text-[#172923]"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="w-[18px] h-[18px] text-[#64736C] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="register-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => markTouched("email")}
                    placeholder="name@example.com"
                    className={`w-full h-[50px] pl-11 pr-4 rounded-[14px] border bg-white text-[14px] font-medium text-[#172923] placeholder:text-[#94A39C] outline-none transition-all duration-200 ${
                      touched.email && !isEmailValid
                        ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : "border-[#E5E5DD] focus:border-[#009B68] focus:ring-4 focus:ring-[#009B68]/12"
                    }`}
                  />
                </div>
                {touched.email && !isEmailValid && (
                  <p className="text-[11.5px] text-red-600 font-medium">
                    Enter a valid email address (e.g. name@example.com).
                  </p>
                )}
              </div>

              {/* 3. Mobile Phone (+91) */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-phone"
                  className="block text-[12.5px] font-bold text-[#172923]"
                >
                  Mobile Phone
                </label>
                <div className="relative flex items-center">
                  <Phone
                    className="w-[18px] h-[18px] text-[#64736C] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <span className="absolute left-11 text-[14px] font-bold text-[#172923] select-none pointer-events-none">
                    +91
                  </span>
                  <input
                    id="register-phone"
                    type="tel"
                    inputMode="numeric"
                    required
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onBlur={() => markTouched("phone")}
                    placeholder="Enter your mobile number"
                    className={`w-full h-[50px] pl-[78px] pr-4 rounded-[14px] border bg-white text-[14px] font-medium text-[#172923] placeholder:text-[#94A39C] outline-none transition-all duration-200 ${
                      touched.phone && !isPhoneValid
                        ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : "border-[#E5E5DD] focus:border-[#009B68] focus:ring-4 focus:ring-[#009B68]/12"
                    }`}
                  />
                </div>
                {touched.phone && !isPhoneValid && (
                  <p className="text-[11.5px] text-red-600 font-medium">
                    Enter a valid 10-digit Indian mobile number.
                  </p>
                )}
              </div>

              {/* 4. Create Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-password"
                  className="block text-[12.5px] font-bold text-[#172923]"
                >
                  Create Password
                </label>
                <div className="relative">
                  <Lock
                    className="w-[18px] h-[18px] text-[#64736C] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => markTouched("password")}
                    placeholder="Enter your password"
                    className={`w-full h-[50px] pl-11 pr-12 rounded-[14px] border bg-white text-[14px] font-medium text-[#172923] placeholder:text-[#94A39C] outline-none transition-all duration-200 ${
                      touched.password && !isPasswordValid
                        ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : "border-[#E5E5DD] focus:border-[#009B68] focus:ring-4 focus:ring-[#009B68]/12"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-[10px] text-[#64736C] hover:text-[#064B35] hover:bg-[#E5F7EE]/60 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <Eye className="w-[18px] h-[18px]" />
                    ) : (
                      <EyeOff className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
                {touched.password && !isPasswordValid && (
                  <p className="text-[11.5px] text-red-600 font-medium">
                    Password must be at least 6 characters.
                  </p>
                )}
              </div>

              {/* 5. Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="register-confirm-password"
                  className="block text-[12.5px] font-bold text-[#172923]"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Shield
                    className="w-[18px] h-[18px] text-[#64736C] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => markTouched("confirmPassword")}
                    placeholder="Re-enter your password"
                    className={`w-full h-[50px] pl-11 pr-12 rounded-[14px] border bg-white text-[14px] font-medium text-[#172923] placeholder:text-[#94A39C] outline-none transition-all duration-200 ${
                      touched.confirmPassword && !isConfirmValid
                        ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : "border-[#E5E5DD] focus:border-[#009B68] focus:ring-4 focus:ring-[#009B68]/12"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-[10px] text-[#64736C] hover:text-[#064B35] hover:bg-[#E5F7EE]/60 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <Eye className="w-[18px] h-[18px]" />
                    ) : (
                      <EyeOff className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
                {touched.confirmPassword && !isConfirmValid && (
                  <p className="text-[11.5px] text-red-600 font-medium">
                    Passwords do not match.
                  </p>
                )}
              </div>

              {/* Terms and Conditions */}
              <label className="flex items-start gap-2.5 pt-1 text-[12.5px] text-[#64736C] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-[#E5E5DD] accent-[#009B68] cursor-pointer shrink-0"
                />
                <span className="leading-snug">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="text-[#009B68] font-semibold hover:text-[#064B35] underline underline-offset-2"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-[#009B68] font-semibold hover:text-[#064B35] underline underline-offset-2"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              {/* Primary CTA */}
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full h-[50px] mt-1 rounded-[14px] bg-gradient-to-r from-[#009B68] to-[#064B35] hover:from-[#00AC74] hover:to-[#085A40] text-white font-bold text-[14.5px] shadow-[0_10px_24px_-8px_rgba(0,155,104,0.55)] hover:shadow-[0_14px_28px_-8px_rgba(0,155,104,0.65)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account &amp; Continue</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* Login Navigation Divider */}
            <div className="relative z-10 mt-5 pt-4 border-t border-[#E5E5DD] text-center">
              <p className="text-[13px] text-[#64736C] font-medium">
                Already have an account?{" "}
                <Link
                  href={`/login?redirect=${encodeURIComponent(redirect)}`}
                  className="font-bold text-[#009B68] hover:text-[#064B35] hover:underline underline-offset-2"
                >
                  Log In
                </Link>
              </p>
            </div>

            {/* Security Footer */}
            <div className="relative z-10 mt-4 pt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11.5px] text-[#64736C] font-medium">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#009B68]" aria-hidden="true" />
                <span>Secure Registration</span>
              </span>
              <span className="text-[#E5E5DD]" aria-hidden="true">
                |
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#009B68]" aria-hidden="true" />
                <span>Your Information Is Protected</span>
              </span>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-109px)] flex items-center justify-center bg-[#F3FAF6] text-xs font-semibold text-[#064B35]">
          Loading registration...
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
