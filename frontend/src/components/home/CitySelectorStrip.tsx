"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

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
  // Bengaluru is highlighted by default in the design specification
  const [activeCity, setActiveCity] = useState<string>("Bengaluru");

  const handleSelectCity = (city: CityItem) => {
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

          {/* Premium Outlined "Explore all cities →" Button */}
          <Link
            href="/cities"
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-emerald-600/35 bg-white/95 hover:bg-[#EAF8F0] text-[#079B50] font-black text-xs sm:text-sm shadow-xs hover:shadow-sm hover:border-[#079B50] transition-all duration-200 self-start sm:self-auto shrink-0 relative z-20"
          >
            <span>Explore all cities</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>

        {/* ======================================================== */}
        {/* 3. SEVEN STANDARDIZED CITY CARDS ROW                     */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 lg:gap-4 items-stretch">
          {CITIES.map((city) => {
            const isSelected = activeCity === city.name;

            return (
              <button
                key={city.id}
                type="button"
                onClick={() => handleSelectCity(city)}
                className={`group relative rounded-[22px] sm:rounded-[24px] p-3 sm:p-4 flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-300 overflow-hidden border-[1.5px] ${
                  isSelected
                    ? "bg-white border-[#079B50] shadow-[0_10px_26px_rgba(7,155,80,0.14)] -translate-y-1.5 ring-1 ring-[#079B50]/30"
                    : "bg-white border-[#E5EDE7] shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:border-[#079B50]/60 hover:shadow-[0_12px_28px_rgba(7,155,80,0.12)] hover:-translate-y-1.5"
                }`}
              >
                {/* Subtle Top Backdrop Gradient inside card */}
                <div
                  className={`absolute inset-x-0 top-0 h-32 pointer-events-none transition-opacity duration-300 ${
                    isSelected
                      ? "bg-gradient-to-b from-[#EAF8F0] via-white/80 to-transparent opacity-100"
                      : "bg-gradient-to-b from-[#F2F9F5] via-white/60 to-transparent opacity-70 group-hover:opacity-100"
                  }`}
                />

                {/* Standardized 3D Landmark Illustration Showcase */}
                <div className="relative z-10 w-full h-24 sm:h-28 flex items-center justify-center p-1 mb-2">
                  <img
                    src={city.image}
                    alt={`${city.name} Landmark - ${city.landmark}`}
                    className="max-h-full max-w-full object-contain object-center transform group-hover:scale-106 transition-transform duration-300 ease-out drop-shadow-xs"
                    loading="lazy"
                  />
                </div>

                {/* City Title and Hubs Container */}
                <div className="relative z-10 w-full flex flex-col items-center pt-0.5 pb-1">
                  <h3
                    className={`text-sm sm:text-base font-extrabold tracking-tight transition-colors duration-200 leading-snug ${
                      isSelected ? "text-[#079B50]" : "text-[#17212B] group-hover:text-[#079B50]"
                    }`}
                  >
                    {city.name}
                  </h3>

                  <span className="text-xs sm:text-[13px] font-bold text-[#079B50] mt-0.5 tracking-tight">
                    {city.localityCount}+ Hubs
                  </span>
                </div>

                {/* Bottom Emerald Accent Bar (Exact Reference Match) */}
                <div
                  className={`absolute inset-x-4 bottom-0 h-1 rounded-full bg-[#079B50] transition-all duration-300 ${
                    isSelected
                      ? "opacity-100 scale-x-100"
                      : "opacity-0 scale-x-50 group-hover:opacity-100 group-hover:scale-x-100"
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
