
import React from "react";
import { notFound } from "next/navigation";
import { DemoBanner } from "@/components/common/DemoBanner";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { RoomDetailsClient } from "./RoomDetailsClient";
import { backendPropertyToFrontendRoom } from "@/lib/api/adapters";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

export default async function RoomDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let property: any;

  try {
    const response = await fetch(`${BACKEND_URL}/properties/${slug}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      notFound();
    }

    const data = await response.json();
    property = data.data?.property || data.data;

    if (!property) {
      notFound();
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_HTTP_ERROR")) {
      throw error;
    }

    console.error("[RoomDetailsPage] Backend fetch failed:", error);
    notFound();
  }

  const room = backendPropertyToFrontendRoom(property);

  const backendRoomType = property.room_types?.[0];

  const images = room.images?.length
    ? room.images
    : ["/fallback-room.jpg"];

  const keyAmenities = room.keyAmenities || room.amenities || [];

  const availableUnits = room.availableCount ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <DemoBanner />
      <Navbar />

      <main className="flex-1 bg-white">
        <RoomDetailsClient
          room={{
            ...room,
            images,
            keyAmenities,
            availableUnits,
            sizeSqFt: backendRoomType?.size_sq_ft ?? 0,
            maxCapacity:
              backendRoomType?.max_capacity ??
              property.max_guests ??
              1,
            foodDetails:
              backendRoomType?.food_details ||
              "Nutritious home-cooked meals are available at this property.",
            property: {
              ...room.property,
              slug: property.id,
              checkInTime: property.check_in_time || "12:00 PM",
              checkOutTime: property.check_out_time || "11:00 AM",
              contactPhone: property.host?.phone || "",
            },
          }}
          initialParams={{}}
        />
      </main>

      <Footer />
    </div>
  );
}
