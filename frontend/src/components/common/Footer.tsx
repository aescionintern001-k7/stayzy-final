"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Home,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import { StayzyLogo } from "@/components/common/StayzyLogo";

interface CityDirectory {
  city: string;
  searchCity?: string;
  localities: string[];
  residences: {
    label: string;
    locality: string;
  }[];
}

interface PressPublication {
  name: string;
  tag: string;
  brandClass: string;
}

const PRESS_PUBLICATIONS: PressPublication[] = [
  {
    name: "THE ECONOMIC TIMES",
    tag: "Fastest Growing Living Brand",
    brandClass: "font-serif font-bold tracking-[0.02em] text-[11px] xl:text-[13.5px] uppercase",
  },
  {
    name: "Forbes",
    tag: "Changing Student & Tech Living",
    brandClass: "font-serif font-extrabold tracking-tight text-[15px] xl:text-[18.5px]",
  },
  {
    name: "Entrepreneur",
    tag: "Top PropTech Startup 2026",
    brandClass: "font-serif font-extrabold tracking-tight text-[13.5px] xl:text-[17px]",
  },
  {
    name: "VCCIRCLE",
    tag: "Co-Living Series B Backed",
    brandClass: "font-sans font-extrabold tracking-[0.05em] text-[12px] xl:text-[15px] uppercase",
  },
  {
    name: "MUMBAI LIVE",
    tag: "Urban Housing Reinvented",
    brandClass: "font-sans font-extrabold tracking-[0.02em] text-[11.5px] xl:text-[14.5px] uppercase",
  },
];

const CITY_DIRECTORIES: CityDirectory[] = [
  {
    city: "Bengaluru",
    searchCity: "Bengaluru",
    localities: [
      "PGs in Koramangala",
      "PGs in HSR Layout",
      "PGs in Bellandur",
      "PGs in BTM Layout",
      "PGs in Electronic City Phase 1",
      "PGs in Electronic City Phase 2",
      "PGs in Whitefield",
      "PGs in Marathahalli",
      "PGs in Manyata Tech Park",
      "PGs in Indiranagar",
      "PGs in Sarjapur Road",
      "PGs in Kadubeesanahalli",
      "PGs in Domlur",
      "PGs in Banashankari",
      "PGs in Mahadevapura",
      "PGs in Mathikere",
    ],
    residences: [
      { label: "Stayzy Haven (Koramangala 4th Block)", locality: "Koramangala" },
      { label: "Stayzy Heights (HSR Sector 2)", locality: "HSR Layout" },
      { label: "Stayzy Urban (Indiranagar 100 Ft Rd)", locality: "Indiranagar" },
      { label: "Stayzy TechPark (Whitefield ITPL)", locality: "Whitefield" },
      { label: "Stayzy Lakeview (Bellandur EcoSpace)", locality: "Bellandur" },
      { label: "Stayzy Silicon (Electronic City Ph 1)", locality: "Electronic City" },
    ],
  },
  {
    city: "Chennai",
    searchCity: "Chennai",
    localities: [
      "PGs in OMR IT Corridor",
      "PGs in Guindy",
      "PGs in Velachery",
      "PGs in Thoraipakkam",
      "PGs in Sholinganallur",
      "PGs in Navalur",
      "PGs in Anna Nagar",
      "PGs in T Nagar",
      "PGs in Perungudi",
      "PGs in Porur DLF",
      "PGs in Siruseri SIPCOT",
      "PGs in Adyar",
    ],
    residences: [
      { label: "Stayzy Bayview (OMR Thoraipakkam)", locality: "OMR IT Corridor" },
      { label: "Stayzy TechGateway (Navalur)", locality: "Navalur" },
      { label: "Stayzy MetroHub (Guindy Kathipara)", locality: "Guindy" },
      { label: "Stayzy Prime (Velachery Main Rd)", locality: "Velachery" },
    ],
  },
  {
    city: "Hyderabad",
    searchCity: "Hyderabad",
    localities: [
      "PGs in Hitec City",
      "PGs in Gachibowli",
      "PGs in Madhapur",
      "PGs in Kondapur",
      "PGs in Financial District",
      "PGs in Jubilee Hills",
      "PGs in Banjara Hills",
      "PGs in Kukatpally",
      "PGs in Manikonda",
      "PGs in Nanakramguda",
    ],
    residences: [
      { label: "Stayzy CyberHub (Madhapur)", locality: "Madhapur" },
      { label: "Stayzy Financial Towers (Gachibowli)", locality: "Gachibowli" },
      { label: "Stayzy WestEnd (Kondapur RTO)", locality: "Kondapur" },
      { label: "Stayzy Highrise (Hitec City Ph 2)", locality: "Hitec City" },
    ],
  },
  {
    city: "Pune",
    searchCity: "Pune",
    localities: [
      "PGs in Hinjewadi Phase 1",
      "PGs in Hinjewadi Phase 2",
      "PGs in Kharadi EON IT Park",
      "PGs in Viman Nagar",
      "PGs in Wakad",
      "PGs in Baner",
      "PGs in Magarpatta City",
      "PGs in Kothrud",
    ],
    residences: [
      { label: "Stayzy Apex (Hinjewadi Ph 1)", locality: "Hinjewadi" },
      { label: "Stayzy Crest (Kharadi World Trade Center)", locality: "Kharadi" },
      { label: "Stayzy Botanica (Baner)", locality: "Baner" },
    ],
  },
  {
    city: "Mumbai",
    searchCity: "Mumbai",
    localities: [
      "PGs in Powai Hiranandani",
      "PGs in Andheri East",
      "PGs in Andheri West",
      "PGs in BKC Bandra",
      "PGs in Goregaon IT Park",
      "PGs in Malad Mindspace",
      "PGs in Thane West",
    ],
    residences: [
      { label: "Stayzy Skyline (Powai Lake)", locality: "Powai" },
      { label: "Stayzy MetroEast (Andheri WEH)", locality: "Andheri East" },
      { label: "Stayzy Capital (BKC Annex)", locality: "Bandra" },
    ],
  },
  {
    city: "Gurgaon",
    searchCity: "Gurugram",
    localities: [
      "PGs in Cyber City",
      "PGs in Sector 28 DLF",
      "PGs in Sector 48 Sohna Rd",
      "PGs in Golf Course Road",
      "PGs in MG Road Metro",
      "PGs in Sector 56",
    ],
    residences: [
      { label: "Stayzy Millennium (Cyber City Ph 2)", locality: "Cyber City" },
      { label: "Stayzy Grandeur (Golf Course Ext)", locality: "Golf Course Road" },
    ],
  },
  {
    city: "Coimbatore",
    searchCity: "Coimbatore",
    localities: [
      "PGs in Peelamedu",
      "PGs in Saravanampatti IT Park",
      "PGs in Gandhipuram",
      "PGs in RS Puram",
      "PGs in TIDEL Park",
    ],
    residences: [
      { label: "Stayzy TechValley (Saravanampatti)", locality: "Saravanampatti" },
      { label: "Stayzy Central (Peelamedu Avinashi Rd)", locality: "Peelamedu" },
    ],
  },
];

