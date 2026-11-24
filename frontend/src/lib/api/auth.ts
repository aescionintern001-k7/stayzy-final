import { apiClient, setClientAuthToken, getClientAuthToken } from "./client";
import {
  AuthResponseData,
  BackendUser,
  LoginDTO,
  RegisterDTO,
  ApiResponse,
} from "./types";

export const authApi = {
  /**
   * Register a new user with Express backend
   */
  async register(data: RegisterDTO): Promise<AuthResponseData> {
    const res = await apiClient.post<AuthResponseData>("/auth/register", data);
    if (res.data?.token) {
      setClientAuthToken(res.data.token);
    }
    return res.data;
  },

  /**
   * Login with email and password
   */
  async login(data: LoginDTO): Promise<AuthResponseData> {
    const res = await apiClient.post<AuthResponseData>("/auth/login", data);
    if (res.data?.token) {
      setClientAuthToken(res.data.token);
    }
    return res.data;
  },

  /**
   * Fetch current authenticated user profile
   */
  async getProfile(): Promise<BackendUser> {
    const res = await apiClient.get<BackendUser>("/auth/me");
    return res.data;
  },

  /**
   * Logout and clear session
   */
  logout(): void {
    setClientAuthToken(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("stayzy_auth_changed"));
    }
  },

  /**
   * Current token getter and setter
   */
  getToken: getClientAuthToken,
  setToken: setClientAuthToken,
};

