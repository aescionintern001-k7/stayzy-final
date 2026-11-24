"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Star,
  Headphones,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { StayzyLogo } from "@/components/common/StayzyLogo";

interface ServiceCardItem {
  id: string;
  title: string;
  image: string;
  description: string;
  link: string;
}

const HOTEL_SERVICES: ServiceCardItem[] = [
  {
    id: "wifi",
    title: "Free Wi-Fi",
    image: "/services/wifi-3d-hd.png",
    description: "High-speed 300 Mbps unlimited fiber internet in every room",
    link: "/amenities",
  },
  {
    id: "ac-rooms",
    title: "AC Rooms",
    image: "/services/ac-rooms-3d-hd.png",
    description: "Climate-controlled Daikin inverter air conditioning",
    link: "/rooms?hasAc=true",
  },
  {
    id: "clean-rooms",
    title: "Clean Rooms",
    image: "/services/clean-rooms-3d-hd.png",
    description: "Hotel-grade sanitized linens, daily housekeeping & fresh duvets",
    link: "/rooms",
  },
  {
    id: "toiletries",
    title: "Essential Toiletries",
    image: "/services/toiletries-3d-hd.png",
    description: "Complimentary luxury hygiene kit, body wash & plush cotton towels",
    link: "/amenities",
  },
  {
    id: "helpful-staff",
    title: "Helpful Staff",
    image: "/services/helpful-staff-3d-hd.png",
    description: "24/7 dedicated on-premise front desk concierge & luggage support",
    link: "/contact",
  },
];

