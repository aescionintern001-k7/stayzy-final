import React from "react";
import {
  Wifi,
  Utensils,
  Laptop,
  ShowerHead,
  KeyRound,
  Zap,
  CheckCircle2,
  WashingMachine,
  type LucideIcon,
} from "lucide-react";
import { StayzyLogo } from "@/components/common/StayzyLogo";

export interface AmenityFeature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  image: string;
  imageAlt: string;
}

const AMENITY_FEATURES: AmenityFeature[] = [
  {
    id: "wifi",
    title: "300 Mbps Wi-Fi",
    description: "Uncapped fiber with dual-band routers on every floor.",
    icon: Wifi,
    image: "/images/amenities/premium-wifi-router.webp",
    imageAlt: "Modern dual-band wireless router on an oak table in a bright Stayzy interior",
  },
  {
    id: "meals",
    title: "Fresh Home Meals",
    description: "Nutritious 3-time daily breakfast, lunch & dinner.",
    icon: Utensils,
    image: "/images/amenities/fresh-home-meals.webp",
    imageAlt: "Freshly plated wholesome Indian home-style meal on a sunlit dining table",
  },
  {
    id: "workspace",
    title: "Ergonomic Work Desk",
    description: "Solid wood desk, orthopaedic chair & power hub.",
    icon: Laptop,
    image: "/images/amenities/ergonomic-workspace.webp",
    imageAlt: "Solid oak work desk with laptop, warm lamp, indoor plant, and ergonomic chair",
  },
  {
    id: "bathroom",
    title: "Attached Bath & Geyser",
    description: "Private clean bathroom with 24/7 hot water.",
    icon: ShowerHead,
    image: "/images/amenities/luxury-attached-bathroom.webp",
    imageAlt: "Clean modern attached bathroom with frameless glass shower and warm stone tiles",
  },
  {
    id: "biometric",
    title: "Keyless Biometric Entry",
    description: "Seamless 24/7 digital lock access for residents.",
    icon: KeyRound,
    image: "/images/amenities/biometric-entry-lock.webp",
    imageAlt: "Modern biometric fingerprint and keypad digital smart door lock on a walnut door",
  },
  {
    id: "power",
    title: "100% Power Backup",
    description: "Heavy-duty diesel generator for uninterrupted power.",
    icon: Zap,
    image: "/images/amenities/diesel-power-backup.webp",
    imageAlt: "Modern acoustic standby diesel generator installed in a clean utility enclosure",
  },
  {
    id: "housekeeping",
    title: "Daily Housekeeping",
    description: "Regular room cleaning, dusting & trash removal.",
    icon: CheckCircle2,
    image: "/images/amenities/premium-housekeeping.webp",
    imageAlt: "Freshly folded white cotton towels and green indoor plant in a tidy bedroom",
  },
  {
    id: "laundry",
    title: "Laundry & Ironing Station",
    description: "Front-load automatic washing machines & iron racks.",
    icon: WashingMachine,
    image: "/images/amenities/modern-laundry-station.webp",
    imageAlt: "Bright modern laundry station with front-load washing machine, folded towels, and steam iron",
  },
];

