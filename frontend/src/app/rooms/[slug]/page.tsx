
import React from "react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Footer } from "@/components/common/Footer";
import { RoomDetailsClient } from "./RoomDetailsClient";
import { backendPropertyToFrontendRoom } from "@/lib/api/adapters";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

export async function generateStaticParams() {
  try {
    const roomTypes = await prisma.roomType.findMany({ select: { slug: true } });
    if (!roomTypes || roomTypes.length === 0) {
      return [{ slug: "preview" }];
    }
    return roomTypes.map((rt) => ({ slug: rt.slug }));
  } catch {
    return [{ slug: "preview" }];
  }
}

export default async function RoomDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let property: any = null;

  try {
    const response = await fetch(`${BACKEND_URL}/properties/${slug}`, {
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      property = data.data?.property || data.data;
    }
  } catch (error) {
    console.warn("[RoomDetailsPage] Backend fetch failed, falling back to Prisma:", error);
  }

  let roomProp: any = null;

  if (property) {
    const room = backendPropertyToFrontendRoom(property);
    const backendRoomType = property.room_types?.[0];
    const images = room.images?.length ? room.images : ["/fallback-room.jpg"];
    const keyAmenities = room.keyAmenities || room.amenities || [];
    const availableUnits = room.availableCount ?? 0;

    roomProp = {
      ...room,
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
  } else {
    const rt = await prisma.roomType.findUnique({
      where: { slug },
      include: {
        property: true,
        ratePlans: { where: { isEnabled: true } },
      },
    });

    if (!rt) {
      notFound();
    }

    const images = JSON.parse(rt.images || "[]");
    const keyAmenities = JSON.parse(rt.keyAmenities || "[]");
    const monthlyRate =
      rt.ratePlans.find((r) => r.durationType === "MONTHLY") || rt.ratePlans[0];

    roomProp = {
      ...rt,
      images: images.length > 0 ? images : ["/fallback-room.jpg"],
      coverImage: images[0] || "/fallback-room.jpg",
      keyAmenities,
      amenities: keyAmenities,
      availableUnits: 3,
      availableCount: 3,
      isAvailable: true,
      price: monthlyRate?.price || 0,
      currentRatePlan: monthlyRate,
      ratePlans: rt.ratePlans,
      allRatePlans: rt.ratePlans,
      foodDetails:
        rt.foodDetails ||
        "Nutritious home-cooked meals are available at this property.",
    };
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className="flex-1 bg-white">
        <RoomDetailsClient room={roomProp} initialParams={{}} />
      </main>

      <Footer />
    </div>
  );
}
