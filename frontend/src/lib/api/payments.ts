import { apiClient } from "./client";
import {
  BackendPayment,
  PaymentOrderResult,
  VerifyPaymentDTO,
  FailPaymentDTO,
} from "./types";

export const paymentsApi = {
  /**
   * Authenticated: Create a Razorpay order for an active booking
   */
  async createOrder(bookingId: string): Promise<PaymentOrderResult> {
    const res = await apiClient.post<PaymentOrderResult>("/payments/create-order", {
      booking_id: bookingId,
    });
    return res.data;
  },

  /**
   * Authenticated: Verify Razorpay HMAC-SHA256 signature and capture payment
   */
  async verifyPayment(data: VerifyPaymentDTO): Promise<BackendPayment> {
    const res = await apiClient.post<BackendPayment>("/payments/verify", data);
    return res.data;
  },

  /**
   * Authenticated: Record payment failure
   */
  async recordFailure(data: FailPaymentDTO): Promise<BackendPayment> {
    const res = await apiClient.post<BackendPayment>("/payments/fail", data);
    return res.data;
  },

  /**
   * Authenticated: List current user's payment transactions
   */
  async getMyPayments(query?: { page?: number; limit?: number }) {
    return apiClient.get<BackendPayment[]>("/payments/my", {
      params: query as Record<string, string | number | boolean | undefined | null>,
    });
  },

  /**
   * Authenticated: Get payments associated with a specific booking
   */
  async getPaymentsByBooking(bookingId: string) {
    return apiClient.get<BackendPayment[]>(`/payments/booking/${bookingId}`);
  },

  /**
   * Authenticated: Get payment details by ID
   */
  async getPaymentById(id: string): Promise<BackendPayment> {
    const res = await apiClient.get<BackendPayment>(`/payments/${id}`);
    return res.data;
  },

  /**
   * Host / Admin: Initiate full or partial refund
   */
  async refundPayment(id: string, amount?: number, reason?: string) {
    return apiClient.post(`/payments/${id}/refund`, { amount, reason });
  },
};

