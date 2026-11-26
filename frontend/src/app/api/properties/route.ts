import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_PROPERTIES } from "@/lib/mock-data";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1";

/**
 * Public property directory endpoint used by property visit & location selectors.
 * Tries Express backend first, then local Prisma SQLite database, then seed fallback.
 */
export async function GET() {
  try {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/properties?limit=50`, {
        cache: "no-store",
      });
      if (backendRes.ok) {
        const json = await backendRes.json();
        const list = json.data?.properties || json.properties || [];
        if (Array.isArray(list) && list.length > 0) {
          const normalized = list.map((p: any) => ({
            id: p.id,
            name: p.title || p.name,
            slug: p.slug || p.id,
            city: p.city || "Bengaluru",
            address: p.address || "",
          }));
          return NextResponse.json({
            success: true,
            properties: normalized,
            source: "express_backend",
          });
        }
      }
    } catch {
      // Backend optional offline fallback
    }

    const dbProps = await prisma.property.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        address: true,
      },
      orderBy: { name: "asc" },
    });

    if (dbProps.length > 0) {
      return NextResponse.json({
        success: true,
        properties: dbProps,
        source: "local_prisma",
      });
    }

    return NextResponse.json({
      success: true,
      properties: INITIAL_PROPERTIES.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        city: p.city,
        address: p.address,
      })),
      source: "initial_seed",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch properties." },
      { status: 500 }
    );
  }
}

