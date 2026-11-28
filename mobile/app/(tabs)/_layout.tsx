import React from "react";
import { Tabs, Redirect, useRouter } from "expo-router";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Compass,
  Search,
  Heart,
  CalendarDays,
  User,
  Building2,
  ShieldCheck,
  Leaf,
  LogIn,
} from "lucide-react-native";
import { useRole } from "../../src/context/RoleContext";
import { Colors } from "../../src/theme/colors";

export default function TabsLayout() {
  const router = useRouter();
  const { role, user, isAuthenticated, isGuest, loading } = useRole();

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated && !isGuest) {
    return <Redirect href="/login" />;
  }

  const isAdmin = isAuthenticated && role === "ADMIN";
  const isOwner = isAuthenticated && role === "OWNER";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Luxury Green & Ivory Top Bar */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <Leaf size={17} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandTitle}>
              Stay<Text style={styles.brandAccent}>zy</Text>
            </Text>
            <Text style={styles.brandSub}>Bengaluru Co-Living</Text>
          </View>
        </View>

        {isAuthenticated ? (
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>
              {isAdmin ? "ADMIN" : isOwner ? "PG HOST" : (user.name || "Stayzy").split(" ")[0]}
            </Text>
          </View>
        ) : (
          <Pressable
            style={styles.signInBtn}
            onPress={() => router.push("/login")}
          >
            <LogIn size={14} color="#FFFFFF" />
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
        )}
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarStyle: {
            backgroundColor: Colors.card,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: isAdmin ? "Overview" : isOwner ? "Host Hub" : "Explore",
            tabBarIcon: ({ color, size }) =>
              isAdmin ? (
                <ShieldCheck color={color} size={size} />
              ) : isOwner ? (
                <Building2 color={color} size={size} />
              ) : (
                <Compass color={color} size={size} />
              ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="saved"
          options={{
            title: "Saved",
            tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="stays"
          options={{
            title: "My Stays",
            tabBarIcon: ({ color, size }) => (
              <CalendarDays color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Account",
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />

        {/* Hidden legacy tabs kept non-indexed in bar for backwards route safety */}
        <Tabs.Screen name="content" options={{ href: null }} />
        <Tabs.Screen name="people" options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.textMain,
    letterSpacing: -0.5,
  },
  brandAccent: { color: Colors.secondary },
  brandSub: { fontSize: 10, color: Colors.textMuted, fontWeight: "600" },
  rolePill: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rolePillText: { fontSize: 11, fontWeight: "800", color: Colors.primary },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  signInBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
});
