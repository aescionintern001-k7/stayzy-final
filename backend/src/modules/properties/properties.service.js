import crypto from "node:crypto";
import pool from "../../database/pool.js";

export const PROPERTY_COLUMNS = [
  "id",
  "host_id",
  "title",
  "description",
  "property_type",
  "room_type",
  "price_per_night",
  "currency",
  "address",
  "city",
  "state",
  "country",
  "postal_code",
  "latitude",
  "longitude",
  "max_guests",
  "bedrooms",
  "beds",
  "bathrooms",
  "amenities",
  "images",
  "status",
  "is_available",
  "is_demo",
  "tagline",
  "rules",
  "check_in_time",
  "check_out_time",
  "timezone",
  "gender_policy",
  "created_at",
  "updated_at",
];

const SELECT_PROPERTY_SQL = PROPERTY_COLUMNS.map((col) => `p.${col}`).join(", ");

const escapeLike = (str) => str.replace(/[%_\\]/g, "\\$&");

/**
 * Ensure the host user exists and is not suspended.
 */
const verifyHostAccount = async (hostId) => {
  const result = await pool.query(
    "SELECT id, role, account_status FROM users WHERE id = $1 LIMIT 1",
    [hostId]
  );
  const host = result.rows[0];

  if (!host) {
    const error = new Error("Host user not found");
    error.status = 404;
    throw error;
  }

  if (host.account_status === "suspended") {
    const error = new Error("Host account is suspended");
    error.status = 403;
    throw error;
  }

  return host;
};

/**
 * Format raw database row to attach structured host details.
 */
export const formatPropertyRow = (row) => {
  if (!row) return null;

  const property = {
    id: row.id,
    host_id: row.host_id,
    title: row.title,
    description: row.description,
    property_type: row.property_type,
    room_type: row.room_type,
    price_per_night: Number.parseFloat(row.price_per_night),
    currency: row.currency,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    postal_code: row.postal_code,
    latitude: row.latitude !== null ? Number.parseFloat(row.latitude) : null,
    longitude: row.longitude !== null ? Number.parseFloat(row.longitude) : null,
    max_guests: row.max_guests,
    bedrooms: row.bedrooms,
    beds: row.beds,
    bathrooms: Number.parseFloat(row.bathrooms),
    amenities: Array.isArray(row.amenities)
      ? row.amenities
      : JSON.parse(row.amenities || "[]"),
    images: Array.isArray(row.images)
      ? row.images
      : JSON.parse(row.images || "[]"),
    status: row.status,
    is_available: row.is_available,
    is_demo: row.is_demo === true,
    tagline: row.tagline ?? null,
    rules: row.rules ?? null,
    check_in_time: row.check_in_time || "12:00 PM",
    check_out_time: row.check_out_time || "11:00 AM",
    timezone: row.timezone || "Asia/Kolkata",
    gender_policy: row.gender_policy || "COLIVING",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.host_full_name !== undefined) {
    property.host = {
      id: row.host_id,
      full_name: row.host_full_name,
      email: row.host_email,
      phone: row.host_phone,
      profile_image_url: row.host_profile_image_url,
    };
  }

  return property;
};

/**
 * Create a new property listing (optionally provisioning room_types, physical units & rate plans).
 */
