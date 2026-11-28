import { Platform } from "react-native";
import { TokenStorage } from "./secureStorage";

const DEFAULT_DEV_API =
  Platform.OS === "android"
    ? "http://10.0.2.2:5000/api/v1"
    : "http://localhost:5000/api/v1";

/**
 * Normalize an explicit or default backend API base URL so all requests resolve
 * to a single clean `<origin><optional-base>/api/v1` base without duplicate slashes
 * or duplicate `/api/v1` segments.
 *
 * - Development (`isDev === true`): allows `http:` or `https:`, defaults to emulator/localhost.
 * - Production (`isDev === false`): requires an explicit `https:` EXPO_PUBLIC_API_URL.
 */
export function normalizeApiBaseUrl(
  rawUrl?: string | null,
  options: { isDev?: boolean; defaultDevUrl?: string } = {}
): string {
  const isDev =
    options.isDev ?? (typeof __DEV__ !== "undefined" ? __DEV__ : false);
  const trimmed = (rawUrl || "").trim();

  if (!trimmed) {
    if (!isDev) {
      throw new Error(
        "EXPO_PUBLIC_API_URL must be explicitly configured with HTTPS for production builds."
      );
    }
    return options.defaultDevUrl || DEFAULT_DEV_API;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      `Invalid EXPO_PUBLIC_API_URL format: "${trimmed}". Expected e.g. http://10.0.2.2:5000/api/v1`
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Unsupported EXPO_PUBLIC_API_URL protocol "${parsed.protocol}". Use http:// (dev) or https://.`
    );
  }

  if (!isDev && parsed.protocol !== "https:") {
    throw new Error(
      "Production builds require an HTTPS EXPO_PUBLIC_API_URL endpoint."
    );
  }

  // Collapse duplicate slashes in pathname and strip trailing slashes
  const cleanPath = parsed.pathname.replace(/\/+/g, "/").replace(/\/+$/, "");

  // Deduplicate repeated trailing /api/v1 segments or append /api/v1 if missing
  const withoutDuplicatePrefix = cleanPath.replace(/(\/api\/v1)+$/i, "");
  const finalPath = `${withoutDuplicatePrefix}/api/v1`;

  return `${parsed.origin}${finalPath}`;
}

let resolvedApiBaseUrl = "";
let apiConfigError: Error | null = null;

try {
  resolvedApiBaseUrl = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL, {
    isDev: typeof __DEV__ !== "undefined" ? __DEV__ : true,
  });
} catch (err: any) {
  apiConfigError = err instanceof Error ? err : new Error(String(err));
}

export const API_BASE_URL = resolvedApiBaseUrl;

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

let refreshPromise: Promise<string | null> | null = null;
let onSessionExpiredCallback: (() => void) | null = null;

export function setOnSessionExpired(cb: (() => void) | null) {
  onSessionExpiredCallback = cb;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await TokenStorage.getRefreshToken();
      if (!refreshToken) return null;

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: refreshToken,
          device_label: `Stayzy-${Platform.OS}`,
        }),
      });

      if (!res.ok) {
        await TokenStorage.clear();
        onSessionExpiredCallback?.();
        return null;
      }

      const json = await res.json();
      const nextToken = json?.data?.token;
      const nextRefresh = json?.data?.refresh_token;
      if (nextToken) {
        await TokenStorage.saveTokens(nextToken, nextRefresh);
        return nextToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 20000;

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    auth?: boolean;
    headers?: Record<string, string>;
    timeoutMs?: number;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    auth = true,
    headers = {},
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    signal,
  } = options;

  const exec = async (token: string | null) => {
    if (apiConfigError || !API_BASE_URL) {
      throw apiConfigError || new Error("API base URL is not configured.");
    }
    const reqHeaders: Record<string, string> = {
      Accept: "application/json",
      ...headers,
    };
    if (body !== undefined) {
      reqHeaders["Content-Type"] = "application/json";
    }
    if (auth && token) {
      reqHeaders.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs)
        : null;

    const onExternalAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", onExternalAbort, { once: true });
    }

    const cleanRoute = path.startsWith("/") ? path : `/${path}`;
    try {
      const response = await fetch(`${API_BASE_URL}${cleanRoute}`, {
        method,
        headers: reqHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      return response;
    } catch (err: any) {
      if (timedOut) {
        throw new ApiError(
          "Request timed out. Please check your connection and try again.",
          408,
          { isTimeout: true }
        );
      }
      if (signal?.aborted || err?.name === "AbortError") {
        throw new ApiError("Request was cancelled.", 499, { isCancelled: true });
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onExternalAbort);
    }
  };

  let token = auth ? await TokenStorage.getAccessToken() : null;
  let response = await exec(token);

  if (response.status === 401 && auth && token) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      response = await exec(renewed);
    }
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new ApiError(
      json?.message || json?.error || `Request failed (${response.status})`,
      response.status,
      json?.errors
    );
  }

  return (json?.data !== undefined ? json.data : json) as T;
}

