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
