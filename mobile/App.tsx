import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  Platform,
} from "react-native";
import { RoleProvider, useRole } from "./src/context/RoleContext";
import { RoleSwitcherBar } from "./src/components/RoleSwitcherBar";
import { CustomerHomeScreen } from "./src/screens/customer/CustomerHomeScreen";
import { CustomerStaysScreen } from "./src/screens/customer/CustomerStaysScreen";
import { CustomerSavedScreen } from "./src/screens/customer/CustomerSavedScreen";
import { OwnerDashboardScreen } from "./src/screens/owner/OwnerDashboardScreen";
import { AdminDashboardScreen } from "./src/screens/admin/AdminDashboardScreen";
import { Colors } from "./src/theme/colors";
import {
  Compass,
  KeyRound,
  Heart,
  Building,
  CalendarCheck,
  ShieldAlert,
  BarChart2,
} from "lucide-react-native";

const MainAppContent: React.FC = () => {
  const { role } = useRole();
  const [activeTab, setActiveTab] = useState<string>("home");
  const { width } = useWindowDimensions();

  // Responsive check for Tablet / iPad (>= 768px)
  const isTablet = width >= 768;

  // Tabs based on the active role
  const getTabs = () => {
    switch (role) {
      case "OWNER":
        return [
          { key: "owner_dash", label: "Properties", icon: Building },
          { key: "owner_visits", label: "Tenant Visits", icon: CalendarCheck },
        ];
      case "ADMIN":
        return [
          { key: "admin_dash", label: "Operations", icon: BarChart2 },
          { key: "admin_audits", label: "Compliance", icon: ShieldAlert },
        ];
      case "CUSTOMER":
      default:
        return [
          { key: "home", label: "Explore", icon: Compass },
          { key: "stays", label: "My Stay", icon: KeyRound },
          { key: "saved", label: "Saved", icon: Heart },
        ];
    }
  };

  const tabs = getTabs();

  // Render the active screen
  const renderScreen = () => {
    if (role === "OWNER") {
      return <OwnerDashboardScreen />;
    }
    if (role === "ADMIN") {
      return <AdminDashboardScreen />;
    }
    // CUSTOMER
    if (activeTab === "stays") {
      return <CustomerStaysScreen />;
    }
    if (activeTab === "saved") {
      return <CustomerSavedScreen onNavigateExplore={() => setActiveTab("home")} />;
    }
    return <CustomerHomeScreen />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Universal Role Switcher Capsule */}
      <RoleSwitcherBar />

      {/* Main Screen Content with Tablet Centering */}
      <View style={[styles.mainWrapper, isTablet && styles.tabletWrapper]}>
        <View style={styles.screenContainer}>{renderScreen()}</View>
      </View>

      {/* Sleek Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        {tabs.map((tab) => {
          const isActive =
            (role === "CUSTOMER" && activeTab === tab.key) ||
            (role === "OWNER" && tab.key === "owner_dash") ||
            (role === "ADMIN" && tab.key === "admin_dash");
          const Icon = tab.icon;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
              style={styles.tabItem}
            >
              <View
                style={[
                  styles.tabIconCircle,
                  isActive && { backgroundColor: Colors.primaryLight },
                ]}
              >
                <Icon
                  size={20}
                  color={isActive ? Colors.primary : Colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive && { color: Colors.primary, fontWeight: "800" },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <RoleProvider>
      <MainAppContent />
    </RoleProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  mainWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabletWrapper: {
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  screenContainer: {
    flex: 1,
  },
  bottomTabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  tabIconCircle: {
    padding: 4,
    borderRadius: 12,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
  },
});
