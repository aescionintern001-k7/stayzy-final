import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findAvailableUnits } from "@/lib/inventory";
import { calculateBookingPricing } from "@/lib/pricing";
import { DurationType } from "@/lib/types";
import { backendPropertyToFrontendRoom } from "@/lib/api/adapters";
import { BackendProperty } from "@/lib/api/types";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const durationType = (searchParams.get("durationType") || "MONTHLY") as DurationType;
    const propertyId = searchParams.get("propertyId");
    const city = searchParams.get("city");
    const locality = searchParams.get("locality");
    const category = searchParams.get("category");
    const hasAc = searchParams.get("hasAc");
    const bathroomType = searchParams.get("bathroomType");
    const foodIncluded = searchParams.get("foodIncluded");
    const minBudget = searchParams.get("minBudget") ? Number(searchParams.get("minBudget")) : undefined;
    const maxBudget = searchParams.get("maxBudget") ? Number(searchParams.get("maxBudget")) : undefined;
    const availableOnly = searchParams.get("availableOnly") === "true";
    const sortBy = searchParams.get("sortBy") || "recommended";
    const startDate = searchParams.get("startDate") || new Date().toISOString().split("T")[0];
    const startTime = searchParams.get("startTime") || "10:00";
    const durationCount = Number(searchParams.get("durationCount") || 1);

    // 1. Attempt authoritative Express backend search
    try {
      const backendQuery = new URLSearchParams();
      if (city && city !== "ALL" && city.trim() !== "") {
        backendQuery.set("city", city.trim());
      }
      if (minBudget !== undefined && minBudget > 0) {
        backendQuery.set("min_price", String(minBudget));
      }
      if (maxBudget !== undefined && maxBudget > 0) {
        backendQuery.set("max_price", String(maxBudget));
      }
      if (sortBy === "price_asc" || sortBy === "price_desc" || sortBy === "newest") {
        backendQuery.set("sort_by", sortBy);
      }
      backendQuery.set("limit", "50");

      const backendRes = await fetch(`${BACKEND_URL}/properties/search?${backendQuery.toString()}`, {
        cache: "no-store",
      });

      if (backendRes.ok) {
        const backendData = await backendRes.json();
        const properties: BackendProperty[] = backendData.data?.properties || [];

        if (properties.length > 0) {
          const adaptedRooms = properties.map((p) => {
            const adapted = backendPropertyToFrontendRoom(p);
            return {
              ...adapted,
              // Match frontend category filter if requested
              isAvailable: p.is_available ?? true,
              availableCount: p.is_available ? 3 : 0,
            };
          });

          let filtered = adaptedRooms;
          if (availableOnly) {
            filtered = filtered.filter((r) => r.isAvailable);
          }

          return NextResponse.json({
            success: true,
            rooms: filtered,
            total: filtered.length,
            source: "express_backend",
          });
        }
      }
    } catch (err) {
      // Backend not running or search query failed; fall through to local database
      console.warn("[Rooms API] Express backend unavailable, falling back to local database");
    }

    // 2. Local database fallback
    const whereClause: any = {};

    if (propertyId && propertyId !== "ALL") {
      whereClause.propertyId = propertyId;
    }

    // City filtering
    if (city && city !== "ALL" && city.trim() !== "") {
      whereClause.property = {
        OR: [
          { city: { contains: city } },
          { address: { contains: city } },
          { state: { contains: city } },
          { locationCity: { name: { contains: city } } },
        ],
      };
    }

    // Category mapping
    if (category && category !== "ALL") {
      const catUpper = category.toUpperCase();
      if (catUpper === "HOSTEL") {
        whereClause.OR = [
          { category: "TWIN_SHARING" },
          { category: "TRIPLE_SHARING" },
          { name: { contains: "Hostel" } },
          { description: { contains: "Hostel" } },
          { name: { contains: "Dorm" } },
        ];
      } else if (catUpper === "FLAT") {
        whereClause.OR = [
          { category: "PRIVATE" },
          { name: { contains: "Studio" } },
          { name: { contains: "Flat" } },
          { name: { contains: "Apartment" } },
          { name: { contains: "Suite" } },
        ];
      } else if (catUpper === "SHARED") {
        whereClause.category = { in: ["TWIN_SHARING", "TRIPLE_SHARING"] };
      } else if (catUpper === "PG") {
        // PG matches all rooms
      } else if (catUpper === "STUDIO") {
        whereClause.category = "PRIVATE";
      } else if (catUpper === "PRIVATE" || catUpper === "TWIN_SHARING" || catUpper === "TRIPLE_SHARING") {
        whereClause.category = catUpper;
      }
    }

    if (hasAc === "true") whereClause.hasAc = true;
    if (bathroomType && bathroomType !== "ALL") whereClause.bathroomType = bathroomType;
    if (foodIncluded === "true") whereClause.foodIncluded = true;

    const roomTypes = await prisma.roomType.findMany({
      where: {
        ...whereClause,
        ratePlans: {
          some: {
            durationType,
            isEnabled: true,
          },
        },
      },
      include: {
        property: {
          include: {
            locationCity: true,
          },
        },
        ratePlans: {
          where: { isEnabled: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedRooms = await Promise.all(
      roomTypes.map(async (rt) => {
        if (locality && locality !== "ALL") {
          const propNameAndAddr = `${rt.property.name} ${rt.property.address} ${rt.property.city}`.toLowerCase();
          if (!propNameAndAddr.includes(locality.toLowerCase())) {
            return null;
          }
        }

        const activeRatePlan = rt.ratePlans.find((rp) => rp.durationType === durationType);
        if (!activeRatePlan) return null;

        const pricing = calculateBookingPricing({
          ratePlan: activeRatePlan,
          durationType,
          durationCount,
          startDateStr: startDate,
          startTimeStr: startTime,
        });

        let availableCount = 0;
        let startDateTime: Date | null = null;
        let endDateTime: Date | null = null;

        if (pricing.success) {
          startDateTime = new Date(pricing.breakdown.startDateTime);
          endDateTime = new Date(pricing.breakdown.endDateTime);
          const availableUnits = await findAvailableUnits(rt.id, startDateTime, endDateTime);
          availableCount = availableUnits.length;
        }

        if (availableOnly && availableCount === 0) {
          return null;
        }

        let parsedImages: string[] = [];
        try {
          parsedImages = JSON.parse(rt.images);
        } catch {
          parsedImages = [];
        }

        let parsedAmenities: string[] = [];
        try {
          parsedAmenities = JSON.parse(rt.keyAmenities);
        } catch {
          parsedAmenities = [];
        }

        let displayLocality = rt.property.city || "Bengaluru";
        const addrLower = `${rt.property.address} ${rt.property.name} ${rt.property.city}`.toLowerCase();
        if (addrLower.includes("koramangala")) displayLocality = "Koramangala, Bengaluru";
        else if (addrLower.includes("hsr")) displayLocality = "HSR Layout, Bengaluru";
        else if (addrLower.includes("indiranagar")) displayLocality = "Indiranagar, Bengaluru";
        else if (addrLower.includes("bandra")) displayLocality = "Bandra West, Mumbai";
        else if (addrLower.includes("cyber city") || addrLower.includes("gurugram")) displayLocality = "Cyber City, Gurugram";
        else if (addrLower.includes("hitec") || addrLower.includes("madhapur")) displayLocality = "Hitec City, Hyderabad";
        else if (addrLower.includes("koregaon")) displayLocality = "Koregaon Park, Pune";
        else if (addrLower.includes("omr") || addrLower.includes("sholinganallur")) displayLocality = "OMR, Chennai";

        const genderEligibility =
          rt.name.toLowerCase().includes("women") || rt.description.toLowerCase().includes("female")
            ? "FEMALE"
            : rt.name.toLowerCase().includes("men")
            ? "MALE"
            : "COLIVING";

        return {
          id: rt.id,
          name: rt.name,
          slug: rt.slug,
          category: rt.category,
          description: rt.description,
          sizeSqFt: rt.sizeSqFt,
          baseCapacity: rt.baseCapacity,
          maxCapacity: rt.maxCapacity,
          hasAc: rt.hasAc,
          bathroomType: rt.bathroomType,
          foodIncluded: rt.foodIncluded,
          foodDetails: rt.foodDetails,
          furnishingStatus: "Fully Furnished",
          genderEligibility,
          displayLocality,
          images: parsedImages,
          keyAmenities: parsedAmenities,
          property: {
            id: rt.property.id,
            name: rt.property.name,
            city: rt.property.city,
            address: rt.property.address,
            coverImage: rt.property.coverImage,
            rules: rt.property.rules,
            checkInTime: rt.property.checkInTime,
            checkOutTime: rt.property.checkOutTime,
            contactPhone: rt.property.contactPhone,
            contactEmail: rt.property.contactEmail,
          },
          currentRatePlan: activeRatePlan,
          allRatePlans: rt.ratePlans,
          pricing: pricing.success ? pricing.breakdown : null,
          availableCount,
          isAvailable: availableCount > 0,
          createdAt: rt.createdAt,
        };
      })
    );

    let filtered = enrichedRooms.filter((r): r is NonNullable<typeof r> => r !== null);

    if (minBudget !== undefined) {
      filtered = filtered.filter((r) => (r.pricing?.baseAmount || r.currentRatePlan.price) >= minBudget);
    }
    if (maxBudget !== undefined) {
      filtered = filtered.filter((r) => (r.pricing?.baseAmount || r.currentRatePlan.price) <= maxBudget);
    }

    if (sortBy === "price_asc") {
      filtered.sort((a, b) => a.currentRatePlan.price - b.currentRatePlan.price);
    } else if (sortBy === "price_desc") {
      filtered.sort((a, b) => b.currentRatePlan.price - a.currentRatePlan.price);
    } else if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      filtered.sort((a, b) => {
        if (a.availableCount > 0 && b.availableCount === 0) return -1;
        if (a.availableCount === 0 && b.availableCount > 0) return 1;
        return a.currentRatePlan.price - b.currentRatePlan.price;
      });
    }

    return NextResponse.json({
      success: true,
      rooms: filtered,
      total: filtered.length,
      source: "local_prisma",
    });
  } catch (error: any) {
    console.error("Error in /api/rooms:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
