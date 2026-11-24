"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Building2,
  ShieldCheck,
} from "lucide-react";

interface CityDirectory {
  city: string;
  localities: string[];
  residences: string[];
}

const CITY_DIRECTORIES: CityDirectory[] = [
  {
    city: "Bengaluru",
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
      "Stayzy Haven (Koramangala 4th Block)",
      "Stayzy Heights (HSR Sector 2)",
      "Stayzy Urban (Indiranagar 100ft Rd)",
      "Stayzy TechPark (Whitefield ITPL)",
      "Stayzy Lakeview (Bellandur EcoSpace)",
      "Stayzy Silicon (Electronic City Ph 1)",
    ],
  },
  {
    city: "Chennai",
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
      "Stayzy Bayview (OMR Thoraipakkam)",
      "Stayzy TechGateway (Navalur)",
      "Stayzy MetroHub (Guindy Kathipara)",
      "Stayzy Prime (Velachery Main Rd)",
    ],
  },
  {
    city: "Hyderabad",
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
      "Stayzy CyberHub (Madhapur)",
      "Stayzy Financial Towers (Gachibowli)",
      "Stayzy WestEnd (Kondapur RTO)",
      "Stayzy Highrise (Hitec City Ph 2)",
    ],
  },
  {
    city: "Pune",
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
      "Stayzy Apex (Hinjewadi Ph 1)",
      "Stayzy Crest (Kharadi World Trade Center)",
      "Stayzy Botanica (Baner)",
    ],
  },
  {
    city: "Mumbai",
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
      "Stayzy Skyline (Powai Lake)",
      "Stayzy MetroEast (Andheri WEH)",
      "Stayzy Capital (BKC Annex)",
    ],
  },
  {
    city: "Gurgaon",
    localities: [
      "PGs in Cyber City",
      "PGs in Sector 28 DLF",
      "PGs in Sector 48 Sohna Rd",
      "PGs in Golf Course Road",
      "PGs in MG Road Metro",
      "PGs in Sector 56",
    ],
    residences: [
      "Stayzy Millennium (Cyber City Ph 2)",
      "Stayzy Grandeur (Golf Course Ext)",
    ],
  },
  {
    city: "Coimbatore",
    localities: [
      "PGs in Peelamedu",
      "PGs in Saravanampatti IT Park",
      "PGs in Gandhipuram",
      "PGs in RS Puram",
      "PGs in TIDEL Park",
    ],
    residences: [
      "Stayzy TechValley (Saravanampatti)",
      "Stayzy Central (Peelamedu Avinashi Rd)",
    ],
  },
];

const PRESS_LOGOS = [
  { name: "THE ECONOMIC TIMES", tag: "Fastest Growing Living Brand" },
  { name: "Forbes", tag: "Changing Student & Tech Living" },
  { name: "Entrepreneur", tag: "Top PropTech Startup 2026" },
  { name: "VCCIRCLE", tag: "Co-Living Series B Backed" },
  { name: "MUMBAI LIVE", tag: "Urban Housing Reinvented" },
  { name: "YourStory", tag: "Tech-Enabled Broker-Free PGs" },
];

