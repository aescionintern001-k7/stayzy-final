import React from "react";
import { Tabs, Redirect } from "expo-router";
import {
  View,
  Text,
  Platform,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Compass,
  Heart,
  CalendarDays,
  Users,
  User,
  FileText,
  Building2,
  LayoutDashboard,
  House,
} from "lucide-react-native";
import { useRole } from "../../src/context/RoleContext";

export default function Layout() {
  const { role, setRole, firebaseUser, isGuest, loading, logout } = useRole();
  const wide = useWindowDimensions().width >= 900;

  if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 40 }} />;
  if (!firebaseUser && !isGuest) return <Redirect href="/login" />;

  const admin = role === "ADMIN";
  const customer = role === "CUSTOMER";
  const owner = role === "OWNER";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* Top Header Bar */}
      <View
        style={{
          height: 64,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: wide ? 44 : 16,
          borderBottomWidth: 1,
          borderColor: "#e6e5e3",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <House color="#c5193e" size={26} />
          <Text style={{ fontWeight: "900", fontSize: 24, letterSpacing: -1 }}>
            Stay<Text style={{ color: "#c5193e" }}>zy</Text>
          </Text>
        </View>

        {/* Quick Role Switcher (Resident / Owner / Admin) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRole("CUSTOMER")}
            style={{
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 16,
              backgroundColor: customer ? "#c5193e" : "#f1f1f1",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: customer ? "#ffffff" : "#555555",
              }}
            >
              Resident
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRole("OWNER")}
            style={{
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 16,
              backgroundColor: owner ? "#c5193e" : "#f1f1f1",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: owner ? "#ffffff" : "#555555",
              }}
            >
              PG Host
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRole("ADMIN")}
            style={{
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 16,
              backgroundColor: admin ? "#c5193e" : "#f1f1f1",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: admin ? "#ffffff" : "#555555",
              }}
            >
              Admin
            </Text>
          </Pressable>
        </View>
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarPosition: wide ? "left" : "bottom",
          tabBarLabelPosition: wide ? "beside-icon" : "below-icon",
          tabBarActiveTintColor: "#b51639",
          tabBarInactiveTintColor: "#565659",
          tabBarStyle: {
            ...(wide ? { width: 185 } : { height: 64 }),
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        }}
      >
        {(
          [
            [
              "index",
              customer ? "Explore" : admin ? "Operations" : "Properties",
              customer ? Compass : admin ? LayoutDashboard : Building2,
              true,
            ],
            ["saved", "Shortlist", Heart, customer],
            ["stays", "Bookings", CalendarDays, true],
            ["people", admin ? "People" : "Residents", Users, !customer],
            ["content", "Content", FileText, admin],
            ["profile", "Account", User, true],
            ["search", "Search", Compass, false],
          ] as const
        ).map(([name, title, Icon, show]) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              href: show ? undefined : null,
              tabBarIcon: ({ color }) => (
                <Icon color={color} size={22} strokeWidth={1.7} />
              ),
            }}
          />
        ))}
      </Tabs>
    </SafeAreaView>
  );
}