function AmenityFeatureCard({ feature }: { feature: AmenityFeature }) {
  const Icon = feature.icon;

  return (
    <article
      className="group relative flex items-stretch justify-between overflow-hidden rounded-[18px] bg-[#FFFFFF] border border-[#E9DED0] shadow-[0_6px_22px_rgba(17,27,50,0.05),0_1px_3px_rgba(17,27,50,0.03)] hover:shadow-[0_16px_34px_rgba(8,122,80,0.10),0_4px_12px_rgba(17,27,50,0.04)] hover:border-[#087A50]/35 hover:-translate-y-1 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none min-h-[168px] sm:min-h-[182px]"
    >
      {/* Left Text & Icon Column */}
      <div className="relative z-10 w-[57%] p-4 xl:p-[18px] flex flex-col justify-between">
        <div>
          <div
            className="w-11 h-11 rounded-[12px] bg-[#DCEBDF]/90 border border-[#087A50]/18 flex items-center justify-center text-[#087A50] mb-3 group-hover:bg-[#087A50] group-hover:text-white transition-colors duration-300 motion-reduce:transition-none shrink-0"
            aria-hidden="true"
          >
            <Icon className="w-[22px] h-[22px]" strokeWidth={1.9} />
          </div>

          <h3 className="text-[14.5px] xl:text-[15.5px] font-bold text-[#111B32] tracking-tight leading-snug mb-1.5 group-hover:text-[#087A50] transition-colors duration-300 motion-reduce:transition-none">
            {feature.title}
          </h3>

          <p className="text-[12px] sm:text-[12.5px] text-[#667085] leading-[1.48] font-normal">
            {feature.description}
          </p>
        </div>
      </div>

      {/* Right Integrated Photography Area with Seamless Ivory/White Feather */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[68%] overflow-hidden bg-[#F5F0E8]">
        <img
          src={feature.image}
          alt={feature.imageAlt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-right transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:transform-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #FFFFFF 0%, #FFFFFF 20%, rgba(255,255,255,0.92) 31%, rgba(255,255,255,0.42) 42%, rgba(255,255,255,0) 54%)",
          }}
        />
      </div>
    </article>
  );
}

/**
 * Renders the Stayzy All-Inclusive Living section with warm ivory editorial
 * framing, eight bespoke hospitality photographs, and centered Stayzy branding.
 */
export function AmenitiesStrip() {
  return (
    <section
      id="amenities"
      aria-labelledby="all-inclusive-heading"
      className="relative overflow-hidden bg-[#FAF8F3] py-16 sm:py-20 lg:py-24 border-y border-[#E9DED0]"
    >
      {/* Subtle Warm Ivory Hospitality Interior Backdrop (Non-blurred, Airy & Bright) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img
          src="/images/amenities/hospitality-backdrop.webp"
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-center opacity-60 sm:opacity-80"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 68% 60% at 50% 24%, rgba(250,248,243,0.94) 0%, rgba(250,248,243,0.72) 52%, rgba(245,240,232,0.42) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-48"
          style={{
            background:
              "linear-gradient(to top, #FAF8F3 0%, rgba(245,240,232,0.88) 52%, transparent 100%)",
          }}
        />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Centered Header */}
        <header className="text-center max-w-[740px] mx-auto mb-10 sm:mb-12 lg:mb-14">
          {/* Eyebrow Pill Badge flanked by hairlines */}
          <div className="inline-flex items-center justify-center gap-3.5 sm:gap-5 mb-4">
            <span
              aria-hidden="true"
              className="h-[1px] w-10 sm:w-16 bg-gradient-to-r from-transparent to-[#111B32]/25"
            />
            <span className="inline-flex items-center px-4 py-1.5 rounded-[9999px] bg-[#DCEBDF]/90 border border-[#087A50]/25 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#087A50]">
              ALL-INCLUSIVE LIVING
            </span>
            <span
              aria-hidden="true"
              className="h-[1px] w-10 sm:w-16 bg-gradient-to-l from-transparent to-[#111B32]/25"
            />
          </div>

          {/* Two-Line Heading on Desktop with Emerald "need." Highlight */}
          <h2
            id="all-inclusive-heading"
            className="text-[32px] sm:text-[42px] xl:text-[50px] font-extrabold text-[#111B32] tracking-[-0.025em] leading-[1.12]"
          >
            Everything you{" "}
            <span className="italic text-[#087A50] font-extrabold">need.</span>
            <br className="hidden sm:block" />{" "}
            Nothing you don&rsquo;t.
          </h2>

          {/* Supporting Description */}
          <p className="mt-4 sm:mt-5 text-[15.5px] sm:text-[17px] lg:text-[18px] text-[#667085] font-medium leading-[1.6] max-w-[600px] mx-auto">
            Every room and bed in Stayzy comes fully equipped for comfort, focus,
            and effortless daily living.
          </p>

          {/* Emerald Decorative Accent Line */}
          <div
            aria-hidden="true"
            className="mt-5 mx-auto w-14 h-[2.5px] rounded-[9999px] bg-[#087A50]"
          />
        </header>

        {/* 8 Feature Cards Grid: 1 col Mobile, 2 cols Tablet (768px-1199px), 4 cols Desktop (1200px+) */}
        <div className="stayzy-amenities-grid">
          {AMENITY_FEATURES.map((feature) => (
            <AmenityFeatureCard key={feature.id} feature={feature} />
          ))}
        </div>

        {/* Centered Stayzy Brand Footer */}
        <div className="mt-12 sm:mt-14 lg:mt-16 text-center">
          <div className="flex items-center justify-center gap-4 sm:gap-7 max-w-2xl mx-auto">
            <span
              aria-hidden="true"
              className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[#E9DED0] to-[#111B32]/20"
            />
            <div className="shrink-0">
              <StayzyLogo variant="dark" size="md" />
            </div>
            <span
              aria-hidden="true"
              className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-[#E9DED0] to-[#111B32]/20"
            />
          </div>

          <p className="mt-2.5 text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.22em] text-[#087A50]">
            LIVE BETTER. STAY LONGER.
          </p>
        </div>
      </div>
    </section>
  );
}
