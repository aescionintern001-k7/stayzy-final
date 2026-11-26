"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/common/Footer";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.info("Password Reset Sent", `If an account exists for ${email}, instructions were dispatched.`);
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
                If an account exists for <strong>{email}</strong>, password reset instructions have been sent.
              </p>
              <p className="text-[11px] text-[#7B8B82]">
                In prototype mode, you can log in directly using the 1-click Demo buttons on the login page.
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
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#D5D2C7] bg-[#FDFCF9] font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#123D2B] text-white font-bold text-xs hover:bg-[#0E2F21] transition-all cursor-pointer"
              >
                Send Reset Link
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
