"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  ChevronDown,
  Star,
  Shield,
  Headphones,
  Award,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Monitor,
  CheckCircle2,
  Sliders,
  Sparkles,
} from "lucide-react";

export function Hero() {
  const router = useRouter();

  // Search form states
  const [destination, setDestination] = useState("");
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);
  const [stayType, setStayType] = useState<"MONTHLY" | "DAILY">("MONTHLY");

  // Selection states
  const [selectedCity, setSelectedCity] = useState("Nearby");
  const [checkInDate, setCheckInDate] = useState("Mon, 23 Nov");
  const [checkOutDate, setCheckOutDate] = useState("Tue, 24 Nov");
  const [roomsCount, setRoomsCount] = useState(1);
  const [guestsCount, setGuestsCount] = useState(1);

  // Video performance & playback controls
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeQuality, setActiveQuality] = useState<"4K" | "1080p" | "MOBILE">("1080p");
  const [fps, setFps] = useState(60);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showPerfBadge, setShowPerfBadge] = useState(false);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setReducedMotion(e.matches);
        if (e.matches && videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  // Performance FPS counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const measureFps = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.min(60, Math.round((frameCount * 1000) / (now - lastTime))));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(measureFps);
    };

    animId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Handle Mute / Unmute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Change Video Quality Dynamically
  const changeQuality = (q: "4K" | "1080p" | "MOBILE") => {
    setActiveQuality(q);
    if (!videoRef.current) return;
    const currentTime = videoRef.current.currentTime;
    let newSrc = "/videos/hero-cinematic-1080p.mp4";
    if (q === "4K") newSrc = "/videos/hero-cinematic-4k.mp4";
    if (q === "MOBILE") newSrc = "/videos/hero-cinematic-mobile.mp4";

    videoRef.current.src = newSrc;
    videoRef.current.currentTime = currentTime;
    videoRef.current.play().catch(() => {});
  };

  // Execute Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.set("locality", destination.trim());
    if (selectedCity !== "Nearby") params.set("city", selectedCity);
    params.set("durationType", stayType);
    params.set("guests", guestsCount.toString());
    params.set("rooms", roomsCount.toString());
    router.push(`/rooms?${params.toString()}`);
  };

  return (
    <div className="relative w-full min-h-[640px] lg:min-h-[740px] flex flex-col justify-between overflow-hidden bg-[#0c1612] text-white">
      {/* ======================================================== */}
      {/* 1. CINEMATIC BACKGROUND VIDEO LAYER (HARDWARE-ACCELERATED) */}
      {/* ======================================================== */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0"
        style={{
          transform: "translate3d(0, 0, 0)",
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}
      >
        {!reducedMotion ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            preload="auto"
            poster="/videos/hero-poster-4k.webp"
            className="w-full h-full object-cover object-center scale-[1.01]"
            style={{
              filter: "contrast(1.02) saturate(1.05)",
            }}
          >
            {/* 4K Source for ultra-high-resolution displays */}
            <source
              src="/videos/hero-cinematic-4k.mp4"
              type="video/mp4"
              media="(min-width: 1920px)"
            />
            {/* High efficiency WebM VP9 source */}
            <source
              src="/videos/hero-cinematic-1080p.webm"
              type="video/webm"
            />
            {/* Universal H.264 1080p 60fps source */}
            <source
              src="/videos/hero-cinematic-1080p.mp4"
              type="video/mp4"
            />
            {/* Fallback image */}
            <img
              src="/videos/hero-poster-4k.jpg"
              alt="Stayzy Luxury Penthouse Living Room"
              className="w-full h-full object-cover"
            />
          </video>
        ) : (
          <img
            src="/videos/hero-poster-4k.webp"
            alt="Stayzy Luxury Living Room (Reduced Motion)"
            className="w-full h-full object-cover object-center"
          />
        )}

        {/* Cinematic Vignette & Text Contrast Gradients */}
        {/* Left-side shadow for headline legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent pointer-events-none" />
        {/* Top bar shadow for navigation legibility */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/75 via-black/35 to-transparent pointer-events-none" />
        {/* Bottom curve ambient integration */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>

      {/* ======================================================== */}
      {/* 2. TOP UTILITY HEADER & NAVIGATION (INTEGRATED ON HERO)   */}
      {/* ======================================================== */}
      <header className="relative z-20 w-full pt-3 sm:pt-4 px-4 sm:px-6 lg:px-10 max-w-[1440px] mx-auto">
        {/* Row 1: Logo & Utility Items */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/10">
          {/* Stayzy Brand Logo */}
          <div
            onClick={() => router.push("/")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center p-1 backdrop-blur-xs">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-400 fill-current">
                <path d="M12 3L3 10v11h6v-6h6v6h6V10L12 3z" />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tight text-white drop-shadow-md">
              Stayzy
            </span>
          </div>

          {/* Top Trust Badges */}
          <div className="hidden lg:flex items-center gap-8 text-xs font-semibold">
            {/* Verified Rooms */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="leading-tight">
                <div className="font-bold text-white">Verified Rooms</div>
                <div className="text-[10px] text-white/70">100% Verified Listings</div>
              </div>
            </div>

            {/* Best Prices */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                <Award className="w-3.5 h-3.5" />
              </div>
              <div className="leading-tight">
                <div className="font-bold text-white">Best Prices</div>
                <div className="text-[10px] text-white/70">Save More, Live Better</div>
              </div>
            </div>

            {/* 24/7 Support */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <div className="leading-tight">
                <div className="font-bold text-white">24/7 Support</div>
                <div className="text-[10px] text-white/70">We're Always Here</div>
              </div>
            </div>
          </div>

          {/* User Account & List Property Button */}
          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              onClick={() => router.push("/login")}
              className="hidden sm:inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-colors cursor-pointer py-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Login / Signup</span>
            </button>

            <span className="hidden sm:inline-block text-white/30">|</span>

            <button
              onClick={() => router.push("/owner/properties/new")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer border border-emerald-400/30"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span>List Your Property</span>
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Navigation Bar */}
        <nav className="flex items-center justify-between text-xs font-bold py-2.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-5 sm:gap-7 whitespace-nowrap">
            {/* Home - Active item with green underline */}
            <div className="relative py-1 text-white cursor-pointer group">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-400 fill-current">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                <span>Home</span>
              </span>
              <div className="absolute -bottom-1 inset-x-0 h-0.5 bg-emerald-400 rounded-full" />
            </div>

            {/* Menu Items with Chevron */}
            {[
              { label: "PG & Rooms", path: "/rooms" },
              { label: "Hostels", path: "/rooms?category=HOSTEL" },
              { label: "Flats", path: "/rooms?category=FLAT" },
              { label: "Shared Spaces", path: "/rooms?category=SHARED" },
              { label: "Services", path: "/amenities" },
              { label: "More", path: "/about" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.path)}
                className="flex items-center gap-1 text-white/80 hover:text-white transition-colors cursor-pointer py-1"
              >
                <span>{item.label}</span>
                <ChevronDown className="w-3 h-3 text-white/60" />
              </button>
            ))}
          </div>

          {/* All Cities Selector */}
          <button
            onClick={() => router.push("/rooms")}
            className="hidden md:flex items-center gap-1.5 text-white/90 hover:text-white py-1 cursor-pointer whitespace-nowrap ml-4"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>All Cities</span>
            <ChevronDown className="w-3 h-3 text-white/60" />
          </button>
        </nav>
      </header>

      {/* ======================================================== */}
      {/* 3. HERO CENTER CONTENT: HEADLINE, DESCRIPTION & SEARCH   */}
      {/* ======================================================== */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-12 my-auto">
        <div className="max-w-3xl space-y-4 sm:space-y-6">
          {/* Main Headline (Ultra-sharp, high contrast, zero blur) */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] drop-shadow-lg">
            Smart, Comfortable <br />
            Living. <br />
            <span className="text-emerald-400 drop-shadow-[0_2px_12px_rgba(16,185,129,0.35)]">
              Tailored For You.
            </span>
          </h1>

          {/* Subtitle Description */}
          <p className="text-sm sm:text-base lg:text-lg text-white/90 font-medium max-w-2xl leading-relaxed drop-shadow-md">
            Explore thousands of verified private rooms and shared spaces with chef-prepared meals,
            300 Mbps Wi-Fi, and zero brokerage across top tech hubs.
          </p>
        </div>

        {/* ======================================================== */}
        {/* 4. FLOATING SEARCH HUB CARD (FULLY CLICKABLE & ACCESSIBLE) */}
        {/* ======================================================== */}
        <div className="mt-8 lg:mt-10 max-w-5xl">
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white rounded-2xl md:rounded-full p-2 sm:p-2.5 shadow-2xl border border-white/50 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center gap-2 text-gray-800 transition-all focus-within:ring-2 focus-within:ring-emerald-500/50"
          >
            {/* Field 1: Destination / Where to? */}
            <div className="flex-1 flex items-center gap-2.5 px-3 py-2 md:py-1">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <div className="w-full">
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Where to?"
                  className="w-full text-xs sm:text-sm font-bold text-gray-900 placeholder:text-gray-500 focus:outline-hidden bg-transparent"
                />
              </div>
            </div>

            <div className="hidden md:block w-px h-8 bg-gray-200" />

            {/* Field 2: Nearby / Locality Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNearbyOpen(!nearbyOpen);
                  setDatePickerOpen(false);
                  setGuestPickerOpen(false);
                }}
                className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 px-3 py-2 rounded-xl md:rounded-full text-xs font-bold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{selectedCity}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
              </button>

              {nearbyOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-30 space-y-1 text-xs">
                  <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase">
                    Popular Corridors
                  </div>
                  {["Nearby (Current Loc)", "Koramangala, BLR", "HSR Layout, BLR", "OMR, Chennai", "Whitefield, BLR", "Gachibowli, HYD"].map(
                    (loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          setSelectedCity(loc.replace(" (Current Loc)", ""));
                          setNearbyOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-gray-700 font-semibold flex items-center justify-between cursor-pointer"
                      >
                        <span>{loc}</span>
                        {selectedCity === loc.replace(" (Current Loc)", "") && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="hidden md:block w-px h-8 bg-gray-200" />

            {/* Field 3: Date Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setDatePickerOpen(!datePickerOpen);
                  setNearbyOpen(false);
                  setGuestPickerOpen(false);
                }}
                className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-gray-500" />
                  <span>
                    {checkInDate} – {checkOutDate}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {datePickerOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-30 space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                    <span className="font-bold text-gray-800">Select Stay Duration</span>
                    <div className="flex gap-1 bg-gray-100 p-0.5 rounded-md text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setStayType("MONTHLY")}
                        className={`px-2 py-0.5 rounded ${stayType === "MONTHLY" ? "bg-white text-emerald-700 shadow-2xs" : "text-gray-500"}`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setStayType("DAILY")}
                        className={`px-2 py-0.5 rounded ${stayType === "DAILY" ? "bg-white text-emerald-700 shadow-2xs" : "text-gray-500"}`}
                      >
                        Daily
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400">CHECK-IN</label>
                      <input
                        type="date"
                        defaultValue="2026-11-23"
                        onChange={(e) => {
                          const d = new Date(e.target.value);
                          setCheckInDate(d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }));
                        }}
                        className="w-full p-1.5 border border-gray-200 rounded-md text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400">CHECK-OUT</label>
                      <input
                        type="date"
                        defaultValue="2026-11-24"
                        onChange={(e) => {
                          const d = new Date(e.target.value);
                          setCheckOutDate(d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }));
                        }}
                        className="w-full p-1.5 border border-gray-200 rounded-md text-xs font-semibold"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(false)}
                    className="w-full py-1.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
                  >
                    Confirm Dates
                  </button>
                </div>
              )}
            </div>

            <div className="hidden md:block w-px h-8 bg-gray-200" />

            {/* Field 4: Guests & Rooms */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setGuestPickerOpen(!guestPickerOpen);
                  setNearbyOpen(false);
                  setDatePickerOpen(false);
                }}
                className="w-full md:w-auto flex items-center justify-between md:justify-start gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  <span>
                    {roomsCount} Room, {guestsCount} Guest{guestsCount > 1 ? "s" : ""}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {guestPickerOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-30 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800">Rooms</div>
                      <div className="text-[10px] text-gray-400">Number of rooms</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRoomsCount(Math.max(1, roomsCount - 1))}
                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm w-4 text-center">{roomsCount}</span>
                      <button
                        type="button"
                        onClick={() => setRoomsCount(roomsCount + 1)}
                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <div>
                      <div className="font-bold text-gray-800">Guests</div>
                      <div className="text-[10px] text-gray-400">Adults & students</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGuestsCount(Math.max(1, guestsCount - 1))}
                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm w-4 text-center">{guestsCount}</span>
                      <button
                        type="button"
                        onClick={() => setGuestsCount(guestsCount + 1)}
                        className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGuestPickerOpen(false)}
                    className="w-full py-1.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Field 5: Emerald Search Action Button */}
            <button
              type="submit"
              className="px-8 py-3 rounded-xl md:rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs sm:text-sm font-black transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4 stroke-[2.5]" />
              <span>Search</span>
            </button>
          </form>
        </div>

        {/* ======================================================== */}
        {/* 5. TRUST INDICATORS STRIP (MATCHING SCREENSHOT)          */}
        {/* ======================================================== */}
        <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-bold text-white/90 drop-shadow-md">
          {/* Happy Tenants */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>75k+ Happy Tenants</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* Cities */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>35+ Cities</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* Properties Listed */}
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-emerald-400" />
            <span>1000+ Properties Listed</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* App Rating */}
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <span>4.8★ App Rating</span>
          </div>

          <span className="text-white/30 hidden sm:inline">|</span>

          {/* Since 2019 */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
            <span>Since 2019</span>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 6. CINEMATIC VIDEO CONTROLS & 60 FPS PERFORMANCE BADGE   */}
      {/* ======================================================== */}
      <div className="absolute top-24 right-4 sm:right-8 z-20 flex items-center gap-2">
        {/* Quality Selector Pills */}
        <div className="hidden sm:flex items-center bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/15 text-[10px] font-bold">
          {(["1080p", "4K", "MOBILE"] as const).map((q) => (
            <button
              key={q}
              onClick={() => changeQuality(q)}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                activeQuality === q
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Video Play / Pause Toggle */}
        <button
          onClick={togglePlay}
          title={isPlaying ? "Pause Video" : "Play Video"}
          className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {/* Audio Mute / Unmute Toggle */}
        <button
          onClick={toggleMute}
          title={isMuted ? "Unmute Ambient Sound" : "Mute Sound"}
          className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>

        {/* 60 FPS Performance Indicator */}
        <div
          onClick={() => setShowPerfBadge(!showPerfBadge)}
          title="Hardware Accelerated Playback"
          className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/40 text-[10px] font-black text-emerald-400 cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{fps} FPS ULTRA HD</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 7. ORGANIC WHITE BOTTOM WAVE (TRANSITION TO REST OF PAGE)*/}
      {/* ======================================================== */}
      <div className="relative z-10 w-full overflow-hidden leading-none">
        <svg
          viewBox="0 0 1440 88"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-10 sm:h-14 lg:h-20 text-white preserve-3d"
          preserveAspectRatio="none"
        >
          <path
            d="M0 40C240 85 480 88 720 60C960 32 1200 15 1440 35V88H0V40Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    </div>
  );
}
