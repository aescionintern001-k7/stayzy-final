import { apiClient } from "./client";
import {
  BackendProperty,
  ListPropertiesQuery,
  CreatePropertyDTO,
  UpdatePropertyDTO,
  PropertyStatus,
  BackendReview,
} from "./types";

export const propertiesApi = {
  /**
   * List properties with search filters and pagination
   */
  async listProperties(query?: ListPropertiesQuery) {
    return apiClient.get<BackendProperty[]>("/properties", { params: query as any });
  },

  /**
   * Search properties alias
   */
  async searchProperties(query?: ListPropertiesQuery) {
    return apiClient.get<BackendProperty[]>("/properties/search", { params: query as any });
  },

  /**
   * Get single property by UUID with amenities, host, and reviews aggregate
   */
  async getPropertyById(id: string): Promise<BackendProperty> {
    const res = await apiClient.get<BackendProperty>(`/properties/${id}`);
    return res.data;
  },

  /**
   * Host / Admin: Get current host's listings
   */
  async getMyListings(query?: { page?: number; limit?: number }) {
    return apiClient.get<BackendProperty[]>("/properties/my-listings", { params: query as any });
  },

  /**
   * Host / Admin: Create a new property listing
   */
  async createProperty(data: CreatePropertyDTO): Promise<BackendProperty> {
    const res = await apiClient.post<BackendProperty>("/properties", data);
    return res.data;
  },

  /**
   * Host / Admin: Update an existing property listing
   */
  async updateProperty(id: string, data: UpdatePropertyDTO): Promise<BackendProperty> {
    const res = await apiClient.patch<BackendProperty>(`/properties/${id}`, data);
    return res.data;
  },

  /**
   * Host / Admin: Delete / archive a property listing
   */
  async deleteProperty(id: string) {
    return apiClient.delete(`/properties/${id}`);
  },

  /**
   * Host / Admin: Update amenities list for property
   */
  async updateAmenities(id: string, amenities: string[]): Promise<BackendProperty> {
    const res = await apiClient.patch<BackendProperty>(`/properties/${id}/amenities`, { amenities });
    return res.data;
  },

  /**
   * Host / Admin: Toggle availability of property
   */
  async updateAvailability(id: string, is_available: boolean): Promise<BackendProperty> {
    const res = await apiClient.patch<BackendProperty>(`/properties/${id}/availability`, { is_available });
    return res.data;
  },

  /**
   * Public: Get reviews for a property
   */
  async getPropertyReviews(propertyId: string, query?: { page?: number; limit?: number }) {
    return apiClient.get<BackendReview[]>(`/properties/${propertyId}/reviews`, { params: query as any });
  },
};

