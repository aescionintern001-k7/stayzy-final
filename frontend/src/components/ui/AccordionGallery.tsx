"use client";

import React, { useState, useEffect } from "react";
import "./AccordionGallery.css";

export interface GalleryItem {
  image: string;
  label?: string;
  link?: string;
  alt?: string;
}

export interface AccordionGalleryProps {
  items?: GalleryItem[];
  defaultIndex?: number;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  orientation?: "horizontal" | "vertical";
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  stagger?: number;
  trigger?: "hover" | "click";
  showLabels?: boolean;
  grayscale?: boolean;
  className?: string;
  onActiveChange?: (index: number) => void;
}

const DEFAULT_ITEMS: GalleryItem[] = [
  { image: "/images/rooms/private-room-main.webp", label: "Master Bedroom" },
  { image: "/images/rooms/private-room-study.webp", label: "Study Desk" },
  { image: "/images/rooms/private-room-detail.webp", label: "Comfort & Linens" },
];

export default function AccordionGallery({
  items = DEFAULT_ITEMS,
  defaultIndex = 0,
  accentColor = "#009B62",
  overlayColor = "#060010",
  textColor = "#ffffff",
  height = 420,
  gap = 12,
  radius = 16,
  expandRatio = 0.55,
  orientation = "horizontal",
  duration = 0.5,
  trigger = "hover",
  showLabels = true,
  grayscale = false,
  className = "",
  onActiveChange,
}: AccordionGalleryProps) {
  const count = items.length;
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), count - 1));

  useEffect(() => {
    setActive(Math.min(Math.max(defaultIndex, 0), count - 1));
  }, [defaultIndex, count]);

  const handleSelect = (idx: number) => {
    setActive(idx);
    onActiveChange?.(idx);
  };

  const r = Math.min(Math.max(expandRatio, 0.2), 0.9);
  const activeGrow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;
  const vertical = orientation === "vertical";

  return (
    <div
      className={`accordion-gallery ${vertical ? "accordion-gallery--vertical" : ""} ${className}`}
      style={
        {
          "--ag-accent": accentColor,
          "--ag-overlay": overlayColor,
          "--ag-text": textColor,
          "--ag-gap": `${gap}px`,
          "--ag-radius": `${radius}px`,
          height: vertical ? "auto" : `${height}px`,
          minHeight: vertical ? `${height}px` : undefined,
        } as React.CSSProperties
      }
    >
      {items.map((item, i) => {
        const isActive = i === active;
        const currentGrow = isActive ? activeGrow : 1;

        return (
          <div
            key={i}
            className={`ag-panel ${isActive ? "is-active" : ""}`}
            style={{
              flexGrow: currentGrow,
              flexShrink: 1,
              flexBasis: "0%",
              transition: `flex-grow ${duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={trigger === "hover" ? () => handleSelect(i) : undefined}
            onClick={() => handleSelect(i)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect(i);
              }
            }}
          >
            <div className="ag-panel__frame" style={{ width: "100%", height: "100%" }}>
              <img
                src={item.image}
                alt={item.alt || item.label || `Gallery ${i + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: grayscale && !isActive ? "grayscale(80%)" : "none",
                  transition: `filter ${duration}s ease, transform ${duration}s ease`,
                  transform: isActive ? "scale(1.04)" : "scale(1)",
                }}
              />
              <div
                className="ag-panel__scrim"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: isActive
                    ? "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)"
                    : "rgba(0,0,0,0.3)",
                  transition: `background ${duration}s ease`,
                }}
              />
              {showLabels && item.label && (
                <div
                  className="ag-panel__label"
                  style={{
                    position: "absolute",
                    bottom: "16px",
                    left: "16px",
                    right: "16px",
                    color: textColor,
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                    opacity: isActive ? 1 : 0.85,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.label}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
