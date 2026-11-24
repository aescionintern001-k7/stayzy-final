import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../../database/pool.js";
import { env } from "../../config/env.js";

// REGISTER
export const registerUser = async ({ full_name, email, password, role = "guest" }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
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
      INSERT INTO users (full_name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, full_name, email, role, account_status, is_email_verified, created_at
    `,
    [full_name.trim(), normalizedEmail, passwordHash, role]
  );

  return result.rows[0];
};

// LOGIN
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    `
      SELECT id, full_name, email, password_hash, role, account_status, is_email_verified
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

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

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  delete user.password_hash;

  return { token, user };
};
