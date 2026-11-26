"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Home,
  CalendarDays,
  Users,
  PlaySquare,
  MapPin,
  Clock,
  UserRound,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  ArrowRight,
  Search,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";

export interface PropertyOption {
  id: string;
  name: string;
  slug: string;
  city: string;
  address?: string;
}

const FALLBACK_STAYZY_PROPERTIES: PropertyOption[] = [
  {
    id: "cmwthfa6g0002u8nopeijqaz6",
    name: "Stayzy Haven — Koramangala",
    slug: "stayzy-haven-koramangala",
    city: "Bengaluru",
    address: "4th Block, 80 Feet Road, Koramangala",
  },
  {
    id: "cmwthfa6j0003u8no9xtzjba7",
    name: "Stayzy Heights — HSR Layout",
    slug: "stayzy-heights-hsr-layout",
    city: "Bengaluru",
    address: "17th Cross, Sector 2, HSR Layout",
  },
  {
    id: "cmwthfa6m0004u8no08wmrbyu",
    name: "Stayzy Urban — Indiranagar",
    slug: "stayzy-urban-indiranagar",
    city: "Bengaluru",
    address: "12th Main Road, HAL 2nd Stage, Indiranagar",
  },
  {
    id: "cmwtizdrg0001u8xwsl45b53d",
    name: "Stayzy Seaside — Bandra West",
    slug: "stayzy-seaside-bandra-west",
    city: "Mumbai",
    address: "Pali Hill Road, Bandra West",
  },
  {
    id: "cmwtj0eq0000pu8l8tplpylx9",
    name: "Stayzy Skyline — Cyber City Gurugram",
    slug: "stayzy-skyline-cyber-city-gurugram",
    city: "Gurugram",
    address: "Tower 5, DLF Phase 2, Cyber City",
  },
  {
    id: "cmwtj0era001nu8l82holg4k5",
    name: "Stayzy Tech Oasis — Hitec City",
    slug: "stayzy-tech-oasis-hitec-city",
    city: "Hyderabad",
    address: "Vittal Rao Nagar, Madhapur, Hitec City",
  },
  {
    id: "cmwtj0esl002nu8l8cmsm2aac",
    name: "Stayzy Botanica — Koregaon Park",
    slug: "stayzy-botanica-koregaon-park",
    city: "Pune",
    address: "Lane 6, Koregaon Park",
  },
  {
    id: "cmwtj0eud003lu8l801iuvsvh",
    name: "Stayzy Marina — OMR IT Corridor",
    slug: "stayzy-marina-omr-it-corridor",
    city: "Chennai",
    address: "Rajiv Gandhi Salai (OMR), Sholinganallur",
  },
];

