"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Compass,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";

interface BookingStepMeta {
  step: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

const BOOKING_STEPS: BookingStepMeta[] = [
  {
    step: "01",
    title: "Choose your stay",
    description:
      "Browse curated private suites or shared PG beds with genuine photographs, amenities, and room configurations.",
    ctaLabel: "Find Your Perfect Space",
    ctaHref: "/rooms",
  },
  {
    step: "02",
    title: "Select your dates",
    description:
      "Pick hourly, daily, weekly, monthly, or yearly schedules with transparent rates and live bed-level availability.",
    ctaLabel: "Check Availability",
    ctaHref: "/rooms",
  },
  {
    step: "03",
    title: "Review and book",
    description:
      "Lock your space with an instant 15-minute hold, zero brokerage, and receive your digital keyless access instructions.",
    ctaLabel: "Book Your Stay",
    ctaHref: "/rooms",
  },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface IllustrativeMonth {
  label: string;
  startOffset: number;
  days: number;
  defaultRange: [number, number];
}

const ILLUSTRATIVE_MONTHS: IllustrativeMonth[] = [
  { label: "November 2026", startOffset: 0, days: 30, defaultRange: [9, 10] },
  { label: "December 2026", startOffset: 2, days: 31, defaultRange: [12, 13] },
  { label: "January 2027", startOffset: 5, days: 31, defaultRange: [8, 9] },
];

/**
 * Decorative interactive booking calendar preview for Card 02.
 * Uses pure HTML/Tailwind layout and stays completely isolated from booking API state.
 */
function DecorativeBookingCalendar() {
  const [monthIdx, setMonthIdx] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number>(9);
  const currentMonth = ILLUSTRATIVE_MONTHS[monthIdx];

  const handleShiftMonth = (dir: -1 | 1) => {
    const next = (monthIdx + dir + ILLUSTRATIVE_MONTHS.length) % ILLUSTRATIVE_MONTHS.length;
    setMonthIdx(next);
    setSelectedDay(ILLUSTRATIVE_MONTHS[next].defaultRange[0]);
  };

  const leadingBlanks = Array.from({ length: currentMonth.startOffset });
  const daysList = Array.from({ length: currentMonth.days }, (_, idx) => idx + 1);

  return (
    <div className="relative h-full w-full flex items-center justify-end pr-3 sm:pr-4 py-4">
      {/* Subtle sunlit ivory room backdrop behind the floating calendar */}
      <img
        src="/images/amenities/hospitality-backdrop.webp"
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-right opacity-55"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, #FFFFFF 0%, rgba(255,255,255,0.92) 22%, rgba(250,247,241,0.45) 55%, rgba(245,238,229,0.22) 100%)",
        }}
      />

      {/* Floating White Calendar Surface */}
      <div className="relative z-10 w-[162px] sm:w-[186px] lg:w-[166px] xl:w-[198px] bg-[#FFFFFF] rounded-[18px] border border-[#E9D8C6]/85 shadow-[0_18px_40px_rgba(17,27,50,0.11),0_4px_12px_rgba(8,122,80,0.06)] p-2.5 xl:p-3.5 -rotate-2 group-hover:rotate-0 transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none">
        {/* Month Bar */}
        <div className="flex items-center justify-between gap-1 mb-2 xl:mb-2.5">
          <button
            type="button"
            onClick={() => handleShiftMonth(-1)}
            className="w-5 h-5 rounded-[6px] hover:bg-[#F5EEE5] text-[#536176] hover:text-[#111B32] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Previous illustrative month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="whitespace-nowrap text-[10px] xl:text-[11.5px] font-extrabold text-[#111B32] tracking-tight">
            {currentMonth.label}
          </span>
          <button
            type="button"
            onClick={() => handleShiftMonth(1)}
            className="w-5 h-5 rounded-[6px] hover:bg-[#F5EEE5] text-[#536176] hover:text-[#111B32] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Next illustrative month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-0.5 text-center mb-1 xl:mb-1.5">
          {WEEKDAYS.map((day) => (
            <span
              key={day}
              className="text-[7.5px] xl:text-[8.5px] font-bold text-[#536176] tracking-tight"
            >
              {day}
            </span>
          ))}
        </div>

        {/* Dates Grid */}
        <div className="grid grid-cols-7 gap-y-0.5 xl:gap-y-1 gap-x-0.5 text-center">
          {leadingBlanks.map((_, i) => (
            <span key={`blank-${i}`} aria-hidden="true" />
          ))}
          {daysList.map((day) => {
            const isHighlighted = day === selectedDay || day === selectedDay + 1;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`w-[19px] h-[19px] xl:w-[22px] xl:h-[22px] mx-auto rounded-[9999px] text-[9px] xl:text-[10px] flex items-center justify-center transition-colors cursor-pointer ${
                  isHighlighted
                    ? "bg-[#087A50] text-white font-bold shadow-[0_2px_8px_rgba(8,122,80,0.32)]"
                    : "text-[#111B32] font-semibold hover:bg-[#DCEEDF]/70"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Floating Confirmation Checkmark at Bottom-Right Corner */}
        <div
          aria-hidden="true"
          className="absolute -bottom-2.5 -right-2 w-8 h-8 xl:-bottom-3 xl:-right-2.5 xl:w-10 xl:h-10 rounded-[9999px] bg-[#087A50] text-white border-[3px] border-white shadow-[0_6px_16px_rgba(8,122,80,0.34)] flex items-center justify-center"
        >
          <Check className="w-4 h-4 xl:w-5 xl:h-5 stroke-[2.8]" />
        </div>
      </div>
    </div>
  );
}

function StepConnectorArrow({ direction }: { direction: "right" | "down" }) {
  const ArrowIcon = direction === "right" ? ArrowRight : ArrowDown;
  return (
    <div
      aria-hidden="true"
      className="w-12 h-12 xl:w-[60px] xl:h-[60px] rounded-[9999px] bg-[#DCEEDF] border border-[#087A50]/15 text-[#087A50] shadow-[0_8px_22px_rgba(8,122,80,0.11)] flex items-center justify-center transition-transform duration-300 hover:scale-105 motion-reduce:transition-none"
    >
      <ArrowIcon className="w-5 h-5 xl:w-6 xl:h-6" strokeWidth={2.3} />
    </div>
  );
}

/**
 * Rebuilt 3-step Stayzy booking workflow with warm ivory aesthetics, custom luxury
 * bedroom photography, interactive calendar preview, and confirmation visual.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-booking-works-heading"
      className="relative overflow-hidden bg-[#FAF7F1] py-16 sm:py-20 lg:py-24 border-y border-[#E9D8C6]/75"
    >
      {/* Subtle Non-Botanical Architectural & Sage Geometric Backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-28 -left-24 w-[420px] h-[420px] rounded-[9999px] bg-[#DCEEDF]/45" />
        <div className="absolute -top-44 left-24 w-[320px] h-[320px] rounded-[9999px] bg-[#F5EEE5]/90" />
        <div className="absolute -bottom-36 -right-24 w-[460px] h-[460px] rounded-[9999px] bg-[#DCEEDF]/42" />
        <div className="absolute top-1/2 -right-20 w-[240px] h-[240px] rounded-[9999px] bg-[#F5EEE5]/80" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Centered Header */}
        <header className="text-center max-w-[760px] mx-auto mb-11 sm:mb-14">
          <div className="inline-flex items-center justify-center gap-3.5 sm:gap-5 mb-4">
            <span
              aria-hidden="true"
              className="h-[1px] w-10 sm:w-16 bg-[#087A50]/35"
            />
            <span className="inline-flex items-center px-4 py-1.5 rounded-[9999px] bg-[#DCEEDF] border border-[#087A50]/20 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#087A50]">
              STRAIGHTFORWARD PROCESS
            </span>
            <span
              aria-hidden="true"
              className="h-[1px] w-10 sm:w-16 bg-[#087A50]/35"
            />
          </div>

          <h2
            id="how-booking-works-heading"
            className="text-[34px] sm:text-[44px] xl:text-[52px] font-extrabold text-[#111B32] tracking-[-0.025em] leading-[1.1]"
          >
            How booking works
          </h2>

          <p className="mt-3.5 sm:mt-4 text-[15.5px] sm:text-[17px] lg:text-[18px] text-[#536176] font-normal leading-[1.6] max-w-[660px] mx-auto">
            No broker negotiations, no confusing hidden charges, and no rigid traditional lease
            agreements.
          </p>

          <div
            aria-hidden="true"
            className="mt-5 mx-auto w-14 h-[2.5px] rounded-[9999px] bg-[#087A50]"
          />
        </header>

        {/* Three Horizontal Booking Cards with Interstitial Circular Arrows */}
        <div className="stayzy-how-flow">
          {/* ==================== CARD 01 ==================== */}
          <article className="group flex-1 relative flex items-stretch justify-between overflow-hidden rounded-[24px] bg-[#FFFFFF] border border-[#E9D8C6] shadow-[0_12px_34px_rgba(17,27,50,0.06),0_2px_6px_rgba(17,27,50,0.03)] hover:shadow-[0_20px_44px_rgba(8,122,80,0.10)] hover:-translate-y-1 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none min-h-[340px] sm:min-h-[390px] xl:min-h-[420px]">
            <div className="relative z-10 w-[55%] xl:w-[54%] p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="text-[34px] sm:text-[38px] xl:text-[42px] font-extrabold text-[#087A50] leading-none tracking-tight">
                  {BOOKING_STEPS[0].step}
                </div>

                <div
                  className="mt-4 w-11 h-11 rounded-[12px] bg-[#DCEEDF] border border-[#087A50]/15 flex items-center justify-center text-[#087A50] group-hover:bg-[#087A50] group-hover:text-white transition-colors duration-300 motion-reduce:transition-none"
                  aria-hidden="true"
                >
                  <Compass className="w-[22px] h-[22px]" strokeWidth={1.9} />
                </div>

                <h3 className="mt-5 text-[18px] sm:text-[19px] font-bold text-[#111B32] tracking-tight leading-snug">
                  {BOOKING_STEPS[0].title}
                </h3>

                <p className="mt-2.5 text-[13px] sm:text-[13.5px] text-[#536176] leading-[1.58]">
                  {BOOKING_STEPS[0].description}
                </p>
              </div>

              <Link
                href={BOOKING_STEPS[0].ctaHref}
                className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold text-[#087A50] hover:text-[#063B2B] transition-colors group/cta"
              >
                <span className="w-6 h-6 rounded-[9999px] bg-[#DCEEDF] flex items-center justify-center text-[#087A50] group-hover/cta:bg-[#087A50] group-hover/cta:text-white transition-colors shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span>{BOOKING_STEPS[0].ctaLabel}</span>
              </Link>
            </div>

            {/* Right Luxury Bedroom Photograph */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[62%] overflow-hidden bg-[#F5EEE5]">
              <img
                src="/images/stayzy-booking-bedroom.webp"
                alt="Curated modern Stayzy bedroom suite with white linens and green accent pillows"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:transform-none"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, #FFFFFF 0%, #FFFFFF 18%, rgba(255,255,255,0.92) 30%, rgba(255,255,255,0.38) 44%, rgba(255,255,255,0) 58%)",
                }}
              />
            </div>
          </article>

          {/* Connector 01 -> 02 */}
          <div className="stayzy-how-arrow-desktop">
            <StepConnectorArrow direction="right" />
          </div>
          <div className="stayzy-how-arrow-mobile">
            <StepConnectorArrow direction="down" />
          </div>

          {/* ==================== CARD 02 ==================== */}
          <article className="group flex-1 relative flex items-stretch justify-between overflow-hidden rounded-[24px] bg-[#FFFFFF] border border-[#E9D8C6] shadow-[0_12px_34px_rgba(17,27,50,0.06),0_2px_6px_rgba(17,27,50,0.03)] hover:shadow-[0_20px_44px_rgba(8,122,80,0.10)] hover:-translate-y-1 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none min-h-[340px] sm:min-h-[390px] xl:min-h-[420px]">
            <div className="relative z-10 w-[52%] xl:w-[50%] p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="text-[34px] sm:text-[38px] xl:text-[42px] font-extrabold text-[#087A50] leading-none tracking-tight">
                  {BOOKING_STEPS[1].step}
                </div>

                <div
                  className="mt-4 w-11 h-11 rounded-[12px] bg-[#DCEEDF] border border-[#087A50]/15 flex items-center justify-center text-[#087A50] group-hover:bg-[#087A50] group-hover:text-white transition-colors duration-300 motion-reduce:transition-none"
                  aria-hidden="true"
                >
                  <CalendarDays className="w-[22px] h-[22px]" strokeWidth={1.9} />
                </div>

                <h3 className="mt-5 text-[18px] sm:text-[19px] font-bold text-[#111B32] tracking-tight leading-snug">
                  {BOOKING_STEPS[1].title}
                </h3>

                <p className="mt-2.5 text-[13px] sm:text-[13.5px] text-[#536176] leading-[1.58]">
                  {BOOKING_STEPS[1].description}
                </p>
              </div>

              <Link
                href={BOOKING_STEPS[1].ctaHref}
                className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold text-[#087A50] hover:text-[#063B2B] transition-colors group/cta"
              >
                <span className="w-6 h-6 rounded-[9999px] bg-[#DCEEDF] flex items-center justify-center text-[#087A50] group-hover/cta:bg-[#087A50] group-hover/cta:text-white transition-colors shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span>{BOOKING_STEPS[1].ctaLabel}</span>
              </Link>
            </div>

            {/* Right Interactive White Floating Calendar */}
            <div className="w-[48%] xl:w-[50%] relative overflow-visible">
              <DecorativeBookingCalendar />
            </div>
          </article>

          {/* Connector 02 -> 03 */}
          <div className="stayzy-how-arrow-desktop">
            <StepConnectorArrow direction="right" />
          </div>
          <div className="stayzy-how-arrow-mobile">
            <StepConnectorArrow direction="down" />
          </div>

          {/* ==================== CARD 03 ==================== */}
          <article className="stayzy-how-card-third group flex-1 relative flex items-stretch justify-between overflow-hidden rounded-[24px] bg-[#FFFFFF] border border-[#E9D8C6] shadow-[0_12px_34px_rgba(17,27,50,0.06),0_2px_6px_rgba(17,27,50,0.03)] hover:shadow-[0_20px_44px_rgba(8,122,80,0.10)] hover:-translate-y-1 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none min-h-[340px] sm:min-h-[390px] xl:min-h-[420px]">
            <div className="relative z-10 w-[52%] xl:w-[50%] p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="text-[34px] sm:text-[38px] xl:text-[42px] font-extrabold text-[#087A50] leading-none tracking-tight">
                  {BOOKING_STEPS[2].step}
                </div>

                <div
                  className="mt-4 w-11 h-11 rounded-[12px] bg-[#DCEEDF] border border-[#087A50]/15 flex items-center justify-center text-[#087A50] group-hover:bg-[#087A50] group-hover:text-white transition-colors duration-300 motion-reduce:transition-none"
                  aria-hidden="true"
                >
                  <ShieldCheck className="w-[22px] h-[22px]" strokeWidth={1.9} />
                </div>

                <h3 className="mt-5 text-[18px] sm:text-[19px] font-bold text-[#111B32] tracking-tight leading-snug">
                  {BOOKING_STEPS[2].title}
                </h3>

                <p className="mt-2.5 text-[13px] sm:text-[13.5px] text-[#536176] leading-[1.58]">
                  {BOOKING_STEPS[2].description}
                </p>
              </div>

              <Link
                href={BOOKING_STEPS[2].ctaHref}
                className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold text-[#087A50] hover:text-[#063B2B] transition-colors group/cta"
              >
                <span className="w-6 h-6 rounded-[9999px] bg-[#DCEEDF] flex items-center justify-center text-[#087A50] group-hover/cta:bg-[#087A50] group-hover/cta:text-white transition-colors shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span>{BOOKING_STEPS[2].ctaLabel}</span>
              </Link>
            </div>

            {/* Right Booking Confirmation Floating Visual */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[55%] overflow-hidden bg-[#FFFFFF] flex items-center justify-center">
              <img
                src="/images/amenities/hospitality-backdrop.webp"
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-right opacity-50"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, #FFFFFF 0%, rgba(255,255,255,0.88) 18%, rgba(250,247,241,0.38) 54%, rgba(245,238,229,0.18) 100%)",
                }}
              />
              <img
                src="/images/stayzy-booking-confirmation.webp"
                alt="Booking Confirmed card indicating instant Stayzy room reservation and digital keyless access"
                loading="lazy"
                decoding="async"
                className="relative z-10 h-full w-full object-contain object-center transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:transform-none"
                style={{
                  WebkitMaskImage:
                    "radial-gradient(48% 44% at 52% 50%, #000000 78%, transparent 96%)",
                  maskImage:
                    "radial-gradient(48% 44% at 52% 50%, #000000 78%, transparent 96%)",
                }}
              />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
