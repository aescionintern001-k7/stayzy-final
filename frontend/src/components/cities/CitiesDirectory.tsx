"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  MapPin,
  Building2,
  Globe,
  CheckCircle2,
  ChevronRight,
  Filter,
  Sparkles,
  ArrowRight,
  X,
  Compass,
} from "lucide-react";
import { StayzyLogo } from "@/components/common/StayzyLogo";

interface CityItem {
  id: string;
  name: string;
  slug: string;
  firstLetter: string;
  country: { id: string; code: string; name: string };
  region: { id: string; name: string; code: string | null } | null;
  propertyCount: number;
  isPopular: boolean;
}

interface CountrySummary {
  id: string;
  code: string;
  name: string;
  cityCount: number;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function CitiesDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query params or defaults
  const initialLetter = searchParams.get("letter")?.toUpperCase() || "A";
  const initialSearch = searchParams.get("search") || "";
  const initialCountry = searchParams.get("country") || "ALL";

  const [activeLetter, setActiveLetter] = useState<string>(initialLetter);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry);
  const [hasPropertiesOnly, setHasPropertiesOnly] = useState<boolean>(false);
  const [popularOnly, setPopularOnly] = useState<boolean>(false);

  const [cities, setCities] = useState<CityItem[]>([]);
  const [letterCounts, setLetterCounts] = useState<Record<string, number>>({});
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch cities from API
  useEffect(() => {
    async function loadCities() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (activeLetter && activeLetter !== "ALL") {
          query.set("letter", activeLetter);
        }
        if (searchQuery.trim()) {
          query.set("search", searchQuery.trim());
        }
        if (selectedCountry && selectedCountry !== "ALL") {
          query.set("country", selectedCountry);
        }
        if (popularOnly) {
          query.set("popular", "true");
        }
        if (hasPropertiesOnly) {
          query.set("hasProperties", "true");
        }

        const res = await fetch(`/api/cities?${query.toString()}`);
        const data = await res.json();
        if (data.success) {
          setCities(data.cities || []);
          setLetterCounts(data.letterCounts || {});
          setCountries(data.countries || []);
        }
      } catch (err) {
        console.error("Failed to load cities:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCities();
  }, [activeLetter, searchQuery, selectedCountry, popularOnly, hasPropertiesOnly]);

  // Handle letter select
  const handleLetterClick = (letter: string) => {
    setActiveLetter(letter);
    const params = new URLSearchParams(searchParams.toString());
    params.set("letter", letter);
    router.replace(`/cities?${params.toString()}`, { scroll: false });
  };

  // Handle country filter
  const handleCountryClick = (code: string) => {
    setSelectedCountry(code);
    const params = new URLSearchParams(searchParams.toString());
    if (code === "ALL") {
      params.delete("country");
    } else {
      params.set("country", code);
    }
    router.replace(`/cities?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="w-full min-h-screen bg-[#FDFDFD] text-[#111827]">
      {/* 1. HERO / SEARCH HEADER SECTION */}
      <section className="bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white pt-10 pb-12 px-4 sm:px-6 lg:px-8 border-b border-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb & Subtitle */}
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-3">
            <Link href="/" className="hover:underline text-gray-300">
              Home
            </Link>
            <span>/</span>
            <span className="text-emerald-400">All Cities Directory</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                Worldwide <span className="text-[#00B86B]">City Directory</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-gray-300 max-w-2xl leading-relaxed">
                Browse our complete index of 300+ co-living destinations, tech corridors, and student hubs across India and worldwide.
              </p>
            </div>

            {/* Top Quick Stats Pill */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
              <Building2 className="w-5 h-5 text-[#00B86B]" />
              <div className="text-left">
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  Global Coverage
                </div>
                <div className="text-xs text-emerald-400 font-semibold">
                  28+ Countries • A-Z Indexed
                </div>
              </div>
            </div>
          </div>

          {/* Search Input Bar (OYO-Style Top Bar) */}
          <div className="relative max-w-3xl">
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden p-1.5 focus-within:ring-2 focus-within:ring-[#00B86B] transition-all">
              <div className="pl-4 pr-2 text-gray-400">
                <Search className="w-5 h-5 text-gray-500" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by city, state, or country name (e.g. Mumbai, Austin, London)..."
                className="w-full py-3 pr-4 text-sm font-medium text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (activeLetter !== "ALL") setActiveLetter("ALL");
                }}
                className="px-5 py-3 rounded-xl bg-[#00B86B] hover:bg-[#00A35E] text-white text-xs font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer"
              >
                Find Cities
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ALPHABETICAL DIRECTORY BAR (Sticky cleanly below global Navbar) */}
      <nav
        aria-label="Alphabetical city navigation"
        className="sticky top-[65px] lg:top-[109px] z-30 bg-white border-b border-gray-200 shadow-xs"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between overflow-x-auto scrollbar-none py-2 gap-1 sm:gap-2">
            {/* "All" button */}
            <button
              type="button"
              onClick={() => handleLetterClick("ALL")}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeLetter === "ALL"
                  ? "bg-[#00B86B] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              All Letters
            </button>

            {/* A to Z Letters */}
            {ALPHABET.map((letter) => {
              const count = letterCounts[letter] || 0;
              const isSelected = activeLetter === letter;
              const hasCities = count > 0;

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasCities && !searchQuery}
                  onClick={() => handleLetterClick(letter)}
                  className={`relative flex items-center justify-center min-w-[34px] sm:min-w-[40px] h-10 px-1 rounded-lg text-sm font-black transition-all cursor-pointer select-none ${
                    isSelected
                      ? "text-[#00B86B] bg-emerald-50 font-black shadow-xs"
                      : hasCities
                      ? "text-gray-700 hover:text-[#00B86B] hover:bg-gray-50"
                      : "text-gray-300 cursor-not-allowed hover:bg-transparent"
                  }`}
                  title={`${letter}: ${count} cities`}
                >
                  <span>{letter}</span>
                  {/* Subtle active underline */}
                  {isSelected && (
                    <span className="absolute bottom-1 inset-x-2 h-0.5 bg-[#00B86B] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 3. FILTER PILLS & CRITERIA BAR */}
      <section className="bg-gray-50/80 border-b border-gray-200 py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Country Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2 hidden sm:inline">
              Country:
            </span>
            <button
              type="button"
              onClick={() => handleCountryClick("ALL")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedCountry === "ALL"
                  ? "bg-[#111827] text-white font-bold shadow-xs"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
              }`}
            >
              All Countries
            </button>
            {countries.slice(0, 8).map((cn) => (
              <button
                key={cn.code}
                type="button"
                onClick={() => handleCountryClick(cn.code)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  selectedCountry === cn.code
                    ? "bg-[#00B86B] text-white font-bold shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                }`}
              >
                <span>{cn.name}</span>
                <span className="text-[10px] opacity-80">({cn.cityCount})</span>
              </button>
            ))}
          </div>

          {/* Quick Toggles */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHasPropertiesOnly(!hasPropertiesOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                hasPropertiesOnly
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>With Active Stays</span>
            </button>

            <button
              type="button"
              onClick={() => setPopularOnly(!popularOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                popularOnly
                  ? "bg-[#111827] text-white font-bold"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Top Hubs</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. MAIN CONTENT: CITIES GRID & COUNT HEADER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header matching OYO format: "Cities from A (34)" */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-gray-200 pb-5 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              {searchQuery ? (
                <span>
                  Search results for &ldquo;<span className="text-[#00B86B]">{searchQuery}</span>&rdquo;
                </span>
              ) : activeLetter === "ALL" ? (
                <span>All Worldwide Cities</span>
              ) : (
                <span>
                  Cities from <span className="text-[#00B86B]">{activeLetter}</span>
                </span>
              )}
              <span className="ml-3 text-lg sm:text-xl font-bold text-gray-500">
                ({cities.length})
              </span>
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Select a city to view available verified PGs, hostels, flats, and private studio accommodations.
            </p>
          </div>

          {/* Quick link to all stays */}
          <Link
            href="/rooms"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00B86B] hover:text-[#00A35E] hover:underline"
          >
            <span>Explore All Room Listings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* LOADING SKELETON */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 rounded-xl border border-gray-200/60 p-4"
              />
            ))}
          </div>
        )}

        {/* 4-COLUMN RESPONSIVE CITY GRID (EXACT OYO SCREENSHOT ALIGNMENT) */}
        {!loading && cities.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3.5">
            {cities.map((city) => {
              const hasStays = city.propertyCount > 0;
              return (
                <Link
                  key={city.id}
                  href={`/rooms?city=${encodeURIComponent(city.name)}`}
                  className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-150 ${
                    hasStays
                      ? "bg-white border-emerald-200 hover:border-[#00B86B] hover:shadow-md hover:bg-emerald-50/30"
                      : "bg-white border-gray-200 hover:border-gray-400 hover:shadow-xs"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-[#00B86B] transition-colors truncate">
                        {city.name}
                      </span>
                      {city.isPopular && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00B86B] shrink-0" title="Popular destination" />
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                      {city.region?.name ? `${city.region.name}, ` : ""}
                      {city.country.name}
                    </div>
                  </div>

                  {/* Property Count Badge or Subtle Arrow */}
                  {hasStays ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide flex items-center gap-1 border border-emerald-200">
                      <span>{city.propertyCount}</span>
                      <span>Stays</span>
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#00B86B] group-hover:translate-x-0.5 transition-all shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && cities.length === 0 && (
          <div className="text-center py-20 px-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400 mb-4">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              No cities found for this filter
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              We couldn't find any indexed cities starting with &ldquo;{activeLetter}&rdquo; matching your selected criteria.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveLetter("A");
                  setSearchQuery("");
                  setSelectedCountry("ALL");
                  setHasPropertiesOnly(false);
                  setPopularOnly(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#00B86B] hover:bg-[#00A35E] text-white text-xs font-bold transition-all shadow-xs"
              >
                Reset All Filters
              </button>
              <Link
                href="/rooms"
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all"
              >
                Browse All Stays
              </Link>
            </div>
          </div>
        )}

        {/* BOTTOM WORLDWIDE ASSURANCE BANNER */}
        <div className="mt-16 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-gray-900 via-[#1E293B] to-gray-900 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-base sm:text-lg font-extrabold text-white">
              Don't see your target city or neighborhood?
            </h4>
            <p className="text-xs sm:text-sm text-gray-300">
              We are constantly onboarding verified PG accommodations and serviced apartments in new cities weekly.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/owner/properties/new"
              className="px-5 py-2.5 rounded-xl bg-[#00B86B] hover:bg-[#00A35E] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md"
            >
              List a Property
            </Link>
            <Link
              href="/contact"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20"
            >
              Request a Location
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

