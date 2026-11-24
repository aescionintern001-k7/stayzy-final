/**
 * TypeScript type definitions for Stayzy Express Backend API
 * Authoritative schemas matching backend OpenAPI 3.0.3 specification
 */

// -------------------------------------------------------------
// Core Enums & Role Mappings
// -------------------------------------------------------------
export type BackendRole = "guest" | "host" | "admin";
export type FrontendRole = "CUSTOMER" | "OWNER" | "ADMIN";

export type UserStatus = "active" | "suspended" | "pending";

export type PropertyType =
  | "apartment"
  | "house"
  | "villa"
  | "condo"
  | "cottage"
  | "cabin"
  | "studio"
  | "chalet"
  | "other";

export type RoomType =
  | "entire_place"
  | "private_room"
  | "shared_room"
  | "hotel_room";

export type PropertyStatus = "active" | "inactive" | "archived" | "draft";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export type RazorpayStatus = "created" | "captured" | "failed" | "refunded";

// -------------------------------------------------------------
// Generic API Responses
// -------------------------------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
    count?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  code?: string;
  details?: Array<{ path?: string; message: string }>;
}

// -------------------------------------------------------------
// User & Auth Types
// -------------------------------------------------------------
export interface BackendUser {
  id: string;
  full_name: string;
  email: string;
  role: BackendRole;
  account_status: UserStatus;
  phone?: string | null;
  profile_image_url?: string | null;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponseData {
  user: BackendUser;
  token: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
  role?: "guest" | "host";
  phone?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UpdateProfileDTO {
  name?: string;
  phone?: string;
  profile_image_url?: string;
}

// -------------------------------------------------------------
// Property Types
// -------------------------------------------------------------
export interface BackendProperty {
  id: string;
  host_id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  room_type: RoomType;
  price_per_night: number | string;
  currency: string;
  address: string;
  city: string;
  state?: string | null;
  country: string;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number | string;
  amenities: string[];
  images: string[];
  status: PropertyStatus;
  is_available: boolean;
  average_rating: number | string;
  reviews_count: number;
  moderation_note?: string | null;
  moderated_at?: string | null;
  moderated_by?: string | null;
  created_at: string;
  updated_at: string;
  host?: Partial<BackendUser>;
}

export interface ListPropertiesQuery {
  page?: number;
  limit?: number;
  city?: string;
  min_price?: number;
  max_price?: number;
  property_type?: PropertyType;
  room_type?: RoomType;
  max_guests?: number;
  amenities?: string;
  check_in?: string;
  check_out?: string;
  sort_by?: "price_asc" | "price_desc" | "rating" | "newest";
}

export interface CreatePropertyDTO {
  title: string;
  description: string;
  property_type?: PropertyType;
  room_type?: RoomType;
  price_per_night: number;
  currency?: string;
  address: string;
  city: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  max_guests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  amenities?: string[];
  images?: string[];
}

export interface UpdatePropertyDTO extends Partial<CreatePropertyDTO> {
  status?: PropertyStatus;
  is_available?: boolean;
}

// -------------------------------------------------------------
// Booking Types
// -------------------------------------------------------------
export interface CheckAvailabilityQuery {
  property_id: string;
  check_in: string;
  check_out: string;
  guests?: number;
}

export interface AvailabilityResult {
  available: boolean;
  property_id: string;
  check_in: string;
  check_out: string;
  total_nights: number;
  price_per_night: number;
  total_price: number;
  currency: string;
  conflict?: boolean;
}

export interface CreateBookingDTO {
  property_id: string;
  check_in: string;
  check_out: string;
  total_guests?: number;
  special_requests?: string;
}

export interface BackendBooking {
  id: string;
  property_id: string;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  total_nights: number;
  price_per_night: number | string;
  total_price: number | string;
  currency: string;
  guests_count: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  special_requests?: string | null;
  created_at: string;
  updated_at: string;
  property?: BackendProperty;
  guest?: BackendUser;
  payments?: BackendPayment[];
}

export interface ListBookingsQuery {
  page?: number;
  limit?: number;
  status?: BookingStatus;
  payment_status?: PaymentStatus;
}

// -------------------------------------------------------------
// Payment Types (Razorpay)
// -------------------------------------------------------------
export interface BackendPayment {
  id: string;
  booking_id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  amount: number | string;
  currency: string;
  status: RazorpayStatus;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentOrderDTO {
  booking_id: string;
}

export interface PaymentOrderResult {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  booking_id: string;
}

export interface VerifyPaymentDTO {
  booking_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface FailPaymentDTO {
  booking_id: string;
  razorpay_order_id: string;
  error_code?: string;
  error_description?: string;
}

// -------------------------------------------------------------
// Review Types
// -------------------------------------------------------------
export interface BackendReview {
  id: string;
  booking_id: string;
  property_id: string;
  guest_id: string;
  rating: number;
  title?: string | null;
  comment: string;
  created_at: string;
  updated_at: string;
  guest?: {
    id: string;
    full_name: string;
    profile_image_url?: string | null;
  };
}

export interface CreateReviewDTO {
  booking_id: string;
  rating: number;
  title?: string;
  comment: string;
}

export interface UpdateReviewDTO {
  rating?: number;
  title?: string;
  comment?: string;
}

// -------------------------------------------------------------
// Admin Types
// -------------------------------------------------------------
export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    guests: number;
    hosts: number;
    admins: number;
  };
  properties: {
    total: number;
    active: number;
    inactive: number;
    draft: number;
    archived: number;
  };
  bookings: {
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  financials: {
    total_gmv: number;
    platform_revenue: number;
    refunded_amount: number;
    average_booking_value: number;
  };
  ratings: {
    platform_average_rating: number;
    total_reviews: number;
  };
}

export interface ModeratePropertyDTO {
  status: PropertyStatus;
  moderation_note?: string;
}

export type CreateReviewRequest = CreateReviewDTO;
export type UpdateReviewRequest = UpdateReviewDTO;

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  count?: number;
}

export interface AdminPropertiesQuery {
  page?: number;
  limit?: number;
  status?: string;
  city?: string;
  search?: string;
}

export interface AdminBookingsQuery {
  page?: number;
  limit?: number;
  status?: string;
}

export interface AdminPaymentsQuery {
  page?: number;
  limit?: number;
  status?: string;
}

export interface AdminReviewsQuery {
  page?: number;
  limit?: number;
  property_id?: string;
}

export interface RevenueReportQuery {
  from_date?: string;
  to_date?: string;
  currency?: string;
}