const HERO_STATS = [
  { icon: MapPin, value: "300+", label: "Cities" },
  { icon: Home, value: "350+", label: "Properties" },
  { icon: ShieldCheck, value: "Zero", label: "Brokerage" },
];

/**
 * Full-width Stayzy Press Coverage, Interactive City Discovery & Directory,
 * 5-Column Premium Dark Emerald Footer, and Copyright Bar.
 */
export function Footer() {
  const [activeCityTab, setActiveCityTab] = useState("Bengaluru");
  const [sectionEntered, setSectionEntered] = useState(true);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSectionEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const currentDir =
    CITY_DIRECTORIES.find((c) => c.city === activeCityTab) || CITY_DIRECTORIES[0];
  const resolvedCityQuery = currentDir.searchCity || currentDir.city;

  return (
    <footer
      ref={footerRef}
      className={`bg-[#003D2B] text-white transition-opacity duration-500 motion-reduce:transition-none ${
        sectionEntered ? "opacity-100" : "opacity-95"
      }`}
    >
      {/* ===================================================================== */}
      {/* SECTION 1: PRESS COVERAGE STRIP (Warm Cream #FFF8ED)                   */}
      {/* ===================================================================== */}
      <section
        aria-labelledby="press-coverage-heading"
        className="w-full bg-[#FFF8ED] text-[#111D35] border-y border-[#EFE4D2] py-6 sm:py-7"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 xl:px-10">
          <div className="stayzy-press-row">
            {/* Left Pill Badge & Heading */}
            <div className="shrink-0 text-center xl:text-left">
              <span className="inline-flex items-center px-3 py-1 rounded-[9999px] bg-[#D8F3E5] text-[#057A55] text-[10px] xl:text-[10.5px] font-bold uppercase tracking-[0.12em]">
                RECOGNIZED BY
              </span>
              <h2
                id="press-coverage-heading"
                className="text-[14px] xl:text-[16.5px] font-extrabold text-[#111D35] mt-1.5 tracking-tight whitespace-nowrap"
              >
                Stayzy In The Media
              </h2>
            </div>

            {/* Center 5 Publications Horizontally with Vertical Dividers */}
            <div className="stayzy-press-logos">
              {PRESS_PUBLICATIONS.map((pub, idx) => (
                <React.Fragment key={pub.name}>
                  {idx > 0 && <span aria-hidden="true" className="stayzy-press-div" />}
                  <div
                    className={`flex flex-col items-center justify-center text-center px-0.5 xl:px-1 ${
                      idx === 4 ? "col-span-2 sm:col-span-1" : ""
                    }`}
                  >
                    <span className={`${pub.brandClass} text-[#1A2438] leading-tight whitespace-nowrap`}>
                      {pub.name}
                    </span>
                    <span className="mt-1 text-[9px] xl:text-[11px] font-medium text-[#536071] leading-snug whitespace-nowrap">
                      {pub.tag}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Right CTA Button */}
            <Link
              href="/about"
              className="shrink-0 inline-flex items-center gap-1.5 xl:gap-2 px-3.5 xl:px-5 py-2 xl:py-2.5 rounded-[9999px] bg-[#009B70] hover:bg-[#00825D] text-white text-[11.5px] xl:text-[13px] font-bold transition-colors shadow-xs whitespace-nowrap"
            >
              <span>Read Press Coverage</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.3} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 2: CITY DISCOVERY & LOCATION DIRECTORY (Deep Forest #003D2B)  */}
      {/* ===================================================================== */}
      <section
        aria-labelledby="city-discovery-heading"
        className="w-full bg-[#003D2B] text-white pt-10 sm:pt-12 pb-10 sm:pb-12"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 xl:px-10 space-y-6">
          {/* Top Heading Row + 3 Stat Blocks */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left Eyebrow + Heading + Subtitle */}
            <div>
              <div className="inline-flex items-center gap-3 mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#00D6A0]">
                  FIND YOUR NEXT STAY
                </span>
                <span
                  aria-hidden="true"
                  className="h-[1px] w-14 bg-[#00D6A0]/45"
                />
              </div>

              <h2
                id="city-discovery-heading"
                className="text-[26px] sm:text-[32px] xl:text-[36px] font-extrabold text-white tracking-tight leading-[1.15]"
              >
                Explore Stayzy across{" "}
                <span className="text-[#00D6A0]">300+</span> cities
              </h2>

              <p className="mt-1.5 text-[13.5px] sm:text-[14.5px] text-[#D6E5DC] font-normal">
                Discover verified co-living spaces in India&apos;s most connected neighbourhoods.
              </p>
            </div>

            {/* Right 3 Stats with Vertical Dividers */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-5 sm:gap-0 lg:shrink-0">
              {HERO_STATS.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <React.Fragment key={stat.label}>
                    {idx > 0 && (
                      <span
                        aria-hidden="true"
                        className="hidden sm:block h-10 w-[1px] bg-[#00D6A0]/20 mx-6 xl:mx-7"
                      />
                    )}
                    <div className="flex items-center gap-3">
                      <div
                        aria-hidden="true"
                        className="w-10 h-10 rounded-[9999px] bg-[#0B4D3A] border border-[#00D6A0]/25 flex items-center justify-center text-[#00D6A0] shrink-0"
                      >
                        <Icon className="w-[19px] h-[19px]" strokeWidth={2} />
                      </div>
                      <div>
                        <div className="text-[18px] sm:text-[20px] font-extrabold text-white leading-none">
                          {stat.value}
                        </div>
                        <div className="text-[11.5px] text-[#D6E5DC] font-medium mt-1">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Interactive City Tabs + Right Outlined A–Z Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            <div
              role="tablist"
              aria-label="Popular Stayzy Cities"
              className="flex items-center justify-start gap-2 pb-1.5 md:pb-0"
            >
              {CITY_DIRECTORIES.filter((c) => c.city === "Bengaluru").map((c) => {
                const isActive = activeCityTab === c.city;
                return (
                  <button
                    key={c.city}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCityTab(c.city)}
                    className={`px-4 py-1.5 rounded-[9999px] text-[12.5px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      isActive
                        ? "bg-[#00A876] text-white shadow-[0_4px_14px_rgba(0,214,160,0.28)]"
                        : "bg-[#094735] border border-[#196650]/70 text-[#D6E5DC] hover:bg-[#0E5943] hover:text-white"
                    }`}
                  >
                    {c.city}
                  </button>
                );
              })}
            </div>

            <Link
              href="/cities"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-[9999px] border border-[#00D6A0]/65 text-[#00D6A0] hover:bg-[#00D6A0] hover:text-[#003D2B] text-[12px] font-bold transition-colors whitespace-nowrap shrink-0 self-start md:self-auto"
            >
              <span>All 300+ Cities (A–Z)</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} />
            </Link>
          </div>

          {/* 6-Column City Location Directory */}
          <div className="stayzy-city-links-grid pt-1">
            {currentDir.localities.map((loc) => (
              <Link
                key={loc}
                href={`/rooms?city=${encodeURIComponent(resolvedCityQuery)}&locality=${encodeURIComponent(
                  loc.replace("PGs in ", "")
                )}`}
                className="group inline-flex items-start sm:items-center gap-1.5 xl:gap-2 text-[11px] xl:text-[12.5px] text-[#D6E5DC] hover:text-[#00D6A0] transition-colors py-0.5 min-w-0 leading-snug"
                title={loc}
              >
                <MapPin
                  className="w-3.5 h-3.5 text-[#00D6A0] shrink-0 mt-0.5 sm:mt-0 transition-transform duration-200 group-hover:scale-110"
                  strokeWidth={2}
                />
                <span>{loc}</span>
              </Link>
            ))}
          </div>

          {/* Flagship Residences Row + Right Divider Prompt */}
          <div className="border-t border-[#00D6A0]/20 pt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/95 mr-1 shrink-0">
                FLAGSHIP RESIDENCES:
              </span>
              {currentDir.residences.map((res) => (
                <Link
                  key={res.label}
                  href={`/rooms?city=${encodeURIComponent(resolvedCityQuery)}&locality=${encodeURIComponent(
                    res.locality
                  )}`}
                  className="px-3.5 py-1 rounded-[9999px] bg-[#094735] border border-[#1B6852]/75 text-[11.5px] font-medium text-[#D6E5DC] hover:text-white hover:border-[#00D6A0]/65 transition-colors"
                >
                  {res.label}
                </Link>
              ))}
            </div>

            <div className="lg:border-l lg:border-[#00D6A0]/20 lg:pl-6 shrink-0 flex flex-row lg:flex-col items-center lg:items-start justify-between gap-2">
              <span className="text-[12px] font-semibold text-white">
                Can&apos;t find your city?
              </span>
              <Link
                href="/cities"
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#00D6A0] hover:text-white transition-colors"
              >
                <span>Explore all locations</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 3: PREMIUM DARK EMERALD FOOTER (#004B35) WITH CURVED TOP      */}
      {/* ===================================================================== */}
      <div className="bg-[#004B35] rounded-t-[28px] sm:rounded-t-[36px] lg:rounded-t-[44px] border-t border-[#00D6A0]/20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-11 sm:pt-14 pb-8 sm:pb-10">
          {/* 5-Column Desktop Layout with Vertical Hairline Separators */}
          <div className="stayzy-footer-cols pb-10">
            {/* Column 1: Brand Info & Property Owner Card */}
            <div className="stayzy-footer-brand-col stayzy-footer-col-sep space-y-4">
              <Link href="/" className="inline-block" aria-label="Stayzy Home">
                <StayzyLogo variant="light" size="md" />
              </Link>

              <p className="text-[#D6E5DC] text-[12.5px] leading-[1.6] max-w-sm">
                India&apos;s leading tech-managed co-living ecosystem. High-speed Wi-Fi, chef-curated
                meals, zero brokerage, and community events across 350+ properties.
              </p>

              {/* Bordered Dark-Green Property Owner Card */}
              <div className="rounded-[14px] bg-[#003D2B] border border-[#00D6A0]/30 hover:border-[#00D6A0]/70 hover:-translate-y-0.5 transition-all duration-200 p-4 max-w-sm motion-reduce:transform-none">
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="w-9 h-9 rounded-[10px] bg-[#0A5740] border border-[#00D6A0]/25 flex items-center justify-center text-[#00D6A0] shrink-0 mt-0.5"
                  >
                    <Building2 className="w-[18px] h-[18px]" strokeWidth={1.9} />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="text-[13px] font-bold text-white leading-snug">
                      Are you a Property Owner?
                    </h3>
                    <p className="text-[11.5px] text-[#D6E5DC]/90 leading-[1.5]">
                      List your building or PG on Stayzy to get verified tenants and assured monthly
                      occupancy.
                    </p>
                    <Link
                      href="/owner"
                      className="inline-flex items-center gap-1.5 pt-0.5 text-[12px] font-extrabold text-[#00D6A0] hover:text-white transition-colors"
                    >
                      <span>Partner With Us / Upload PG</span>
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.3} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: EXPLORE LIVING */}
            <div className="stayzy-footer-col-sep stayzy-footer-col-pad space-y-3.5">
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-white">
                EXPLORE LIVING
              </h3>
              <ul className="space-y-2.5 text-[12.5px] text-[#D6E5DC]">
                <li>
                  <Link href="/rooms?category=PRIVATE" className="hover:text-[#00D6A0] transition-colors">
                    Couple Suite / Private
                  </Link>
                </li>
                <li>
                  <Link
                    href="/rooms?category=TWIN_SHARING"
                    className="hover:text-[#00D6A0] transition-colors"
                  >
                    Solo Rider / Twin Sharing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/rooms?category=TRIPLE_SHARING"
                    className="hover:text-[#00D6A0] transition-colors"
                  >
                    Shared Adventure (3-bed)
                  </Link>
                </li>
                <li>
                  <Link
                    href="/rooms?durationType=HOURLY"
                    className="hover:text-[#00D6A0] transition-colors"
                  >
                    Hourly Pods &amp; Day Stays
                  </Link>
                </li>
                <li>
                  <Link
                    href="/rooms?durationType=DAILY"
                    className="hover:text-[#00D6A0] transition-colors"
                  >
                    Daily &amp; Weekend Stays
                  </Link>
                </li>
                <li>
                  <Link
                    href="/rooms?durationType=MONTHLY"
                    className="hover:text-[#00D6A0] transition-colors"
                  >
                    Monthly Co-Living
                  </Link>
                </li>
                <li className="pt-0.5">
                  <Link
                    href="/cities"
                    className="inline-flex items-center gap-1.5 font-bold text-[#00D6A0] hover:text-white transition-colors whitespace-nowrap text-[11.5px] xl:text-[12.5px]"
                  >
                    <span>Worldwide Cities (A–Z)</span>
                    <span className="px-1.5 py-0.5 rounded-[9999px] bg-[#00A876] text-white text-[10px] font-extrabold leading-none shrink-0">
                      300+
                    </span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: PLATFORM PORTALS */}
            <div className="stayzy-footer-col-sep stayzy-footer-col-pad space-y-3.5">
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-white">
                PLATFORM PORTALS
              </h3>
              <ul className="space-y-2.5 text-[12.5px] text-[#D6E5DC]">
                <li>
                  <Link
                    href="/admin/users"
                    className="inline-flex items-center gap-2 hover:text-[#00D6A0] transition-colors"
                  >
                    <span>Super Admin Portal</span>
                    <span className="px-2 py-0.5 rounded-[9999px] bg-[#D99B26]/25 border border-[#F59E0B]/40 text-[#FCD34D] text-[10px] font-bold leading-none">
                      Admin
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/owner"
                    className="inline-flex items-center gap-2 hover:text-[#00D6A0] transition-colors"
                  >
                    <span>Property Owner Portal</span>
                    <span className="px-2 py-0.5 rounded-[9999px] bg-[#00A876]/25 border border-[#00D6A0]/40 text-[#00D6A0] text-[10px] font-bold leading-none shrink-0">
                      Landlord
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/owner/properties/new"
                    className="hover:text-[#00D6A0] transition-colors"
                  >
                    Upload New PG Listing
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-[#00D6A0] transition-colors">
                    Resident Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/rooms" className="hover:text-[#00D6A0] transition-colors">
                    Browse All 350+ Stays
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: COMPANY & LEGAL */}
            <div className="stayzy-footer-col-sep stayzy-footer-col-pad space-y-3.5">
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-white">
                COMPANY &amp; LEGAL
              </h3>
              <ul className="space-y-2.5 text-[12.5px] text-[#D6E5DC]">
                <li>
                  <Link href="/about" className="hover:text-[#00D6A0] transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="hover:text-[#00D6A0] transition-colors">
                    Investor Relations
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-[#00D6A0] transition-colors">
                    FAQs &amp; House Rules
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-[#00D6A0] transition-colors">
                    Terms of Service &amp; T&amp;C
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[#00D6A0] transition-colors">
                    Privacy &amp; Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[#00D6A0] transition-colors">
                    Contact Customer Care
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 5: HEADQUARTERS */}
            <div className="stayzy-footer-col-pad space-y-3.5">
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-white">
                HEADQUARTERS
              </h3>
              <div className="space-y-2.5 text-[12.5px] text-[#D6E5DC]">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#00D6A0] shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="leading-[1.5]">
                    80 Feet Rd, 4th Block, Koramangala, Bengaluru 560034
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#00D6A0] shrink-0" strokeWidth={2} />
                  <a href="tel:+918045678900" className="hover:text-white transition-colors">
                    +91 80 4567 8900
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#00D6A0] shrink-0" strokeWidth={2} />
                  <a href="mailto:support@stayzy.in" className="hover:text-white transition-colors">
                    support@stayzy.in
                  </a>
                </div>
              </div>

              <div className="pt-1.5 space-y-2.5">
                <div className="text-[12px] font-bold text-white">Follow us:</div>
                <div className="flex items-center gap-2.5">
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow Stayzy on Facebook"
                    className="w-8 h-8 rounded-[9999px] bg-[#0B5D44] border border-[#00D6A0]/20 hover:bg-[#00D6A0] text-white hover:text-[#003D2B] flex items-center justify-center transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                      <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5h1.6V5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V11H8v3h2.3v8h3.2z" />
                    </svg>
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow Stayzy on LinkedIn"
                    className="w-8 h-8 rounded-[9999px] bg-[#0B5D44] border border-[#00D6A0]/20 hover:bg-[#00D6A0] text-white hover:text-[#003D2B] flex items-center justify-center transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                      <path d="M6.94 8.5H3.56V19.5H6.94V8.5ZM5.25 3.5C4.14 3.5 3.25 4.39 3.25 5.5C3.25 6.6 4.14 7.5 5.25 7.5C6.35 7.5 7.25 6.6 7.25 5.5C7.25 4.39 6.35 3.5 5.25 3.5ZM20.44 13.02C20.44 9.88 18.76 8.22 16.16 8.22C14.37 8.22 13.48 9.2 13.02 9.93V8.5H9.65C9.7 9.48 9.65 19.5 9.65 19.5H13.02V13.36C13.02 13.02 13.05 12.69 13.15 12.45C13.42 11.78 14.03 11.09 15.07 11.09C16.41 11.09 17.06 12.11 17.06 13.6V19.5H20.44V13.02Z" />
                    </svg>
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow Stayzy on Instagram"
                    className="w-8 h-8 rounded-[9999px] bg-[#0B5D44] border border-[#00D6A0]/20 hover:bg-[#00D6A0] text-white hover:text-[#003D2B] flex items-center justify-center transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                      <circle cx="12" cy="12" r="4.2" />
                      <circle cx="17.3" cy="6.7" r="0.8" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Subscribe to Stayzy on YouTube"
                    className="w-8 h-8 rounded-[9999px] bg-[#0B5D44] border border-[#00D6A0]/20 hover:bg-[#00D6A0] text-white hover:text-[#003D2B] flex items-center justify-center transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                      <path d="M21.58 7.19C21.35 6.33 20.67 5.65 19.81 5.42C18.25 5 12 5 12 5C12 5 5.75 5 4.19 5.42C3.33 5.65 2.65 6.33 2.42 7.19C2 8.75 2 12 2 12C2 12 2 15.25 2.42 16.81C2.65 17.67 3.33 18.35 4.19 18.58C5.75 19 12 19 12 19C12 19 18.25 19 19.81 18.58C20.67 18.35 21.35 17.67 21.58 16.81C22 15.25 22 12 22 12C22 12 22 8.75 21.58 7.19ZM10 15V9L15.2 12L10 15Z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* BOTTOM COPYRIGHT BAR                                              */}
          {/* ================================================================= */}
          <div className="border-t border-[#00D6A0]/35 pt-6 pb-14 lg:pb-0 flex flex-col md:flex-row items-center justify-between gap-4 text-[11.5px] text-[#D6E5DC]/90 pr-0 md:pr-20 xl:pr-20">
            <span className="text-center md:text-left shrink-0">
              Copyright © 2026 Stayzy Spaces Pvt. Ltd. All Rights Reserved.
            </span>

            <span
              aria-hidden="true"
              className="hidden md:block h-4 w-[1px] bg-[#00D6A0]/35 shrink-0"
            />

            <p className="text-center md:text-right leading-relaxed">
              Images shown are for representational purposes only. Amenities depicted may or may not
              form a part of that individual property.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
