import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../config/firebase";

import { ensurePerson } from "./people";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

export type UserRole = "CUSTOMER" | "OWNER" | "ADMIN";

export interface ActiveStay {
  propertyName: string;
  roomName: string;
  roomPin: string;
  wifiName: string;
  wifiPass: string;
  checkOutDate: string;
  rentStatus: "PAID" | "DUE";
  rentAmount: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  activeStay?: ActiveStay;
}

export const DEMO_PROFILES: Record<UserRole, UserProfile> = {
  CUSTOMER: {
    id: "usr-cust-1",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    phone: "+91 98765 43210",
    role: "CUSTOMER",
    activeStay: {
      propertyName: "Stayzy Haven — Koramangala",
      roomName: "Deluxe Private Studio Suite",
      roomPin: "8921#",
      wifiName: "Stayzy-Haven-Resident-5G",
      wifiPass: "stayzy@koramangala",
      checkOutDate: "30 Nov 2026",
      rentStatus: "PAID",
      rentAmount: 28000,
    },
  },
  OWNER: {
    id: "usr-own-1",
    name: "Rajesh Sharma",
    email: "rajesh.sharma@stayzy.in",
    phone: "+91 80 4567 8900",
    role: "OWNER",
  },
  ADMIN: {
    id: "usr-adm-1",
    name: "Vikramaditya (Lead Admin)",
    email: "admin@stayzy.com",
    phone: "+91 80 4567 8999",
    role: "ADMIN",
  },
};

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  user: UserProfile;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  login: (
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithRole: (role: UserRole) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  registerUser: (
    name: string,
    email: string,
    phone: string,
    pass: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  favorites: string[];
  toggleFavorite: (roomId: string) => Promise<void>;
  isFavorite: (roomId: string) => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const STORAGE_KEY_ROLE = "@stayzy_active_role";
const STORAGE_KEY_USER = "@stayzy_active_user";
const STORAGE_KEY_FAVS = "@stayzy_favorite_rooms";

export const RoleProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [role, setRoleState] = useState<UserRole>("CUSTOMER");
  const [user, setUser] = useState<UserProfile>(DEMO_PROFILES.CUSTOMER);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>(["room-1"]);

  useEffect(() => {
    let generation = 0;
    let stopProfile = () => {};
    const unsubscribe = onAuthStateChanged(auth, async (account) => {
      const current = ++generation;
      stopProfile();
      setFirebaseUser(account);
      setUser(DEMO_PROFILES.CUSTOMER);
      setRoleState("CUSTOMER");
      setIsAuthenticated(!!account);
      setLoading(!!account);
      if (!account) return;
      try {
        const token = await account.getIdTokenResult();
        await ensurePerson(account);
        if (current !== generation) return;
        stopProfile = onSnapshot(
          doc(db, "stayzyPeople", account.uid),
          (snap) => {
            if (!snap.exists() || current !== generation) return;
            const p = snap.data();
            const assigned =
              token.claims.stayzyAdmin === true
                ? "ADMIN"
                : p.role === "OWNER"
                  ? "OWNER"
                  : "CUSTOMER";
            setRoleState(assigned);setLoading(false);
            setUser({
              id: account.uid,
              name: p.name,
              email: p.email,
              phone: p.phone,
              role: assigned,
            });
          },
          () => {setRoleState("CUSTOMER");setLoading(false);},
        );
      } catch {
        if (current === generation) {setRoleState("CUSTOMER");setLoading(false);}
      }
    });
    return () => {
      generation++;
      stopProfile();
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    let active = true;
    setFavorites([]);
    AsyncStorage.getItem(STORAGE_KEY_FAVS + (firebaseUser?.uid || "guest"))
      .then((value) => {
        if (active && value) setFavorites(JSON.parse(value));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [firebaseUser?.uid]);
  const setRole = async (next: UserRole) => {
    setRoleState(next);
    if (!firebaseUser) {
      setUser(DEMO_PROFILES[next]);
    }
  };
  const loginWithRole = async (next: UserRole) => {
    setIsGuest(true);
    setRoleState(next);
    setUser(DEMO_PROFILES[next]);
  };
  const loginAsGuest = async () => {
    setIsGuest(true);
    setRoleState("CUSTOMER");
    setUser(DEMO_PROFILES.CUSTOMER);
  };
  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      setIsGuest(false);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Sign-in failed. Check your credentials and connection.",
      };
    }
  };
  const registerUser = async (
    name: string,
    email: string,
    phone: string,
    pass: string,
  ) => {
    try {
      const { user: account } = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        pass,
      );
      await ensurePerson(account);
      await updateDoc(doc(db, "stayzyPeople", account.uid), {
        name: name.trim(),
        phone: phone.trim(),
      });
      setIsGuest(false);
      return { success: true };
    } catch {
      return {
        success: false,
        error:
          "Registration or profile setup failed. If your account was created, sign in to complete your profile.",
      };
    }
  };
  const logout = async () => {
    try {
      await signOut(auth);
    } catch {}
    setFirebaseUser(null);
    setIsGuest(false);
    setIsAuthenticated(false);
  };

  const toggleFavorite = async (roomId: string) => {
    const updated = favorites.includes(roomId)
      ? favorites.filter((id) => id !== roomId)
      : [...favorites, roomId];
    setFavorites(updated);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY_FAVS + (firebaseUser?.uid || "guest"),
        JSON.stringify(updated),
      );
    } catch (e) {
      console.warn("Failed to persist favorites", e);
    }
  };

  const isFavorite = (roomId: string) => favorites.includes(roomId);

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        user,
        firebaseUser,
        isAuthenticated,
        isGuest,
        loading,
        login,
        loginWithRole,
        loginAsGuest,
        registerUser,
        logout,
        favorites,
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
};
