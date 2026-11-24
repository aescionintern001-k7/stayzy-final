import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import pool from "../database/pool.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }

  const userId = decoded.sub;
  if (!userId || !UUID_REGEX.test(userId)) {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token payload",
    });
  }

  try {
    const userRes = await pool.query(
      "SELECT id, email, role, account_status FROM users WHERE id = $1 LIMIT 1",
      [userId]
    );

    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.account_status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
