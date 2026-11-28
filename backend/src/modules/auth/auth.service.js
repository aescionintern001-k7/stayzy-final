import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../../database/pool.js";
import { env } from "../../config/env.js";

const hashToken = (rawToken) =>
  crypto.createHash("sha256").update(String(rawToken)).digest("hex");

const parseDurationMs = (durationStr = "30d") => {
  const match = String(durationStr).trim().match(/^(\d+)([smhd])$/i);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const val = Number(match[1]);
  const unit = match[2].toLowerCase();
  const mult =
    unit === "s" ? 1000 : unit === "m" ? 60000 : unit === "h" ? 3600000 : 86400000;
  return val * mult;
};

const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

const issueSessionTokens = async (user, deviceLabel = null, executor = pool) => {
  const token = signAccessToken(user);
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN));

  await executor.query(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, device_label, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [user.id, tokenHash, deviceLabel ? String(deviceLabel).slice(0, 120) : null, expiresAt]
  );

  return {
    token,
    refresh_token: refreshToken,
    expires_in: env.JWT_EXPIRES_IN,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone ?? null,
      profile_image_url: user.profile_image_url ?? null,
      role: user.role,
      account_status: user.account_status,
      is_email_verified: user.is_email_verified,
    },
  };
};

// REGISTER
export const registerUser = async ({
  full_name,
  email,
  password,
  phone,
  role = "guest",
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  // Never allow self-registration as admin
  const safeRole = role === "host" ? "host" : "guest";

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1",
    [normalizedEmail]
  );

  if (existingUser.rows.length > 0) {
    const error = new Error("Email is already registered");
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `
      INSERT INTO users (full_name, email, phone, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, full_name, email, phone, role, account_status, is_email_verified, created_at
    `,
    [
      full_name.trim(),
      normalizedEmail,
      phone ? phone.trim() : null,
      passwordHash,
      safeRole,
    ]
  );

  return result.rows[0];
};

// LOGIN (supports email or phone identifier)
export const loginUser = async ({
  email,
  phone,
  identifier,
  password,
  device_label,
}) => {
  const rawLookup = (email || identifier || phone || "").trim();
  let result;

  if (rawLookup.includes("@")) {
    result = await pool.query(
      `
        SELECT id, full_name, email, phone, profile_image_url, password_hash, role, account_status, is_email_verified
        FROM users
        WHERE LOWER(email) = $1
        LIMIT 1
      `,
      [rawLookup.toLowerCase()]
    );
  } else {
    const digits = rawLookup.replace(/\D/g, "");
    const tail10 = digits.length >= 10 ? digits.slice(-10) : digits;
    result = await pool.query(
      `
        SELECT id, full_name, email, phone, profile_image_url, password_hash, role, account_status, is_email_verified
        FROM users
        WHERE REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') = $1
           OR ($2 <> '' AND RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g'), 10) = $2)
        LIMIT 1
      `,
      [digits, tail10]
    );
  }

  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  if (user.account_status !== "active") {
    const error = new Error("Account is not active");
    error.status = 403;
    throw error;
  }

  return issueSessionTokens(user, device_label);
};

// Server-side verification against Google/Firebase Identity Toolkit
const verifyExternalGoogleToken = async (idToken) => {
  if (env.FIREBASE_WEB_API_KEY) {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!resp.ok) {
      const error = new Error("Invalid or expired Google/Firebase ID token");
      error.status = 401;
      throw error;
    }

    const payload = await resp.json();
    const account = payload?.users?.[0];
    if (!account?.email || !account.emailVerified) {
      const error = new Error("Google account email could not be verified");
      error.status = 401;
      throw error;
    }

    return {
      email: account.email.trim().toLowerCase(),
      name: account.displayName || account.email.split("@")[0],
      picture: account.photoUrl || null,
    };
  }

  if (env.NODE_ENV === "production") {
    const error = new Error("Google authentication is not configured on the server");
    error.status = 503;
    throw error;
  }

  // Fallback verification via Google's official tokeninfo verification endpoint
  const tokenInfoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );
  if (!tokenInfoRes.ok) {
    const error = new Error("Invalid or expired Google ID token");
    error.status = 401;
    throw error;
  }

  const info = await tokenInfoRes.json();
  if (!info.email || String(info.email_verified) !== "true") {
    const error = new Error("Google account email could not be verified");
    error.status = 401;
    throw error;
  }

  return {
    email: info.email.trim().toLowerCase(),
    name: info.name || info.email.split("@")[0],
    picture: info.picture || null,
  };
};

