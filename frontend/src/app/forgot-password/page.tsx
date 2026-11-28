"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { app } from "@/lib/firebase";
import { Footer } from "@/components/common/Footer";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const auth = getAuth(app);
      await sendPasswordResetEmail(auth, trimmedEmail, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });

      setSubmitted(true);
      toast.info(
        "Password Reset Sent",
        `If an account exists for ${trimmedEmail}, instructions were dispatched.`
      );
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found") {
        // Privacy-safe response: do not expose whether an account exists
        setSubmitted(true);
        toast.info(
          "Password Reset Sent",
          `If an account exists for ${trimmedEmail}, instructions were dispatched.`
        );
      } else if (code === "auth/invalid-email") {
        const msg = "Please enter a valid email address.";
        setError(msg);
        toast.error("Invalid Email", msg);
      } else if (code === "auth/too-many-requests") {
        const msg = "Too many reset requests. Please wait a few minutes and try again.";
        setError(msg);
        toast.error("Rate Limited", msg);
      } else if (code === "auth/network-request-failed") {
        const msg = "Network error while contacting authentication service. Please try again.";
        setError(msg);
        toast.error("Network Error", msg);
      } else {
        const msg = "Unable to send password reset email right now. Please try again.";
        setError(msg);
        toast.error("Reset Failed", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="bg-white rounded-lg border border-[#E8E6DF] p-8 max-w-md w-full shadow-card-hover space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-[#123D2B]">Reset Password</h1>
            <p className="text-sm font-medium text-[#374151]">
              Enter the email address associated with your Stayzy account.
            </p>
          </div>

          {submitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#E8F1D5] text-[#123D2B] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs text-[#192621] font-semibold">
                If an account exists for <strong>{email.trim()}</strong>, password reset instructions have been sent.
              </p>
              <p className="text-[11px] text-[#7B8B82]">
                Check your inbox and spam folder for the password reset link.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#123D2B] text-white text-xs font-bold"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-[#5E6E65]">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7B8B82] absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9] font-medium disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#123D2B] text-white font-bold text-xs hover:bg-[#0E2F21] transition-all cursor-pointer disabled:opacity-60"
              >
                {loading ? "Sending Reset Link..." : "Send Reset Link"}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#123D2B] hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
