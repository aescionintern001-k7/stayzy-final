"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Home,
  Images,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CalendarCheck,
  User,
  Users,
  BedDouble,
  LampDesk,
  DoorOpen,
  Lock,
  Sparkles,
  Wifi,
  Utensils,
  Headset,
  CheckCircle2,
  Eye,
  Bath,
  type LucideIcon,
} from "lucide-react";
import AccordionGallery, { GalleryItem } from "@/components/ui/AccordionGallery";
import { Typewriter } from "@/components/ui/typewriter-text";

interface RoomFeature {
  icon: LucideIcon;
  label: string;
}

interface RoomCategory {
  id: string;
  categoryParam: string;
  title: string;
  badge: string;
  badgeIcon: LucideIcon;
  description: string;
  mainImage: string;
  price: string;
  features: RoomFeature[];
  gallery: GalleryItem[];
}

const ROOM_CATEGORIES: RoomCategory[] = [
  {
    id: "private-room",
    categoryParam: "PRIVATE",
    title: "Private Room",
    badge: "Single Occupancy",
    badgeIcon: User,
    description:
      "Enjoy your own personal space with a comfortable private bed, study area, and modern interiors.",
    mainImage: "/images/rooms/private-room-main.webp?v=5",
    price: "₹18,500",
    features: [
      { icon: Bath, label: "Attached Washroom" },
      { icon: LampDesk, label: "Queen Bed & Study Desk" },
      { icon: DoorOpen, label: "Wardrobe & Balcony" },
    ],
    gallery: [
      {
        image: "/images/rooms/private-room-main.webp?v=5",
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
    badgeIcon: Users,
    description:
      "Share a comfortable space with individual sleeping areas and convenient amenities.",
    mainImage: "/images/rooms/twin-sharing-main.webp?v=5",
    price: "₹12,000",
    features: [
      { icon: LampDesk, label: "Separate Study Desks" },
      { icon: Lock, label: "Lockable Wardrobes" },
      { icon: Sparkles, label: "Daily Housekeeping" },
    ],
    gallery: [
      {
        image: "/images/rooms/twin-sharing-main.webp?v=5",
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
    badgeIcon: Users,
    description:
      "An affordable shared living experience with essential comforts and daily meals.",
    mainImage: "/images/rooms/three-sharing-main.webp?v=5",
    price: "₹8,500",
    features: [
      { icon: ShieldCheck, label: "Low Security Deposit" },
      { icon: Wifi, label: "High-Speed Wi-Fi" },
      { icon: Utensils, label: "3 Daily Meals Included" },
    ],
    gallery: [
      {
        image: "/images/rooms/three-sharing-main.webp?v=5",
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

const COMPARISON_ROWS = [
  {
    icon: Eye,
    label: "Privacy",
    values: ["High", "Medium", "Standard"],
  },
  {
    icon: Users,
    label: "Number of Occupants",
    values: ["1", "2", "3"],
  },
  {
    icon: Bath,
    label: "Washroom Availability",
    values: ["Attached", "Shared", "Shared"],
  },
] as const;

const ASSURANCE_ITEMS = [
  { icon: Home, label: "350+ Verified Properties" },
  { icon: CheckCircle2, label: "Zero Brokerage" },
  { icon: Headset, label: "24/7 Support" },
  { icon: Utensils, label: "Chef-Curated Meals" },
] as const;

function RoomCategoryCard({
  cat,
  index,
  onOpenGallery,
}: {
  cat: RoomCategory;
  index: number;
  onOpenGallery: (e: React.MouseEvent, room: RoomCategory, initialIndex: number) => void;
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Automatic infinite 3-second slideshow per room card (staggered start so cards rotate independently); pauses while hovered
  useEffect(() => {
    if (isHovered || cat.gallery.length <= 1) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const startDelay = setTimeout(() => {
      intervalId = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % cat.gallery.length);
      }, 3000);
    }, index * 1000);

    return () => {
      clearTimeout(startDelay);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isHovered, cat.gallery.length, index]);

  const BadgeIcon = cat.badgeIcon;
  const isThirdOnTablet =
    index === 2
      ? "md:col-span-2 md:max-w-[460px] md:mx-auto lg:col-span-1 lg:max-w-none w-full"
      : "w-full";

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group bg-white rounded-[20px] border border-[#E4EAE0] overflow-hidden flex flex-col justify-between shadow-[0_10px_30px_-14px_rgba(20,44,53,0.10)] hover:shadow-[0_20px_42px_-14px_rgba(0,155,104,0.18)] hover:border-[#009B68]/45 transition-all duration-300 ease-out hover:-translate-y-1.5 ${isThirdOnTablet}`}
    >
      <div>
        {/* Smooth Crossfade Infinite Image Slideshow */}
        <div className="relative h-[230px] sm:h-[245px] w-full overflow-hidden bg-[#EDF5E9]">
          {cat.gallery.map((slide, slideIdx) => (
            <div
              key={slide.image}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                slideIdx === currentSlide ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"
              }`}
              aria-hidden={slideIdx !== currentSlide}
            >
              <Image
                src={slide.image}
                alt={slide.alt || cat.title}
                fill
                quality={100}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                priority={index === 0 && slideIdx === 0}
              />
            </div>
          ))}

          {/* Top-Left Category Badge */}
          <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9999px] text-[12px] font-bold bg-white/95 text-[#142C35] shadow-[0_2px_10px_rgba(20,44,53,0.14)] border border-[#E4EAE0]">
              <BadgeIcon className="w-3.5 h-3.5 text-[#009B68]" aria-hidden="true" />
              <span>{cat.badge}</span>
            </span>
          </div>

          {/* Subtle Slide Progress Dots */}
          {cat.gallery.length > 1 && (
            <div className="absolute bottom-4 left-3.5 z-10 flex items-center gap-1.5 pointer-events-none">
              {cat.gallery.map((_, dotIdx) => (
                <span
                  key={dotIdx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    dotIdx === currentSlide
                      ? "w-4 bg-white shadow-xs"
                      : "w-1.5 bg-white/55"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Bottom-Right View Gallery Button */}
          <button
            type="button"
            onClick={(e) => onOpenGallery(e, cat, currentSlide)}
            className="absolute bottom-3.5 right-3.5 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#142C35]/85 hover:bg-[#142C35] text-white text-[12px] font-semibold shadow-md border border-white/15 transition-all duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer"
          >
            <Images className="w-3.5 h-3.5 text-[#00D6A0]" aria-hidden="true" />
            <span>View Gallery ({cat.gallery.length})</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6">
          <h3 className="text-[22px] font-extrabold text-[#142C35] tracking-tight group-hover:text-[#009B68] transition-colors">
            {cat.title}
          </h3>

          <p className="mt-2 text-[14px] text-[#556B73] leading-relaxed md:min-h-[68px] xl:min-h-[46px]">
            {cat.description}
          </p>

          {/* Three Feature Highlights Strip */}
          <div className="mt-4 pt-4 border-t border-[#EDF2EA] grid grid-cols-3 divide-x divide-[#EDF2EA]">
            {cat.features.map((feat) => {
              const FeatIcon = feat.icon;
              return (
                <div
                  key={feat.label}
                  className="px-2 first:pl-0 last:pr-0 flex flex-col items-center text-center gap-1.5"
                >
                  <div className="w-8 h-8 rounded-[10px] bg-[#EDF5E9] flex items-center justify-center text-[#009B68]">
                    <FeatIcon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="text-[11.5px] font-semibold text-[#142C35] leading-snug">
                    {feat.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Separate Pricing Footer */}
      <div className="mt-auto px-5 sm:px-6 py-4 bg-[#F9FAF6] border-t border-[#E8EDE4] flex items-center justify-between gap-3">
        <div>
          <div className="text-[11.5px] font-semibold text-[#64767D]">Starting from</div>
          <div className="flex items-baseline gap-1">
            <span className="text-[21px] sm:text-[22px] font-extrabold text-[#142C35] tracking-tight">
              {cat.price}
            </span>
            <span className="text-[12.5px] font-medium text-[#64767D]">/month</span>
          </div>
        </div>

        <Link
          href={`/rooms?category=${cat.categoryParam}`}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] bg-[#009B68] hover:bg-[#008256] text-white text-[13px] font-bold shadow-[0_6px_16px_-6px_rgba(0,155,104,0.55)] hover:shadow-[0_10px_20px_-6px_rgba(0,155,104,0.65)] transition-all duration-200 shrink-0"
        >
          <span>View Available Stays</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function ColivingCategoriesSection() {
  const [activeModalRoom, setActiveModalRoom] = useState<RoomCategory | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!activeModalRoom || touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const diff = endX - touchStartX.current;
    if (Math.abs(diff) > 45) {
      if (diff < 0) {
        setActiveGalleryIndex((prev) => (prev + 1) % activeModalRoom.gallery.length);
      } else {
        setActiveGalleryIndex(
          (prev) => (prev - 1 + activeModalRoom.gallery.length) % activeModalRoom.gallery.length
        );
      }
    }
    touchStartX.current = null;
  };

  return (
    <section className="relative overflow-hidden py-16 sm:py-22 bg-[#FAF9F2] border-y border-[#E6EAE2]">
      {/* Subtle Outer Sage Ambient & Botanical Accents */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-[9999px] bg-[#EDF5E9]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-[9999px] bg-[#EDF5E9]" />

        {/* Subtle Outer Botanical Leaf Outlines */}
        <svg
          viewBox="0 0 120 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="hidden xl:block absolute top-10 left-0 w-24 h-44 text-[#009B68]/20"
          aria-hidden="true"
        >
          <path
            d="M10 210C18 148 44 92 92 22M36 146C12 130 6 106 20 88C42 96 48 122 36 146ZM62 96C38 82 34 56 48 40C70 48 74 74 62 96Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <svg
          viewBox="0 0 120 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="hidden xl:block absolute top-10 right-0 w-24 h-44 text-[#009B68]/20 scale-x-[-1]"
          aria-hidden="true"
        >
          <path
            d="M10 210C18 148 44 92 92 22M36 146C12 130 6 106 20 88C42 96 48 122 36 146ZM62 96C38 82 34 56 48 40C70 48 74 74 62 96Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="relative z-10 w-[calc(100%-32px)] sm:w-[calc(100%-64px)] max-w-[1320px] mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-[780px] mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center px-4 py-1.5 rounded-[9999px] border border-[#009B68]/35 bg-[#EDF5E9] text-[#009B68] text-[11px] font-extrabold tracking-[0.12em] uppercase mb-4">
            FIND YOUR PERFECT SPACE
          </div>

          <h2 className="text-[32px] sm:text-[42px] lg:text-[46px] font-extrabold text-[#142C35] tracking-tight leading-[1.12]">
            Choose Your <span className="text-[#009B68]">Ideal</span> Room
          </h2>

          <p className="mt-3.5 max-w-[650px] mx-auto min-h-[76px] sm:min-h-[54px] flex items-center justify-center text-[15px] sm:text-[16.5px] text-[#4D636C] font-medium leading-relaxed">
            <Typewriter
              text={[
                "From private spaces to shared living, discover comfortable rooms designed around your lifestyle and budget.",
                "Enjoy fully-furnished PG rooms with high-speed Wi-Fi, chef-prepared meals, and daily housekeeping.",
                "Zero brokerage, verified co-living residences, and flexible stays tailored for students and professionals.",
              ]}
              speed={40}
              deleteSpeed={20}
              delay={2400}
              loop={true}
              cursor="|"
              cursorClassName="text-[#009B68] font-bold"
              startWhenVisible={true}
            />
          </p>

          {/* Compact Horizontal Trust-Indicator Row */}
          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 py-2.5 rounded-[9999px] bg-white border border-[#E4EAE0] shadow-[0_6px_20px_-10px_rgba(20,44,53,0.12)] text-[12.5px] sm:text-[13px] font-semibold text-[#142C35]">
            <span className="inline-flex items-center gap-2">
              <Home className="w-4 h-4 text-[#009B68]" aria-hidden="true" />
              <span>350+ Verified Properties</span>
            </span>
            <span className="hidden sm:inline-block w-px h-4 bg-[#DCE3D8]" aria-hidden="true" />
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#009B68]" aria-hidden="true" />
              <span>Zero Brokerage</span>
            </span>
            <span className="hidden sm:inline-block w-px h-4 bg-[#DCE3D8]" aria-hidden="true" />
            <span className="inline-flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#009B68]" aria-hidden="true" />
              <span>Flexible Stays</span>
            </span>
          </div>
        </div>

        {/* Three Equal-Width Room Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
          {ROOM_CATEGORIES.map((cat, index) => (
            <RoomCategoryCard
              key={cat.id}
              cat={cat}
              index={index}
              onOpenGallery={openGalleryModal}
            />
          ))}
        </div>

        {/* Room Comparison & Stayzy Assurance Section */}
        <div className="mt-8 sm:mt-10 bg-white rounded-[22px] border border-[#E4EAE0] shadow-[0_14px_36px_-16px_rgba(20,44,53,0.10)] p-5 sm:p-8">
          {/* Comparison Heading with Flanking Lines */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="hidden sm:block h-px flex-1 max-w-[140px] bg-[#DCE4D8]" />
            <h3 className="text-[19px] sm:text-[22px] font-extrabold text-[#142C35] text-center tracking-tight">
              Find the Right Space for Your Lifestyle
            </h3>
            <span className="hidden sm:block h-px flex-1 max-w-[140px] bg-[#DCE4D8]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_275px] gap-6 lg:gap-8 items-center">
            {/* Comparison Table */}
            <div className="rounded-[14px] border border-[#E8EDE4] bg-[#FCFDF9] overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#FAF9F2] border-b border-[#E8EDE4]">
                    <th className="py-3 px-4 text-[13px] font-bold text-[#142C35]">
                      <span className="inline-flex items-center gap-2">
                        <BedDouble className="w-4 h-4 text-[#009B68]" aria-hidden="true" />
                        <span>Room Type</span>
                      </span>
                    </th>
                    {ROOM_CATEGORIES.map((cat) => (
                      <th
                        key={cat.id}
                        className="py-3 px-4 text-[13px] font-bold text-[#142C35] text-center"
                      >
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-[#009B68]" aria-hidden="true" />
                          <span>{cat.title}</span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2EC] text-[13.5px]">
                  {COMPARISON_ROWS.map((row) => {
                    const RowIcon = row.icon;
                    return (
                      <tr key={row.label} className="hover:bg-[#FAF9F2]/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#142C35]">
                          <span className="inline-flex items-center gap-2">
                            <RowIcon className="w-4 h-4 text-[#009B68]" aria-hidden="true" />
                            <span>{row.label}</span>
                          </span>
                        </td>
                        {row.values.map((val, idx) => (
                          <td
                            key={idx}
                            className="py-3.5 px-4 text-center font-medium text-[#4D636C]"
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Vertical Divider on Desktop / Horizontal on Mobile */}
            <div className="h-px w-full lg:h-44 lg:w-px bg-[#E4EAE0]" aria-hidden="true" />

            {/* Stayzy Assurance Panel */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#EDF5E9] flex items-center justify-center text-[#009B68] shrink-0">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-[16px] font-extrabold text-[#142C35] leading-tight">
                    Stayzy Assurance
                  </h4>
                  <p className="text-[12.5px] font-medium text-[#556B73] mt-0.5">
                    Trusted spaces. Better living.
                  </p>
                </div>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 pt-1">
                {ASSURANCE_ITEMS.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <li
                      key={item.label}
                      className="flex items-center gap-2.5 text-[13px] font-semibold text-[#142C35]"
                    >
                      <ItemIcon className="w-4 h-4 text-[#009B68] shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
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
            className="relative w-full max-w-5xl bg-[#111827] rounded-[20px] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#1F2937]/50">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-[8px] text-xs font-bold bg-[#009B68] text-white">
                  {activeModalRoom.badge}
                </span>
                <h3 className="text-base sm:text-xl font-bold text-white tracking-tight">
                  {activeModalRoom.title} — Photography Gallery
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalRoom(null)}
                className="p-2 rounded-[10px] bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
                aria-label="Close gallery modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AccordionGallery + Touch Swipe Support */}
            <div
              className="p-4 sm:p-6 bg-[#0B0F19]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="w-full">
                <AccordionGallery
                  items={activeModalRoom.gallery}
                  defaultIndex={activeGalleryIndex}
                  height={420}
                  gap={12}
                  radius={14}
                  expandRatio={0.58}
                  accentColor="#009B68"
                  overlayColor="#050811"
                  textColor="#FFFFFF"
                  trigger="click"
                  showLabels={true}
                  grayscale={false}
                  onActiveChange={(idx) => setActiveGalleryIndex(idx)}
                />
              </div>

              {/* Navigation & Thumbnails Row */}
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
                    className="p-2 rounded-[10px] bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
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
                    className="p-2 rounded-[10px] bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
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
                      className={`relative w-16 h-11 sm:w-20 sm:h-13 rounded-[10px] overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                        activeGalleryIndex === gIdx
                          ? "border-[#009B68] ring-2 ring-[#009B68]/30 scale-105"
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
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#009B68] hover:bg-[#008256] text-white text-xs sm:text-sm font-bold shadow-md transition-colors"
                >
                  <span>View Available Stays</span>
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
