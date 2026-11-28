"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  ChevronDown,
  ChevronRight,
  Star,
  ShieldCheck,
  Building2,
  Headphones,
  User,
  Home,
  CheckCircle2,
  Navigation,
  X,
  Plus,
  Compass,
  Sparkles,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { StayzyLogo } from "@/components/common/StayzyLogo";
import { A_TO_Z_CITIES, QuickCity } from "@/lib/cities-data";
import { ArrowFillButton } from "@/components/ui/arrow-fill-button";

export function Hero() {
  const router = useRouter();
  const toast = useToast();

  // Search states
  const [destination, setDestination] = useState("");
  const [destFocused, setDestFocused] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Nearby");
  const [selectedCorridor, setSelectedCorridor] = useState("Nearby (Current Loc)");
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);
  const [stayType, setStayType] = useState<"MONTHLY" | "DAILY">("MONTHLY");

  // Selection states
  const [checkInDate, setCheckInDate] = useState("Mon, 23 Nov");
  const [checkOutDate, setCheckOutDate] = useState("Tue, 24 Nov");
  const [roomsCount, setRoomsCount] = useState(1);
  const [guestsCount, setGuestsCount] = useState(1);

  // Video background reference & viewport/visibility-aware autoplay management
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 767px)");

    const updateVideoSrc = () => {
      if (motionQuery.matches) {
        setVideoSrc(null);
        return;
      }
      setVideoSrc(
        mobileQuery.matches
          ? "/videos/hero-cinematic-mobile.mp4"
          : "/videos/stayzy_hotel_commercial_scenes_1080p.mp4"
      );
    };

    updateVideoSrc();
    motionQuery.addEventListener("change", updateVideoSrc);
    mobileQuery.addEventListener("change", updateVideoSrc);

    return () => {
      motionQuery.removeEventListener("change", updateVideoSrc);
      mobileQuery.removeEventListener("change", updateVideoSrc);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    // Enforce muted for universal browser autoplay compliance
    video.muted = true;
    video.defaultMuted = true;

    let isInView = true;

    const syncPlayback = () => {
      if (isInView && !document.hidden) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn("Autoplay was prevented by browser policy, fallback poster active:", err);
          });
        }
      } else {
        video.pause();
      }
    };

    syncPlayback();

    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (!entry) return;
              isInView = entry.isIntersecting;
              syncPlayback();
            },
            { threshold: 0.05 }
          )
        : null;

    observer?.observe(video);

    const handleVisibilityChange = () => {
      syncPlayback();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Seamless loop without black flash
    const handleEnded = () => {
      if (!isInView || document.hidden) return;
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener("ended", handleEnded);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoSrc]);

  // Refs for click outside
  const searchBarRef = useRef<HTMLDivElement>(null);

  // Close open popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchBarRef.current && !searchBarRef.current.contains(target)) {
        setNearbyOpen(false);
        setDatePickerOpen(false);
        setGuestPickerOpen(false);
        setDestFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Submit search query
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.set("locality", destination.trim());
    if (selectedCity && selectedCity !== "Nearby") params.set("city", selectedCity);
    params.set("durationType", stayType);
    params.set("rooms", roomsCount.toString());
    params.set("guests", guestsCount.toString());
    router.push(`/rooms?${params.toString()}`);
  };

  const popularCorridors = [
    { name: "Nearby (Current Loc)", city: "Nearby" },
    { name: "Koramangala, Bangalore", city: "Bangalore" },
    { name: "HSR Layout, Bangalore", city: "Bangalore" },
    { name: "Indiranagar, Bangalore", city: "Bangalore" },
    { name: "Whitefield, Bangalore", city: "Bangalore" },
    { name: "Gachibowli, Hyderabad", city: "Hyderabad" },
    { name: "Hitec City, Hyderabad", city: "Hyderabad" },
    { name: "OMR IT Corridor, Chennai", city: "Chennai" },
    { name: "Powai, Mumbai", city: "Mumbai" },
    { name: "Cyber City, Gurgaon", city: "Gurgaon" },
  ];

  return (
    <div className="relative z-20 w-full min-h-[780px] lg:min-h-[900px] flex flex-col justify-between overflow-x-clip overflow-y-visible bg-[#0c130e] text-white pt-24 sm:pt-32 lg:pt-36">
      {/* ======================================================== */}
      {/* 1. CINEMATIC VIDEO BACKGROUND & PRECISE GRADIENT OVERLAYS */}
      {/* ======================================================== */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
        {/* Crisp Luxury Living Room Underlay Poster Image (Zero-flash during load and loop) */}
        <img
          src="/videos/hero-poster-4k.jpg"
          alt="Stayzy Luxury Co-Living Living Room"
          className="absolute inset-0 w-full h-full object-cover object-center transform scale-[1.01]"
          loading="eager"
          decoding="sync"
        />

        {/* Full-screen HTML5 Autoplay Looping Video (Uploaded Stayzy Hotel Commercial) */}
        <video
          ref={videoRef}
          src={videoSrc ?? undefined}
          autoPlay={Boolean(videoSrc)}
          muted
          loop
          playsInline
          webkit-playsinline="true"
          preload="metadata"
          poster="/videos/hero-poster-4k.jpg"
          disablePictureInPicture
          disableRemotePlayback
          className="absolute inset-0 w-full h-full object-cover object-center transform scale-[1.01]"
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Master Dark Left-to-Right Gradient Overlay for Optimal Text Contrast */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(10, 16, 12, 0.85) 0%, rgba(12, 18, 14, 0.62) 42%, rgba(12, 18, 14, 0.22) 100%)",
          }}
        />

        {/* Top Vignette for Transparent Header & Navigation Legibility */}
        <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none" />

        {/* Bottom Ambient Gradient for Seamless Organic Curve Integration */}
        <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />
      </div>

      {/* ======================================================== */}
      {/* 4. HERO CENTER: HEADLINE, SUBTITLE, SEARCH PANEL & STATS */}
      {/* ======================================================== */}
      <main className="relative z-30 w-full max-w-[1480px] mx-auto px-4 sm:px-8 lg:px-12 pt-8 pb-16 lg:py-16 my-auto">
        <div className="max-w-3xl space-y-4 sm:space-y-5 text-left">
          {/* Main Headline (Exact screenshot line arrangement & colors) */}
          <h1 className="text-4xl sm:text-6xl lg:text-[72px] font-black text-white tracking-tight leading-[1.05] drop-shadow-lg font-sans">
            Smart, Comfortable <br />
            Living. <br />
            <span className="text-[#00C875] drop-shadow-[0_2px_16px_rgba(0,200,117,0.35)]">
              Tailored For You.
            </span>
          </h1>

          {/* Supporting Description (Exact screenshot copy) */}
          <p className="text-base sm:text-lg lg:text-[19px] text-white/95 font-normal max-w-2xl leading-relaxed drop-shadow-md">
            Explore thousands of verified private rooms and shared spaces with chef-prepared meals,
            300 Mbps Wi-Fi, and zero brokerage across top tech hubs.
          </p>
        </div>

        {/* ======================================================== */}
        {/* 5. PROPERTY SEARCH PANEL (EXACT SCREENSHOT LAYOUT)       */}
        {/* ======================================================== */}
        <div ref={searchBarRef} className="mt-8 lg:mt-10 max-w-[1310px]">
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white rounded-2xl md:rounded-full p-2 sm:p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/80 flex flex-col md:flex-row items-stretch md:items-center gap-2 text-gray-800 transition-all"
          >
            {/* Field 1: Destination ("Where to?") */}
            <div className="flex-1 relative flex items-center gap-3 px-3 py-2">
              <Search className="w-5 h-5 text-gray-400 shrink-0" strokeWidth={2.2} />
              <input
                type="text"
                value={destination}
                onFocus={() => setDestFocused(true)}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Where to?"
                className="w-full text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-hidden bg-transparent"
              />

              {/* Autocomplete Corridor Popover */}
              {destFocused && (
                <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-50 text-xs space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase">
                    Popular localities
                  </div>
                  {popularCorridors.slice(1, 7).map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onMouseDown={() => {
                        setDestination(item.name);
                        setSelectedCity(item.city);
                        setDestFocused(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-gray-700 font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Field 2: Nearby Outlined Green Selector Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNearbyOpen(!nearbyOpen);
                  setDatePickerOpen(false);
                  setGuestPickerOpen(false);
                  setDestFocused(false);
                }}
                className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 px-4 py-2.5 rounded-xl md:rounded-full text-xs font-bold text-[#00B86B] bg-[#F0FDF4] border border-[#00B86B] hover:bg-emerald-100/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#00B86B]" />
                  <span>{selectedCity}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#00B86B]" />
              </button>

              {nearbyOpen && (
                <div
                  role="listbox"
                  aria-label="Select Location or Corridor"
                  className="absolute top-full left-0 mt-3 w-64 sm:w-68 bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-[70] text-xs max-h-[280px] sm:max-h-[320px] overflow-y-auto overscroll-contain space-y-0.5"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-gray-400 uppercase sticky top-0 bg-white z-10">
                    Select Location / Corridor
                  </div>
                  {popularCorridors.map((c) => {
                    const isRowSelected = selectedCorridor === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        role="option"
                        aria-selected={isRowSelected}
                        onClick={() => {
                          setSelectedCity(c.city);
                          setSelectedCorridor(c.name);
                          if (c.city !== "Nearby") {
                            setDestination(c.name);
                          }
                          setNearbyOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors font-semibold flex items-center justify-between gap-2 cursor-pointer ${
                          isRowSelected
                            ? "bg-emerald-50/80 text-[#00834F]"
                            : "text-gray-700 hover:bg-emerald-50 hover:text-[#00834F]"
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {isRowSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00B86B] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-8 bg-gray-200" />

            {/* Field 3: Date Selection (Mon, 23 Nov – Tue, 24 Nov) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setDatePickerOpen(!datePickerOpen);
                  setNearbyOpen(false);
                  setGuestPickerOpen(false);
                  setDestFocused(false);
                }}
                className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-700">
                    {checkInDate} – {checkOutDate}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {datePickerOpen && (
                <div className="absolute top-full left-0 mt-3 w-76 bg-white rounded-xl shadow-2xl border border-gray-100 p-3.5 z-50 space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="font-bold text-gray-800">Stay Type</span>
                    <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setStayType("MONTHLY")}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          stayType === "MONTHLY"
                            ? "bg-white text-emerald-800 shadow-xs"
                            : "text-gray-500"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setStayType("DAILY")}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          stayType === "DAILY"
                            ? "bg-white text-emerald-800 shadow-xs"
                            : "text-gray-500"
                        }`}
                      >
                        Daily
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Check-In</label>
                      <input
                        type="date"
                        defaultValue="2026-11-23"
                        onChange={(e) => {
                          if (e.target.value) {
                            const d = new Date(e.target.value);
                            setCheckInDate(
                              d.toLocaleDateString("en-US", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })
                            );
                          }
                        }}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Check-Out</label>
                      <input
                        type="date"
                        defaultValue="2026-11-24"
                        onChange={(e) => {
                          if (e.target.value) {
                            const d = new Date(e.target.value);
                            setCheckOutDate(
                              d.toLocaleDateString("en-US", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })
                            );
                          }
                        }}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 mt-1"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(false)}
                    className="w-full py-2 bg-[#00B86B] hover:bg-[#00A35E] text-white font-bold rounded-lg text-xs"
                  >
                    Apply Dates
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-8 bg-gray-200" />

            {/* Field 4: Room & Guest Selector ("1 Room, 1 Guest") */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setGuestPickerOpen(!guestPickerOpen);
                  setNearbyOpen(false);
                  setDatePickerOpen(false);
                  setDestFocused(false);
                }}
                className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-700">
                    {roomsCount} Room, {guestsCount} Guest{guestsCount > 1 ? "s" : ""}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {guestPickerOpen && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-3.5 z-50 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800">Rooms</div>
                      <div className="text-[10px] text-gray-400">Total rooms needed</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRoomsCount(Math.max(1, roomsCount - 1))}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm w-4 text-center">{roomsCount}</span>
                      <button
                        type="button"
                        onClick={() => setRoomsCount(Math.min(5, roomsCount + 1))}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-2.5">
                    <div>
                      <div className="font-bold text-gray-800">Guests</div>
                      <div className="text-[10px] text-gray-400">Adults & students</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGuestsCount(Math.max(1, guestsCount - 1))}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm w-4 text-center">{guestsCount}</span>
                      <button
                        type="button"
                        onClick={() => setGuestsCount(Math.min(10, guestsCount + 1))}
                        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setGuestPickerOpen(false)}
                    className="w-full py-2 bg-[#00B86B] hover:bg-[#00A35E] text-white font-bold rounded-lg text-xs"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Field 5: Large Bright Green Search Action Button with ArrowFill Animation */}
            <ArrowFillButton
              as="button"
              type="submit"
              btnText="Search"
              leftIcon={<Search className="w-4 h-4 stroke-[2.5]" />}
              variant="emerald"
              size="lg"
              bgColor="#00B86B"
              textColor="#ffffff"
              fillBgColor="#ffffff"
              fillTextColor="#00834F"
              hoverFillBgColor="#ffffff"
              hoverFillTextColor="#00834F"
              arrowColor="#00834F"
              hoverArrowColor="#00834F"
              className="text-sm font-bold shadow-md border-[#00B86B] shrink-0"
            />
          </form>
        </div>

        {/* ======================================================== */}
        {/* 6. TRUST INDICATORS & STATISTICS ROW                     */}
        {/* ======================================================== */}
        <div className="mt-8 flex flex-wrap items-center justify-start gap-4 sm:gap-6 text-[13px] font-bold text-white/95 drop-shadow-md">
          {/* Happy Tenants */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00B86B]" strokeWidth={2.2} />
            <span>75k+ Happy Tenants</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* Cities */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00B86B]" strokeWidth={2.2} />
            <span>35+ Cities</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* Properties Listed */}
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-[#00B86B]" strokeWidth={2.2} />
            <span>1000+ Properties Listed</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* App Rating */}
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#00B86B] fill-[#00B86B]" strokeWidth={1.5} />
            <span>4.8★ App Rating</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* Since 2019 */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#00B86B]" strokeWidth={2.2} />
            <span>Since 2019</span>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 7. ORGANIC WHITE BOTTOM WAVE (TRANSITION TO REST OF PAGE)*/}
      {/* ======================================================== */}
      <div className="relative z-10 w-full overflow-hidden leading-none -mb-px pointer-events-none">
        <svg
          viewBox="0 0 1440 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-12 sm:h-16 lg:h-22 text-white preserve-3d"
          preserveAspectRatio="none"
        >
          {/* Exact Organic Curve: High on left, dips in center, slight rise on right */}
          <path
            d="M0 25 C 240 25, 480 65, 800 80 C 1100 95, 1320 60, 1440 45 L 1440 90 L 0 90 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {/* ======================================================== */}
      {/* 8. FLOATING CUSTOMER SUPPORT CHAT BUTTON (BOTTOM-RIGHT)   */}
      {/* ======================================================== */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link
          href="/dashboard/support"
          aria-label="Customer Support Live Chat"
          className="w-14 h-14 rounded-full bg-[#00B86B] hover:bg-[#00A35E] active:scale-95 shadow-2xl flex items-center justify-center text-white transition-all cursor-pointer group hover:shadow-[0_8px_25px_rgba(0,184,107,0.45)]"
        >
          {/* Chat bubble icon with two conversation dots */}
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
            <path d="M12 2C6.477 2 2 6.141 2 11.25c0 2.87 1.42 5.438 3.652 7.106-.178.966-.677 2.658-1.573 3.626 1.957-.22 3.69-1.026 4.773-1.802.997.288 2.052.445 3.148.445 5.523 0 10-4.141 10-9.25S17.523 2 12 2zm-3 10a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
