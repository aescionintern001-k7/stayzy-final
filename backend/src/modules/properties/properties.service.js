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
const formatPropertyRow = (row) => {
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
    amenities: Array.isArray(row.amenities) ? row.amenities : JSON.parse(row.amenities || "[]"),
    images: Array.isArray(row.images) ? row.images : JSON.parse(row.images || "[]"),
    status: row.status,
    is_available: row.is_available,
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
 * Create a new property listing.
 */
export const createProperty = async (hostId, propertyData) => {
  await verifyHostAccount(hostId);

  const query = `
    INSERT INTO properties (
      host_id, title, description, property_type, room_type,
      price_per_night, currency, address, city, state, country, postal_code,
      latitude, longitude, max_guests, bedrooms, beds, bathrooms,
      amenities, images, status, is_available
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18,
      $19::jsonb, $20::jsonb, $21, $22
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
  ];

  const result = await pool.query(query, values);
  return formatPropertyRow(result.rows[0]);
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

  return formatPropertyRow(row);
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
export const deleteOrArchiveProperty = async (propertyId, user, { permanent = false } = {}) => {
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

  return { id: propertyId, archived: true, property: formatPropertyRow(updateResult.rows[0]) };
};

/**
 * Public listing of properties with pagination and filtering.
 */
export const listProperties = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    city,
    country,
    property_type,
    room_type,
    host_id,
    min_price,
    max_price,
    status = "active",
    is_available = true,
  } = options;

  const whereClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  if (status) {
    whereClauses.push(`p.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  if (is_available !== undefined) {
    whereClauses.push(`p.is_available = $${paramIndex}`);
    queryParams.push(is_available);
    paramIndex++;
  }

  if (city && city.trim() !== "") {
    const escaped = escapeLike(city.trim());
    whereClauses.push(`p.city ILIKE $${paramIndex} ESCAPE '\\'`);
    queryParams.push(`%${escaped}%`);
    paramIndex++;
  }

  if (country && country.trim() !== "") {
    const escaped = escapeLike(country.trim());
    whereClauses.push(`p.country ILIKE $${paramIndex} ESCAPE '\\'`);
    queryParams.push(`%${escaped}%`);
    paramIndex++;
  }

  if (property_type) {
    whereClauses.push(`p.property_type = $${paramIndex}`);
    queryParams.push(property_type);
    paramIndex++;
  }

  if (room_type) {
    whereClauses.push(`p.room_type = $${paramIndex}`);
    queryParams.push(room_type);
    paramIndex++;
  }

  if (host_id) {
    whereClauses.push(`p.host_id = $${paramIndex}`);
    queryParams.push(host_id);
    paramIndex++;
  }

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

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

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

  // Prevent duplicate image URLs while appending new ones
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
export const updatePropertyAvailability = async (propertyId, is_available, user) => {
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
