// Stayzy Mobile Firebase Integration (Expo SDK 52)
// Compatible with Expo Go on physical Android and iOS devices

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  // @ts-expect-error React Native export in firebase/auth
  getReactNativePersistence,
  getAuth,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const mobileFirebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyAm-hx_KDHYrtEdEXm2l8oC8YrRhAkjqtA",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "stayzy-2e171.firebaseapp.com",
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "stayzy-2e171",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "stayzy-2e171.firebasestorage.app",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "54975315748",
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    "1:54975315748:web:0f7531f49581af40effdb1",
};

// Initialize or reuse Firebase App instance
export const app =
  getApps().length > 0 ? getApp() : initializeApp(mobileFirebaseConfig);

// Initialize React Native Auth with AsyncStorage persistence
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e: any) {
  // If already initialized (e.g. during fast-refresh)
  auth = getAuth(app);
}

export const db: Firestore = getFirestore(app);
export { auth };
