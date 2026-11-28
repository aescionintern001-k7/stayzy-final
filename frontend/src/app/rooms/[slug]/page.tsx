import React from "react";
import { notFound } from "next/navigation";
import { Footer } from "@/components/common/Footer";
import { RoomDetailsClient } from "./RoomDetailsClient";
import { backendPropertyToFrontendRoom } from "@/lib/api/adapters";
import { getServerBackendUrl } from "@/lib/api/config";

export const dynamic = "force-dynamic";

export default async function RoomDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let property: any = null;

  try {
    const response = await fetch(`${getServerBackendUrl()}/properties/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      property = data.data?.property || data.data;
    }
  } catch (error) {
    console.warn("[RoomDetailsPage] Backend fetch failed:", error);
  }

  if (!property) {
    notFound();
  }

  const room = backendPropertyToFrontendRoom(property);
  const backendRoomType = property.room_types?.[0];
  const images = room.images?.length ? room.images : ["/fallback-room.jpg"];
  const keyAmenities = room.keyAmenities || room.amenities || [];
  const availableUnits = room.availableCount ?? 0;

  const roomProp = {
    ...room,
    roomTypeId: backendRoomType?.id || room.roomTypeId || room.id,
    images,
    keyAmenities,
    availableUnits,
    sizeSqFt: backendRoomType?.size_sq_ft ?? 0,
    maxCapacity:
      backendRoomType?.max_capacity ?? property.max_guests ?? 1,
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
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFAF4]">
      <main className="flex-1 bg-[#FCFAF4]">
        <RoomDetailsClient room={roomProp} initialParams={{}} />
      </main>

      <Footer />
    </div>
  );
}
