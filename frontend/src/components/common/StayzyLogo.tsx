import React from "react";

interface StayzyLogoProps {
  variant?: "light" | "dark";
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Pixel-Perfect Stayzy Brand Logo (Icon + Wordmark)
 * Directly using the Ultra-HD transparent brand asset extracted from the reference design.
 * Features:
 * - Isometric S ribbon with green key tag diamond on top-right
 * - Internal green circuit connector and white terminal dot
 * - Clean modern geometric "Stayzy" wordmark
 * - Retina-ready high-DPI scaling
 */
export function StayzyLogo({
  variant = "light",
  className = "",
  size = "md",
}: StayzyLogoProps) {
  const heightClass = {
    sm: "h-7 sm:h-8",
    md: "h-8 sm:h-9 lg:h-10",
    lg: "h-10 sm:h-12",
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 select-none cursor-pointer group ${className}`}>
      <img
        src="/stayzy-logo.png"
        alt="Stayzy Logo"
        className={`${heightClass} w-auto object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-[1.03]`}
        loading="eager"
      />
    </div>
  );
}
