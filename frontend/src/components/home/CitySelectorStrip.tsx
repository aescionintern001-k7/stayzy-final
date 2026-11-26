"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { ArrowFillButton } from "@/components/ui/arrow-fill-button";

interface CityItem {
  id: string;
  name: string;
  localityCount: number;
  image: string;
  landmark: string;
}

const CITIES: CityItem[] = [
  {
    id: "bengaluru",
    name: "Bengaluru",
    localityCount: 42,
    image: "/cities/bengaluru-landmark.png",
    landmark: "Vidhana Soudha",
  },
  {
    id: "chennai",
    name: "Chennai",
    localityCount: 28,
    image: "/cities/chennai-landmark.png",
    landmark: "Kapaleeshwarar Temple",
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    localityCount: 31,
    image: "/cities/hyderabad-landmark.png",
    landmark: "Charminar",
  },
  {
    id: "pune",
    name: "Pune",
    localityCount: 24,
    image: "/cities/pune-landmark.png",
    landmark: "Shaniwar Wada",
  },
  {
    id: "mumbai",
    name: "Mumbai",
    localityCount: 36,
    image: "/cities/mumbai-landmark.png",
    landmark: "Gateway of India",
  },
  {
    id: "delhi",
    name: "Delhi NCR",
    localityCount: 39,
    image: "/cities/delhi-landmark.png",
    landmark: "India Gate",
  },
  {
    id: "coimbatore",
    name: "Coimbatore",
    localityCount: 18,
    image: "/cities/coimbatore-landmark.png",
    landmark: "Marudhamalai Temple",
  },
];

