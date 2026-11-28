import pool from "../../database/pool.js";
import {
  calculateBookingPricing,
  getTodayIstYmd,
  addCalendarDays,
} from "../../utils/pricing.js";
import {
  findAvailableUnits,
  countAvailableUnitsByRoomTypes,
} from "../../utils/inventory.js";

const inferLocalityDisplay = (row) => {
  const combined = `${row.property_address || ""} ${row.property_title || ""} ${row.property_city || ""}`.toLowerCase();
  if (combined.includes("koramangala")) return "Koramangala, Bengaluru";
  if (combined.includes("hsr")) return "HSR Layout, Bengaluru";
  if (combined.includes("indiranagar")) return "Indiranagar, Bengaluru";
  if (combined.includes("whitefield")) return "Whitefield, Bengaluru";
  if (combined.includes("bandra")) return "Bandra West, Mumbai";
  if (combined.includes("cyber city") || combined.includes("gurugram"))
    return "Cyber City, Gurugram";
  if (combined.includes("hitec") || combined.includes("madhapur"))
    return "Hitec City, Hyderabad";
  if (combined.includes("koregaon")) return "Koregaon Park, Pune";
  if (combined.includes("omr") || combined.includes("sholinganallur"))
    return "OMR, Chennai";
  return row.property_city || "Bengaluru";
};

const formatRatePlan = (rp) => ({
  id: rp.id,
  duration_type: rp.duration_type,
  durationType: rp.duration_type,
  price: Number.parseFloat(rp.price),
  is_enabled: rp.is_enabled,
  isEnabled: rp.is_enabled,
  min_duration: rp.min_duration,
  minDuration: rp.min_duration,
  max_duration: rp.max_duration,
  maxDuration: rp.max_duration,
  allowed_hours_start: rp.allowed_hours_start,
  allowedHoursStart: rp.allowed_hours_start,
  allowed_hours_end: rp.allowed_hours_end,
  allowedHoursEnd: rp.allowed_hours_end,
  deposit_amount: Number.parseFloat(rp.deposit_amount || 0),
  depositAmount: Number.parseFloat(rp.deposit_amount || 0),
  food_monthly_charge: Number.parseFloat(rp.food_monthly_charge || 0),
  foodMonthlyCharge: Number.parseFloat(rp.food_monthly_charge || 0),
  electricity_rule: rp.electricity_rule,
  electricityRule: rp.electricity_rule,
  notes: rp.notes,
});