// ==========================================
// Domain API Modules
// ==========================================

export type DurationType = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  profile_image_url?: string | null;
  role: "guest" | "host" | "admin";
  account_status: string;
  is_email_verified?: boolean;
}

export const AuthApi = {
  login: (payload: {
    email?: string;
    identifier?: string;
    password: string;
    device_label?: string;
  }) =>
    apiRequest<{
      token: string;
      refresh_token: string;
      expires_in: string;
      user: AuthUser;
    }>("/auth/login", { method: "POST", body: payload, auth: false }),

  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    role: "guest" | "host";
  }) =>
    apiRequest<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  googleLogin: (idToken: string) =>
    apiRequest<{
      token: string;
      refresh_token: string;
      user: AuthUser;
    }>("/auth/google", {
      method: "POST",
      body: { idToken, device_label: `Stayzy-${Platform.OS}` },
      auth: false,
    }),

  me: () => apiRequest<{ user: AuthUser }>("/auth/me"),

  logout: (refresh_token?: string | null) =>
    apiRequest<{ logged_out: boolean }>("/auth/logout", {
      method: "POST",
      body: refresh_token ? { refresh_token } : {},
    }),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
      auth: false,
    }),
};

export const UsersApi = {
  getProfile: () => apiRequest<{ user: AuthUser }>("/users/me"),

  updateProfile: (payload: { full_name?: string; phone?: string | null }) =>
    apiRequest<{ user: AuthUser }>("/users/me", { method: "PATCH", body: payload }),

  changePassword: (payload: { current_password: string; new_password: string }) =>
    apiRequest<{ password_updated: boolean }>("/users/me/password", {
      method: "PATCH",
      body: payload,
    }),

  getFavorites: () => apiRequest<{ favorites: any[] }>("/users/me/favorites"),

  addFavorite: (room_type_id: string) =>
    apiRequest<{ saved: boolean }>("/users/me/favorites", {
      method: "POST",
      body: { room_type_id },
    }),

  removeFavorite: (roomTypeId: string) =>
    apiRequest<{ removed: boolean }>(`/users/me/favorites/${roomTypeId}`, {
      method: "DELETE",
    }),
};

export const CatalogApi = {
  listRooms: (
    params: Record<string, string | number | boolean | undefined> = {},
    options: { signal?: AbortSignal } = {}
  ) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "" && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    return apiRequest<{ rooms: any[]; total: number }>(`/rooms${qs ? `?${qs}` : ""}`, {
      auth: false,
      signal: options.signal,
    });
  },

  getRoomDetail: (
    slugOrId: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "" && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    return apiRequest<{ room: any }>(
      `/rooms/${encodeURIComponent(slugOrId)}${qs ? `?${qs}` : ""}`,
      { auth: false }
    );
  },

  listCities: (
    params: Record<string, string | boolean | undefined> = {},
    options: { signal?: AbortSignal } = {}
  ) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    return apiRequest<{
      cities: any[];
      byLetter: Record<string, any[]>;
      alphabetCounts: Record<string, number>;
      total: number;
    }>(`/cities${qs ? `?${qs}` : ""}`, { auth: false, signal: options.signal });
  },

  getContent: () =>
    apiRequest<{ content: Record<string, any>; settings: Record<string, any> }>(
      "/content",
      { auth: false }
    ),
};

