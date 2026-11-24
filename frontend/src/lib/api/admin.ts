import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import {
  AdminDashboardStats,
  AdminPropertiesQuery,
  AdminBookingsQuery,
  AdminPaymentsQuery,
  AdminReviewsQuery,
  RevenueReportQuery,
  BackendProperty,
  BackendBooking,
  BackendPayment,
  BackendReview,
  PaginationMeta,
} from './types';

export interface AdminPropertiesResponse {
  properties: BackendProperty[];
  pagination: PaginationMeta;
}

export interface AdminBookingsResponse {
  bookings: BackendBooking[];
  pagination: PaginationMeta;
}

export interface AdminPaymentsResponse {
  payments: BackendPayment[];
  pagination: PaginationMeta;
}

export interface AdminReviewsResponse {
  reviews: BackendReview[];
  pagination: PaginationMeta;
}

export interface RevenueReportResponse {
  period: string;
  totalRevenue: number;
  completedBookingsCount: number;
  currency: string;
  dailyBreakdown?: Array<{
    date: string;
    revenue: number;
    count: number;
  }>;
}

export const adminApi = {
  /**
   * Get high-level KPI metrics and stats for admin dashboard
   */
  getDashboardStats: () => apiGet<AdminDashboardStats>('/admin/dashboard'),

  /**
   * Get all properties for admin oversight with filtering
   */
  getProperties: (params?: AdminPropertiesQuery) =>
    apiGet<AdminPropertiesResponse | { properties: BackendProperty[] }>(
      '/admin/properties',
      { params }
    ),

  /**
   * Moderate property status (approve, reject, flag, etc.)
   */
  moderateProperty: (id: string, data: { status: string; reason?: string }) =>
    apiPatch<BackendProperty>(`/admin/properties/${id}/status`, data),

  /**
   * Get all bookings for admin oversight
   */
  getBookings: (params?: AdminBookingsQuery) =>
    apiGet<AdminBookingsResponse | { bookings: BackendBooking[] }>(
      '/admin/bookings',
      { params }
    ),

  /**
   * Update booking status as admin
   */
  updateBookingStatus: (id: string, data: { status: string; note?: string }) =>
    apiPatch<BackendBooking>(`/admin/bookings/${id}/status`, data),

  /**
   * Cancel booking as admin with refund consideration
   */
  cancelBooking: (id: string, data: { reason: string; issueRefund?: boolean }) =>
    apiPost<BackendBooking>(`/admin/bookings/${id}/cancel`, data),

  /**
   * Get all platform payments with status and date filters
   */
  getPayments: (params?: AdminPaymentsQuery) =>
    apiGet<AdminPaymentsResponse | { payments: BackendPayment[] }>(
      '/admin/payments',
      { params }
    ),

  /**
   * Get revenue and platform fee financial reports
   */
  getRevenueReport: (params?: RevenueReportQuery) =>
    apiGet<RevenueReportResponse>('/admin/reports/revenue', { params }),

  /**
   * Moderate reviews across platform
   */
  getReviews: (params?: AdminReviewsQuery) =>
    apiGet<AdminReviewsResponse | { reviews: BackendReview[] }>(
      '/admin/reviews',
      { params }
    ),

  /**
   * Delete or suppress an abusive review as admin
   */
  deleteReview: (id: string) =>
    apiDelete<{ message: string }>(`/admin/reviews/${id}`),
};

