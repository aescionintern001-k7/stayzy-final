import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import {
  BackendReview,
  CreateReviewRequest,
  UpdateReviewRequest,
  PaginationMeta,
} from './types';

export interface PropertyReviewsResponse {
  reviews: BackendReview[];
  pagination: PaginationMeta;
  ratingDistribution?: Record<number, number>;
  averageRating?: number;
}

export interface MyReviewsResponse {
  reviews: BackendReview[];
  pagination: PaginationMeta;
}

export const reviewsApi = {
  /**
   * Get public reviews for a specific property
   */
  getPropertyReviews: (
    propertyId: string,
    params?: { page?: number; limit?: number; rating?: number }
  ) =>
    apiGet<PropertyReviewsResponse | { reviews: BackendReview[] }>(
      `/reviews/property/${propertyId}`,
      { params }
    ),

  /**
   * Get reviews written by the currently logged in user
   */
  getMyReviews: (params?: { page?: number; limit?: number }) =>
    apiGet<MyReviewsResponse | { reviews: BackendReview[] }>('/reviews/my', {
      params,
    }),

  /**
   * Get single review details by ID
   */
  getReviewById: (id: string) => apiGet<BackendReview>(`/reviews/${id}`),

  /**
   * Submit a new review for a completed stay
   */
  createReview: (data: CreateReviewRequest) =>
    apiPost<BackendReview>('/reviews', data),

  /**
   * Update own review
   */
  updateReview: (id: string, data: UpdateReviewRequest) =>
    apiPatch<BackendReview>(`/reviews/${id}`, data),

  /**
   * Delete own review (or admin delete)
   */
  deleteReview: (id: string) => apiDelete<{ message: string }>(`/reviews/${id}`),
};

