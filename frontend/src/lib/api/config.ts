/**
 * Centralized Stayzy API Configuration
 */

export function normalizeBackendApiUrl(rawUrl?: string | null): string {
  const base = (rawUrl || "http://localhost:5000/api/v1").trim().replace(/\/$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

export function getServerBackendUrl(): string {
  return normalizeBackendApiUrl(
    process.env.BACKEND_URL ||
      process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL
  );
}

export const API_CONFIG = {
  baseUrl: normalizeBackendApiUrl(
    typeof process !== "undefined" ? process.env?.NEXT_PUBLIC_API_BASE_URL : undefined
  ),
  timeoutMs: 15000,
  jwtCookieName: "stayzy_jwt_token",
  sessionCookieName: "stayzy_session_token",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

export default API_CONFIG;
