import pool from "../../database/pool.js";
import { A_TO_Z_CITIES } from "./cities.data.js";

const CITY_ALIASES = {
  bangalore: "bengaluru",
  gurgaon: "gurugram",
  "delhi ncr": "delhi",
};

const normalizeCityKey = (name = "") => {
  const lower = String(name).trim().toLowerCase();
  return CITY_ALIASES[lower] || lower;
};

const CITY_COUNTS_TTL_MS = 60 * 1000;
let cachedCityCounts = null;
let cachedCityCountsExpiresAt = 0;
let cityCountsInFlight = null;

const getCityCountMap = async () => {
  const now = Date.now();
  if (cachedCityCounts && now < cachedCityCountsExpiresAt) {
    return cachedCityCounts;
  }
  if (cityCountsInFlight) {
    return cityCountsInFlight;
  }
  cityCountsInFlight = (async () => {
    try {
      const countsRes = await pool.query(`
        SELECT
          LOWER(TRIM(p.city)) AS city_key,
          COUNT(DISTINCT p.id)::int AS property_count,
          COUNT(DISTINCT rt.id)::int AS room_type_count
        FROM properties p
        LEFT JOIN room_types rt ON rt.property_id = p.id AND rt.is_active = TRUE
        WHERE p.status = 'active' AND p.is_available = TRUE
        GROUP BY LOWER(TRIM(p.city))
      `);

      const countMap = new Map();
      for (const row of countsRes.rows) {
        const norm = normalizeCityKey(row.city_key);
        const prev = countMap.get(norm) || { propertyCount: 0, roomTypeCount: 0 };
        countMap.set(norm, {
          propertyCount: prev.propertyCount + row.property_count,
          roomTypeCount: prev.roomTypeCount + row.room_type_count,
        });
      }
      cachedCityCounts = countMap;
      cachedCityCountsExpiresAt = Date.now() + CITY_COUNTS_TTL_MS;
      return countMap;
    } finally {
      cityCountsInFlight = null;
    }
  })();
  return cityCountsInFlight;
};

export const listCitiesService = async (query = {}) => {
  const letter = query.letter ? String(query.letter).trim().toUpperCase() : null;
  const search = query.q ? String(query.q).trim().toLowerCase() : null;
  const country = query.country ? String(query.country).trim().toLowerCase() : null;
  const popularOnly = query.popularOnly === "true" || query.popularOnly === true;
  const activeOnly = query.activeOnly === "true" || query.activeOnly === true;

  const countMap = await getCityCountMap();

  const allEntries = [];
  const alphabetCounts = {};
  const byLetter = {};

  for (const [alpha, list] of Object.entries(A_TO_Z_CITIES)) {
    const filteredList = list
      .map((city) => {
        const stats = countMap.get(normalizeCityKey(city.name)) || {
          propertyCount: 0,
          roomTypeCount: 0,
        };
        return {
          ...city,
          letter: alpha,
          propertyCount: stats.propertyCount,
          roomTypeCount: stats.roomTypeCount,
          hasLiveStays: stats.propertyCount > 0 || Boolean(city.hasStays),
          isComingSoon: stats.propertyCount === 0 && normalizeCityKey(city.name) !== "bengaluru",
        };
      })
      .filter((city) => {
        if (letter && alpha !== letter) return false;
        if (country && city.country.toLowerCase() !== country) return false;
        if (popularOnly && !city.isPopular) return false;
        if (activeOnly && city.propertyCount === 0) return false;
        if (
          search &&
          !city.name.toLowerCase().includes(search) &&
          !city.country.toLowerCase().includes(search) &&
          !(city.region || "").toLowerCase().includes(search)
        ) {
          return false;
        }
        return true;
      });

    alphabetCounts[alpha] = filteredList.length;
    if (filteredList.length > 0) {
      byLetter[alpha] = filteredList;
      allEntries.push(...filteredList);
    }
  }

  return {
    cities: allEntries,
    byLetter,
    alphabetCounts,
    total: allEntries.length,
    letters: Object.keys(A_TO_Z_CITIES),
  };
};