export const listRoomsService = async (query = {}) => {
  const {
    city,
    locality,
    search,
    category,
    gender,
    propertyId,
    durationType = "MONTHLY",
    durationCount = 1,
    startDate,
    startTime = "10:00",
    hasAc,
    bathroomType,
    foodIncluded,
    includeFood = false,
    availableOnly = false,
    minBudget,
    maxBudget,
    sortBy = "newest",
    page = 1,
    limit: rawLimit = 50,
  } = query;

  const limit = Math.min(Math.max(Number(rawLimit) || 50, 1), 100);

  const effectiveStartDate =
    startDate || addCalendarDays(getTodayIstYmd(), 1);

  const params = [];
  const conditions = [
    "rt.is_active = TRUE",
    "p.status = 'active'",
    "p.is_available = TRUE",
  ];

  if (propertyId) {
    params.push(propertyId);
    conditions.push(`rt.property_id = $${params.length}`);
  }

  if (city && city.toUpperCase() !== "ALL") {
    params.push(`%${city.trim()}%`);
    conditions.push(`p.city ILIKE $${params.length}`);
  }

  if (locality && locality.toUpperCase() !== "ALL") {
    params.push(`%${locality.trim()}%`);
    conditions.push(
      `(p.address ILIKE $${params.length} OR p.title ILIKE $${params.length} OR p.city ILIKE $${params.length})`
    );
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(
      `(rt.name ILIKE $${params.length} OR rt.description ILIKE $${params.length} OR p.title ILIKE $${params.length} OR p.address ILIKE $${params.length} OR p.city ILIKE $${params.length})`
    );
  }

  if (category && category.toUpperCase() !== "ALL") {
    const catUpper = category.toUpperCase();
    if (catUpper === "HOSTEL") {
      conditions.push(
        "(rt.category IN ('TWIN_SHARING', 'TRIPLE_SHARING', 'DORMITORY') OR rt.name ILIKE '%Hostel%' OR rt.name ILIKE '%Dorm%' OR rt.description ILIKE '%Hostel%')"
      );
    } else if (catUpper === "FLAT") {
      conditions.push(
        "(rt.category IN ('PRIVATE', 'STUDIO') OR rt.name ILIKE '%Studio%' OR rt.name ILIKE '%Flat%' OR rt.name ILIKE '%Apartment%' OR rt.name ILIKE '%Suite%')"
      );
    } else if (catUpper === "SHARED") {
      conditions.push(
        "rt.category IN ('TWIN_SHARING', 'TRIPLE_SHARING', 'DORMITORY')"
      );
    } else if (catUpper === "STUDIO") {
      conditions.push("rt.category IN ('STUDIO', 'PRIVATE')");
    } else if (
      ["PRIVATE", "TWIN_SHARING", "TRIPLE_SHARING", "DORMITORY"].includes(
        catUpper
      )
    ) {
      params.push(catUpper);
      conditions.push(`rt.category = $${params.length}`);
    }
  }

  if (gender && gender.toUpperCase() !== "ALL") {
    params.push(gender.toUpperCase());
    conditions.push(`rt.gender_eligibility = $${params.length}`);
  }

  if (hasAc === true) {
    conditions.push("rt.has_ac = TRUE");
  }

  if (bathroomType && bathroomType.toUpperCase() !== "ALL") {
    params.push(bathroomType.toUpperCase());
    conditions.push(`rt.bathroom_type = $${params.length}`);
  }

  if (foodIncluded === true) {
    conditions.push("rt.food_included = TRUE");
  }

  params.push(durationType);
  const durationParamIdx = params.length;

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const res = await pool.query(
    `
      SELECT
        rt.*,
        p.id AS property_id,
        p.title AS property_title,
        p.description AS property_description,
        p.address AS property_address,
        p.city AS property_city,
        p.state AS property_state,
        p.country AS property_country,
        p.images AS property_images,
        p.tagline AS property_tagline,
        p.rules AS property_rules,
        p.check_in_time AS property_check_in_time,
        p.check_out_time AS property_check_out_time,
        p.gender_policy AS property_gender_policy,
        p.average_rating AS property_rating,
        p.reviews_count AS property_reviews_count,
        COALESCE(
          (
            SELECT json_agg(rp ORDER BY rp.price ASC)
            FROM rate_plans rp
            WHERE rp.room_type_id = rt.id AND rp.is_enabled = TRUE
          ),
          '[]'::json
        ) AS rate_plans_json
      FROM room_types rt
      JOIN properties p ON rt.property_id = p.id
      ${whereClause}
        AND EXISTS (
          SELECT 1
          FROM rate_plans rp_req
          WHERE rp_req.room_type_id = rt.id
            AND rp_req.duration_type = $${durationParamIdx}
            AND rp_req.is_enabled = TRUE
        )
      ORDER BY rt.created_at DESC
    `,
    params
  );

  // Precompute pricing per room and batch availability queries by shared time window (eliminates N+1)
  const prepared = [];
  const windowBatches = new Map();

  for (const row of res.rows) {
    const ratePlans = (
      Array.isArray(row.rate_plans_json) ? row.rate_plans_json : []
    ).map(formatRatePlan);

    const activeRatePlan = ratePlans.find(
      (rp) => rp.durationType === durationType
    );
    if (!activeRatePlan) continue;

    const pricing = calculateBookingPricing({
      ratePlan: activeRatePlan,
      durationType,
      durationCount,
      startDateStr: effectiveStartDate,
      startTimeStr: startTime,
      includeFood: Boolean(includeFood),
    });

    if (pricing.success) {
      const winKey = `${pricing.breakdown.startDateTime}|${pricing.breakdown.endDateTime}`;
      if (!windowBatches.has(winKey)) {
        windowBatches.set(winKey, {
          startDateTime: pricing.breakdown.startDateTime,
          endDateTime: pricing.breakdown.endDateTime,
          roomTypeIds: [],
        });
      }
      windowBatches.get(winKey).roomTypeIds.push(row.id);
    }

    prepared.push({ row, ratePlans, activeRatePlan, pricing });
  }

  const availabilityByRoomType = new Map();
  await Promise.all(
    Array.from(windowBatches.values()).map(async (batch) => {
      const counts = await countAvailableUnitsByRoomTypes(
        batch.roomTypeIds,
        batch.startDateTime,
        batch.endDateTime
      );
      for (const [rtId, cnt] of counts.entries()) {
        availabilityByRoomType.set(rtId, cnt);
      }
    })
  );

  const enriched = prepared.map(({ row, ratePlans, activeRatePlan, pricing }) => {
    const availableCount = pricing.success
      ? availabilityByRoomType.get(row.id) || 0
      : 0;

    if (availableOnly === true && availableCount === 0) {
      return null;
    }

    const propImages = Array.isArray(row.property_images)
      ? row.property_images
      : [];
    const roomImages = Array.isArray(row.images) ? row.images : [];
    const amenities = Array.isArray(row.amenities) ? row.amenities : [];

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
      description: row.description,
      size_sq_ft: row.size_sq_ft,
      sizeSqFt: row.size_sq_ft,
      base_capacity: row.base_capacity,
      baseCapacity: row.base_capacity,
      max_capacity: row.max_capacity,
      maxCapacity: row.max_capacity,
      has_ac: row.has_ac,
      hasAc: row.has_ac,
      bathroom_type: row.bathroom_type,
      bathroomType: row.bathroom_type,
      food_included: row.food_included,
      foodIncluded: row.food_included,
      food_details: row.food_details,
      foodDetails: row.food_details,
      gender_eligibility: row.gender_eligibility || "COLIVING",
      genderEligibility: row.gender_eligibility || "COLIVING",
      furnishingStatus: "Fully Furnished",
      displayLocality: inferLocalityDisplay(row),
      images: roomImages,
      amenities,
      keyAmenities: amenities,
      property: {
        id: row.property_id,
        name: row.property_title,
        title: row.property_title,
        city: row.property_city,
        state: row.property_state,
        country: row.property_country,
        address: row.property_address,
        coverImage: propImages[0] || roomImages[0] || null,
        tagline: row.property_tagline || null,
        rules: row.property_rules || null,
        checkInTime: row.property_check_in_time || "12:00 PM",
        checkOutTime: row.property_check_out_time || "11:00 AM",
        genderPolicy: row.property_gender_policy || "COLIVING",
        averageRating: Number.parseFloat(row.property_rating || 0),
        reviewsCount: Number.parseInt(row.property_reviews_count || 0, 10),
      },
      currentRatePlan: activeRatePlan,
      allRatePlans: ratePlans,
      pricing: pricing.success ? pricing.breakdown : null,
      available_count: availableCount,
      availableCount,
      isAvailable: availableCount > 0,
      created_at: row.created_at,
    };
  });

  let filtered = enriched.filter(Boolean);

  if (minBudget !== undefined) {
    filtered = filtered.filter(
      (r) => (r.pricing?.payableNow ?? r.currentRatePlan.price) >= minBudget
    );
  }
  if (maxBudget !== undefined) {
    filtered = filtered.filter(
      (r) => (r.pricing?.payableNow ?? r.currentRatePlan.price) <= maxBudget
    );
  }

  if (sortBy === "price_asc") {
    filtered.sort(
      (a, b) =>
        (a.pricing?.payableNow ?? a.currentRatePlan.price) -
        (b.pricing?.payableNow ?? b.currentRatePlan.price)
    );
  } else if (sortBy === "price_desc") {
    filtered.sort(
      (a, b) =>
        (b.pricing?.payableNow ?? b.currentRatePlan.price) -
        (a.pricing?.payableNow ?? a.currentRatePlan.price)
    );
  }

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    rooms: paginated,
    total,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: total,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getRoomDetailService = async (slugOrId, query = {}) => {
  const isUuid = UUID_REGEX.test(slugOrId);
  const res = await pool.query(
    `
      SELECT
        rt.*,
        p.id AS property_id,
        p.title AS property_title,
        p.description AS property_description,
        p.address AS property_address,
        p.city AS property_city,
        p.state AS property_state,
        p.country AS property_country,
        p.images AS property_images,
        p.amenities AS property_amenities,
        p.tagline AS property_tagline,
        p.rules AS property_rules,
        p.check_in_time AS property_check_in_time,
        p.check_out_time AS property_check_out_time,
        p.gender_policy AS property_gender_policy,
        p.average_rating AS property_rating,
        p.reviews_count AS property_reviews_count,
        COALESCE(
          (
            SELECT json_agg(rp ORDER BY CASE rp.duration_type
              WHEN 'HOURLY' THEN 1
              WHEN 'DAILY' THEN 2
              WHEN 'WEEKLY' THEN 3
              WHEN 'MONTHLY' THEN 4
              ELSE 5 END)
            FROM rate_plans rp
            WHERE rp.room_type_id = rt.id AND rp.is_enabled = TRUE
          ),
          '[]'::json
        ) AS rate_plans_json
      FROM room_types rt
      JOIN properties p ON rt.property_id = p.id
      WHERE ${isUuid ? "rt.id = $1::uuid" : "rt.slug = $1"}
      LIMIT 1
    `,
    [slugOrId]
  );

  const row = res.rows[0];
  if (!row) {
    const error = new Error("Room type not found");
    error.status = 404;
    throw error;
  }

  const ratePlans = (
    Array.isArray(row.rate_plans_json) ? row.rate_plans_json : []
  ).map(formatRatePlan);

  const chosenDuration =
    query.durationType ||
    ratePlans.find((r) => r.durationType === "MONTHLY")?.durationType ||
    ratePlans[0]?.durationType ||
    "MONTHLY";
  const activePlan =
    ratePlans.find((r) => r.durationType === chosenDuration) || ratePlans[0] || null;

  const effectiveStartDate =
    query.startDate || addCalendarDays(getTodayIstYmd(), 1);
  const pricing = activePlan
    ? calculateBookingPricing({
        ratePlan: activePlan,
        durationType: chosenDuration,
        durationCount: query.durationCount || 1,
        startDateStr: effectiveStartDate,
        startTimeStr: query.startTime || "10:00",
        includeFood: Boolean(query.includeFood),
      })
    : { success: false };

  const availableUnits = pricing.success
    ? await findAvailableUnits(
        row.id,
        pricing.breakdown.startDateTime,
        pricing.breakdown.endDateTime
      )
    : [];

  const reviewsRes = await pool.query(
    `
      SELECT rv.id, rv.rating, rv.comment, rv.created_at, u.full_name AS author_name, u.profile_image_url AS author_image
      FROM reviews rv
      JOIN users u ON rv.guest_id = u.id
      WHERE rv.property_id = $1
      ORDER BY rv.created_at DESC
      LIMIT 10
    `,
    [row.property_id]
  );

  const propImages = Array.isArray(row.property_images)
    ? row.property_images
    : [];
  const roomImages = Array.isArray(row.images) ? row.images : [];
  const amenities = Array.isArray(row.amenities) ? row.amenities : [];

  return {
    room: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
      description: row.description,
      size_sq_ft: row.size_sq_ft,
      sizeSqFt: row.size_sq_ft,
      base_capacity: row.base_capacity,
      baseCapacity: row.base_capacity,
      max_capacity: row.max_capacity,
      maxCapacity: row.max_capacity,
      has_ac: row.has_ac,
      hasAc: row.has_ac,
      bathroom_type: row.bathroom_type,
      bathroomType: row.bathroom_type,
      food_included: row.food_included,
      foodIncluded: row.food_included,
      food_details: row.food_details,
      foodDetails: row.food_details,
      gender_eligibility: row.gender_eligibility || "COLIVING",
      genderEligibility: row.gender_eligibility || "COLIVING",
      displayLocality: inferLocalityDisplay(row),
      images: roomImages,
      amenities,
      keyAmenities: amenities,
      property: {
        id: row.property_id,
        name: row.property_title,
        title: row.property_title,
        description: row.property_description,
        city: row.property_city,
        state: row.property_state,
        country: row.property_country,
        address: row.property_address,
        images: propImages,
        coverImage: propImages[0] || roomImages[0] || null,
        amenities: Array.isArray(row.property_amenities)
          ? row.property_amenities
          : [],
        tagline: row.property_tagline || null,
        rules: row.property_rules || null,
        checkInTime: row.property_check_in_time || "12:00 PM",
        checkOutTime: row.property_check_out_time || "11:00 AM",
        genderPolicy: row.property_gender_policy || "COLIVING",
        averageRating: Number.parseFloat(row.property_rating || 0),
        reviewsCount: Number.parseInt(row.property_reviews_count || 0, 10),
      },
      allRatePlans: ratePlans,
      currentRatePlan: activePlan,
      pricing: pricing.success ? pricing.breakdown : null,
      available_units: availableUnits,
      available_count: availableUnits.length,
      availableCount: availableUnits.length,
      isAvailable: availableUnits.length > 0,
      reviews: reviewsRes.rows,
    },
  };
};