const VISIT_TIME_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
];

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function validateIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const tenDigits = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(tenDigits)) return null;
  return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`;
}

/**
 * Luxury Stayzy "Schedule a Visit" walkthrough section featuring dark emerald-green
 * hero panel, bedroom photography overlay, searchable property dropdown, validated
 * booking form fields, and live API submission.
 */
export function ScheduleVisitSection() {
  const [properties, setProperties] = useState<PropertyOption[]>(FALLBACK_STAYZY_PROPERTIES);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const [preferredDate, setPreferredDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedDetails, setConfirmedDetails] = useState<{
    locationName: string;
    dateLabel: string;
    timeSlot: string;
    name: string;
    phone: string;
  } | null>(null);

  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const todayIso = useMemo(() => getTodayIso(), []);

  useEffect(() => {
    let active = true;
    fetch("/api/properties")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.success && Array.isArray(data.properties) && data.properties.length > 0) {
          setProperties(data.properties);
        }
      })
      .catch(() => {
        // Fallback seeded list already loaded
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLocationDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const filteredProperties = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (p.address && p.address.toLowerCase().includes(q))
    );
  }, [properties, locationSearch]);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId || p.slug === selectedPropertyId),
    [properties, selectedPropertyId]
  );

  const handlePhoneFocus = () => {
    if (!customerPhone.trim()) {
      setCustomerPhone("+91 ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!selectedProperty) {
      setError("Please select a Stayzy location for your property walkthrough.");
      return;
    }
    if (!preferredDate) {
      setError("Please select your preferred visit date.");
      return;
    }
    if (preferredDate < todayIso) {
      setError("Please choose today or a future date for your walkthrough.");
      return;
    }
    if (!timeSlot) {
      setError("Please select an available walkthrough time slot between 10 AM and 7 PM.");
      return;
    }

    const cleanName = customerName.trim();
    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    const validPhone = validateIndianPhone(customerPhone);
    if (!validPhone) {
      setError("Please enter a valid 10-digit Indian mobile number (e.g. +91 98765 43210).");
      return;
    }

    const cleanEmail = customerEmail.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address or leave it blank.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/visits/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedProperty.id,
          customerName: cleanName,
          customerPhone: validPhone,
          customerEmail: cleanEmail,
          preferredDate,
          timeSlot,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Unable to schedule walkthrough right now. Please try again.");
      }

      const formattedDate = new Date(preferredDate + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      setConfirmedDetails({
        locationName: selectedProperty.name,
        dateLabel: formattedDate,
        timeSlot,
        name: cleanName,
        phone: validPhone,
      });
    } catch (err: any) {
      setError(err.message || "Failed to connect to the booking service.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="schedule-visit"
      aria-labelledby="schedule-visit-heading"
      className="bg-[#FAF7F0] py-16 sm:py-20 lg:py-24"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Luxury Deep Forest-Green Rounded Master Container */}
        <div className="relative overflow-hidden rounded-[26px] lg:rounded-[38px] bg-[#063B2B] shadow-[0_28px_72px_rgba(6,59,43,0.24)] border border-[#004B36]/45">
          {/* Bedroom Photography Backdrop with Deep Forest-Green Hospitality Gradient Overlay */}
          <img
            src="/images/stayzy-schedule-visit-bg.webp"
            alt="Luxury Stayzy suite interior available for walkthrough tours"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-right opacity-70 pointer-events-none select-none"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(102deg, rgba(6,59,43,0.96) 0%, rgba(0,75,54,0.91) 46%, rgba(6,59,43,0.72) 74%, rgba(6,59,43,0.48) 100%)",
            }}
          />

          {/* Subtle Champagne Gold Architectural Corner Wave Accent */}
          <svg
            aria-hidden="true"
            viewBox="0 0 340 28"
            fill="none"
            className="pointer-events-none hidden lg:block absolute bottom-0 left-0 w-[340px] h-[28px] opacity-90"
          >
            <path
              d="M0 28C82 8 205 11 340 28H0Z"
              fill="#DFC07C"
            />
          </svg>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 p-6 sm:p-10 lg:p-12 xl:p-14 items-center">
            {/* ============================================================ */}
            {/* LEFT COLUMN (~48%): HERO VALUE PROPOSITION & BENEFITS        */}
            {/* ============================================================ */}
            <div className="lg:col-span-6 xl:col-span-5 space-y-6 text-white">
              {/* Top Pill Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-[9999px] bg-[#F2E2BA] text-[#063B2B] text-xs sm:text-[13px] font-bold shadow-xs">
                <Home className="w-4 h-4 text-[#063B2B]" strokeWidth={2.2} />
                <span>Complimentary Property Walkthrough</span>
              </div>

              {/* 3-Line Main Heading */}
              <h2
                id="schedule-visit-heading"
                className="text-[36px] sm:text-[46px] xl:text-[54px] font-extrabold tracking-[-0.025em] leading-[1.08] text-white"
              >
                Schedule a Visit
                <br />
                <span className="text-[#E9CE94]">Before You</span>
                <br />
                Decide.
              </h2>

              {/* Decorative Gold Divider Bar */}
              <div
                aria-hidden="true"
                className="w-24 h-[4px] rounded-[9999px] bg-gradient-to-r from-[#D9AD55] to-[#E9CE94]"
              />

              {/* Description */}
              <p className="text-white/90 text-[15px] sm:text-[16px] leading-[1.65] max-w-[540px] font-normal">
                Experience the rooms, test the 300 Mbps Wi-Fi, try the chef&rsquo;s food sample,
                and meet your personal roommates. No commitment, just a first-hand look.
              </p>

              {/* Three Benefit Rows */}
              <ul className="space-y-4 pt-1">
                <li className="flex items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="w-10 h-10 rounded-[9999px] bg-[#087A50] border border-white/15 flex items-center justify-center shrink-0 shadow-xs"
                  >
                    <CalendarDays className="w-5 h-5 text-white" strokeWidth={1.9} />
                  </span>
                  <div className="text-sm sm:text-[15px] leading-snug pt-0.5">
                    <div className="font-semibold text-white">Available 7 days a week</div>
                    <div className="text-white/75 text-xs sm:text-[13.5px] mt-0.5">
                      (10 AM to 7 PM)
                    </div>
                  </div>
                </li>

                <li className="flex items-center gap-3.5">
                  <span
                    aria-hidden="true"
                    className="w-10 h-10 rounded-[9999px] bg-[#087A50] border border-white/15 flex items-center justify-center shrink-0 shadow-xs"
                  >
                    <Users className="w-5 h-5 text-white" strokeWidth={1.9} />
                  </span>
                  <span className="text-sm sm:text-[15px] font-medium text-white">
                    Assisted by a dedicated Community Host
                  </span>
                </li>

                <li className="flex items-center gap-3.5">
                  <span
                    aria-hidden="true"
                    className="w-10 h-10 rounded-[9999px] bg-[#087A50] border border-white/15 flex items-center justify-center shrink-0 shadow-xs"
                  >
                    <PlaySquare className="w-5 h-5 text-white" strokeWidth={1.9} />
                  </span>
                  <span className="text-sm sm:text-[15px] font-medium text-white">
                    Both in-person and guided live video tours available
                  </span>
                </li>
              </ul>
            </div>

            {/* ============================================================ */}
            {/* RIGHT COLUMN (~52%): PREMIUM WHITE BOOKING FORM PANEL        */}
            {/* ============================================================ */}
            <div className="lg:col-span-6 xl:col-span-7 bg-[#FFFFFF] text-[#123B30] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 xl:p-10 shadow-[0_24px_60px_rgba(0,0,0,0.24)] relative overflow-hidden">
            {/* Subtle Top-Right Decorative Roof Outline Symbol */}
              <svg
                aria-hidden="true"
                viewBox="0 0 96 44"
                fill="none"
                className="pointer-events-none hidden sm:block absolute top-6 right-7 w-[92px] h-[42px] opacity-45"
              >
                <path
                  d="M4 38L44 7L60 19.5V10H69V26.5L88 38"
                  stroke="#DFC79C"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {confirmedDetails ? (
                <div className="py-10 sm:py-12 text-center space-y-5 animate-in fade-in duration-200">
                  <div className="w-16 h-16 rounded-[9999px] bg-[#DCEEDF] border border-[#087A50]/25 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-9 h-9 text-[#087A50]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold text-[#123B30]">
                      Walkthrough Confirmed!
                    </h3>
                    <p className="text-sm text-[#66716F] max-w-md mx-auto leading-relaxed">
                      Thank you, <strong className="text-[#123B30]">{confirmedDetails.name}</strong>
                      . Your tour request has been registered and our Community Host will reach out
                      at <strong className="text-[#123B30]">{confirmedDetails.phone}</strong>.
                    </p>
                  </div>

                  <div className="max-w-md mx-auto rounded-[16px] bg-[#FAF7F0] border border-[#E9CE94]/60 p-4 text-left text-xs space-y-2">
                    <div className="flex justify-between gap-3">
                      <span className="text-[#66716F] font-semibold">Property:</span>
                      <span className="font-bold text-[#123B30] text-right">
                        {confirmedDetails.locationName}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-[#66716F] font-semibold">Preferred Date:</span>
                      <span className="font-bold text-[#123B30]">{confirmedDetails.dateLabel}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-[#66716F] font-semibold">Walkthrough Slot:</span>
                      <span className="font-bold text-[#087A50]">{confirmedDetails.timeSlot}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmedDetails(null);
                      setPreferredDate("");
                      setTimeSlot("");
                      setCustomerName("");
                      setCustomerPhone("");
                      setCustomerEmail("");
                      setNotes("");
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-[14px] bg-[#087A50] hover:bg-[#063B2B] text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <span>Book Another Walkthrough</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Form Header */}
                  <div className="flex items-start gap-3.5 pb-1">
                    <span
                      aria-hidden="true"
                      className="w-[4px] h-11 rounded-[9999px] bg-gradient-to-b from-[#D9AD55] to-[#C29138] shrink-0 mt-0.5"
                    />
                    <div>
                      <h3 className="text-[21px] sm:text-[24px] font-extrabold text-[#123B30] tracking-tight leading-tight">
                        Book Your Walkthrough Slot
                      </h3>
                      <p className="text-xs sm:text-[13.5px] text-[#66716F] font-medium mt-0.5">
                        Take the next step towards your Stayzy home.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="p-3.5 rounded-[12px] bg-red-50 border border-red-200 text-red-700 text-xs font-semibold"
                    >
                      {error}
                    </div>
                  )}

                  {/* Two-Column Desktop Input Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* FIELD 1: Select Location (Searchable Dropdown) */}
                    <div ref={locationDropdownRef} className="relative">
                      <label
                        htmlFor="visit-location-trigger"
                        className="block text-[13px] font-bold text-[#123B30] mb-1.5"
                      >
                        Select Location
                      </label>
                      <button
                        id="visit-location-trigger"
                        type="button"
                        onClick={() => setLocationDropdownOpen((prev) => !prev)}
                        aria-expanded={locationDropdownOpen}
                        aria-haspopup="listbox"
                        className={`w-full h-[54px] sm:h-[58px] px-3.5 rounded-[14px] border bg-[#FAFBFA] hover:border-[#087A50]/50 flex items-center justify-between gap-2 text-left transition-all cursor-pointer ${
                          locationDropdownOpen
                            ? "border-[#087A50] bg-white ring-2 ring-[#087A50]/15"
                            : "border-[#E2E6E5]"
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <MapPin className="w-[18px] h-[18px] text-[#66716F] shrink-0" />
                          <span
                            className={`text-[13.5px] truncate ${
                              selectedProperty
                                ? "text-[#123B30] font-semibold"
                                : "text-[#66716F] font-medium"
                            }`}
                          >
                            {selectedProperty ? selectedProperty.name : "Choose Location"}
                          </span>
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#123B30] shrink-0 transition-transform duration-200 ${
                            locationDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {locationDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-2 bg-white rounded-[16px] border border-[#E2E6E5] shadow-[0_20px_50px_rgba(17,27,50,0.14)] p-2.5 z-40">
                          <div className="flex items-center gap-2 px-2.5 py-2 rounded-[10px] bg-[#FAF7F0] border border-[#E2E6E5] mb-2">
                            <Search className="w-3.5 h-3.5 text-[#66716F] shrink-0" />
                            <input
                              type="text"
                              value={locationSearch}
                              onChange={(e) => setLocationSearch(e.target.value)}
                              placeholder="Search city or property..."
                              className="w-full bg-transparent text-xs text-[#123B30] placeholder-[#66716F] focus:outline-none"
                              autoFocus
                            />
                            {locationSearch && (
                              <button
                                type="button"
                                onClick={() => setLocationSearch("")}
                                className="text-[#66716F] hover:text-[#123B30]"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div role="listbox" className="max-h-52 overflow-y-auto space-y-1">
                            {filteredProperties.length === 0 ? (
                              <div className="px-3 py-4 text-center text-xs text-[#66716F]">
                                No matching Stayzy locations found.
                              </div>
                            ) : (
                              filteredProperties.map((prop) => {
                                const isActive = prop.id === selectedPropertyId;
                                return (
                                  <button
                                    key={prop.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isActive}
                                    onClick={() => {
                                      setSelectedPropertyId(prop.id);
                                      setLocationDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2.5 rounded-[10px] transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                      isActive
                                        ? "bg-[#DCEEDF]/70 text-[#063B2B] font-bold"
                                        : "hover:bg-[#FAF7F0] text-[#123B30]"
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold truncate">{prop.name}</div>
                                      <div className="text-[11px] text-[#66716F] truncate">
                                        {prop.address ? `${prop.address}, ` : ""}
                                        {prop.city}
                                      </div>
                                    </div>
                                    {isActive && (
                                      <CheckCircle2 className="w-4 h-4 text-[#087A50] shrink-0" />
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* FIELD 2: Preferred Date */}
                    <div>
                      <label
                        htmlFor="visit-date"
                        className="block text-[13px] font-bold text-[#123B30] mb-1.5"
                      >
                        Preferred Date
                      </label>
                      <div
                        onClick={() => dateInputRef.current?.showPicker?.()}
                        className="relative h-[54px] sm:h-[58px] px-3.5 rounded-[14px] border border-[#E2E6E5] bg-[#FAFBFA] hover:border-[#087A50]/50 focus-within:border-[#087A50] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#087A50]/15 flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <CalendarDays className="w-[18px] h-[18px] text-[#66716F] shrink-0" />
                        <div className="relative flex-1 flex items-center">
                          {!preferredDate && (
                            <span className="pointer-events-none text-[13.5px] font-medium text-[#66716F]">
                              Select Date
                            </span>
                          )}
                          <input
                            ref={dateInputRef}
                            id="visit-date"
                            type="date"
                            required
                            min={todayIso}
                            value={preferredDate}
                            onChange={(e) => setPreferredDate(e.target.value)}
                            className={`w-full bg-transparent text-[13.5px] font-semibold focus:outline-none cursor-pointer ${
                              preferredDate
                                ? "text-[#123B30]"
                                : "opacity-0 absolute inset-0"
                            }`}
                          />
                        </div>
                        <CalendarDays className="w-[17px] h-[17px] text-[#123B30] shrink-0 pointer-events-none" />
                      </div>
                    </div>

                    {/* FIELD 3: Time Slot (10 AM - 7 PM only) */}
                    <div>
                      <label
                        htmlFor="visit-time-slot"
                        className="block text-[13px] font-bold text-[#123B30] mb-1.5"
                      >
                        Time Slot
                      </label>
                      <div className="relative h-[54px] sm:h-[58px] px-3 sm:px-3.5 rounded-[14px] border border-[#E2E6E5] bg-[#FAFBFA] hover:border-[#087A50]/50 focus-within:border-[#087A50] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#087A50]/15 flex items-center gap-2 transition-all">
                        <Clock className="w-[18px] h-[18px] text-[#66716F] shrink-0" />
                        <select
                          id="visit-time-slot"
                          required
                          value={timeSlot}
                          onChange={(e) => setTimeSlot(e.target.value)}
                          className={`min-w-0 flex-1 bg-transparent text-[13px] xl:text-[13.5px] appearance-none focus:outline-none cursor-pointer pr-1 ${
                            timeSlot ? "text-[#123B30] font-semibold" : "text-[#66716F] font-medium"
                          }`}
                        >
                          <option value="">Select Time Slot</option>
                          {VISIT_TIME_SLOTS.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-[#123B30] pointer-events-none shrink-0" />
                      </div>
                    </div>

                    {/* FIELD 4: Your Full Name */}
                    <div>
                      <label
                        htmlFor="visit-full-name"
                        className="block text-[13px] font-bold text-[#123B30] mb-1.5"
                      >
                        Your Full Name
                      </label>
                      <div className="h-[54px] sm:h-[58px] px-3.5 rounded-[14px] border border-[#E2E6E5] bg-[#FAFBFA] hover:border-[#087A50]/50 focus-within:border-[#087A50] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#087A50]/15 flex items-center gap-2.5 transition-all">
                        <UserRound className="w-[18px] h-[18px] text-[#66716F] shrink-0" />
                        <input
                          id="visit-full-name"
                          type="text"
                          required
                          placeholder="Enter Your Name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full bg-transparent text-[13.5px] font-semibold text-[#123B30] placeholder:text-[#66716F] placeholder:font-medium focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* FIELD 5: Mobile Phone */}
                    <div>
                      <label
                        htmlFor="visit-phone"
                        className="block text-[13px] font-bold text-[#123B30] mb-1.5"
                      >
                        Mobile Phone
                      </label>
                      <div className="h-[54px] sm:h-[58px] px-3.5 rounded-[14px] border border-[#E2E6E5] bg-[#FAFBFA] hover:border-[#087A50]/50 focus-within:border-[#087A50] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#087A50]/15 flex items-center gap-2.5 transition-all">
                        <Phone className="w-[18px] h-[18px] text-[#66716F] shrink-0" />
                        <input
                          id="visit-phone"
                          type="tel"
                          inputMode="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={customerPhone}
                          onFocus={handlePhoneFocus}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full bg-transparent text-[13.5px] font-semibold text-[#123B30] placeholder:text-[#66716F] placeholder:font-medium focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* FIELD 6: Email Address (Optional) */}
                    <div>
                      <label
                        htmlFor="visit-email"
                        className="block text-[13px] font-bold text-[#123B30] mb-1.5"
                      >
                        Email Address (Optional)
                      </label>
                      <div className="h-[54px] sm:h-[58px] px-3.5 rounded-[14px] border border-[#E2E6E5] bg-[#FAFBFA] hover:border-[#087A50]/50 focus-within:border-[#087A50] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#087A50]/15 flex items-center gap-2.5 transition-all">
                        <Mail className="w-[18px] h-[18px] text-[#66716F] shrink-0" />
                        <input
                          id="visit-email"
                          type="email"
                          placeholder="name@example.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full bg-transparent text-[13.5px] font-semibold text-[#123B30] placeholder:text-[#66716F] placeholder:font-medium focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* FIELD 7: Special Notes or Questions (Optional) — Full Width */}
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="visit-notes"
                        className="block text-[13px] font-bold text-[#123B30] mb-1.5"
                      >
                        Special Notes or Questions (Optional)
                      </label>
                      <div className="h-[56px] sm:h-[58px] px-3.5 rounded-[14px] border border-[#E2E6E5] bg-[#FAFBFA] hover:border-[#087A50]/50 focus-within:border-[#087A50] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#087A50]/15 flex items-center gap-2.5 transition-all">
                        <MessageCircle className="w-[18px] h-[18px] text-[#66716F] shrink-0" />
                        <input
                          id="visit-notes"
                          type="text"
                          placeholder="Let us know if you have any specific requests..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full bg-transparent text-[13.5px] font-semibold text-[#123B30] placeholder:text-[#66716F] placeholder:font-medium focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Confirm Free Visit CTA Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-[60px] sm:h-[68px] rounded-[20px] bg-gradient-to-r from-[#0A754D] via-[#087A50] to-[#063B2B] hover:brightness-110 disabled:opacity-65 text-white font-extrabold text-[15px] sm:text-[17px] shadow-[0_14px_30px_rgba(8,122,80,0.28),0_4px_12px_rgba(217,173,85,0.22)] flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer mt-1"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Scheduling Your Walkthrough...</span>
                      </>
                    ) : (
                      <>
                        <CalendarDays className="w-5 h-5 text-white" strokeWidth={2.1} />
                        <span>Confirm Free Visit</span>
                        <span className="w-7 h-7 rounded-[9999px] border border-white/60 flex items-center justify-center">
                          <ArrowRight className="w-4 h-4 text-white" strokeWidth={2.2} />
                        </span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