export const createProperty = async (hostId, propertyData) => {
  await verifyHostAccount(hostId);

  const hasNestedRooms =
    Array.isArray(propertyData.room_types) && propertyData.room_types.length > 0;
  const client = hasNestedRooms ? await pool.connect() : null;
  const executor = client || pool;

  try {
    if (client) await client.query("BEGIN");

    const query = `
      INSERT INTO properties (
        host_id, title, description, property_type, room_type,
        price_per_night, currency, address, city, state, country, postal_code,
        latitude, longitude, max_guests, bedrooms, beds, bathrooms,
        amenities, images, status, is_available,
        tagline, rules, check_in_time, check_out_time, gender_policy
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19::jsonb, $20::jsonb, $21, $22,
        $23, $24, $25, $26, $27
      )
      RETURNING *
    `;

    const values = [
      hostId,
      propertyData.title.trim(),
      propertyData.description.trim(),
      propertyData.property_type,
      propertyData.room_type || "entire_place",
      propertyData.price_per_night,
      propertyData.currency || "USD",
      propertyData.address.trim(),
      propertyData.city.trim(),
      propertyData.state ? propertyData.state.trim() : null,
      propertyData.country.trim(),
      propertyData.postal_code ? propertyData.postal_code.trim() : null,
      propertyData.latitude !== undefined ? propertyData.latitude : null,
      propertyData.longitude !== undefined ? propertyData.longitude : null,
      propertyData.max_guests ?? 1,
      propertyData.bedrooms ?? 1,
      propertyData.beds ?? 1,
      propertyData.bathrooms ?? 1.0,
      JSON.stringify(propertyData.amenities || []),
      JSON.stringify(propertyData.images || []),
      propertyData.status || "active",
      propertyData.is_available ?? true,
      propertyData.tagline || null,
      propertyData.rules || null,
      propertyData.check_in_time || "12:00 PM",
      propertyData.check_out_time || "11:00 AM",
      propertyData.gender_policy || "COLIVING",
    ];

    const result = await executor.query(query, values);
    const propertyRow = result.rows[0];

    const createdRoomTypes = [];
    if (hasNestedRooms) {
      for (const rt of propertyData.room_types) {
        const finalSlug =
          rt.slug?.trim().toLowerCase() ||
          `${rt.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")}-${crypto.randomBytes(2).toString("hex")}`;

        const rtRes = await executor.query(
          `
            INSERT INTO room_types (
              property_id, name, slug, category, description, size_sq_ft,
              base_capacity, max_capacity, has_ac, bathroom_type,
              food_included, food_details, gender_eligibility,
              amenities, images, is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, TRUE)
            RETURNING *
          `,
          [
            propertyRow.id,
            rt.name.trim(),
            finalSlug,
            rt.category || "PRIVATE",
            rt.description?.trim() || propertyRow.description,
            rt.size_sq_ft ?? 220,
            rt.base_capacity ?? 1,
            rt.max_capacity ?? 2,
            rt.has_ac ?? true,
            rt.bathroom_type || "ATTACHED",
            rt.food_included ?? false,
            rt.food_details || null,
            rt.gender_eligibility || "COLIVING",
            JSON.stringify(rt.amenities || []),
            JSON.stringify(rt.images || []),
          ]
        );
        const createdRt = rtRes.rows[0];

        const bedsPerRoom = rt.beds_per_room ?? 1;
        const isBed =
          bedsPerRoom > 1 ||
          ["TWIN_SHARING", "TRIPLE_SHARING", "DORMITORY"].includes(createdRt.category);
        for (const rn of rt.room_numbers || ["101"]) {
          const roomRes = await executor.query(
            "INSERT INTO rooms (room_type_id, room_number, floor, status) VALUES ($1, $2, $3, 'active') RETURNING id",
            [createdRt.id, rn, Number.parseInt(rn, 10) || 1]
          );
          for (let b = 1; b <= bedsPerRoom; b++) {
            const identifier = isBed ? `${rn}-${String.fromCharCode(64 + b)}` : rn;
            await executor.query(
              "INSERT INTO inventory_units (room_id, identifier, is_bed, status) VALUES ($1, $2, $3, 'available')",
              [roomRes.rows[0].id, identifier, isBed]
            );
          }
        }

        const plans =
          rt.rate_plans && rt.rate_plans.length > 0
            ? rt.rate_plans
            : [
                { duration_type: "DAILY", price: propertyRow.price_per_night, deposit_amount: 500, is_enabled: true },
                { duration_type: "MONTHLY", price: Number(propertyRow.price_per_night) * 25, deposit_amount: 10000, is_enabled: true },
              ];
        for (const rp of plans) {
          await executor.query(
            `
              INSERT INTO rate_plans (
                room_type_id, duration_type, price, is_enabled, min_duration, max_duration,
                allowed_hours_start, allowed_hours_end, deposit_amount, food_monthly_charge, electricity_rule, notes
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `,
            [
              createdRt.id,
              rp.duration_type,
              rp.price,
              rp.is_enabled ?? true,
              rp.min_duration ?? 1,
              rp.max_duration ?? null,
              rp.allowed_hours_start || "08:00",
              rp.allowed_hours_end || "22:00",
              rp.deposit_amount ?? 0,
              rp.food_monthly_charge ?? 0,
              rp.electricity_rule || "Included in rent",
              rp.notes || null,
            ]
          );
        }

        createdRoomTypes.push(createdRt);
      }
      await client.query("COMMIT");
    }

    const formatted = formatPropertyRow(propertyRow);
    if (createdRoomTypes.length > 0) {
      formatted.room_types = createdRoomTypes;
    }
    return formatted;
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    if (client) client.release();
  }
};

