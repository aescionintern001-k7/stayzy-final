import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAdmin, JWT_COOKIE_NAME } from "@/lib/auth";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    // 1. Attempt authoritative Express backend
    const cookieStore = await cookies();
    const token =
      cookieStore.get(JWT_COOKIE_NAME)?.value ||
      cookieStore.get("token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (token && token.includes(".")) {
      try {
        const backendRes = await fetch(`${BACKEND_URL}/admin/properties`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          const properties = data.data?.properties || [];
          if (properties.length > 0) {
            return NextResponse.json({
              success: true,
              properties,
              source: "express_backend",
            });
          }
        }
      } catch (backendErr) {
        console.warn("[Admin Properties API] Express backend unreachable, using local fallback");
      }
    }

    // 2. Local fallback
    const properties = await prisma.property.findMany({
      include: {
        roomTypes: {
          include: {
            rooms: {
              include: {
                inventoryUnits: true,
              },
            },
          },
        },
        _count: {
          select: {
            bookings: true,
            visitRequests: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, properties, source: "local_prisma" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const {
      id,
      name,
      slug,
      tagline,
      description,
      address,
      city,
      state,
      pincode,
      contactPhone,
      contactEmail,
      rules,
      checkInTime,
      checkOutTime,
      timezone,
      coverImage,
    } = body;

    if (!name || !address || !contactPhone || !contactEmail) {
      return NextResponse.json(
        { error: "Name, address, contact phone, and contact email are required." },
        { status: 400 }
      );
    }

    let property;
    if (id) {
      property = await prisma.property.update({
        where: { id },
        data: {
          name,
          tagline,
          description: description || "",
          address,
          city: city || "Bengaluru",
          state: state || "Karnataka",
          pincode: pincode || "560034",
          contactPhone,
          contactEmail,
          rules,
          checkInTime: checkInTime || "12:00 PM",
          checkOutTime: checkOutTime || "11:00 AM",
          timezone: timezone || "Asia/Kolkata",
          coverImage: coverImage || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
        },
      });

      await prisma.auditLog.create({
        data: {
          adminEmail: admin.email,
          action: "UPDATE_PROPERTY",
          entityType: "Property",
          entityId: id,
          details: `Updated property settings for ${name}`,
        },
      });
    } else {
      const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      property = await prisma.property.create({
        data: {
          name,
          slug: generatedSlug,
          tagline,
          description: description || "Modern coliving property with fully furnished rooms.",
          address,
          city: city || "Bengaluru",
          state: state || "Karnataka",
          pincode: pincode || "560034",
          contactPhone,
          contactEmail,
          rules: rules || "Quiet hours after 10 PM. Visitors allowed in lounge until 8 PM.",
          checkInTime: checkInTime || "12:00 PM",
          checkOutTime: checkOutTime || "11:00 AM",
          timezone: timezone || "Asia/Kolkata",
          coverImage: coverImage || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
          images: JSON.stringify([
            coverImage || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
          ]),
        },
      });

      await prisma.auditLog.create({
        data: {
          adminEmail: admin.email,
          action: "CREATE_PROPERTY",
          entityType: "Property",
          entityId: property.id,
          details: `Created new property: ${name}`,
        },
      });
    }

    return NextResponse.json({ success: true, property, message: "Property saved successfully." });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