export function Footer() {
  const [activeCityTab, setActiveCityTab] = useState("Bengaluru");

  const currentDir =
    CITY_DIRECTORIES.find((c) => c.city === activeCityTab) ||
    CITY_DIRECTORIES[0];

  return (
    <footer className="bg-[#0F172A] text-slate-200 border-t border-slate-800">
      {/* 1. In The Press / Media Strip */}
      <div className="bg-white text-gray-900 py-8 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="shrink-0 text-center md:text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-md inline-block">
                Recognized By
              </span>
              <h3 className="text-sm font-extrabold text-gray-900 mt-1">
                Stayzy In The Media
              </h3>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-6 sm:gap-10">
              {PRESS_LOGOS.map((press, i) => (
                <div key={i} className="text-center group cursor-default">
                  <span className="text-sm sm:text-base font-serif font-black tracking-wider text-gray-700 group-hover:text-emerald-700 transition-colors">
                    {press.name}
                  </span>
                  <p className="text-[9px] text-gray-500 hidden sm:block">
                    {press.tag}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href="/about"
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0 shadow-xs"
            >
              Read Press Coverage
            </Link>
          </div>
        </div>
      </div>

      {/* 2. City Locality Directory Bar */}
      <div className="bg-[#090D16] py-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          {/* City Selection Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CITY_DIRECTORIES.map((c) => {
              const isActive = activeCityTab === c.city;
              return (
                <button
                  key={c.city}
                  onClick={() => setActiveCityTab(c.city)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {c.city}
                </button>
              );
            })}
            <Link
              href="/cities"
              className="px-3.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-white border border-emerald-500/40 shrink-0 ml-auto"
            >
              All 300+ Cities (A–Z) &rarr;
            </Link>
          </div>

          {/* Locality Grid for Active City */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2 text-[11px] text-slate-400 pt-1">
            {currentDir.localities.map((loc, i) => (
              <Link
                key={i}
                href={`/rooms?city=${encodeURIComponent(currentDir.city)}&locality=${encodeURIComponent(loc.replace("PGs in ", ""))}`}
                className="hover:text-emerald-400 hover:underline truncate transition-colors py-0.5"
                title={loc}
              >
                {loc}
              </Link>
            ))}
          </div>

          {/* Flagship Residences under this City */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400 border-t border-slate-800">
            <span className="font-extrabold uppercase tracking-wider text-slate-300">
              Flagship Residences:
            </span>
            {currentDir.residences.map((res, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
              >
                {res}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Main Footer Links & Company Information */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 pb-12 border-b border-[#1E3B2E]">
          {/* Col 1 & 2: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/stayzy-logo-hd.png"
                alt="Stayzy Logo"
                className="h-9 w-auto object-contain drop-shadow-md"
              />
            </div>
            <p className="text-[#A2B6AA] text-xs leading-relaxed max-w-sm">
              India&apos;s leading tech-managed co-living ecosystem. High-speed Wi-Fi, chef-curated meals, zero brokerage, and community events across 350+ properties.
            </p>

            {/* Quick Partner CTA */}
            <div className="p-3.5 rounded-md bg-[#142A20] border border-[#1E3B2E] space-y-2 max-w-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  Are you a Property Owner?
                </span>
              </div>
              <p className="text-[11px] text-[#869E90]">
                List your building or PG on Stayzy to get verified tenants and assured monthly occupancy.
              </p>
              <Link
                href="/owner"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 hover:text-white transition-colors"
              >
                <span>Partner With Us / Upload PG</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Col 3: Explore Living */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">
              Explore Living
            </h4>
            <ul className="space-y-2 text-xs text-[#A2B6AA]">
              <li>
                <Link href="/rooms?category=PRIVATE" className="hover:text-white transition-colors">
                  Couple Suite / Private
                </Link>
              </li>
              <li>
                <Link href="/rooms?category=TWIN_SHARING" className="hover:text-white transition-colors">
                  Solo Rider / Twin Sharing
                </Link>
              </li>
              <li>
                <Link href="/rooms?category=TRIPLE_SHARING" className="hover:text-white transition-colors">
                  Shared Adventure (3-bed)
                </Link>
              </li>
              <li>
                <Link href="/rooms?durationType=HOURLY" className="hover:text-white transition-colors">
                  Hourly Pods &amp; Day Stays
                </Link>
              </li>
              <li>
                <Link href="/rooms?durationType=DAILY" className="hover:text-white transition-colors">
                  Daily &amp; Weekend Stays
                </Link>
              </li>
              <li>
                <Link href="/rooms?durationType=MONTHLY" className="hover:text-white transition-colors">
                  Monthly Co-Living
                </Link>
              </li>
              <li>
                <Link href="/cities" className="text-emerald-400 hover:text-white transition-colors font-bold flex items-center gap-1">
                  <span>Worldwide Cities (A–Z)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded">300+</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Portals & Roles */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">
              Platform Portals
            </h4>
            <ul className="space-y-2 text-xs text-[#A2B6AA]">
              <li>
                <Link href="/admin/users" className="hover:text-white transition-colors flex items-center gap-1">
                  <span>Super Admin Portal</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">Admin</span>
                </Link>
              </li>
              <li>
                <Link href="/owner" className="hover:text-white transition-colors flex items-center gap-1">
                  <span>Property Owner Portal</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">Landlord</span>
                </Link>
              </li>
              <li>
                <Link href="/owner/properties/new" className="hover:text-white transition-colors">
                  Upload New PG Listing
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Resident Dashboard
                </Link>
              </li>
              <li>
                <Link href="/rooms" className="hover:text-white transition-colors">
                  Browse All 350+ Stays
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Company & Legal */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">
              Company &amp; Legal
            </h4>
            <ul className="space-y-2 text-xs text-[#A2B6AA]">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Investor Relations
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQs &amp; House Rules
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service &amp; T&amp;C
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy &amp; Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Customer Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 6: Headquarters & Support */}
          <div className="space-y-3">
            <h4 className="text-white text-xs font-extrabold uppercase tracking-wider">
              Headquarters
            </h4>
            <div className="space-y-2.5 text-xs text-[#A2B6AA]">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  80 Feet Rd, 4th Block, Koramangala, Bengaluru 560034
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a href="tel:+918045678900" className="hover:text-white transition-colors">
                  +91 80 4567 8900
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a href="mailto:support@stayzy.in" className="hover:text-white transition-colors">
                  support@stayzy.in
                </a>
              </div>
              <div className="pt-2 flex items-center gap-2 text-white/90">
                <span className="text-[11px] font-bold">Follow us:</span>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 font-bold transition-colors"
                >
                  FB
                </a>
                <span>•</span>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 font-bold transition-colors"
                >
                  LinkedIn
                </a>
                <span>•</span>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 font-bold transition-colors"
                >
                  Instagram
                </a>
                <span>•</span>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 font-bold transition-colors"
                >
                  YouTube
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Bottom Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-[#7A9385]">
          <div className="flex items-center gap-2">
            <span>
              Copyright © 2026 Stayzy Spaces Pvt Ltd. All Rights Reserved.
            </span>
          </div>
          <p className="text-center md:text-right">
            Images shown are for representational purposes only. Amenities depicted may or may not form a part of that individual property.
          </p>
        </div>
      </div>
    </footer>
  );
}
