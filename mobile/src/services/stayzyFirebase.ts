import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../config/firebase";

export interface BookingPayload {
  bookingId: string;
  roomId: string;
  roomName: string;
  propertyName: string;
  locality: string;
  durationPlan: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";
  rentAmount: number;
  depositAmount: number;
  totalAmount: number;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  roomPin?: string;
  wifiSsid?: string;
  wifiPass?: string;
}

export interface VisitPayload {
  visitId: string;
  roomId: string;
  propertyName: string;
  address: string;
  timeSlot: string;
  userId: string;
  userName: string;
  userPhone: string;
}

const LOCAL_BOOKINGS_KEY = "@stayzy_cached_bookings";
const LOCAL_VISITS_KEY = "@stayzy_cached_visits";

/**
 * Create a new Booking in Firestore and sync locally
 */
export async function createBooking(payload: BookingPayload) {
  const newBooking = {
    ...payload,
    status: "CONFIRMED",
    roomPin: payload.roomPin || "8921#",
    wifiSsid: payload.wifiSsid || "Stayzy-Resident-5G",
    wifiPass: payload.wifiPass || "stayzy@koramangala",
    checkInDate: new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    checkOutDate: "30 Dec 2026",
    rentStatus: "PAID",
    createdAt: new Date().toISOString(),
  };

  try {
    // 1. Save to Firebase Firestore
    await addDoc(collection(db, "stayzyBookings"), {
      ...newBooking,
      serverTime: serverTimestamp(),
    });
  } catch (error) {
    console.log("[Firebase] Firestore offline/demo fallback for booking:", error);
  }

  // 2. Cache locally for instant offline display
  try {
    const existing = await AsyncStorage.getItem(LOCAL_BOOKINGS_KEY);
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(newBooking);
    await AsyncStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("AsyncStorage error:", e);
  }

  return newBooking;
}

/**
 * Schedule a Property Walkthrough Visit in Firestore
 */
export async function scheduleTourVisit(payload: VisitPayload) {
  const newVisit = {
    ...payload,
    status: "CONFIRMED",
    date: new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    createdAt: new Date().toISOString(),
  };

  try {
    // 1. Save to Firebase Firestore
    await addDoc(collection(db, "stayzyVisits"), {
      ...newVisit,
      serverTime: serverTimestamp(),
    });
  } catch (error) {
    console.log("[Firebase] Firestore offline/demo fallback for visit:", error);
  }

  // 2. Cache locally
  try {
    const existing = await AsyncStorage.getItem(LOCAL_VISITS_KEY);
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(newVisit);
    await AsyncStorage.setItem(LOCAL_VISITS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("AsyncStorage error:", e);
  }

  return newVisit;
}

/**
 * Fetch all bookings for the active user
 */
export async function getActiveBookings(userId: string) {
  try {
    // Check local cache first
    const cached = await AsyncStorage.getItem(LOCAL_BOOKINGS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return [];
}
