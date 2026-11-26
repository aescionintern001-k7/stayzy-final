import React from "react";

interface StayzyLogoProps {
  variant?: "light" | "dark";
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Official Stayzy Brand Logo (Uploaded S-House Symbol + Wordmark)
 * Supports:
 * - variant="dark": Official dark charcoal logo on transparent background for white/cream/light surfaces
 * - variant="light": High-contrast pure white official logo on transparent background for dark-green surfaces
 */
export function StayzyLogo({
  variant = "dark",
  className = "",
  size = "sm",
}: StayzyLogoProps) {
  const heightClass = {
    sm: "h-7 sm:h-8",
    md: "h-8 sm:h-9",
    lg: "h-10 sm:h-12",
  }[size];

  const src =
    variant === "light"
      ? "/stayzy-logo-official-light.png"
      : "/stayzy-logo-official.png";

  return (
    <div
      className={`inline-flex items-center select-none cursor-pointer group ${className}`}
    >
      <img
        src={src}
        alt="Stayzy"
        width={160}
        height={60}
        decoding="async"
        className={`${heightClass} w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03]`}
      />
    </div>
  );
}