// GOOGLE / FIREBASE SIGN-IN
export const googleLoginUser = async (
  { idToken, device_label },
  tokenVerifier = verifyExternalGoogleToken
) => {
  const verifiedProfile = await tokenVerifier(idToken);
  if (!verifiedProfile?.email) {
    const error = new Error("Google authentication failed");
    error.status = 401;
    throw error;
  }

  const normalizedEmail = verifiedProfile.email.trim().toLowerCase();
  const existingRes = await pool.query(
    `
      SELECT id, full_name, email, phone, profile_image_url, role, account_status, is_email_verified
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  let user = existingRes.rows[0];

  if (user) {
    if (user.account_status !== "active") {
      const error = new Error("Account is not active");
      error.status = 403;
      throw error;
    }

    if (!user.is_email_verified || (!user.profile_image_url && verifiedProfile.picture)) {
      const updatedRes = await pool.query(
        `
          UPDATE users
          SET is_email_verified = TRUE,
              profile_image_url = COALESCE(profile_image_url, $1),
              updated_at = NOW()
          WHERE id = $2
          RETURNING id, full_name, email, phone, profile_image_url, role, account_status, is_email_verified
        `,
        [verifiedProfile.picture || null, user.id]
      );
      user = updatedRes.rows[0];
    }
  } else {
    const unusableSecret = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(unusableSecret, 12);
    const createdRes = await pool.query(
      `
        INSERT INTO users (
          full_name, email, password_hash, role, profile_image_url, is_email_verified
        )
        VALUES ($1, $2, $3, 'guest', $4, TRUE)
        RETURNING id, full_name, email, phone, profile_image_url, role, account_status, is_email_verified
      `,
      [
        verifiedProfile.name.trim().slice(0, 100),
        normalizedEmail,
        passwordHash,
        verifiedProfile.picture || null,
      ]
    );
    user = createdRes.rows[0];
  }

  return issueSessionTokens(user, device_label);
};

// REFRESH SESSION (single-use atomic rotation)
export const refreshUserSession = async ({ refresh_token, device_label }) => {
  const tokenHash = hashToken(refresh_token);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const rowRes = await client.query(
      `
        SELECT rt.id AS refresh_id,
               rt.user_id,
               rt.expires_at,
               rt.revoked_at,
               rt.device_label,
               u.id,
               u.full_name,
               u.email,
               u.phone,
               u.profile_image_url,
               u.role,
               u.account_status,
               u.is_email_verified
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token_hash = $1
        FOR UPDATE
      `,
      [tokenHash]
    );

    const record = rowRes.rows[0];
    if (!record || record.revoked_at || new Date(record.expires_at) <= new Date()) {
      const error = new Error("Invalid or expired refresh token");
      error.status = 401;
      throw error;
    }

    if (record.account_status !== "active") {
      const error = new Error("Account is not active");
      error.status = 403;
      throw error;
    }

    await client.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1",
      [record.refresh_id]
    );

    const session = await issueSessionTokens(
      record,
      device_label ?? record.device_label,
      client
    );

    await client.query("COMMIT");
    return session;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// LOGOUT (revoke refresh token)
export const logoutUserSession = async ({ userId = null, refresh_token = null }) => {
  if (refresh_token) {
    const tokenHash = hashToken(refresh_token);
    if (userId) {
      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL",
        [tokenHash, userId]
      );
    } else {
      await pool.query(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL",
        [tokenHash]
      );
    }
  } else if (userId) {
    await pool.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId]
    );
  }

  return { logged_out: true };
};

// FORGOT PASSWORD (uniform non-enumerating response)
export const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const userRes = await pool.query(
    "SELECT id, account_status FROM users WHERE LOWER(email) = $1 LIMIT 1",
    [normalizedEmail]
  );

  const user = userRes.rows[0];
  if (user && user.account_status === "active") {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await pool.query(
      `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [user.id, tokenHash, expiresAt]
    );
  }

  return {
    message:
      "If an active account exists for this email, password reset instructions have been issued.",
  };
};

// RESET PASSWORD
export const resetPasswordWithToken = async ({ token, new_password }) => {
  const tokenHash = hashToken(token);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenRes = await client.query(
      `
        SELECT prt.id, prt.user_id, prt.expires_at, prt.used_at, u.account_status
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token_hash = $1
        FOR UPDATE
      `,
      [tokenHash]
    );

    const record = tokenRes.rows[0];
    if (!record || record.used_at || new Date(record.expires_at) <= new Date()) {
      const error = new Error("Invalid or expired password reset token");
      error.status = 400;
      throw error;
    }

    if (record.account_status !== "active") {
      const error = new Error("Account is not active");
      error.status = 403;
      throw error;
    }

    const newHash = await bcrypt.hash(new_password, 12);
    await client.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [newHash, record.user_id]
    );
    await client.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1",
      [record.id]
    );
    await client.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [record.user_id]
    );

    await client.query("COMMIT");
    return { password_reset: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
