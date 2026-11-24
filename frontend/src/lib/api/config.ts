/**
 * Centralized Stayzy API Configuration
 */

export const API_CONFIG = {
  baseUrl:
    typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL
      ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")
      : "http://localhost:5000/api/v1",
  timeoutMs: 15000,
  jwtCookieName: "stayzy_jwt_token",
  sessionCookieName: "stayzy_session_token",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

export default API_CONFIG;
