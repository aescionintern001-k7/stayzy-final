import { apiClient } from "./client";
import {
  BackendBooking,
  CheckAvailabilityQuery,
  AvailabilityResult,
  CreateBookingDTO,
  ListBookingsQuery,
  BookingStatus,
} from "./types";

export const bookingsApi = {
  /**
   * Public: Check property availability & calculate authoritative pricing
   */
  async checkAvailability(query: CheckAvailabilityQuery): Promise<AvailabilityResult> {
    const res = await apiClient.get<AvailabilityResult>("/bookings/availability", {
      params: query as unknown as Record<string, string | number | boolean | undefined | null>,
    });
    return res.data;
  },

  /**
   * Authenticated: Create a new booking
   */
  async createBooking(data: CreateBookingDTO): Promise<BackendBooking> {
    const res = await apiClient.post<BackendBooking>("/bookings", data);
    return res.data;
  },

  /**
   * Authenticated: Get booking history for current user (Guest sees own, Host sees owned)
   */
  async getMyBookings(query?: ListBookingsQuery) {
    return apiClient.get<BackendBooking[]>("/bookings", {
      params: query as unknown as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Authenticated: Get booking details by ID
   */
  async getBookingById(id: string): Promise<BackendBooking> {
    const res = await apiClient.get<BackendBooking>(`/bookings/${id}`);
    return res.data;
  },

  /**
   * Authenticated: Cancel a booking
   */
  async cancelBooking(id: string, reason?: string): Promise<BackendBooking> {
    const res = await apiClient.patch<BackendBooking>(`/bookings/${id}/cancel`, {
      cancellation_reason: reason || "User requested cancellation",
    });
    return res.data;
  },

  /**
   * Host / Admin: Update booking status
   */
  async updateStatus(id: string, status: BookingStatus): Promise<BackendBooking> {
    const res = await apiClient.patch<BackendBooking>(`/bookings/${id}/status`, { status });
    return res.data;
  },

  /**
   * Host / Admin: View reservations for a specific property
   */
  async getPropertyReservations(propertyId: string) {
    return apiClient.get<BackendBooking[]>(`/bookings/property/${propertyId}`);
  },
};