/**
 * Retrieve a property listing by ID with host association.
 */
export const getPropertyById = async (propertyId, user = null) => {
  const query = `
    SELECT
      ${SELECT_PROPERTY_SQL},
      u.full_name AS host_full_name,
      u.email AS host_email,
      u.phone AS host_phone,
      u.profile_image_url AS host_profile_image_url
    FROM properties p
    JOIN users u ON u.id = p.host_id
    WHERE p.id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [propertyId]);
  const row = result.rows[0];

  if (!row) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  // Non-active listings are only visible to the property owner or an admin
  if (row.status !== "active") {
    const isOwner = user && user.id === row.host_id;
    const isAdmin = user && user.role === "admin";

    if (!isOwner && !isAdmin) {
      const error = new Error("Property not found");
      error.status = 404;
      throw error;
    }
  }

  const formatted = formatPropertyRow(row);

  try {
    const rtRes = await pool.query(
      `SELECT rt.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', rp.id,
              'duration_type', rp.duration_type,
              'price', rp.price,
              'deposit_amount', rp.deposit_amount,
              'food_monthly_charge', rp.food_monthly_charge,
              'min_duration', rp.min_duration,
              'max_duration', rp.max_duration,
              'is_enabled', rp.is_enabled
            )
          ) FILTER (WHERE rp.id IS NOT NULL), '[]'
        ) as rate_plans
      FROM room_types rt
      LEFT JOIN rate_plans rp ON rp.room_type_id = rt.id AND rp.is_enabled = true
      WHERE rt.property_id = $1
      GROUP BY rt.id`,
      [propertyId]
    );
    formatted.room_types = rtRes.rows || [];
  } catch (err) {
    formatted.room_types = [];
  }

  return formatted;
};

/**
 * Update an existing property listing.
 */
export const updateProperty = async (propertyId, updateData, user) => {
  const existingResult = await pool.query(
    "SELECT id, host_id, status FROM properties WHERE id = $1 LIMIT 1",
    [propertyId]
  );
  const existing = existingResult.rows[0];

  if (!existing) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  const isOwner = user && user.id === existing.host_id;
  const isAdmin = user && user.role === "admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("You do not have permission to modify this property");
    error.status = 403;
    throw error;
  }

  await verifyHostAccount(user.id);

  const setClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updateData)) {
    if (value === undefined) continue;

    if (key === "amenities" || key === "images") {
      setClauses.push(`${key} = $${paramIndex}::jsonb`);
      queryParams.push(JSON.stringify(value));
    } else if (typeof value === "string") {
      setClauses.push(`${key} = $${paramIndex}`);
      queryParams.push(value.trim());
    } else {
      setClauses.push(`${key} = $${paramIndex}`);
      queryParams.push(value);
    }
    paramIndex++;
  }

  setClauses.push("updated_at = NOW()");

  queryParams.push(propertyId);
  const whereParamIndex = paramIndex;

  const query = `
    UPDATE properties
    SET ${setClauses.join(", ")}
    WHERE id = $${whereParamIndex}
    RETURNING *
  `;

  const result = await pool.query(query, queryParams);
  return formatPropertyRow(result.rows[0]);
};

/**
 * Delete or archive a property listing.
 */
export const deleteOrArchiveProperty = async (
  propertyId,
  user,
  { permanent = false } = {}
) => {
  const existingResult = await pool.query(
    "SELECT id, host_id, status FROM properties WHERE id = $1 LIMIT 1",
    [propertyId]
  );
  const existing = existingResult.rows[0];

  if (!existing) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  const isOwner = user && user.id === existing.host_id;
  const isAdmin = user && user.role === "admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("You do not have permission to delete this property");
    error.status = 403;
    throw error;
  }

  if (permanent) {
    await pool.query("DELETE FROM properties WHERE id = $1", [propertyId]);
    return { id: propertyId, archived: false, deleted: true };
  }

  const updateResult = await pool.query(
    `
      UPDATE properties
      SET status = 'archived', is_available = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [propertyId]
  );

  return {
    id: propertyId,
    archived: true,
    property: formatPropertyRow(updateResult.rows[0]),
  };
};

