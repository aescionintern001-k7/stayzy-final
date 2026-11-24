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
    "AIzaSyAjUnuYLvCGfYJEqQ7unkYxAmWbDrwhy6E",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "pg-rooms-60c83.firebaseapp.com",
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "pg-rooms-60c83",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "pg-rooms-60c83.firebasestorage.app",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "27796929578",
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    "1:27796929578:web:c9018be5ea6e29db88d753",
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
