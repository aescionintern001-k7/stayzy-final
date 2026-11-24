import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  SafeAreaView,
  Linking,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useRole } from "../context/RoleContext";
import { Colors, Shadows } from "../theme/colors";
import {
  X,
  LogIn,
  Home,
  MessageSquare,
  Headphones,
  Info,
  CheckCircle2,
  Star,
  MapPin,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from "lucide-react-native";

interface SideDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const { role, setRole, user } = useRole();

  const handleOwnerClick = () => {
    setRole("OWNER");
    onClose();
    Alert.alert(
      "Switched to PG Host",
      "Welcome Rajesh Sharma! You can now manage your property inventory and tenant leads."
    );
  };

  const handleAdminClick = () => {
    setRole("ADMIN");
    onClose();
    Alert.alert(
      "Switched to Platform Admin",
      "Welcome Lead Admin Vikramaditya! You can now oversee platform GMV and audits."
    );
  };

  const handleResidentClick = () => {
    setRole("CUSTOMER");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <SafeAreaView style={styles.drawerContainer}>
          <View style={styles.drawerContent}>
            {/* Drawer Header */}
            <View style={styles.header}>
              <View style={styles.brandRow}>
                <Image
                  source={require("../../assets/stayzy-logo-transparent.png")}
                  style={styles.drawerLogoImage}
                  resizeMode="contain"
                />
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={20} color={Colors.textMain} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollBody}
            >
              {/* PROPERTY OWNER SECTION */}
              <Text style={styles.sectionTitle}>PROPERTY OWNER</Text>
              <TouchableOpacity
                style={styles.ownerCard}
                onPress={handleOwnerClick}
                activeOpacity={0.8}
              >
                <View style={styles.ownerIconWrap}>
                  <LogIn size={20} color={Colors.primary} />
                </View>
                <View style={styles.ownerTextWrap}>
                  <Text style={styles.ownerTitle}>Property Owner?</Text>
                  <Text style={styles.ownerSubtitle}>Login to manage your leads</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              {/* QUICK ACTIONS SECTION */}
              <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  handleOwnerClick();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: "#FFF7ED" }]}>
                  <Home size={18} color="#EA580C" />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Post a Property</Text>
                  <Text style={styles.actionSubtitle}>List your PG/room in minutes</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  Alert.alert(
                    "Submit a Query",
                    "Tell us your location & budget preferences and our local PG curator will call you."
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: "#EFF6FF" }]}>
                  <MessageSquare size={18} color="#2563EB" />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Submit a Query</Text>
                  <Text style={styles.actionSubtitle}>Tell us what you're looking for</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  Linking.openURL("tel:+918045678900");
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: "#F0FDF4" }]}>
                  <Headphones size={18} color="#16A34A" />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Contact Support</Text>
                  <Text style={styles.actionSubtitle}>We're here to help you</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => {
                  onClose();
                  Alert.alert(
                    "About Stayzy",
                    "Stayzy is India's premier flexible accommodation network offering hourly, daily, and monthly PG & co-living spaces."
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: "#FAF5FF" }]}>
                  <Info size={18} color="#9333EA" />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>About Us</Text>
                  <Text style={styles.actionSubtitle}>Our story, mission & more</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>

              {/* DEMO PERSONA SWITCHER STRIP */}
              <Text style={styles.sectionTitle}>SWITCH ROLE (DEMO TESTING)</Text>
              <View style={styles.roleGrid}>
                <TouchableOpacity
                  style={[styles.roleButton, role === "CUSTOMER" && styles.roleButtonActive]}
                  onPress={handleResidentClick}
                >
                  <UserCheck size={14} color={role === "CUSTOMER" ? "#FFFFFF" : Colors.primary} />
                  <Text style={[styles.roleButtonText, role === "CUSTOMER" && styles.roleButtonTextActive]}>
                    Resident
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, role === "OWNER" && styles.roleButtonActive]}
                  onPress={handleOwnerClick}
                >
                  <Home size={14} color={role === "OWNER" ? "#FFFFFF" : Colors.ownerBlue} />
                  <Text style={[styles.roleButtonText, role === "OWNER" && styles.roleButtonTextActive]}>
                    Host
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, role === "ADMIN" && styles.roleButtonActive]}
                  onPress={handleAdminClick}
                >
                  <ShieldCheck size={14} color={role === "ADMIN" ? "#FFFFFF" : Colors.adminPurple} />
                  <Text style={[styles.roleButtonText, role === "ADMIN" && styles.roleButtonTextActive]}>
                    Admin
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TRUST BADGES */}
              <View style={styles.badgeRow}>
                <View style={styles.trustBadgeGreen}>
                  <CheckCircle2 size={13} color="#16A34A" />
                  <Text style={styles.trustBadgeGreenText}>Verified Listings</Text>
                </View>
                <View style={styles.trustBadgeOrange}>
                  <Star size={13} color="#EA580C" fill="#EA580C" />
                  <Text style={styles.trustBadgeOrangeText}>Trusted Reviews</Text>
                </View>
              </View>

              {/* FOOTER */}
              <View style={styles.drawerFooter}>
                <Text style={styles.footerText}>Stayzy • Live Better</Text>
                <Text style={styles.versionText}>v1.0.1 (Android APK Preview)</Text>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flexDirection: "row",
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: "82%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    height: "100%",
    ...Shadows.modal,
  },
  drawerContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  drawerLogoImage: {
    height: 36,
    width: 140,
  },
  pinBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  scrollBody: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  ownerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FFF1EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  ownerTextWrap: {
    flex: 1,
  },
  ownerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textMain,
  },
  ownerSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textMain,
  },
  actionSubtitle: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  roleGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 22,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textMain,
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 24,
  },
  trustBadgeGreen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  trustBadgeGreenText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  trustBadgeOrange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  trustBadgeOrangeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EA580C",
  },
  drawerFooter: {
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  versionText: {
    fontSize: 10,
    color: "#CBD5E1",
    marginTop: 4,
  },
});
