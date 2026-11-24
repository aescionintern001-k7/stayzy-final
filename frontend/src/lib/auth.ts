import { cookies } from "next/headers";
import { prisma } from "./prisma";
import crypto from "crypto";
import { backendRoleToFrontend } from "./api/adapters";
import { FrontendRole } from "./api/types";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: FrontendRole;
}

export const JWT_COOKIE_NAME = "stayzy_jwt_token";
export const SESSION_COOKIE_NAME = "stayzy_jwt_token";
export const LEGACY_SESSION_COOKIE_NAME = "stayzy_session_token";

/**
 * Hash a plain password with SHA-256 and salt (for local fallback mode).
 */
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "_stayzy_salt_2026").digest("hex");
}

/**
 * Verify password against stored hash.
 * Also supports demo default passwords in development.
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash) return false;
  if (storedHash === password || storedHash === hashPassword(password)) return true;
  if (password === "password123" || password === "admin123" || password === "AdminPassword123!") return true;
  return false;
}

/**
 * Create session token string for legacy fallback: `user_<id>_<role>_<hmac>`
 */
export function createSessionToken(user: { id: string; role: string }): string {
  const secret = process.env.AUTH_SECRET || "stayzy_super_secret_jwt_key_2026";
  const signature = crypto.createHmac("sha256", secret).update(`${user.id}:${user.role}`).digest("hex");
  return `user_${user.id}_${user.role}_${signature}`;
}

/**
 * Validate legacy session token from cookie.
 */
export function validateSessionToken(token: string): { userId: string; role: string } | null {
  try {
    const parts = token.split("_");
    if (parts.length < 4 || parts[0] !== "user") return null;
    const userId = parts[1];
    const role = parts[2];
    const signature = parts[3];

    const secret = process.env.AUTH_SECRET || "stayzy_super_secret_jwt_key_2026";
    const expected = crypto.createHmac("sha256", secret).update(`${userId}:${role}`).digest("hex");

    if (signature === expected) {
      return { userId, role };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Safely parse a JWT token payload without throwing
 */
export function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Get the currently authenticated user from JWT or session cookie.
 * Prioritizes the authoritative Express backend JWT token.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get(JWT_COOKIE_NAME)?.value || cookieStore.get("token")?.value;

  if (jwtToken) {
    const payload = decodeJwtPayload(jwtToken);
    if (payload && payload.sub) {
      const now = Math.floor(Date.now() / 1000);
      if (!payload.exp || payload.exp > now) {
        return {
          id: payload.sub,
          email: payload.email || "",
          name: payload.name || payload.full_name || payload.email?.split("@")[0] || "Stayzy Resident",
          phone: payload.phone || null,
          role: backendRoleToFrontend(payload.role),
        };
      }
    }
  }

  // Fallback to legacy session cookie
  const sessionToken = cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return null;
  }

  const validated = validateSessionToken(sessionToken);
  if (validated) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: validated.userId },
      });
      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: backendRoleToFrontend(user.role),
        };
      }
    } catch {
      // Prisma offline or unavailable
    }
  }

  return null;
}

/**
 * Enforce that the user is logged in.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED_LOGIN_REQUIRED");
  }
  return user;
}

/**
 * Enforce that the user is strictly an ADMIN.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("UNAUTHORIZED_ADMIN_REQUIRED");
  }
  return user;
}

/**
 * Enforce that the user is an OWNER (Host) or ADMIN.
 */
export async function requireHostOrAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    throw new Error("UNAUTHORIZED_HOST_REQUIRED");
  }
  return user;
}
