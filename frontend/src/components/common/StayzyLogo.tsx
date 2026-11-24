import React from "react";

interface StayzyLogoProps {
  variant?: "light" | "dark";
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Pixel-Perfect Stayzy Brand Logo (Icon + Wordmark)
 * Supports:
 * - variant="dark": High-contrast #263442 wordmark for white navbar capsules and light backgrounds
 * - variant="light": Pure white wordmark for dark headers and footer
 */
export function StayzyLogo({
  variant = "dark",
  className = "",
  size = "sm",
}: StayzyLogoProps) {
  const iconSizeClass = {
    sm: "w-6 h-6 sm:w-7 sm:h-7",
    md: "w-7 h-7 sm:w-8 sm:h-8",
    lg: "w-9 h-9 sm:w-10 sm:h-10",
  }[size];

  const textSizeClass = {
    sm: "text-lg sm:text-xl",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl",
  }[size];

  return (
    <div
      className={`inline-flex items-center gap-1.5 sm:gap-2 select-none cursor-pointer group ${className}`}
    >
      {/* Stayzy S-House Ribbon Brand Icon (Isometric Gable Roof + Diamond Key Tag) */}
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSizeClass} shrink-0 transition-transform duration-200 group-hover:scale-105`}
        aria-hidden="true"
      >
        {/* Gable Roof & House Contour */}
        <path
          d="M18 4L31 13.5V28C31 29.38 29.88 30.5 28.5 30.5H7.5C6.12 30.5 5 29.38 5 28V13.5L18 4Z"
          stroke="#009B70"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#009B70"
          fillOpacity="0.08"
        />
        {/* Smooth Stylized S Ribbon Centerpiece */}
        <path
          d="M23 13.5H15C13.34 13.5 12 14.84 12 16.5C12 18.16 13.34 19.5 15 19.5H21C22.66 19.5 24 20.84 24 22.5C24 24.16 22.66 25.5 21 25.5H13"
          stroke="#009B70"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Diamond Key / Room Indicator Accent */}
        <rect
          x="26"
          y="6.5"
          width="4"
          height="4"
          rx="1"
          transform="rotate(45 28 8.5)"
          fill="#00B981"
        />
      </svg>

      {/* Brand Wordmark Text */}
      <span
        className={`${textSizeClass} font-black tracking-tight font-sans transition-colors ${
          variant === "light"
            ? "text-white group-hover:text-emerald-300"
            : "text-[#263442] group-hover:text-[#009B70]"
        }`}
      >
        Stayzy
      </span>
    </div>
  );
}
