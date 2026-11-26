"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Home, Images, X, ChevronLeft, ChevronRight } from "lucide-react";
import AccordionGallery, { GalleryItem } from "@/components/ui/AccordionGallery";
import { AnimatedText } from "@/components/ui/animated-underline-text-one";
import { ArrowFillButton } from "@/components/ui/arrow-fill-button";
import { Typewriter } from "@/components/ui/typewriter-text";

interface RoomCategory {
  id: string;
  categoryParam: string;
  title: string;
  badge: string;
  description: string;
  mainImage: string;
  price: string;
  features: string[];
  gallery: GalleryItem[];
}

const ROOM_CATEGORIES: RoomCategory[] = [
  {
    id: "private-room",
    categoryParam: "PRIVATE",
    title: "Private Room",
    badge: "Single Occupancy",
    description:
      "Spacious room with a private bed, study desk, attached washroom, and quiet personal space to study or work.",
    mainImage: "/images/rooms/private-room-main.webp?v=4",
    price: "₹18,500",
    features: ["Attached Washroom", "Queen Bed & Desk", "Wardrobe & Balcony"],
    gallery: [
      {
        image: "/images/rooms/private-room-main.webp?v=4",
        label: "Master Bedroom & Queen Bed",
        alt: "Private room master bedroom with queen bed",
      },
      {
        image: "/images/rooms/private-room-study.webp?v=4",
        label: "Dedicated Study Workspace",
        alt: "Private study desk and ergonomic chair",
      },
      {
        image: "/images/rooms/private-room-detail.webp?v=4",
        label: "Premium Linens & Comfort",
        alt: "Comfortable bedding and warm room details",
      },
    ],
  },
  {
    id: "twin-sharing",
    categoryParam: "TWIN_SHARING",
    title: "2 Sharing Room",
    badge: "Twin Sharing",
    description:
      "Comfortable room shared between two people with separate beds, individual study tables, and lockable wardrobes.",
    mainImage: "/images/rooms/twin-sharing-main.webp?v=4",
    price: "₹12,000",
    features: ["Separate Study Desks", "Lockable Wardrobes", "Daily Housekeeping"],
    gallery: [
      {
        image: "/images/rooms/twin-sharing-main.webp?v=4",
        label: "Spacious Twin Bed Layout",
        alt: "Twin sharing bedroom with two separate beds",
      },
      {
        image: "/images/rooms/twin-sharing-study.webp?v=4",
        label: "Individual Study Desks",
        alt: "Dual study desks and personal storage",
      },
      {
        image: "/images/rooms/twin-sharing-detail.webp?v=4",
        label: "Bedside Storage & Comfort",
        alt: "Neat bedding and lockable storage wardrobe",
      },
    ],
  },
  {
    id: "three-sharing",
    categoryParam: "TRIPLE_SHARING",
    title: "3 Sharing Room",
    badge: "Pocket Friendly",
    description:
      "Economical shared accommodation for students and professionals with 3 meals daily, Wi-Fi, and power backup.",
    mainImage: "/images/rooms/three-sharing-main.webp?v=4",
    price: "₹8,500",
    features: ["Low Security Deposit", "High-Speed Wi-Fi", "3 Daily Meals Included"],
    gallery: [
      {
        image: "/images/rooms/three-sharing-main.webp?v=4",
        label: "Modern Shared Bedroom",
        alt: "Three person shared room sleeping layout",
      },
      {
        image: "/images/rooms/three-sharing-common.webp?v=4",
        label: "Shared Living & Dining Lounge",
        alt: "Spacious dining and comfortable seating area",
      },
      {
        image: "/images/rooms/three-sharing-detail.webp?v=4",
        label: "Organized Storage & Beds",
        alt: "Practical storage and comfortable bedding arrangement",
      },
    ],
  },
];

