import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { backendPropertyToFrontendRoom } from "@/lib/api/adapters";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    // 1. If slug is a UUID, attempt to query authoritative Express backend
    if (UUID_REGEX.test(slug)) {
      try {
        const backendRes = await fetch(`${BACKEND_URL}/properties/${slug}`, {
          cache: "no-store",
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          const property = data.data?.property || data.data;
          if (property) {
            const adapted = backendPropertyToFrontendRoom(property);
            return NextResponse.json({
              success: true,
              room: adapted,
              source: "express_backend",
            });
          }
        }
      } catch (err) {
        console.warn(`[Rooms API] Failed fetching property ${slug} from backend, checking local db`);
      }
    }

    // 2. Query local database by slug or id
    const roomType = await prisma.roomType.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
      include: {
        property: true,
        ratePlans: {
          where: { isEnabled: true },
        },
        rooms: {
          where: { status: "ACTIVE" },
          include: {
            inventoryUnits: true,
          },
        },
      },
    });

    if (!roomType) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    let parsedImages: string[] = [];
    try {
      parsedImages = JSON.parse(roomType.images);
    } catch {
      parsedImages = [];
    }

    let parsedAmenities: string[] = [];
    try {
      parsedAmenities = JSON.parse(roomType.keyAmenities);
    } catch {
      parsedAmenities = [];
    }

    const totalUnits = roomType.rooms.reduce(
      (acc, r) => acc + r.inventoryUnits.length,
      0
    );

    return NextResponse.json({
      success: true,
      room: {
        ...roomType,
        images: parsedImages,
        keyAmenities: parsedAmenities,
        totalUnits,
      },
      source: "local_prisma",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
