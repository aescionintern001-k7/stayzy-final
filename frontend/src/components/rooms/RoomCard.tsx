"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Check,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { isRoomSaved, toggleSaveRoom } from "@/lib/favorites";

interface RoomCardProps {
  room: any;
  durationType?: string;
  onFavoriteToggle?: (isSaved: boolean) => void;
}

export function RoomCard({ room, durationType = "MONTHLY", onFavoriteToggle }: RoomCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(() => isRoomSaved(room.id));

  // Collect images array (minimum 1, default fallback if none)
  const images: string[] = React.useMemo(() => {
    let list: string[] = [];
    if (Array.isArray(room.images) && room.images.length > 0) {
      list = room.images;
    } else if (typeof room.images === "string") {
      try {
        const parsed = JSON.parse(room.images);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      } catch {}
    }

    if (list.length === 0) {
      if (room.coverImage) list.push(room.coverImage);
      else if (room.property?.coverImage) list.push(room.property.coverImage);
      else list.push("/fallback-room.jpg");
    }

    return list;
  }, [room]);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cover = images[0] || room.coverImage || room.property?.coverImage;
    const nowSaved = toggleSaveRoom({
      id: room.id,
      name: room.name,
      slug: room.slug,
      category: room.category,
      property: {
        name: room.property?.name || "Stayzy PG",
        city: room.property?.city || "Bengaluru",
        address: room.property?.address || "",
      },
      image: cover,
      price: room.pricing?.totalPrice || room.currentRatePlan?.price || 12000,
      durationType: durationType as any,
      hasAc: room.hasAc,
    });
    setIsSaved(nowSaved);
    if (onFavoriteToggle) onFavoriteToggle(nowSaved);
  };

  const price = room.pricing?.totalPrice || room.currentRatePlan?.price || 12000;
  const isDaily = durationType === "DAILY" || durationType === "HOURLY";
  const durationLabel =
    durationType === "HOURLY"
      ? "/ hr"
      : durationType === "DAILY"
      ? "/ day"
      : durationType === "WEEKLY"
      ? "/ wk"
      : durationType === "YEARLY"
      ? "/ yr"
      : "/ mo";

  const genderBadge =
    room.genderEligibility === "COLIVING"
      ? { text: "UNISEX", color: "text-emerald-700 bg-emerald-50 border-emerald-200" }
      : room.genderEligibility === "FEMALE"
      ? { text: "WOMEN'S", color: "text-rose-700 bg-rose-50 border-rose-200" }
      : { text: "MEN'S", color: "text-teal-700 bg-teal-50 border-teal-200" };

  const sharingText =
    room.category === "PRIVATE"
      ? "Private Room"
      : room.category === "TWIN_SHARING"
      ? "2 Sharing"
      : "3 Sharing";

  return (
    <Link
      href={`/rooms/${room.slug}?durationType=${durationType}`}
      className="group bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Top Media Area with Multi-Image Slider */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 select-none">
        {/* Active Image */}
        <ImageWithFallback
          src={images[currentImageIndex] || images[0]}
          alt={`${room.name} in ${room.displayLocality || "Bengaluru"}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Carousel Prev & Next Controls (appear on hover) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevImage}
              aria-label="Previous photo"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              aria-label="Next photo"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Pagination Dots at Bottom Right (Zolo screenshot style) */}
            <div className="absolute bottom-2.5 right-3 flex items-center gap-1 z-20 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-xs">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentImageIndex
                      ? "w-3 bg-white"
                      : "w-1.5 bg-white/60 hover:bg-white"
                  }`}
                  aria-label={`Go to photo ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Bottom-Left Stay Type Badge */}
        <div className="absolute bottom-2.5 left-3 z-20">
          <span
            className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
              isDaily
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {isDaily ? "DAILY STAYS AVAILABLE" : "MONTHLY PG"}
          </span>
        </div>

        {/* Wishlist Heart Button (Top-Right) */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-20 backdrop-blur-md transition-transform hover:scale-110 shadow-sm cursor-pointer ${
            isSaved
              ? "bg-white text-rose-600"
              : "bg-white/80 hover:bg-white text-gray-700"
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? "fill-rose-600 text-rose-600" : ""}`} />
        </button>

        {/* Top-Left Sharing Badge */}
        <div className="absolute top-3 left-3 z-20">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-white/95 text-[#111827] shadow-xs border border-gray-200">
            {sharingText}
          </span>
        </div>
      </div>

      {/* Card Content (Bright, Spacious, Zolo style) */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
        <div>
          {/* Title */}
          <h3 className="text-lg sm:text-xl font-black text-[#111827] group-hover:text-emerald-600 transition-colors line-clamp-1">
            {room.name}
          </h3>

          {/* Gender & Locality (e.g. UNISEX PG in Indiranagar) */}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${genderBadge.color}`}>
              {genderBadge.text}
            </span>
            <span className="text-xs font-semibold text-gray-600 line-clamp-1">
              PG in {room.displayLocality || room.property?.city || "Bengaluru"}
            </span>
          </div>
        </div>

        {/* Core Quick Tags (AC, Bath, Meals) */}
        <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-[#374151]">
          {room.hasAc && (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">AC</span>
          )}
          {room.bathroomType === "ATTACHED" && (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">Attached Bath</span>
          )}
          {room.foodIncluded && (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">Food Incl.</span>
          )}
        </div>

        {/* Price & Discount Row */}
        <div className="pt-2 border-t border-gray-100 flex items-end justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 block">Starts at</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-[#111827]">
                ₹{price.toLocaleString("en-IN")}
              </span>
              <span className="text-xs font-medium text-gray-500">{durationLabel}</span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-extrabold">
            <Zap className="w-3 h-3 fill-emerald-600 text-emerald-600" />
            UPTO 10% OFF
          </span>
        </div>

        {/* Locality Landmark / Distance Tag */}
        <div className="pt-1 flex items-center justify-between text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-1 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>Near Metro &amp; Tech Parks</span>
          </div>
          <span className="text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform">
            View &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
