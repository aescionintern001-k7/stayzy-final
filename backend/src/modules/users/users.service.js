import bcrypt from "bcrypt";
import pool from "../../database/pool.js";

/**
 * Safe user fields to return in API responses.
 * Sensitive columns such as password_hash are NEVER selected.
 */
export const SAFE_USER_COLUMNS = [
  "id",
  "full_name",
  "email",
  "phone",
  "profile_image_url",
  "role",
  "account_status",
  "is_email_verified",
  "created_at",
  "updated_at",
].join(", ");

/**
 * Helper to escape SQL LIKE/ILIKE wildcards (%, _, \) to prevent pattern manipulation.
 */
const escapeLike = (str) => str.replace(/[%_\\]/g, "\\$&");

/**
 * Retrieve the current authenticated user's profile.
 *
 * @param {string} userId - UUID of the authenticated user
 * @returns {Promise<Object>} Safe user record
 */
export const getCurrentUserProfile = async (userId) => {
  const result = await pool.query(
    `SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (user.account_status === "suspended") {
    const error = new Error("Account is suspended");
    error.status = 403;
    throw error;
  }

  return user;
};

/**
 * Update the authenticated user's permitted profile fields.
 *
 * @param {string} userId - UUID of the authenticated user
 * @param {Object} updateData - Allowed fields: full_name, phone, profile_image_url
 * @returns {Promise<Object>} Updated safe user record
 */
export const updateCurrentUserProfile = async (userId, updateData) => {
  // First ensure the user exists and is active
  const existingUserResult = await pool.query(
    "SELECT id, account_status FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );

  const existingUser = existingUserResult.rows[0];

  if (!existingUser) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (existingUser.account_status === "suspended") {
    const error = new Error("Account is suspended");
    error.status = 403;
    throw error;
  }

  const setClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  if (updateData.full_name !== undefined) {
    setClauses.push(`full_name = $${paramIndex}`);
    queryParams.push(updateData.full_name.trim());
    paramIndex++;
  }

  if (updateData.phone !== undefined) {
    setClauses.push(`phone = $${paramIndex}`);
    queryParams.push(updateData.phone !== null ? updateData.phone.trim() : null);
    paramIndex++;
  }

  if (updateData.profile_image_url !== undefined) {
    setClauses.push(`profile_image_url = $${paramIndex}`);
    queryParams.push(updateData.profile_image_url !== null ? updateData.profile_image_url.trim() : null);
    paramIndex++;
  }

  // Always update updated_at timestamp
  setClauses.push("updated_at = NOW()");

  queryParams.push(userId);
  const whereParamIndex = paramIndex;

  const query = `
    UPDATE users
    SET ${setClauses.join(", ")}
    WHERE id = $${whereParamIndex}
    RETURNING ${SAFE_USER_COLUMNS}
  `;

  const result = await pool.query(query, queryParams);
  return result.rows[0];
};

/**
 * Admin: List users with pagination, search, and filtering.
 *
 * @param {Object} queryOptions - page, limit, search, role, status
 * @returns {Promise<{ users: Array, pagination: Object }>}
 */
export const getUsersList = async ({ page = 1, limit = 10, search, role, status }) => {
  const whereClauses = [];
  const queryParams = [];
  let paramIndex = 1;

  if (search && search.trim() !== "") {
    const escaped = escapeLike(search.trim());
    whereClauses.push(
      `(full_name ILIKE $${paramIndex} ESCAPE '\\' OR email ILIKE $${paramIndex} ESCAPE '\\')`
    );
    queryParams.push(`%${escaped}%`);
    paramIndex++;
  }

  if (role) {
    whereClauses.push(`role = $${paramIndex}`);
    queryParams.push(role);
    paramIndex++;
  }

  if (status) {
    whereClauses.push(`account_status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Count total matching records
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM users ${whereSql}`,
    queryParams
  );
  const total = countResult.rows[0].total;

  // Fetch paginated records with stable ordering
  const offset = (page - 1) * limit;
  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT ${SAFE_USER_COLUMNS}
    FROM users
    ${whereSql}
    ORDER BY created_at DESC, id ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const dataResult = await pool.query(dataQuery, dataParams);
  const total_pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    users: dataResult.rows,
    pagination: {
      total,
      page,
      limit,
      total_pages,
    },
  };
};

/**
 * Admin: Retrieve user details by ID.
 *
 * @param {string} userId - UUID of the target user
 * @returns {Promise<Object>} Safe user record
 */
export const getUserById = async (userId) => {
  const result = await pool.query(
    `SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return user;
};

/**
 * Admin: Update user account status (active, suspended, pending).
 * Protects against admin self-suspension.
 *
 * @param {string} targetUserId - UUID of target user
 * @param {string} newStatus - New account status
 * @param {string} currentAdminId - UUID of performing admin
 * @returns {Promise<Object>} Updated safe user record
 */
export const updateUserStatus = async (targetUserId, newStatus, currentAdminId) => {
  // Prevent admin from suspending or deactivating their own account
  if (targetUserId === currentAdminId && (newStatus === "suspended" || newStatus === "pending")) {
    const error = new Error("Admins cannot suspend or deactivate their own account");
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE users
      SET account_status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING ${SAFE_USER_COLUMNS}
    `,
    [newStatus, targetUserId]
  );

  const updatedUser = result.rows[0];

  if (!updatedUser) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return updatedUser;
};

/**
 * Authenticated user: verify current password and update to a new password.
 */
export const changeCurrentUserPassword = async (
  userId,
  { current_password, new_password }
) => {
  const userRes = await pool.query(
    "SELECT id, password_hash, account_status FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );

  const user = userRes.rows[0];
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (user.account_status !== "active") {
    const error = new Error("Account is not active");
    error.status = 403;
    throw error;
  }

  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) {
    const error = new Error("Current password is incorrect");
    error.status = 401;
    throw error;
  }

  const newHash = await bcrypt.hash(new_password, 12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [newHash, userId]
    );
    await client.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId]
    );
    await client.query("COMMIT");
    return { password_updated: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Authenticated user: list favorite room types synced across web & mobile.
 */
export const listUserFavorites = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        uf.room_type_id,
        uf.created_at AS favorited_at,
        rt.name AS room_name,
        rt.slug AS room_slug,
        rt.category,
        rt.images AS room_images,
        rt.has_ac,
        rt.bathroom_type,
        rt.food_included,
        rt.gender_eligibility,
        p.id AS property_id,
        p.title AS property_title,
        p.city AS property_city,
        p.address AS property_address,
        (
          SELECT rp.price
          FROM rate_plans rp
          WHERE rp.room_type_id = rt.id AND rp.is_enabled = TRUE
          ORDER BY CASE rp.duration_type WHEN 'MONTHLY' THEN 1 WHEN 'DAILY' THEN 2 ELSE 3 END
          LIMIT 1
        ) AS starting_price
      FROM user_favorites uf
      JOIN room_types rt ON uf.room_type_id = rt.id
      JOIN properties p ON rt.property_id = p.id
      WHERE uf.user_id = $1
      ORDER BY uf.created_at DESC
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    room_type_id: row.room_type_id,
    favorited_at: row.favorited_at,
    room: {
      id: row.room_type_id,
      name: row.room_name,
      slug: row.room_slug,
      category: row.category,
      images: Array.isArray(row.room_images) ? row.room_images : [],
      has_ac: row.has_ac,
      bathroom_type: row.bathroom_type,
      food_included: row.food_included,
      gender_eligibility: row.gender_eligibility,
      starting_price: row.starting_price ? Number.parseFloat(row.starting_price) : null,
    },
    property: {
      id: row.property_id,
      title: row.property_title,
      city: row.property_city,
      address: row.property_address,
    },
  }));
};

/**
 * Authenticated user: save a room_type_id to favorites.
 */
export const addUserFavorite = async (userId, roomTypeId) => {
  const roomRes = await pool.query(
    "SELECT id FROM room_types WHERE id = $1 LIMIT 1",
    [roomTypeId]
  );
  if (roomRes.rows.length === 0) {
    const error = new Error("Room type not found");
    error.status = 404;
    throw error;
  }

  await pool.query(
    `
      INSERT INTO user_favorites (user_id, room_type_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, room_type_id) DO NOTHING
    `,
    [userId, roomTypeId]
  );

  return { room_type_id: roomTypeId, saved: true };
};

/**
 * Authenticated user: remove a room_type_id from favorites.
 */
export const removeUserFavorite = async (userId, roomTypeId) => {
  const result = await pool.query(
    "DELETE FROM user_favorites WHERE user_id = $1 AND room_type_id = $2 RETURNING room_type_id",
    [userId, roomTypeId]
  );

  return {
    room_type_id: roomTypeId,
    removed: result.rowCount > 0,
  };
};
