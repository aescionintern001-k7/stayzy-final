"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintReceiptButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] hover:bg-[#F9FAFB] hover:border-[#D5D2C7] transition-all cursor-pointer shadow-xs print:hidden"
    >
      <Printer className="w-3.5 h-3.5 text-[#4B5563]" />
      <span>Print Official Receipt</span>
    </button>
  );
}