export function HotelServices() {
  return (
    <section
      aria-label="Stayzy Premium Hotel Services"
      className="relative w-full bg-gradient-to-b from-[#F3FAF5] via-[#EAF8F0]/50 to-[#FFFFFF] border-b border-[#E2F0E7] py-10 lg:py-14 overflow-hidden select-none"
    >
      {/* ======================================================== */}
      {/* 1. DECORATIVE BACKGROUND ACCENTS (MATCHING REFERENCE)   */}
      {/* ======================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft mint concentric circular glow behind male character */}
        <div className="absolute -top-16 -right-16 w-96 h-96 rounded-full bg-[#DDF4E6]/50 blur-2xl" />
        <div className="absolute top-4 right-16 w-80 h-80 rounded-full border border-emerald-200/40 opacity-70" />
        <div className="absolute top-12 right-24 w-64 h-64 rounded-full border border-emerald-300/30 opacity-60" />

        {/* Decorative green dot matrix in top right corner */}
        <div className="absolute top-5 right-8 hidden sm:grid grid-cols-6 gap-2 opacity-35">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#079B50]" />
          ))}
        </div>

        {/* Dynamic bottom-left organic emerald curve swoosh */}
        <div className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-gradient-to-tr from-[#079B50] via-[#00B86B]/80 to-transparent opacity-90 blur-xs" />
        {/* Dynamic bottom-right organic emerald wave */}
        <div className="absolute -bottom-28 -right-16 w-72 h-72 rounded-full bg-gradient-to-tl from-[#079B50] via-[#00B86B]/70 to-transparent opacity-90 blur-xs" />
      </div>

      <div className="relative z-10 max-w-[1480px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* ======================================================== */}
        {/* 2. SECTION HEADER & MALE CHARACTER ROW                   */}
        {/* ======================================================== */}
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between pb-8 lg:pb-10 min-h-[160px] lg:min-h-[190px]">
          {/* Left: Branding, Headline & Trust Indicators */}
          <div className="space-y-3.5 max-w-2xl text-left">
            {/* Top Brand Logo */}
            <div className="flex items-center gap-2">
              <StayzyLogo size="sm" />
            </div>

            {/* Main Headline */}
            <h2 className="text-2xl sm:text-3xl lg:text-[38px] font-black text-[#17212B] tracking-tight leading-tight">
              <span className="text-[#079B50]">Stayzy</span>
              <span className="text-[#17212B]"> – Premium Hotel Services</span>
            </h2>

            {/* Horizontal Trust Indicators Row */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-5 pt-1 text-xs font-semibold text-gray-700">
              {/* Item 1: Trusted & Secure */}
              <div className="flex items-center gap-2 bg-white/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-emerald-100 sm:border-transparent sm:bg-transparent sm:px-0">
                <div className="w-6 h-6 rounded-full bg-[#EAF8F0] border border-emerald-200/60 flex items-center justify-center text-[#079B50] shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.4} />
                </div>
                <span className="text-[#17212B] font-bold text-xs tracking-tight">
                  Trusted &amp; Secure
                </span>
              </div>

              <div className="hidden sm:block w-px h-4 bg-gray-300/80" />

              {/* Item 2: Instant Booking */}
              <div className="flex items-center gap-2 bg-white/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-emerald-100 sm:border-transparent sm:bg-transparent sm:px-0">
                <div className="w-6 h-6 rounded-full bg-[#EAF8F0] border border-emerald-200/60 flex items-center justify-center text-[#079B50] shrink-0">
                  <Zap className="w-3.5 h-3.5" strokeWidth={2.4} />
                </div>
                <span className="text-[#17212B] font-bold text-xs tracking-tight">
                  Instant Booking
                </span>
              </div>

              <div className="hidden sm:block w-px h-4 bg-gray-300/80" />

              {/* Item 3: Best Price Guarantee */}
              <div className="flex items-center gap-2 bg-white/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-emerald-100 sm:border-transparent sm:bg-transparent sm:px-0">
                <div className="w-6 h-6 rounded-full bg-[#EAF8F0] border border-emerald-200/60 flex items-center justify-center text-[#079B50] shrink-0">
                  <Star className="w-3.5 h-3.5" strokeWidth={2.4} />
                </div>
                <span className="text-[#17212B] font-bold text-xs tracking-tight">
                  Best Price Guarantee
                </span>
              </div>

              <div className="hidden sm:block w-px h-4 bg-gray-300/80" />

              {/* Item 4: 24/7 Support */}
              <div className="flex items-center gap-2 bg-white/70 backdrop-blur-xs px-2.5 py-1 rounded-full border border-emerald-100 sm:border-transparent sm:bg-transparent sm:px-0">
                <div className="w-6 h-6 rounded-full bg-[#EAF8F0] border border-emerald-200/60 flex items-center justify-center text-[#079B50] shrink-0">
                  <Headphones className="w-3.5 h-3.5" strokeWidth={2.4} />
                </div>
                <span className="text-[#17212B] font-bold text-xs tracking-tight">
                  24/7 Support
                </span>
              </div>
            </div>
          </div>

          {/* Right: Male Hotel Representative Character (Pointing Towards Cards) */}
          <div className="hidden lg:block absolute right-0 top-0 xl:right-4 z-20 pointer-events-none select-none">
            <div className="relative w-64 xl:w-72 -mt-4">
              <img
                src="/services/male-staff-transparent-hd.png"
                alt="Stayzy Hotel Representative"
                className="w-full h-auto object-contain drop-shadow-md transform hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. FIVE SERVICE CARDS ROW                                */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5 pt-2">
          {HOTEL_SERVICES.map((service, index) => (
            <Link
              key={service.id}
              href={service.link}
              className="group relative bg-white rounded-[26px] sm:rounded-[30px] border border-[#E0F2E9] p-4 sm:p-5 shadow-[0_8px_24px_rgba(7,155,80,0.05)] hover:shadow-[0_16px_36px_rgba(7,155,80,0.14)] hover:border-[#079B50]/50 transition-all duration-300 hover:-translate-y-2 flex flex-col items-center text-center cursor-pointer overflow-hidden"
            >
              {/* Card Subtle Top Highlight */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#079B50]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* 3D Illustration Area */}
              <div className="w-full h-28 sm:h-36 flex items-center justify-center p-2 mb-2 relative">
                <img
                  src={service.image}
                  alt={service.title}
                  className="max-h-full max-w-full object-contain transform group-hover:scale-110 transition-transform duration-300 ease-out drop-shadow-xs"
                  loading="lazy"
                />
              </div>

              {/* Card Label */}
              <h3 className="text-sm sm:text-base font-black text-[#17212B] group-hover:text-[#079B50] transition-colors leading-tight">
                {service.title}
              </h3>

              {/* Green Pill Dash Accent (Exact Reference Visual) */}
              <div className="w-6 h-1 bg-[#079B50] rounded-full mt-2 sm:mt-2.5 transition-all duration-300 group-hover:w-10 group-hover:bg-[#00B86B]" />

              {/* Hover description preview for enhanced user experience */}
              <p className="mt-2 text-[11px] text-gray-500 line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity hidden sm:block">
                {service.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