export function ColivingCategoriesSection() {
  const [activeModalRoom, setActiveModalRoom] = useState<RoomCategory | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  // Keyboard navigation & Escape key support
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!activeModalRoom) return;
      if (e.key === "Escape") {
        setActiveModalRoom(null);
      } else if (e.key === "ArrowRight") {
        setActiveGalleryIndex((prev) => (prev + 1) % activeModalRoom.gallery.length);
      } else if (e.key === "ArrowLeft") {
        setActiveGalleryIndex(
          (prev) => (prev - 1 + activeModalRoom.gallery.length) % activeModalRoom.gallery.length
        );
      }
    },
    [activeModalRoom]
  );

  useEffect(() => {
    if (activeModalRoom) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeModalRoom, handleKeyDown]);

  const openGalleryModal = (e: React.MouseEvent, room: RoomCategory, initialIndex = 0) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveModalRoom(room);
    setActiveGalleryIndex(initialIndex);
  };

  return (
    <section className="relative overflow-hidden py-18 sm:py-24 bg-[#F8FAF8] border-y border-[#E5E7EB]">
      {/* Subtle Luxury Organic Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/10 w-[550px] h-[550px] bg-gradient-to-br from-[#EAF7F0] via-[#16C784]/5 to-transparent rounded-full blur-[120px] opacity-80" />
        <div className="absolute -bottom-32 right-1/10 w-[550px] h-[550px] bg-gradient-to-tl from-[#EAF7F0] via-[#009B62]/5 to-transparent rounded-full blur-[140px] opacity-80" />
      </div>

      <div className="relative z-10 w-[calc(100%-32px)] sm:w-[calc(100%-80px)] max-w-[1480px] mx-auto">
        {/* Section Header: Elegant Centered Hotel Aesthetic */}
        <div className="text-center max-w-[850px] mx-auto mb-12 sm:mb-16">
          {/* Eyebrow Pill: FIND YOUR SPACE with Home icon & flanking accent lines */}
          <div className="inline-flex items-center justify-center gap-3 sm:gap-4 mb-3.5">
            <span className="h-[1.5px] w-8 sm:w-14 bg-gradient-to-r from-transparent to-[#009B62]/35 rounded-full" />
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#EAF7F0] border border-[#009B62]/20 shadow-xs">
              <Home className="w-3.5 h-3.5 fill-[#00834F] text-[#00834F]" />
              <span className="text-[11px] font-extrabold tracking-[0.1em] text-[#00834F] uppercase">
                FIND YOUR SPACE
              </span>
            </div>
            <span className="h-[1.5px] w-8 sm:w-14 bg-gradient-to-l from-transparent to-[#009B62]/35 rounded-full" />
          </div>

          {/* Main Heading with Animated Emerald Underline */}
          <AnimatedText
            as="h2"
            text="Choose Your Room Type"
            textClassName="text-3xl sm:text-4xl lg:text-[46px] xl:text-[50px] font-extrabold text-[#111827] tracking-tight leading-[1.15]"
            underlineClassName="text-[#009B62]"
            underlineDuration={1.4}
            underlineStrokeWidth={3}
          />

          {/* Subtitle with Typewriter animation, matched typography & zero layout shift */}
          <p className="mt-5 sm:mt-6 max-w-[740px] mx-auto min-h-[78px] sm:min-h-[62px] flex items-center justify-center text-base sm:text-[18px] lg:text-[19px] text-[#475569] font-medium leading-[1.6]">
            <Typewriter
              text={[
                "Clean, fully-furnished PG rooms with high-speed Wi-Fi, home-cooked food, and daily housekeeping.",
                "Private rooms, twin sharing, and pocket-friendly stays crafted for students and professionals.",
                "Zero brokerage, verified co-living residences, and seamless digital move-in across top tech hubs.",
              ]}
              speed={35}
              deleteSpeed={20}
              delay={2500}
              loop={true}
              cursor="|"
              cursorClassName="text-[#009B62] font-semibold"
              startWhenVisible={true}
            />
          </p>
        </div>

        {/* 3-Card Premium Grid: Max-width 1480px, 28px gap */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-[28px]">
          {ROOM_CATEGORIES.map((cat, index) => {
            const isThirdOnTablet =
              index === 2
                ? "md:col-span-2 md:max-w-md md:mx-auto lg:col-span-1 lg:max-w-none w-full"
                : "w-full";

            return (
              <div
                key={cat.id}
                className={`group bg-white rounded-[16px] border border-[#E5E7EB] overflow-hidden flex flex-col justify-between shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,155,98,0.09),0_4px_12px_rgba(0,0,0,0.03)] hover:border-[#009B62]/45 transition-all duration-300 ease-out hover:-translate-y-2 ${isThirdOnTablet}`}
              >
                <div>
                  {/* High-Resolution Architectural Photography: 270-290px height on desktop */}
                  <div className="relative h-[250px] sm:h-[270px] lg:h-[285px] w-full overflow-hidden bg-gray-100">
                    <Image
                      src={cat.mainImage}
                      alt={cat.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover object-left group-hover:scale-105 transition-transform duration-500 ease-out"
                      priority={index === 0}
                    />

                    {/* Category Badge Pill on Top Left */}
                    <div className="absolute top-4 left-4 z-10 pointer-events-none">
                      <span className="inline-block px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white/95 text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-gray-100 tracking-wide backdrop-blur-xs">
                        {cat.badge}
                      </span>
                    </div>

                    {/* View Room Gallery Action Pill on Bottom Right */}
                    <button
                      type="button"
                      onClick={(e) => openGalleryModal(e, cat)}
                      className="absolute bottom-3.5 right-3.5 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/65 hover:bg-black/85 text-white text-xs font-bold backdrop-blur-md shadow-md border border-white/10 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                      title="View room gallery photographs"
                    >
                      <Images className="w-3.5 h-3.5 text-[#16C784]" />
                      <span>View Gallery (3)</span>
                    </button>
                  </div>

                  {/* Internal Card Content: ~24px padding */}
                  <div className="p-6 sm:p-7 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[22px] sm:text-[24px] lg:text-[25px] font-bold text-[#111827] tracking-tight group-hover:text-[#009B62] transition-colors">
                        {cat.title}
                      </h3>
                    </div>

                    {/* Room Description: 15-16px, line-height 1.6 */}
                    <p className="mt-2.5 text-[14.5px] sm:text-[15.5px] text-[#64748B] leading-[1.6] min-h-[72px]">
                      {cat.description}
                    </p>

                    {/* Features List: Comfortable vertical spacing with emerald checkmarks */}
                    <div className="mt-5 pt-5 border-t border-[#F1F5F9] space-y-3">
                      {cat.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#009B62] flex items-center justify-center shrink-0 shadow-xs">
                            <Check className="w-3 h-3 text-white stroke-[3.5]" />
                          </div>
                          <span className="text-[14px] sm:text-[14.5px] font-medium text-[#334155]">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Premium Pricing Footer: Left Price & Right View Stays */}
                <div className="mt-auto px-6 sm:px-7 py-5 border-t border-[#E5E7EB]/80 flex items-center justify-between bg-white">
                  <div className="text-[14px] sm:text-[15px] text-[#64748B] font-medium">
                    From{" "}
                    <span className="text-xl sm:text-[22px] font-bold text-[#111827] tracking-tight">
                      {cat.price}
                    </span>{" "}
                    / mo
                  </div>
                  <ArrowFillButton
                    as={Link}
                    href={`/rooms?category=${cat.categoryParam}`}
                    btnText="View Stays"
                    variant="secondary"
                    size="sm"
                    bgColor="#F0FDF4"
                    textColor="#009B62"
                    fillBgColor="#009B62"
                    fillTextColor="#ffffff"
                    hoverFillBgColor="#00834F"
                    hoverFillTextColor="#ffffff"
                    arrowColor="#009B62"
                    hoverArrowColor="#ffffff"
                    className="text-[13px] font-bold border border-emerald-200/80 shadow-2xs hover:shadow-xs"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Room Gallery Lightbox Modal */}
      {activeModalRoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${activeModalRoom.title} photo gallery`}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveModalRoom(null)}
        >
          <div
            className="relative w-full max-w-5xl bg-[#111827] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#1F2937]/50">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#009B62] text-white">
                  {activeModalRoom.badge}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {activeModalRoom.title} — Photography Gallery
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalRoom(null)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close gallery modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* AccordionGallery React Bits Component */}
            <div className="p-4 sm:p-6 bg-[#0B0F19]">
              <div className="w-full">
                <AccordionGallery
                  items={activeModalRoom.gallery}
                  defaultIndex={activeGalleryIndex}
                  height={420}
                  gap={12}
                  radius={14}
                  expandRatio={0.58}
                  accentColor="#009B62"
                  overlayColor="#050811"
                  textColor="#FFFFFF"
                  trigger="click"
                  showLabels={true}
                  grayscale={false}
                  onActiveChange={(idx) => setActiveGalleryIndex(idx)}
                />
              </div>

              {/* Thumbnails Navigation Row */}
              <div className="mt-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveGalleryIndex(
                        (prev) =>
                          (prev - 1 + activeModalRoom.gallery.length) %
                          activeModalRoom.gallery.length
                      )
                    }
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs sm:text-sm font-semibold text-gray-300 px-2">
                    {activeGalleryIndex + 1} / {activeModalRoom.gallery.length}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveGalleryIndex((prev) => (prev + 1) % activeModalRoom.gallery.length)
                    }
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Thumbnails */}
                <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1">
                  {activeModalRoom.gallery.map((gItem, gIdx) => (
                    <button
                      key={gIdx}
                      type="button"
                      onClick={() => setActiveGalleryIndex(gIdx)}
                      className={`relative w-16 h-11 sm:w-20 sm:h-13 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                        activeGalleryIndex === gIdx
                          ? "border-[#009B62] ring-2 ring-[#009B62]/30 scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={gItem.image}
                        alt={gItem.label || ""}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  ))}
                </div>

                {/* Direct Action */}
                <Link
                  href={`/rooms?category=${activeModalRoom.categoryParam}`}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#009B62] hover:bg-[#00834F] text-white text-xs sm:text-sm font-bold shadow-md transition-colors"
                >
                  <span>Explore All Stays</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
