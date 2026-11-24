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
  ShieldAlert,
  BarChart3,
  CheckCircle,
  XCircle,
  FileText,
  UserCheck,
  Building2,
  DollarSign,
  AlertTriangle,
} from "lucide-react-native";

export const AdminDashboardScreen: React.FC = () => {
  const [pendingAudits, setPendingAudits] = useState([
    {
      id: "audit-1",
      property: "Stayzy Haven Ext (Koramangala 5th Block)",
      owner: "Rajesh Sharma",
      rooms: 8,
      status: "KYC_PENDING",
      submittedDate: "26 Oct 2026",
    },
    {
      id: "audit-2",
      property: "Stayzy Co-Living Pods (Electronic City Ph 1)",
      owner: "Ananya Deshmukh",
      rooms: 14,
      status: "FIRE_SAFETY_AUDIT",
      submittedDate: "27 Oct 2026",
    },
  ]);

  const handleApproveListing = (propName: string) => {
    Alert.alert(
      "Approve & Publish Listing",
      `Authorize ${propName} to accept online bookings on Stayzy?`,
      [
        { text: "Reject", style: "destructive" },
        {
          text: "Approve & Go Live",
          onPress: () =>
            Alert.alert("Listing Live!", `${propName} is now published in search.`),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Title */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Platform Operations</Text>
          <Text style={styles.pageSubtitle}>Super Administrator & Compliance Console</Text>
        </View>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>SUPER ADMIN</Text>
        </View>
      </View>

      {/* KPI Stats */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Total Platform GMV</Text>
          <Text style={styles.kpiValue}>₹48.5 Lakh</Text>
          <Text style={styles.kpiMeta}>Gross Booking Value</Text>
        </View>

        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Platform Commission</Text>
          <Text style={[styles.kpiValue, { color: Colors.primary }]}>₹4.85 Lakh</Text>
          <Text style={styles.kpiMeta}>10% Take-rate</Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Active Beds Under Mgmt</Text>
          <Text style={styles.kpiValue}>142 Units</Text>
          <Text style={styles.kpiMeta}>91.4% Avg Occupancy</Text>
        </View>

        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Disputes / Refunds</Text>
          <Text style={[styles.kpiValue, { color: Colors.primaryDark }]}>0 Open</Text>
          <Text style={styles.kpiMeta}>100% SLA Maintained</Text>
        </View>
      </View>

      {/* New Property Compliance Audits */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldAlert size={16} color={Colors.accentGold} />
          <Text style={styles.cardTitle}>Listing Compliance Queue ({pendingAudits.length})</Text>
        </View>

        {pendingAudits.map((item) => (
          <View key={item.id} style={styles.auditItem}>
            <View style={styles.auditInfo}>
              <Text style={styles.auditProp}>{item.property}</Text>
              <Text style={styles.auditSub}>Owner: {item.owner} • {item.rooms} Rooms</Text>
              <View style={styles.auditStatusBadge}>
                <Text style={styles.auditStatusText}>{item.status}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => handleApproveListing(item.property)}
              activeOpacity={0.8}
            >
              <Text style={styles.reviewBtnText}>Audit & Approve</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Recent Ledger Entries */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FileText size={16} color={Colors.primary} />
          <Text style={styles.cardTitle}>Recent Financial Transactions</Text>
        </View>

        <View style={styles.ledgerRow}>
          <View>
            <Text style={styles.ledgerUser}>Aarav Sharma (Room 101 - Koramangala)</Text>
            <Text style={styles.ledgerTime}>Today, 10:45 AM • Monthly Rent</Text>
          </View>
          <Text style={styles.ledgerAmount}>+ ₹28,000</Text>
        </View>

        <View style={styles.ledgerRow}>
          <View>
            <Text style={styles.ledgerUser}>Sneha Reddy (Pod 204 - HSR)</Text>
            <Text style={styles.ledgerTime}>Yesterday, 6:15 PM • Day-Stay Booking</Text>
          </View>
          <Text style={styles.ledgerAmount}>+ ₹1,200</Text>
        </View>

        <View style={[styles.ledgerRow, { borderBottomWidth: 0 }]}>
          <View>
            <Text style={styles.ledgerUser}>Kavya Nair (Studio 302 - Indiranagar)</Text>
            <Text style={styles.ledgerTime}>25 Oct, 2:30 PM • Monthly Rent</Text>
          </View>
          <Text style={styles.ledgerAmount}>+ ₹34,000</Text>
        </View>
      </View>
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
  adminBadge: {
    backgroundColor: Colors.roleAdmin,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
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
    marginVertical: 3,
  },
  kpiMeta: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textMain,
  },
  auditItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  auditInfo: {
    flex: 1,
    paddingRight: 10,
  },
  auditProp: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMain,
  },
  auditSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  auditStatusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  auditStatusText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#92400e",
  },
  reviewBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  reviewBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  ledgerUser: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMain,
  },
  ledgerTime: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  ledgerAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primary,
  },
});
