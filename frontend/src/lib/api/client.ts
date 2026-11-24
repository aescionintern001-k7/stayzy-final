/**
 * Central API Client for Stayzy Express Backend
 * Native Fetch-based HTTP Client with JWT support and graceful error handling
 */

import { ApiResponse, ApiErrorResponse } from "./types";

export class ApiClientError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: any;
  params?: Record<string, any>;
  token?: string | null;
}

const DEFAULT_BASE_URL = "http://localhost:5000/api/v1";

/**
 * Gets the configured base URL for the backend API.
 */
export function getApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");
  }
  return DEFAULT_BASE_URL;
}

/**
 * Retrieves the stored JWT auth token from cookies or localStorage (client-side).
 */
export function getClientAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    // 1. Try localStorage
    const localToken = localStorage.getItem("stayzy_jwt_token");
    if (localToken) return localToken;

    // 2. Try cookie
    const cookies = document.cookie.split(";");
    for (const c of cookies) {
      const [name, val] = c.trim().split("=");
      if (name === "stayzy_jwt_token" || name === "stayzy_session_token") {
        return decodeURIComponent(val);
      }
    }
  } catch {
    // Ignore browser storage exceptions
  }

  return null;
}

/**
 * Saves the JWT auth token to localStorage and cookies for session persistence.
 */
export function setClientAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;

  try {
    if (token) {
      localStorage.setItem("stayzy_jwt_token", token);
      // Set secure-friendly session cookie valid for 7 days
      document.cookie = `stayzy_jwt_token=${encodeURIComponent(
        token
      )}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    } else {
      localStorage.removeItem("stayzy_jwt_token");
      document.cookie =
        "stayzy_jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    }
  } catch {
    // Ignore storage exceptions
  }
}

/**
 * Unified request handler for Express Backend APIs.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  // Build query string
  let url = `${baseUrl}${cleanEndpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  // Determine auth token
  const token = options.token !== undefined ? options.token : getClientAuthToken();

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body,
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorData = data as ApiErrorResponse;
      const message =
        errorData?.message ||
        errorData?.error ||
        `Backend API error (${response.status}: ${response.statusText})`;

      // Handle 401 Unauthorized by clearing stale client tokens
      if (response.status === 401 && typeof window !== "undefined") {
        setClientAuthToken(null);
      }

      throw new ApiClientError(
        message,
        response.status,
        errorData?.code,
        errorData?.details
      );
    }

    // Standardize response payload
    if (typeof data === "object" && data !== null && "success" in data) {
      return data as ApiResponse<T>;
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (err: any) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    // Network / connection errors
    throw new ApiClientError(
      err.message || "Failed to communicate with Stayzy backend",
      500,
      "NETWORK_ERROR"
    );
  }
}

/**
 * Convenient HTTP verb helpers
 */
export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "POST", body }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};

export const apiGet = apiClient.get;
export const apiPost = apiClient.post;
export const apiPut = apiClient.put;
export const apiPatch = apiClient.patch;
export const apiDelete = apiClient.delete;