/**
 * Search and list properties with multi-criteria filtering, sorting, and pagination (BE-07).
 */
export const listProperties = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    search,
    q,
    location,
    city,
    state,
    country,
    property_type,
    room_type,
    host_id,
    min_price,
    max_price,
    guests,
    max_guests,
    bedrooms,
    beds,
    bathrooms,
    amenities,
    status = "active",
    is_available = true,
    sort_by,
    sort,
    order,
  } = options;

  const whereClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  // Status filter (defaults to 'active' for public searches)
  if (status) {
    whereClauses.push(`p.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  // Availability filter (defaults to true for public searches)
  if (is_available !== undefined) {
    whereClauses.push(`p.is_available = $${paramIndex}`);
    queryParams.push(is_available);
    paramIndex++;
  }

  // General keyword search across title, description, city, state, country, address
  const searchTerm = search || q;
  if (searchTerm && searchTerm.trim() !== "") {
    const escaped = escapeLike(searchTerm.trim());
    whereClauses.push(`(
      p.title ILIKE $${paramIndex} ESCAPE '\\' OR
      p.description ILIKE $${paramIndex} ESCAPE '\\' OR
      p.city ILIKE $${paramIndex} ESCAPE '\\' OR
      p.state ILIKE $${paramIndex} ESCAPE '\\' OR
      p.country ILIKE $${paramIndex} ESCAPE '\\' OR
      p.address ILIKE $${paramIndex} ESCAPE '\\'
    )`);
    queryParams.push(`%${escaped}%`);
    paramIndex++;
  }

  // Free-text location search across city, state, country, address
  if (location && location.trim() !== "") {
    const escaped = escapeLike(location.trim());
    whereClauses.push(`(
      p.city ILIKE $${paramIndex} ESCAPE '\\' OR
      p.state ILIKE $${paramIndex} ESCAPE '\\' OR
      p.country ILIKE $${paramIndex} ESCAPE '\\' OR
      p.address ILIKE $${paramIndex} ESCAPE '\\'
    )`);
    queryParams.push(`%${escaped}%`);
    paramIndex++;
  }

  // Structured location filters
  if (city && city.trim() !== "") {
    const escaped = escapeLike(city.trim());
    whereClauses.push(`p.city ILIKE $${paramIndex} ESCAPE '\\'`);
    queryParams.push(`%${escaped}%`);
    paramIndex++;
  }

  if (state && state.trim() !== "") {
    const escaped = escapeLike(state.trim());
    whereClauses.push(`p.state ILIKE $${paramIndex} ESCAPE '\\'`);
    queryParams.push(`%${escaped}%`);
    paramIndex++;
  }

  if (country && country.trim() !== "") {
    const escaped = escapeLike(country.trim());
    whereClauses.push(`p.country ILIKE $${paramIndex} ESCAPE '\\'`);
    queryParams.push(`%${escaped}%`);
    paramIndex++;
  }

  // Property type filter (single or array/comma-separated)
  if (property_type) {
    if (Array.isArray(property_type) && property_type.length > 0) {
      whereClauses.push(`p.property_type = ANY($${paramIndex})`);
      queryParams.push(property_type);
      paramIndex++;
    } else if (typeof property_type === "string") {
      whereClauses.push(`p.property_type = $${paramIndex}`);
      queryParams.push(property_type);
      paramIndex++;
    }
  }

  // Room type filter (single or array/comma-separated)
  if (room_type) {
    if (Array.isArray(room_type) && room_type.length > 0) {
      whereClauses.push(`p.room_type = ANY($${paramIndex})`);
      queryParams.push(room_type);
      paramIndex++;
    } else if (typeof room_type === "string") {
      whereClauses.push(`p.room_type = $${paramIndex}`);
      queryParams.push(room_type);
      paramIndex++;
    }
  }

  // Host filter
  if (host_id) {
    whereClauses.push(`p.host_id = $${paramIndex}`);
    queryParams.push(host_id);
    paramIndex++;
  }

  // Price range filters
  if (min_price !== undefined) {
    whereClauses.push(`p.price_per_night >= $${paramIndex}`);
    queryParams.push(min_price);
    paramIndex++;
  }

  if (max_price !== undefined) {
    whereClauses.push(`p.price_per_night <= $${paramIndex}`);
    queryParams.push(max_price);
    paramIndex++;
  }

  // Capacity filters: guests, bedrooms, beds, bathrooms
  const requiredGuests = guests !== undefined ? guests : max_guests;
  if (requiredGuests !== undefined) {
    whereClauses.push(`p.max_guests >= $${paramIndex}`);
    queryParams.push(requiredGuests);
    paramIndex++;
  }

  if (bedrooms !== undefined) {
    whereClauses.push(`p.bedrooms >= $${paramIndex}`);
    queryParams.push(bedrooms);
    paramIndex++;
  }

  if (beds !== undefined) {
    whereClauses.push(`p.beds >= $${paramIndex}`);
    queryParams.push(beds);
    paramIndex++;
  }

  if (bathrooms !== undefined) {
    whereClauses.push(`p.bathrooms >= $${paramIndex}`);
    queryParams.push(bathrooms);
    paramIndex++;
  }

  // Amenities filtering via JSONB containment (@>)
  // Requires all specified amenities to be present in p.amenities
  if (amenities && Array.isArray(amenities) && amenities.length > 0) {
    whereClauses.push(`p.amenities @> $${paramIndex}::jsonb`);
    queryParams.push(JSON.stringify(amenities));
    paramIndex++;
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Safe sorting mapping to prevent SQL injection
  let orderBySql = "p.created_at DESC, p.id ASC";

  const effectiveSortBy =
    sort_by ||
    (sort && order
      ? `${sort}_${order}`
      : sort
        ? `${sort}_asc`
        : undefined);

  switch (effectiveSortBy) {
    case "price_asc":
      orderBySql = "p.price_per_night ASC, p.id ASC";
      break;
    case "price_desc":
      orderBySql = "p.price_per_night DESC, p.id ASC";
      break;
    case "oldest":
    case "created_at_asc":
      orderBySql = "p.created_at ASC, p.id ASC";
      break;
    case "newest":
    case "created_at_desc":
      orderBySql = "p.created_at DESC, p.id ASC";
      break;
    case "name_asc":
    case "title_asc":
      orderBySql = "p.title ASC, p.id ASC";
      break;
    case "name_desc":
    case "title_desc":
      orderBySql = "p.title DESC, p.id ASC";
      break;
    default:
      orderBySql = "p.created_at DESC, p.id ASC";
  }

  // Count total matching records
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM properties p ${whereSql}`,
    queryParams
  );
  const total = countResult.rows[0].total;

  // Query paginated matching records
  const offset = (page - 1) * limit;
  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT
      ${SELECT_PROPERTY_SQL},
      u.full_name AS host_full_name,
      u.email AS host_email,
      u.phone AS host_phone,
      u.profile_image_url AS host_profile_image_url
    FROM properties p
    JOIN users u ON u.id = p.host_id
    ${whereSql}
    ORDER BY ${orderBySql}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const dataResult = await pool.query(dataQuery, dataParams);
  const total_pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    properties: dataResult.rows.map(formatPropertyRow),
    pagination: {
      total,
      page,
      limit,
      total_pages,
    },
  };
};

