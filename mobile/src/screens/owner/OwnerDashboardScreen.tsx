import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Colors, Shadows } from "../../theme/colors";
import {
  Building,
  TrendingUp,
  Users,
  Eye,
  PlusCircle,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react-native";

export const OwnerDashboardScreen: React.FC = () => {
  const [properties, setProperties] = useState([
    {
      id: "prop-1",
      name: "Stayzy Haven — Koramangala",
      location: "4th Block, 80ft Road",
      totalBeds: 24,
      occupiedBeds: 22,
      monthlyGross: 342000,
      activeVisits: 2,
    },
    {
      id: "prop-2",
      name: "Stayzy Heights — HSR Layout",
      location: "Sector 2, 17th Cross",
      totalBeds: 18,
      occupiedBeds: 17,
      monthlyGross: 265000,
      activeVisits: 1,
    },
    {
      id: "prop-3",
      name: "Stayzy Urban — Indiranagar",
      location: "12th Main, HAL 2nd Stage",
      totalBeds: 12,
      occupiedBeds: 11,
      monthlyGross: 198000,
      activeVisits: 3,
    },
  ]);

  const totalBeds = properties.reduce((acc, p) => acc + p.totalBeds, 0);
  const occupiedBeds = properties.reduce((acc, p) => acc + p.occupiedBeds, 0);
  const totalRevenue = properties.reduce((acc, p) => acc + p.monthlyGross, 0);
  const occupancyRate = ((occupiedBeds / totalBeds) * 100).toFixed(1);

  const handleApproveVisit = (guestName: string, time: string) => {
    Alert.alert(
      "Confirm Property Walkthrough",
      `Approve visit for ${guestName} tomorrow at ${time}?`,
      [
        { text: "Reschedule", style: "destructive" },
        {
          text: "Confirm & Send Access SMS",
          onPress: () =>
            Alert.alert("Visit Confirmed!", `Confirmation sent to ${guestName}.`),
        },
      ]
    );
  };

  const handleAddUnit = () => {
    Alert.alert(
      "Add Property / Bed Unit",
      "Which property would you like to expand?",
      [
        { text: "Stayzy Haven (Koramangala)", onPress: () => Alert.alert("Success", "Unit Room 304 added.") },
        { text: "Stayzy Heights (HSR)", onPress: () => Alert.alert("Success", "Unit Room 202 added.") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Title & Add Unit Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Host / Owner Hub</Text>
          <Text style={styles.pageSubtitle}>Property portfolio & tenant rent management</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAddUnit} activeOpacity={0.8}>
          <PlusCircle size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Add Bed</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiIconWrapper}>
            <TrendingUp size={16} color={Colors.primary} />
          </View>
          <Text style={styles.kpiLabel}>Monthly Revenue</Text>
          <Text style={styles.kpiValue}>₹{(totalRevenue / 100000).toFixed(2)} Lakh</Text>
          <Text style={styles.kpiTrend}>+12.4% vs last month</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.kpiIconWrapper, { backgroundColor: "#eff6ff" }]}>
            <Users size={16} color="#2563eb" />
          </View>
          <Text style={styles.kpiLabel}>Bed Occupancy</Text>
          <Text style={styles.kpiValue}>{occupancyRate}%</Text>
          <Text style={styles.kpiTrend}>{occupiedBeds}/{totalBeds} Beds Filled</Text>
        </View>
      </View>

      {/* Pending Walkthrough Visits Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <CalendarCheck size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Pending Tour Visits (2)</Text>
          </View>
        </View>

        {/* Visit Item 1 */}
        <View style={styles.visitItem}>
          <View>
            <Text style={styles.guestName}>Rahul Deshmukh (Software Dev)</Text>
            <Text style={styles.visitDetails}>Tomorrow • 11:30 AM • Stayzy Haven (Koramangala)</Text>
          </View>
          <TouchableOpacity
            style={styles.confirmVisitBtn}
            onPress={() => handleApproveVisit("Rahul Deshmukh", "11:30 AM")}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmVisitBtnText}>Approve</Text>
          </TouchableOpacity>
        </View>

        {/* Visit Item 2 */}
        <View style={[styles.visitItem, { borderBottomWidth: 0 }]}>
          <View>
            <Text style={styles.guestName}>Sneha Reddy (Product Analyst)</Text>
            <Text style={styles.visitDetails}>Wednesday • 4:00 PM • Stayzy Heights (HSR)</Text>
          </View>
          <TouchableOpacity
            style={styles.confirmVisitBtn}
            onPress={() => handleApproveVisit("Sneha Reddy", "4:00 PM")}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmVisitBtnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Property Portfolio Listing */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitleBlack}>Managed Properties ({properties.length})</Text>
      </View>

      {properties.map((prop) => (
        <View key={prop.id} style={styles.propertyCard}>
          <View style={styles.propTopRow}>
            <View>
              <Text style={styles.propName}>{prop.name}</Text>
              <Text style={styles.propLocation}>{prop.location}</Text>
            </View>
            <View style={styles.occupancyBadge}>
              <Text style={styles.occupancyBadgeText}>
                {prop.occupiedBeds}/{prop.totalBeds} Occupied
              </Text>
            </View>
          </View>

          {/* Progress Bar for Occupancy */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(prop.occupiedBeds / prop.totalBeds) * 100}%` },
              ]}
            />
          </View>

          <View style={styles.propBottomRow}>
            <Text style={styles.grossText}>
              Rent Collected: <Text style={styles.grossBold}>₹{prop.monthlyGross.toLocaleString()}</Text>
            </Text>

            <TouchableOpacity
              style={styles.viewInventoryBtn}
              onPress={() =>
                Alert.alert(
                  prop.name,
                  `All ${prop.totalBeds} beds operational.\nKeycard access online.\nCCTV security active.`
                )
              }
            >
              <Text style={styles.viewInventoryText}>Manage Units</Text>
              <ArrowUpRight size={13} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.textMain,
  },
  pageSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  addBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  kpiIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textMain,
    marginVertical: 2,
  },
  kpiTrend: {
    fontSize: 10,
    color: Colors.primaryDark,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    ...Shadows.card,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textMain,
  },
  visitItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  guestName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMain,
  },
  visitDetails: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  confirmVisitBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  confirmVisitBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitleBlack: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textMain,
  },
  propertyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    ...Shadows.card,
  },
  propTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  propName: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textMain,
  },
  propLocation: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  occupancyBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  occupancyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  propBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grossText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  grossBold: {
    color: Colors.textMain,
    fontWeight: "700",
  },
  viewInventoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewInventoryText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
});
