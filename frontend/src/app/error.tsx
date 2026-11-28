"use client";

import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#FAF6EC]">
      <div className="max-w-md w-full bg-white rounded-[24px] border border-[#E9E3D5] shadow-sm p-8 text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-[#064E38]">
            Something went wrong
          </h1>
          <p className="text-sm text-[#5E6E65]">
            We encountered an unexpected issue loading this page. Your bookings and account data remain safe.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#064E38] text-white text-sm font-bold hover:bg-[#053D2C] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#D5E9CE] text-[#064E38] text-sm font-bold hover:bg-[#EAF5E4] transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
