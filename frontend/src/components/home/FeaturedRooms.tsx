import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import prisma from "@/lib/prisma";
import { RoomCard } from "@/components/rooms/RoomCard";
import { backendPropertyToFrontendRoom } from "@/lib/api/adapters";
import { BackendProperty } from "@/lib/api/types";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

export async function FeaturedRooms() {
  let displayRooms: any[] = [];

  // 1. Attempt to fetch properties from Express backend
  try {
    const backendRes = await fetch(`${BACKEND_URL}/properties?limit=6`, {
      cache: "no-store",
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      const properties: BackendProperty[] = data.data?.properties || [];
      if (properties.length > 0) {
        displayRooms = properties.map((p) => {
          const adapted = backendPropertyToFrontendRoom(p);
          return {
            id: adapted.id,
            name: adapted.name,
            slug: adapted.slug,
            category: adapted.category,
            genderEligibility: adapted.genderEligibility || "COLIVING",
            displayLocality: adapted.displayLocality,
            hasAc: adapted.hasAc,
            bathroomType: adapted.bathroomType,
            foodIncluded: adapted.foodIncluded,
            availableCount: adapted.availableCount,
            images: adapted.images,
            currentRatePlan: adapted.currentRatePlan,
            property: adapted.property,
          };
        });
      }
    }
  } catch (err) {
    // Backend offline or unreachable
  }

  // 2. Fallback to local database if backend yielded no properties
  if (displayRooms.length === 0) {
    try {
      const roomTypes = await prisma.roomType.findMany({
        take: 6,
        orderBy: { createdAt: "asc" },
        include: {
          property: true,
          ratePlans: {
            where: { isEnabled: true },
          },
          rooms: {
            where: { status: "ACTIVE" },
            include: {
              inventoryUnits: {
                where: { status: "AVAILABLE" },
              },
            },
          },
        },
      });

      displayRooms = roomTypes.map((room) => {
        let images: string[] = [];
        try {
          images = JSON.parse(room.images);
        } catch {
          images = [];
        }
        if (images.length === 0 && room.property?.coverImage) {
          images = [room.property.coverImage];
        }

        const monthlyPlan = room.ratePlans.find((r) => r.durationType === "MONTHLY") || room.ratePlans[0];
        const availableUnits = room.rooms.reduce(
          (acc, r) => acc + r.inventoryUnits.length,
          0
        );

        let displayLocality = room.property.city || "Bengaluru";
        const addr = `${room.property.name} ${room.property.address}`.toLowerCase();
        if (addr.includes("koramangala")) displayLocality = "Koramangala";
        else if (addr.includes("hsr")) displayLocality = "HSR Layout";
        else if (addr.includes("indiranagar")) displayLocality = "Indiranagar";
        else if (addr.includes("whitefield")) displayLocality = "Whitefield";

        return {
          id: room.id,
          name: room.name,
          slug: room.slug,
          category: room.category,
          genderEligibility: (room as any).genderEligibility || "COLIVING",
          displayLocality,
          hasAc: room.hasAc,
          bathroomType: room.bathroomType,
          foodIncluded: room.foodIncluded,
          availableCount: availableUnits,
          images,
          currentRatePlan: monthlyPlan,
          property: room.property,
        };
      });
    } catch {
      displayRooms = [];
    }
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#111827] tracking-tight">
              Featured PG Rooms
            </h2>
            <p className="text-sm sm:text-base text-gray-600 font-medium mt-2 max-w-xl">
              Verified private and shared PG accommodations with home-cooked meals, Wi-Fi, and 24/7 security.
            </p>
          </div>

          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-gray-200 text-xs sm:text-sm font-extrabold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all group shadow-xs hover:shadow"
          >
            <span>View All PGs ({Math.max(displayRooms.length * 3, 12)}+ Stays)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 3-Column Grid with Multi-Image Room Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayRooms.map((cardRoom) => (
            <RoomCard
              key={cardRoom.id}
              room={cardRoom}
              durationType="MONTHLY"
            />
          ))}
        </div>

        {/* Bottom catalogue CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-sm hover:shadow transition-all"
          >
            <span>Explore All Rooms &amp; Beds</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
