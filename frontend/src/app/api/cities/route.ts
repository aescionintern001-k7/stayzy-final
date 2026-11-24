import { NextResponse } from "next/server";
import { A_TO_Z_CITIES, QuickCity } from "@/lib/cities-data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const letter = searchParams.get("letter")?.toUpperCase();
    const search = searchParams.get("search")?.trim().toLowerCase();
    const country = searchParams.get("country");
    const popularOnly = searchParams.get("popular") === "true";

    // 1. Gather all cities
    let allCities: (QuickCity & { id: string; slug: string; firstLetter: string; propertyCount: number })[] = [];
    for (const [char, list] of Object.entries(A_TO_Z_CITIES)) {
      for (const city of list) {
        allCities.push({
          ...city,
          id: `${char}-${city.name.toLowerCase().replace(/\s+/g, "-")}`,
          slug: city.name.toLowerCase().replace(/\s+/g, "-"),
          firstLetter: char,
          propertyCount: city.hasStays ? 8 : city.isPopular ? 3 : 0,
        });
      }
    }

    // 2. Filter
    let filtered = allCities;

    if (letter && letter !== "ALL" && /^[A-Z]$/.test(letter)) {
      filtered = filtered.filter((c) => c.firstLetter === letter);
    }

    if (country && country !== "ALL") {
      filtered = filtered.filter(
        (c) => c.country.toLowerCase() === country.toLowerCase()
      );
    }

    if (popularOnly) {
      filtered = filtered.filter((c) => c.isPopular);
    }

    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.country.toLowerCase().includes(search) ||
          (c.region && c.region.toLowerCase().includes(search))
      );
    }

    // 3. Compute letter counts
    const letterCounts: Record<string, number> = {};
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    for (const char of ALPHABET) {
      letterCounts[char] = (A_TO_Z_CITIES[char] || []).length;
    }

    // 4. Distinct countries
    const countryCounts: Record<string, number> = {};
    for (const c of allCities) {
      countryCounts[c.country] = (countryCounts[c.country] || 0) + 1;
    }
    const countries = Object.entries(countryCounts).map(([name, count]) => ({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      code: name.slice(0, 2).toUpperCase(),
      name,
      cityCount: count,
    }));

    return NextResponse.json({
      success: true,
      total: filtered.length,
      currentLetter: letter || "ALL",
      cities: filtered.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        firstLetter: c.firstLetter,
        country: { name: c.country, code: c.country.slice(0, 2).toUpperCase() },
        region: c.region ? { name: c.region } : null,
        propertyCount: c.propertyCount,
        isPopular: !!c.isPopular,
      })),
      letterCounts,
      countries,
    });
  } catch (error: any) {
    console.error("Error in /api/cities:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch cities", details: error.message },
      { status: 500 }
    );
  }
}
