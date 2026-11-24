import { apiClient } from "./client";
import { BackendUser, UpdateProfileDTO, UserStatus } from "./types";

export const usersApi = {
  /**
   * Get current authenticated user profile
   */
  async getMe(): Promise<BackendUser> {
    const res = await apiClient.get<BackendUser>("/users/me");
    return res.data;
  },

  /**
   * Update current user profile
   */
  async updateMe(data: UpdateProfileDTO): Promise<BackendUser> {
    const res = await apiClient.patch<BackendUser>("/users/me", data);
    return res.data;
  },

  /**
   * Admin: List users with pagination and search
   */
  async listUsers(params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) {
    return apiClient.get<BackendUser[]>("/users", { params });
  },

  /**
   * Admin: Get single user by ID
   */
  async getUser(id: string): Promise<BackendUser> {
    const res = await apiClient.get<BackendUser>(`/users/${id}`);
    return res.data;
  },

  /**
   * Admin: Change user account status (active, suspended, pending)
   */
  async changeStatus(id: string, status: UserStatus): Promise<BackendUser> {
    const res = await apiClient.patch<BackendUser>(`/users/${id}/status`, { status });
    return res.data;
  },
};

