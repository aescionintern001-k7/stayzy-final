import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAjUnuYLvCGfYJEqQ7unkYxAmWbDrwhy6E",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pg-rooms-60c83.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pg-rooms-60c83",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pg-rooms-60c83.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "27796929578",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:27796929578:web:c9018be5ea6e29db88d753",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-ZB2V2Z6VZ3",
};

// Initialize or reuse existing Firebase app
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize analytics conditionally on client-side only
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics };
