import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "stayzy_access_token";
const REFRESH_TOKEN_KEY = "stayzy_refresh_token";
const PENDING_BOOKING_KEY = "stayzy_pending_booking_recovery";

export interface PendingBookingRecoveryRecord {
  userId: string;
  idempotencyKey: string;
  roomTypeId: string;
  startDate: string;
  holdToken?: string | null;
  createdAt: number;
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const TokenStorage = {
  async saveTokens(accessToken: string, refreshToken?: string | null) {
    await setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },
  async getAccessToken() {
    return getItem(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken() {
    return getItem(REFRESH_TOKEN_KEY);
  },
  async clear() {
    await Promise.all([
      removeItem(ACCESS_TOKEN_KEY),
      removeItem(REFRESH_TOKEN_KEY),
    ]);
  },
};

export const PendingBookingStorage = {
  async save(record: PendingBookingRecoveryRecord): Promise<void> {
    await setItem(PENDING_BOOKING_KEY, JSON.stringify(record));
  },
  async getForUser(userId?: string | null): Promise<PendingBookingRecoveryRecord | null> {
    if (!userId) return null;
    const raw = await getItem(PENDING_BOOKING_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as PendingBookingRecoveryRecord;
      if (!parsed?.userId || !parsed?.idempotencyKey || parsed.userId !== userId) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },
  async clear(): Promise<void> {
    await removeItem(PENDING_BOOKING_KEY);
  },
};