/**
 * List all properties owned by a specific host.
 */
export const listHostProperties = async (hostId, options = {}) => {
  const { page = 1, limit = 10, status } = options;

  await verifyHostAccount(hostId);

  const whereClauses = ["p.host_id = $1"];
  const queryParams = [hostId];
  let paramIndex = 2;

  if (status) {
    whereClauses.push(`p.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM properties p ${whereSql}`,
    queryParams
  );
  const total = countResult.rows[0].total;

  const offset = (page - 1) * limit;
  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT
      ${SELECT_PROPERTY_SQL},
      u.full_name AS host_full_name,
      u.email AS host_email,
      u.phone AS host_phone,
      u.profile_image_url AS host_profile_image_url
    FROM properties p
    JOIN users u ON u.id = p.host_id
    ${whereSql}
    ORDER BY p.created_at DESC, p.id ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const dataResult = await pool.query(dataQuery, dataParams);
  const total_pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    properties: dataResult.rows.map(formatPropertyRow),
    pagination: {
      total,
      page,
      limit,
      total_pages,
    },
  };
};

/**
 * Add image URLs to a property listing.
 */
export const addPropertyImages = async (propertyId, newImages, user) => {
  const existingResult = await pool.query(
    "SELECT id, host_id, images FROM properties WHERE id = $1 LIMIT 1",
    [propertyId]
  );
  const existing = existingResult.rows[0];

  if (!existing) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  const isOwner = user && user.id === existing.host_id;
  const isAdmin = user && user.role === "admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("You do not have permission to modify this property");
    error.status = 403;
    throw error;
  }

  const currentImages = Array.isArray(existing.images)
    ? existing.images
    : JSON.parse(existing.images || "[]");

  const mergedImages = [...currentImages];
  for (const img of newImages) {
    if (!mergedImages.includes(img)) {
      mergedImages.push(img);
    }
  }

  const result = await pool.query(
    `
      UPDATE properties
      SET images = $1::jsonb, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [JSON.stringify(mergedImages), propertyId]
  );

  return formatPropertyRow(result.rows[0]);
};

/**
 * Remove an image URL from a property listing.
 */
export const removePropertyImage = async (propertyId, imageUrl, user) => {
  const existingResult = await pool.query(
    "SELECT id, host_id, images FROM properties WHERE id = $1 LIMIT 1",
    [propertyId]
  );
  const existing = existingResult.rows[0];

  if (!existing) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  const isOwner = user && user.id === existing.host_id;
  const isAdmin = user && user.role === "admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("You do not have permission to modify this property");
    error.status = 403;
    throw error;
  }

  const currentImages = Array.isArray(existing.images)
    ? existing.images
    : JSON.parse(existing.images || "[]");

  const filteredImages = currentImages.filter((img) => img !== imageUrl);

  const result = await pool.query(
    `
      UPDATE properties
      SET images = $1::jsonb, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [JSON.stringify(filteredImages), propertyId]
  );

  return formatPropertyRow(result.rows[0]);
};

/**
 * Update property amenities list.
 */
export const updatePropertyAmenities = async (propertyId, amenities, user) => {
  const existingResult = await pool.query(
    "SELECT id, host_id FROM properties WHERE id = $1 LIMIT 1",
    [propertyId]
  );
  const existing = existingResult.rows[0];

  if (!existing) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  const isOwner = user && user.id === existing.host_id;
  const isAdmin = user && user.role === "admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("You do not have permission to modify this property");
    error.status = 403;
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE properties
      SET amenities = $1::jsonb, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [JSON.stringify(amenities), propertyId]
  );

  return formatPropertyRow(result.rows[0]);
};

/**
 * Update property availability.
 */
export const updatePropertyAvailability = async (
  propertyId,
  is_available,
  user
) => {
  const existingResult = await pool.query(
    "SELECT id, host_id FROM properties WHERE id = $1 LIMIT 1",
    [propertyId]
  );
  const existing = existingResult.rows[0];

  if (!existing) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  const isOwner = user && user.id === existing.host_id;
  const isAdmin = user && user.role === "admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("You do not have permission to modify this property");
    error.status = 403;
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE properties
      SET is_available = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [is_available, propertyId]
  );

  return formatPropertyRow(result.rows[0]);
};
