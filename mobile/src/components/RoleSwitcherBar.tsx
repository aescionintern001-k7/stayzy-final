import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRole, UserRole } from "../context/RoleContext";
import { Colors } from "../theme/colors";
import { User, Home, ShieldCheck } from "lucide-react-native";

export const RoleSwitcherBar: React.FC = () => {
  const { role, setRole, user } = useRole();

  const roles: { key: UserRole; label: string; icon: any; color: string }[] = [
    { key: "CUSTOMER", label: "Resident", icon: User, color: Colors.forest },
    { key: "OWNER", label: "Host / Owner", icon: Home, color: Colors.roleOwner },
    { key: "ADMIN", label: "Admin", icon: ShieldCheck, color: Colors.roleAdmin },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topInfo}>
        <Text style={styles.roleSubtext}>Active Persona: </Text>
        <Text style={[styles.activeName, { color: roles.find((r) => r.key === role)?.color }]}>
          {user.name} ({role === "CUSTOMER" ? "Resident" : role === "OWNER" ? "Host" : "Lead Admin"})
        </Text>
      </View>

      <View style={styles.segmentedControl}>
        {roles.map((item) => {
          const isActive = role === item.key;
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setRole(item.key)}
              activeOpacity={0.8}
              style={[
                styles.segmentTab,
                isActive && { backgroundColor: item.color, borderColor: item.color },
              ]}
            >
              <Icon size={13} color={isActive ? "#ffffff" : Colors.textMuted} />
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  roleSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  activeName: {
    fontSize: 11,
    fontWeight: "700",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  tabLabelInactive: {
    color: Colors.textMuted,
  },
});
