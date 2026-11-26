import { cookies } from "next/headers";
import { prisma } from "./prisma";
import crypto from "crypto";
import { backendRoleToFrontend, backendUserToFrontend } from "./api/adapters";
import { getServerBackendUrl } from "./api/config";
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
  if (!storedHash || !password) return false;
  if (storedHash === hashPassword(password)) return true;
  if (process.env.NODE_ENV !== "production" && storedHash === password) return true;
  return false;
}

function getAuthSecret(): string | null {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV !== "production") {
    return "stayzy_dev_auth_secret_local_only";
  }
  return null;
}

/**
 * Create session token string for legacy dev fallback: `user_<id>_<role>_<hmac>`
 */
export function createSessionToken(user: { id: string; role: string }): string {
  const secret = getAuthSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }
  const signature = crypto.createHmac("sha256", secret).update(`${user.id}:${user.role}`).digest("hex");
  return `user_${user.id}_${user.role}_${signature}`;
}

/**
 * Validate legacy session token from cookie.
 */
export function validateSessionToken(token: string): { userId: string; role: string } | null {
  try {
    const secret = getAuthSecret();
    if (!secret) return null;

    const parts = token.split("_");
    if (parts.length < 4 || parts[0] !== "user") return null;
    const userId = parts[1];
    const role = parts[2];
    const signature = parts[3];

    const expected = crypto.createHmac("sha256", secret).update(`${userId}:${role}`).digest("hex");
    const sigBuf = Buffer.from(signature, "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length) return null;

    if (crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { userId, role };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cryptographically verify an HS256 JWT token using JWT_SECRET.
 * Fails closed when JWT_SECRET is not configured or signature/exp/sub is invalid.
 */
export function verifyJwtPayload(token: string): Record<string, any> | null {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
    if (!header || header.alg !== "HS256") return null;

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const sigBuf = Buffer.from(signatureB64, "utf8");
    const expBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (!payload || !payload.sub) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Get the currently authenticated user from verified JWT or dev-only session cookie.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const jwtToken = cookieStore.get(JWT_COOKIE_NAME)?.value || cookieStore.get("token")?.value;

  if (jwtToken && jwtToken.includes(".")) {
    const payload = verifyJwtPayload(jwtToken);
    if (payload && payload.sub) {
      return {
        id: payload.sub,
        email: payload.email || "",
        name: payload.name || payload.full_name || payload.email?.split("@")[0] || "Stayzy Resident",
        phone: payload.phone || null,
        role: backendRoleToFrontend(payload.role),
      };
    }

    // If JWT_SECRET is only on Express backend, verify via Express /auth/me
    if (!process.env.JWT_SECRET) {
      try {
        const res = await fetch(`${getServerBackendUrl()}/auth/me`, {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.user) {
            return backendUserToFrontend(data.data.user);
          }
        }
      } catch {
        // Backend unreachable — fail closed
      }
    }
    return null;
  }

  if (jwtToken && !jwtToken.includes(".") && jwtToken.startsWith("user_")) {
    const validated = validateSessionToken(jwtToken);
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
  }

  // Legacy session cookie only allowed in explicit demo mode outside production
  const isDemoMode =
    process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!isDemoMode) {
    return null;
  }

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
