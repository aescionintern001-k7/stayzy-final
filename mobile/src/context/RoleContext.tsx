import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  AuthApi,
  AuthUser,
  UsersApi,
  setOnSessionExpired,
} from "../services/api";
import { TokenStorage } from "../services/secureStorage";

export type UserRole = "CUSTOMER" | "OWNER" | "ADMIN";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  backendRole: "guest" | "host" | "admin";
  avatar?: string | null;
}

const GUEST_MODE_KEY = "@stayzy_guest_mode";
const LOCAL_FAV_KEY = "@stayzy_guest_favorites";

function mapBackendRole(role?: string): UserRole {
  if (role === "admin") return "ADMIN";
  if (role === "host") return "OWNER";
  return "CUSTOMER";
}

function toUserProfile(u: AuthUser | null): UserProfile {
  if (!u) {
    return {
      id: "guest",
      name: "Guest Explorer",
      email: "",
      phone: "",
      role: "CUSTOMER",
      backendRole: "guest",
    };
  }
  return {
    id: u.id,
    name: u.full_name || u.email?.split("@")[0] || "Stayzy User",
    email: u.email,
    phone: u.phone || "",
    role: mapBackendRole(u.role),
    backendRole: u.role,
    avatar: u.profile_image_url,
  };
}

interface RoleContextType {
  role: UserRole;
  user: UserProfile;
  authUser: AuthUser | null;
  /** @deprecated Legacy alias retained for unused template screens. */
  firebaseUser: AuthUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  favorites: string[];
  isFavorite: (roomTypeId: string) => boolean;
  toggleFavorite: (roomTypeId: string) => Promise<void>;
  login: (
    identifier: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (
    idToken: string
  ) => Promise<{ success: boolean; error?: string }>;
  registerUser: (
    fullName: string,
    email: string,
    phone: string,
    password: string,
    accountRole?: "guest" | "host"
  ) => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** @deprecated Server role is authoritative; retained only for legacy signature compatibility. */
  setRole: (_role: UserRole) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  const loadFavorites = useCallback(async (authenticated: boolean) => {
    if (authenticated) {
      try {
        const res = await UsersApi.getFavorites();
        setFavorites(
          (res.favorites || []).map((f: any) => f.room_type_id).filter(Boolean)
        );
        return;
      } catch {
        // Fallback silently
      }
    }
    try {
      const raw = await AsyncStorage.getItem(LOCAL_FAV_KEY);
      setFavorites(raw ? JSON.parse(raw) : []);
    } catch {
      setFavorites([]);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const token = await TokenStorage.getAccessToken();
      if (!token) {
        setAuthUser(null);
        const guestFlag = await AsyncStorage.getItem(GUEST_MODE_KEY);
        setIsGuest(guestFlag === "1");
        await loadFavorites(false);
        return;
      }

      const res = await UsersApi.getProfile();
      setAuthUser(res.user);
      setIsGuest(false);
      await loadFavorites(true);
    } catch {
      await TokenStorage.clear();
      setAuthUser(null);
      const guestFlag = await AsyncStorage.getItem(GUEST_MODE_KEY);
      setIsGuest(guestFlag === "1");
      await loadFavorites(false);
    }
  }, [loadFavorites]);

  useEffect(() => {
    setOnSessionExpired(() => {
      setAuthUser(null);
      setIsGuest(false);
      setFavorites([]);
    });

    (async () => {
      await refreshProfile();
      setLoading(false);
    })();

    return () => setOnSessionExpired(null);
  }, [refreshProfile]);

  const completeAuthSession = async (res: {
    token: string;
    refresh_token: string;
    user: AuthUser;
  }) => {
    await TokenStorage.saveTokens(res.token, res.refresh_token);
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setAuthUser(res.user);
    setIsGuest(false);
    await loadFavorites(true);
  };

  const login = async (identifier: string, password: string) => {
    try {
      const trimmed = identifier.trim();
      const payload = trimmed.includes("@")
        ? { email: trimmed, password, device_label: `Stayzy-${Platform.OS}` }
        : { identifier: trimmed, password, device_label: `Stayzy-${Platform.OS}` };

      const res = await AuthApi.login(payload);
      await completeAuthSession(res);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Invalid credentials. Please try again.",
      };
    }
  };

  const googleLogin = async (idToken: string) => {
    try {
      const res = await AuthApi.googleLogin(idToken);
      await completeAuthSession(res);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Google sign-in failed. Please try again.",
      };
    }
  };

  const registerUser = async (
    fullName: string,
    email: string,
    phone: string,
    password: string,
    accountRole: "guest" | "host" = "guest"
  ) => {
    try {
      await AuthApi.register({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        role: accountRole === "host" ? "host" : "guest",
      });

      return await login(email.trim(), password);
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Registration failed. Please check your details.",
      };
    }
  };

  const loginAsGuest = async () => {
    await TokenStorage.clear();
    await AsyncStorage.setItem(GUEST_MODE_KEY, "1");
    setAuthUser(null);
    setIsGuest(true);
    await loadFavorites(false);
  };

  const logout = async () => {
    try {
      const refreshToken = await TokenStorage.getRefreshToken();
      if (authUser) {
        await AuthApi.logout(refreshToken);
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      await TokenStorage.clear();
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      setAuthUser(null);
      setIsGuest(false);
      setFavorites([]);
    }
  };

  const isFavorite = (roomTypeId: string) => favorites.includes(roomTypeId);

  const toggleFavorite = async (roomTypeId: string) => {
    const exists = favorites.includes(roomTypeId);
    const next = exists
      ? favorites.filter((id) => id !== roomTypeId)
      : [...favorites, roomTypeId];
    setFavorites(next);

    if (authUser) {
      try {
        if (exists) {
          await UsersApi.removeFavorite(roomTypeId);
        } else {
          await UsersApi.addFavorite(roomTypeId);
        }
      } catch {
        // Revert on server rejection
        setFavorites(favorites);
      }
    } else {
      await AsyncStorage.setItem(LOCAL_FAV_KEY, JSON.stringify(next));
    }
  };

  const user = toUserProfile(authUser);

  return (
    <RoleContext.Provider
      value={{
        role: user.role,
        user,
        authUser,
        firebaseUser: authUser,
        isAuthenticated: Boolean(authUser),
        isGuest,
        loading,
        favorites,
        isFavorite,
        toggleFavorite,
        login,
        googleLogin,
        registerUser,
        loginAsGuest,
        logout,
        refreshProfile,
        setRole: () => {},
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
