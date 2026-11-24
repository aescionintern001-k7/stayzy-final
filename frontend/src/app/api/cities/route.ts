import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const letter = searchParams.get("letter")?.toUpperCase();
    const search = searchParams.get("search")?.trim().toLowerCase();
    const countryCode = searchParams.get("country")?.toUpperCase();
    const popularOnly = searchParams.get("popular") === "true";
    const hasProperties = searchParams.get("hasProperties") === "true";

    // Build base filter conditions
    const whereConditions: any = {};

    if (letter && letter !== "ALL" && /^[A-Z]$/.test(letter)) {
      whereConditions.firstLetter = letter;
    }

    if (countryCode && countryCode !== "ALL") {
      whereConditions.country = { code: countryCode };
    }

    if (popularOnly) {
      whereConditions.isPopular = true;
    }

    if (search) {
      whereConditions.OR = [
        { name: { contains: search } },
        { region: { name: { contains: search } } },
        { country: { name: { contains: search } } },
      ];
    }

    if (hasProperties) {
      whereConditions.properties = {
        some: {},
      };
    }

    // 1. Fetch filtered cities
    const cities = await prisma.locationCity.findMany({
      where: whereConditions,
      include: {
        country: {
          select: { id: true, code: true, name: true },
        },
        region: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { properties: true },
        },
      },
      orderBy: [
        { name: "asc" },
      ],
    });

    // 2. Compute letter counts (A-Z) for current country & search context
    const letterCountBaseWhere: any = {};
    if (countryCode && countryCode !== "ALL") {
      letterCountBaseWhere.country = { code: countryCode };
    }
    if (search) {
      letterCountBaseWhere.OR = [
        { name: { contains: search } },
        { region: { name: { contains: search } } },
        { country: { name: { contains: search } } },
      ];
    }

    const allMatchingForLetters = await prisma.locationCity.groupBy({
      by: ["firstLetter"],
      where: letterCountBaseWhere,
      _count: { _all: true },
    });

    const letterCounts: Record<string, number> = {};
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    for (const char of ALPHABET) {
      letterCounts[char] = 0;
    }
    for (const item of allMatchingForLetters) {
      if (item.firstLetter && letterCounts[item.firstLetter] !== undefined) {
        letterCounts[item.firstLetter] = item._count._all;
      }
    }

    // 3. Get list of available countries with counts
    const countriesWithCounts = await prisma.locationCountry.findMany({
      include: {
        _count: {
          select: { cities: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      total: cities.length,
      currentLetter: letter || "ALL",
      cities: cities.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        firstLetter: c.firstLetter,
        country: c.country,
        region: c.region,
        propertyCount: c._count.properties,
        isPopular: c.isPopular,
      })),
      letterCounts,
      countries: countriesWithCounts.map((cn) => ({
        id: cn.id,
        code: cn.code,
        name: cn.name,
        cityCount: cn._count.cities,
      })),
    });
  } catch (error: any) {
    console.error("Error in /api/cities:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cities", details: error.message },
      { status: 500 }
    );
  }
}

