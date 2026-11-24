import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../theme/colors";
import { SideDrawer } from "./SideDrawer";
import {
  Menu,
  Search,
  Bell,
  MapPin,
  Check,
  X,
} from "lucide-react-native";

interface HeaderProps {
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
  onSearchPress?: () => void;
}

const CITIES = [
  { id: "bengaluru", name: "Bengaluru", activeCount: 24 },
  { id: "tirunelveli", name: "Tirunelveli", activeCount: 16 },
  { id: "chennai", name: "Chennai", activeCount: 20 },
  { id: "hyderabad", name: "Hyderabad", activeCount: 18 },
  { id: "pune", name: "Pune", activeCount: 12 },
];

export const Header: React.FC<HeaderProps> = ({
  selectedCity = "Bengaluru",
  onSelectCity,
  onSearchPress,
}) => {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <>
      <View style={styles.headerContainer}>
        {/* Left: Hamburger Menu */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setDrawerOpen(true)}
          activeOpacity={0.7}
          accessibilityLabel="Open Navigation Menu"
        >
          <Menu size={22} color={Colors.textMain} />
        </TouchableOpacity>

        {/* Center: Official Transparent Logo */}
        <TouchableOpacity
          style={styles.brandCenter}
          onPress={() => onSelectCity && setCityModalOpen(true)}
          activeOpacity={0.8}
        >
          <Image
            source={require("../../assets/stayzy-logo-transparent.png")}
            style={styles.headerLogoImage}
            resizeMode="contain"
          />
          <Text style={styles.brandSubtitle}>Your Accommodation Partner</Text>
        </TouchableOpacity>

        {/* Right: Search & Notification Icons */}
        <View style={styles.actionsRight}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={onSearchPress || (() => router.push("/search"))}
            activeOpacity={0.7}
          >
            <Search size={20} color={Colors.textMain} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => setNotifOpen(true)}
            activeOpacity={0.7}
          >
            <Bell size={20} color={Colors.textMain} />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Side Drawer Component */}
      <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* City Selector Modal */}
      <Modal
        visible={cityModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCityModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCityModalOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalTop}>
              <Text style={styles.modalHeading}>Select City</Text>
              <TouchableOpacity onPress={() => setCityModalOpen(false)}>
                <X size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {CITIES.map((c) => {
              const isSelected = selectedCity.toLowerCase() === c.name.toLowerCase();
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.cityItem, isSelected && styles.cityItemSelected]}
                  onPress={() => {
                    onSelectCity && onSelectCity(c.name);
                    setCityModalOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={[styles.cityName, isSelected && styles.cityNameSelected]}>
                      {c.name}
                    </Text>
                    <Text style={styles.citySub}>{c.activeCount} verified PGs & co-living</Text>
                  </View>
                  {isSelected && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={notifOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setNotifOpen(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalTop}>
              <Text style={styles.modalHeading}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotifOpen(false)}>
                <X size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.notifItem}>
              <Text style={styles.notifTitle}>Stayzy Bangalore Verified</Text>
              <Text style={styles.notifBody}>
                All 18 Bangalore co-living listings updated with 300 Mbps Wi-Fi & Keyless PIN access.
              </Text>
            </View>
            <View style={styles.notifItem}>
              <Text style={styles.notifTitle}>Hourly Stays Now Live</Text>
              <Text style={styles.notifBody}>
                Book daytime work pods or flexible hourly micro-stays from ₹99/hr.
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuButton: {
    padding: 6,
    borderRadius: 8,
  },
  brandCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogoImage: {
    height: 32,
    width: 130,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  actionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionIconBtn: {
    padding: 6,
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#EF4444",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    maxHeight: 450,
  },
  modalTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textMain,
  },
  cityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  cityItemSelected: {
    backgroundColor: "#FFF7ED",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  cityName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textMain,
  },
  cityNameSelected: {
    color: Colors.primary,
  },
  citySub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  notifItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textMain,
  },
  notifBody: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },
});