export function CitySelectorStrip() {
  const router = useRouter();
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  const handleSelectCity = (city: CityItem) => {
    if (city.id !== "bengaluru") return;
    setActiveCity(city.name);
    router.push(`/rooms?city=${encodeURIComponent(city.name)}`);
  };

  return (
    <section
      aria-label="Popular Destination Cities"
      className="relative w-full bg-gradient-to-b from-[#FCFBF8] via-[#FAF9F4] to-[#FFFFFF] border-b border-[#EAF2EC] py-12 lg:py-16 overflow-hidden select-none"
    >
      {/* ======================================================== */}
      {/* 1. DECORATIVE BACKGROUND SKYLINE & MINT GLOW             */}
      {/* ======================================================== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Soft radial mint ambient glow */}
        <div className="absolute top-0 right-10 w-[540px] h-[320px] rounded-full bg-[#E5F6EC]/60 blur-3xl" />
        <div className="absolute -bottom-10 left-12 w-80 h-80 rounded-full bg-[#F3FAF5]/80 blur-2xl" />

        {/* Authentic Architectural City Skyline Illustration (Exact Match to Reference Image 2) */}
        <div className="absolute right-0 top-0 w-[560px] md:w-[680px] lg:w-[780px] xl:w-[860px] h-[155px] md:h-[175px] hidden sm:block pointer-events-none select-none">
          <img
            src="/cities/city-skyline-authentic-full.png"
            alt="Stayzy City Skyline Background"
            className="w-full h-full object-contain object-right-top"
          />
        </div>
      </div>

      <div className="relative z-10 max-w-[1480px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* ======================================================== */}
        {/* 2. SECTION HEADER (TITLE, SUBTITLE & EXPLORE BUTTON)     */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-8 lg:pb-10 gap-4">
          <div className="text-left space-y-2 max-w-2xl">
            {/* Emerald pill accent dash (Exact reference match) */}
            <div className="w-12 h-1.5 bg-[#079B50] rounded-full" />

            {/* Main Headline */}
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-[#17212B] tracking-tight leading-tight">
              Popular Destination Cities
            </h2>

            {/* Supporting Description */}
            <p className="text-xs sm:text-sm text-[#526071] font-medium leading-relaxed">
              Select a city to find verified PGs and rooms near college hubs &amp; tech parks.
            </p>
          </div>

          {/* Premium Outlined "Explore all cities →" Button with ArrowFill Animation */}
          <ArrowFillButton
            as={Link}
            href="/cities"
            btnText="Explore all cities"
            variant="outline"
            size="md"
            bgColor="#ffffff"
            textColor="#079B50"
            fillBgColor="#009B62"
            fillTextColor="#ffffff"
            hoverFillBgColor="#00834F"
            hoverFillTextColor="#ffffff"
            arrowColor="#079B50"
            hoverArrowColor="#ffffff"
            className="text-xs sm:text-sm font-black border-emerald-600/35 shadow-xs hover:border-[#079B50] self-start sm:self-auto shrink-0 relative z-20"
          />
        </div>

        {/* ======================================================== */}
        {/* 3. SEVEN STANDARDIZED CITY CARDS ROW                     */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 lg:gap-4 items-stretch">
          {CITIES.map((city) => {
            const isComingSoon = city.id !== "bengaluru";
            const isSelected = !isComingSoon && activeCity === city.name;
            const isHovered = hoveredCity === city.name;

            return (
              <button
                key={city.id}
                type="button"
                aria-disabled={isComingSoon}
                onClick={() => handleSelectCity(city)}
                onPointerEnter={(e) => {
                  if (e.pointerType !== "touch") setHoveredCity(city.name);
                }}
                onPointerLeave={() => setHoveredCity(null)}
                onMouseEnter={() => setHoveredCity(city.name)}
                onMouseLeave={() => setHoveredCity(null)}
                onBlur={() => setHoveredCity((prev) => (prev === city.name ? null : prev))}
                className={`group relative rounded-[22px] sm:rounded-[24px] p-3 sm:p-4 flex flex-col items-center justify-between text-center transition-all duration-250 ease-out overflow-hidden border-[1.5px] bg-white ${
                  isComingSoon ? "cursor-not-allowed" : "cursor-pointer"
                } ${
                  isHovered
                    ? "border-[#008F55] shadow-[0_12px_28px_rgba(0,143,85,0.16)] -translate-y-1.5"
                    : isSelected
                    ? "border-[#008F55]/75 shadow-[0_4px_16px_rgba(0,143,85,0.08)]"
                    : "border-[#E5EDE7] shadow-[0_4px_16px_rgba(0,0,0,0.03)]"
                }`}
              >
                {/* Sharp Top-Center COMING SOON Badge for Unavailable Cities */}
                {isComingSoon && (
                  <span className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EAF5E5] border border-[#C6E2BC] text-[#064B35] text-[10px] font-extrabold tracking-wider uppercase whitespace-nowrap shadow-2xs pointer-events-none">
                    <Clock className="w-2.5 h-2.5 text-[#008F55] shrink-0" aria-hidden="true" />
                    <span>COMING SOON</span>
                  </span>
                )}

                {/* Subtle Selected Status Dot (only after user clicks a city, distinct from hover) */}
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute top-3 right-3 z-20 w-2 h-2 rounded-full bg-[#008F55] pointer-events-none"
                  />
                )}

                {/* Card Content Wrapper (Blurred & Softened for Coming Soon Cities) */}
                <div
                  className={`w-full flex flex-col items-center justify-between flex-1 ${
                    isComingSoon ? "blur-[2.5px] opacity-65 pointer-events-none select-none" : ""
                  }`}
                >
                  {/* Subtle Top Backdrop Gradient inside card (intensifies ONLY on hover) */}
                  <div
                    className={`absolute inset-x-0 top-0 h-32 pointer-events-none transition-opacity duration-250 ${
                      isHovered
                        ? "bg-gradient-to-b from-[#EAF8F0] via-white/80 to-transparent opacity-100"
                        : "bg-gradient-to-b from-[#F2F9F5] via-white/60 to-transparent opacity-65"
                    }`}
                  />

                  {/* Standardized 3D Landmark Illustration Showcase */}
                  <div className="relative z-10 w-full h-24 sm:h-28 flex items-center justify-center p-1 mb-2">
                    <img
                      src={city.image}
                      alt={`${city.name} Landmark - ${city.landmark}`}
                      className={`max-h-full max-w-full object-contain object-center transform transition-transform duration-250 ease-out drop-shadow-xs ${
                        isHovered ? "scale-105" : "scale-100"
                      }`}
                      loading="lazy"
                    />
                  </div>

                  {/* City Title and Hubs Container */}
                  <div className="relative z-10 w-full flex flex-col items-center pt-0.5 pb-1">
                    <h3
                      className={`text-sm sm:text-base font-extrabold tracking-tight transition-colors duration-200 leading-snug ${
                        isHovered ? "text-[#008F55]" : "text-[#17212B]"
                      }`}
                    >
                      {city.name}
                    </h3>

                    <span className="text-xs sm:text-[13px] font-bold text-[#008F55] mt-0.5 tracking-tight">
                      {city.localityCount}+ Hubs
                    </span>
                  </div>
                </div>

                {/* Bottom Emerald Accent Bar (visible ONLY when mouse is over this card) */}
                <div
                  className={`absolute inset-x-4 bottom-0 h-1 rounded-full bg-[#008F55] transition-all duration-250 ${
                    isHovered ? "opacity-100 scale-x-100" : "opacity-0 scale-x-50"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
