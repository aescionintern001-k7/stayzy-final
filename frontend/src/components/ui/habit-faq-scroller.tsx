"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import { HelpCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  icon?: LucideIcon;
}

export interface FaqRow {
  id: string;
  speed?: string;
  direction?: "left" | "right";
  repeatSets?: number;
  faqItems: FaqItem[];
}

export interface FaqSectionData {
  badge?: string;
  mainTitle: string;
  highlightedWord?: string;
  mainSubtitle: string;
  rows: FaqRow[];
}

export interface FaqCardProps {
  question: string;
  answer: string;
  icon?: LucideIcon;
  className?: string;
}

export interface HorizontalScrollerProps {
  children: ReactNode;
  speed?: string;
  direction?: "left" | "right";
  repeatSets?: number;
  className?: string;
  ariaLabel?: string;
}

export interface FaqSectionProps {
  data: FaqSectionData;
  sectionId?: string;
  className?: string;
}

type ScrollerTrackStyle = CSSProperties & {
  "--scroll-duration"?: string;
};

/**
 * Reusable card for a single Stayzy hospitality FAQ entry pairing a pale sage
 * circular icon badge on the left with the navy question and muted answer on the right.
 */
export const FaqCard: React.FC<FaqCardProps> = ({
  question,
  answer,
  icon: Icon = HelpCircle,
  className,
}) => {
  return (
    <article
      className={cn(
        "faq-card group flex items-start gap-3.5 sm:gap-4 w-[300px] sm:w-[376px] lg:w-[436px] xl:w-[468px] shrink-0 rounded-[20px] bg-[#FFFFFF] border border-[#E9DFD1] p-5 sm:p-6 shadow-[0_10px_28px_rgba(17,29,53,0.05),0_2px_6px_rgba(17,29,53,0.03)] hover:border-[#087A4B]/35 hover:shadow-[0_16px_34px_rgba(8,122,75,0.08)] transition-all duration-300",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-[9999px] bg-[#E6F3E7] border border-[#087A4B]/12 flex items-center justify-center text-[#087A4B] group-hover:bg-[#087A4B] group-hover:text-white transition-colors duration-300 shrink-0 mt-0.5"
      >
        <Icon className="w-[18px] h-[18px] sm:w-[21px] sm:h-[21px]" strokeWidth={2} />
      </div>

      <div className="min-w-0 flex-1 text-left">
        <h3 className="faq-title text-[15px] sm:text-[16.5px] font-bold text-[#111D35] leading-[1.35] tracking-[-0.01em]">
          {question}
        </h3>
        <p className="faq-answer mt-1.5 text-[13px] sm:text-[14px] text-[#536071] leading-[1.58] font-normal">
          {answer}
        </p>
      </div>
    </article>
  );
};

/**
 * Wraps row cards in a seamless CSS marquee track that pauses cleanly on hover
 * or keyboard focus and falls back to static wrapped layout for reduced motion.
 */
export const HorizontalScroller: React.FC<HorizontalScrollerProps> = ({
  children,
  speed = "50s",
  direction = "left",
  repeatSets = 1,
  className,
  ariaLabel,
}) => {
  const animationClass =
    direction === "right" ? "animate-scroll-horizontal-reverse" : "animate-scroll-horizontal";

  const style: ScrollerTrackStyle = {
    "--scroll-duration": speed,
  };

  const fillerCount = Math.max(0, repeatSets - 1);

  return (
    <div
      className={cn("faq-scroller-row w-full overflow-hidden relative scroller-mask py-1", className)}
      aria-label={ariaLabel}
    >
      <div className={cn("flex", animationClass)} style={style}>
        {/* Primary Half */}
        <div className="faq-scroller-track-primary flex items-stretch flex-shrink-0 gap-4 sm:gap-5 pr-4 sm:pr-5">
          {children}
          {Array.from({ length: fillerCount }).map((_, fillerIdx) => (
            <div
              key={`filler-${fillerIdx}`}
              className="faq-scroller-filler flex items-stretch flex-shrink-0 gap-4 sm:gap-5"
              aria-hidden="true"
            >
              {children}
            </div>
          ))}
        </div>

        {/* Symmetrical Duplicate Half for seamless -50% loop */}
        <div
          className="faq-scroller-track-duplicate flex items-stretch flex-shrink-0 gap-4 sm:gap-5 pr-4 sm:pr-5"
          aria-hidden="true"
        >
          {children}
          {Array.from({ length: fillerCount }).map((_, fillerIdx) => (
            <div
              key={`dup-filler-${fillerIdx}`}
              className="flex items-stretch flex-shrink-0 gap-4 sm:gap-5"
            >
              {children}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Renders the complete Stayzy FAQ band with warm ivory hospitality styling,
 * centered emerald-accented header, subtle architectural circles, and 3 scrolling rows.
 */
export const FaqSection: React.FC<FaqSectionProps> = ({
  data,
  sectionId = "faq",
  className,
}) => {
  const renderHighlightedTitle = () => {
    const { mainTitle, highlightedWord } = data;
    if (!highlightedWord || !mainTitle.includes(highlightedWord)) {
      return mainTitle;
    }

    const idx = mainTitle.indexOf(highlightedWord);
    const before = mainTitle.slice(0, idx);
    const after = mainTitle.slice(idx + highlightedWord.length);

    return (
      <>
        {before}
        <span className="text-[#087A4B]">{highlightedWord}</span>
        {after}
      </>
    );
  };

  return (
    <section
      id={sectionId}
      aria-labelledby={`${sectionId}-heading`}
      className={cn(
        "relative overflow-hidden bg-[#FBF7F0] py-16 sm:py-20 lg:py-24 border-t border-[#E9DFD1]",
        className
      )}
    >
      {/* Subtle Pale Sage & Warm Cream Architectural Corner Geometry */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Top-Left Cream & Pale Sage Circles */}
        <div className="absolute -top-24 left-12 w-[300px] h-[300px] rounded-[9999px] bg-[#F6EFE4]" />
        <div className="absolute -top-20 -left-24 w-[360px] h-[360px] rounded-[9999px] bg-[#E6F3E7]/80" />
        {/* Middle-Right & Bottom-Right Sage + Cream Curves */}
        <div className="absolute top-[30%] -right-28 w-[340px] h-[340px] rounded-[9999px] bg-[#E6F3E7]/75" />
        <div className="absolute -bottom-36 -right-16 w-[380px] h-[380px] rounded-[9999px] bg-[#F6EFE4]" />
        {/* Bottom-Left Pale Sage Curve */}
        <div className="absolute -bottom-28 -left-20 w-[300px] h-[300px] rounded-[9999px] bg-[#E6F3E7]/65" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Centered Premium Stayzy Header */}
        <header className="text-center max-w-[760px] mx-auto mb-11 sm:mb-14">
          {data.badge && (
            <div className="inline-flex items-center justify-center gap-3.5 sm:gap-5 mb-4">
              <span
                aria-hidden="true"
                className="h-[1px] w-10 sm:w-16 bg-[#087A4B]/35"
              />
              <span className="inline-flex items-center px-4 py-1.5 rounded-[9999px] bg-[#E6F3E7] border border-[#087A4B]/20 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#087A4B]">
                {data.badge}
              </span>
              <span
                aria-hidden="true"
                className="h-[1px] w-10 sm:w-16 bg-[#087A4B]/35"
              />
            </div>
          )}

          <h2
            id={`${sectionId}-heading`}
            className="text-[32px] sm:text-[44px] xl:text-[50px] font-extrabold text-[#111D35] tracking-[-0.025em] leading-[1.12]"
          >
            {renderHighlightedTitle()}
          </h2>

          <p className="mt-3.5 sm:mt-4 text-[15px] sm:text-[17px] lg:text-[18px] text-[#536071] font-normal leading-[1.6] max-w-[680px] mx-auto">
            {data.mainSubtitle}
          </p>

          <div
            aria-hidden="true"
            className="mt-5 mx-auto w-14 h-[2.5px] rounded-[9999px] bg-[#087A4B]"
          />
        </header>

        {/* Three Independent Alternating Horizontal Scrolling FAQ Rows */}
        <div className="flex flex-col gap-5 sm:gap-6 w-full">
          {data.rows.map((row, rowIndex) => (
            <HorizontalScroller
              key={row.id}
              speed={row.speed}
              direction={row.direction}
              repeatSets={row.repeatSets ?? (row.faqItems.length < 3 ? 2 : 1)}
              ariaLabel={`Frequently asked questions row ${rowIndex + 1}`}
            >
              {row.faqItems.map((item) => (
                <FaqCard
                  key={item.id}
                  question={item.question}
                  answer={item.answer}
                  icon={item.icon}
                />
              ))}
            </HorizontalScroller>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;