export const BookingApi = {
  calculatePricing: (payload: {
    room_type_id: string;
    duration_type: DurationType;
    duration_count: number;
    start_date: string;
    start_time?: string;
    include_food?: boolean;
  }) =>
    apiRequest<{ breakdown: any; ratePlan: any }>("/bookings/calculate-pricing", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  createHold: (payload: {
    room_type_id: string;
    inventory_unit_id?: string | null;
    duration_type: DurationType;
    start_date: string;
    start_time?: string;
    duration_count: number;
    include_food?: boolean;
    guest_email?: string;
  }) => apiRequest<any>("/holds", { method: "POST", body: payload }),

  getHold: (token: string) =>
    apiRequest<{ hold: any }>(`/holds/${encodeURIComponent(token)}`),

  releaseHold: (token: string) =>
    apiRequest<{ released: boolean }>(`/holds/${encodeURIComponent(token)}`, {
      method: "DELETE",
    }),

  createBooking: (payload: {
    room_type_id?: string;
    hold_token?: string | null;
    inventory_unit_id?: string | null;
    duration_type?: DurationType;
    start_date?: string;
    start_time?: string;
    duration_count?: number;
    include_food?: boolean;
    guests_count: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    special_requests?: string;
    idempotency_key?: string;
  }) => apiRequest<{ booking: any }>("/bookings", { method: "POST", body: payload }),

  getMyBookings: (limit = 30) =>
    apiRequest<{ bookings: any[]; pagination: any }>(`/bookings?limit=${limit}`),

  getBookingById: (id: string) =>
    apiRequest<{ booking: any }>(`/bookings/${id}`),

  recoverByIdempotencyKey: (idempotencyKey: string) =>
    apiRequest<{ booking: any }>(
      `/bookings/recover/${encodeURIComponent(idempotencyKey)}`
    ),

  getOwnerBookings: (limit = 30) =>
    apiRequest<{ reservations: any[]; pagination: any }>(
      `/bookings/owner?limit=${limit}`
    ),

  extendBooking: (id: string, additional_count: number) =>
    apiRequest<{ booking: any; extension: any }>(`/bookings/${id}/extend`, {
      method: "POST",
      body: { additional_count },
    }),

  cancelBooking: (id: string, reason?: string) =>
    apiRequest<{ booking: any }>(`/bookings/${id}/cancel`, {
      method: "PATCH",
      body: { reason: reason || "Cancelled by user via Stayzy mobile app" },
    }),

  updateStatus: (id: string, status: string) =>
    apiRequest<{ booking: any }>(`/bookings/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),
};

export const PaymentApi = {
  createOrder: (payload: {
    booking_id: string;
    payment_schedule_id?: string | null;
    idempotency_key?: string;
  }) => apiRequest<{ payment: any; order: any }>("/payments/create-order", { method: "POST", body: payload }),

  verify: (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => apiRequest<{ payment: any; booking: any }>("/payments/verify", { method: "POST", body: payload }),

  fail: (payload: {
    razorpay_order_id: string;
    error_code?: string;
    error_description?: string;
  }) => apiRequest<{ payment: any }>("/payments/fail", { method: "POST", body: payload }),

  reconcile: (payload: {
    booking_id?: string;
    payment_id?: string;
    razorpay_order_id?: string;
  }) => apiRequest<any>("/payments/reconcile", { method: "POST", body: payload }),

  demoSimulate: (payload: {
    booking_id?: string;
    razorpay_order_id?: string;
    payment_schedule_id?: string | null;
    outcome: "SUCCESS" | "FAILED" | "PENDING";
  }) => apiRequest<any>("/payments/demo-simulate", { method: "POST", body: payload }),

  getMyPayments: () =>
    apiRequest<{ payments: any[]; schedules: any[]; refunds: any[] }>("/payments/my?limit=50"),
};

export const VisitSupportApi = {
  scheduleVisit: (payload: {
    property_id?: string;
    room_type_id?: string;
    room_slug?: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    preferred_date: string;
    time_slot: string;
    notes?: string;
  }) => apiRequest<{ visit: any }>("/visits/schedule", { method: "POST", body: payload }),

  getMyVisits: () => apiRequest<{ visits: any[] }>("/visits/my"),
  getOwnerVisits: () => apiRequest<{ visits: any[] }>("/visits/owner"),
  updateVisitStatus: (id: string, status: string, admin_notes?: string) =>
    apiRequest<{ visit: any }>(`/visits/${id}/status`, {
      method: "PATCH",
      body: { status, ...(admin_notes ? { admin_notes } : {}) },
    }),

  getMySupportTickets: () => apiRequest<{ tickets: any[] }>("/support"),
  createSupportTicket: (payload: {
    booking_id?: string | null;
    category: "general" | "maintenance" | "housekeeping" | "payment" | "cancellation";
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    subject: string;
    message: string;
  }) => apiRequest<{ ticket: any }>("/support", { method: "POST", body: payload }),
};

export const PropertiesApi = {
  getMyListings: () =>
    apiRequest<{ properties: any[] }>("/properties/my-listings?limit=50"),

  createProperty: (payload: any) =>
    apiRequest<{ property: any }>("/properties", { method: "POST", body: payload }),
};

export const AdminApi = {
  getDashboard: () => apiRequest<any>("/admin/dashboard"),
  getProperties: () => apiRequest<{ properties: any[] }>("/admin/properties?limit=50"),
  moderateProperty: (id: string, status: "active" | "inactive" | "archived", moderation_note?: string) =>
    apiRequest<any>(`/admin/properties/${id}/status`, {
      method: "PATCH",
      body: { status, moderation_note },
    }),
  getBookings: () => apiRequest<{ bookings: any[] }>("/admin/bookings?limit=50"),
  updateBookingStatus: (id: string, status: string) =>
    apiRequest<any>(`/admin/bookings/${id}/status`, { method: "PATCH", body: { status } }),
  cancelBooking: (id: string, cancellation_reason?: string) =>
    apiRequest<any>(`/admin/bookings/${id}/cancel`, {
      method: "POST",
      body: { cancellation_reason },
    }),
  getCustomers: (search = "") =>
    apiRequest<{ customers: any[] }>(`/admin/customers?limit=50${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  createUser: (payload: any) =>
    apiRequest<{ user: any }>("/admin/users", { method: "POST", body: payload }),
  updateUserRole: (id: string, role: "guest" | "host" | "admin") =>
    apiRequest<{ user: any }>(`/admin/users/${id}/role`, { method: "PATCH", body: { role } }),
  getRooms: () => apiRequest<{ room_types: any[] }>("/admin/rooms"),
  createRoom: (payload: any) =>
    apiRequest<any>("/admin/rooms", { method: "POST", body: payload }),
  getBeds: () => apiRequest<{ units: any[] }>("/admin/beds"),
  manageBed: (payload: any) =>
    apiRequest<any>("/admin/beds", { method: "POST", body: payload }),
  createBlock: (payload: any) =>
    apiRequest<any>("/admin/inventory/blocks", { method: "POST", body: payload }),
  deleteBlock: (id: string) =>
    apiRequest<any>(`/admin/inventory/blocks/${id}`, { method: "DELETE" }),
  getCalendar: (days = 10) =>
    apiRequest<any>(`/admin/calendar?days=${days}`),
  getRates: () => apiRequest<{ rate_plans: any[] }>("/admin/rates"),
  updateRate: (id: string, payload: any) =>
    apiRequest<any>(`/admin/rates/${id}`, { method: "PATCH", body: payload }),
  createOfflineBooking: (payload: any) =>
    apiRequest<any>("/admin/bookings/offline", { method: "POST", body: payload }),
  recordOfflinePayment: (payload: any) =>
    apiRequest<any>("/admin/payments/offline", { method: "POST", body: payload }),
  getVisits: () => apiRequest<{ visits: any[] }>("/admin/visits?limit=50"),
  updateVisit: (id: string, status: string, admin_notes?: string) =>
    apiRequest<any>(`/admin/visits/${id}`, {
      method: "PATCH",
      body: { status, ...(admin_notes ? { admin_notes } : {}) },
    }),
  getSupportTickets: () => apiRequest<{ tickets: any[] }>("/admin/support?limit=50"),
  replySupport: (id: string, admin_reply: string, status = "resolved") =>
    apiRequest<any>(`/admin/support/${id}/reply`, {
      method: "POST",
      body: { admin_reply, status },
    }),
  getContent: () => apiRequest<{ content: Record<string, any> }>("/admin/content"),
  updateContent: (key: string, value: any) =>
    apiRequest<any>("/admin/content", { method: "PUT", body: { key, value } }),
  getSettings: () => apiRequest<{ settings: Record<string, any> }>("/admin/settings"),
  updateSettings: (key: string, value: any, is_public = true) =>
    apiRequest<any>("/admin/settings", { method: "PUT", body: { key, value, is_public } }),
  getAuditLogs: () => apiRequest<{ logs: any[] }>("/admin/audit-logs?limit=50"),
};
