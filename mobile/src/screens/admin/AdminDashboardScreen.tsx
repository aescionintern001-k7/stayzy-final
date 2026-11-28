import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { AdminApi } from "../../services/api";
import { Colors, Shadows } from "../../theme/colors";
import {
  ShieldCheck,
  TrendingUp,
  BedDouble,
  Users,
  Calendar,
  FileText,
} from "lucide-react-native";

type AdminSection =
  | "OVERVIEW"
  | "OPS"
  | "CRM"
  | "DESK"
  | "SYSTEM";

export function AdminDashboardScreen() {
  const [section, setSection] = useState<AdminSection>("OVERVIEW");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any>(null);
  const [rates, setRates] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});

  // Quick reply state
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});

  const loadSection = useCallback(async () => {
    try {
      const [
        dashRes,
        bRes,
        bedRes,
        calRes,
        rateRes,
        custRes,
        visRes,
        tickRes,
        logRes,
        setRes,
      ] = await Promise.all([
        AdminApi.getDashboard().catch(() => null),
        AdminApi.getBookings().catch(() => ({ bookings: [] })),
        AdminApi.getBeds().catch(() => ({ units: [] })),
        AdminApi.getCalendar(10).catch(() => null),
        AdminApi.getRates().catch(() => ({ rate_plans: [] })),
        AdminApi.getCustomers().catch(() => ({ customers: [] })),
        AdminApi.getVisits().catch(() => ({ visits: [] })),
        AdminApi.getSupportTickets().catch(() => ({ tickets: [] })),
        AdminApi.getAuditLogs().catch(() => ({ logs: [] })),
        AdminApi.getSettings().catch(() => ({ settings: {} })),
      ]);

      setStats(dashRes);
      setBookings(bRes.bookings || []);
      setBeds(bedRes.units || []);
      setCalendar(calRes);
      setRates(rateRes.rate_plans || []);
      setCustomers(custRes.customers || []);
      setVisits(visRes.visits || []);
      setTickets(tickRes.tickets || []);
      setAuditLogs(logRes.logs || []);
      setSettings(setRes.settings || {});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSection();
  }, [loadSection]);

  const toggleBedStatus = async (unit: any) => {
    const next = unit.status === "available" ? "maintenance" : "available";
    try {
      await AdminApi.manageBed({
        action: "UPDATE_STATUS",
        inventory_unit_id: unit.id,
        status: next,
      });
      loadSection();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update bed status");
    }
  };

  const handleRecordOfflinePay = async (bookingId: string) => {
    try {
      await AdminApi.recordOfflinePayment({
        booking_id: bookingId,
        notes: "Recorded via Admin Mobile App",
      });
      Alert.alert("Recorded", "Offline payment settled and synced.");
      loadSection();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not record payment");
    }
  };

  const handleReplySupport = async (ticketId: string) => {
    const replyText = (replyMap[ticketId] || "").trim();
    if (!replyText) return;
    try {
      await AdminApi.replySupport(ticketId, replyText, "resolved");
      setReplyMap((m) => ({ ...m, [ticketId]: "" }));
      loadSection();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Reply failed");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={20} color="#34D399" />
          <View>
            <Text style={styles.bannerTitle}>Stayzy Admin Control</Text>
            <Text style={styles.bannerSub}>
              Phase A/B/C Operations · Authoritative PostgreSQL
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.navBar}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
      >
        {(
          [
            { key: "OVERVIEW", label: "KPIs & Bookings" },
            { key: "OPS", label: "Beds, Calendar & Rates" },
            { key: "CRM", label: "Customers" },
            { key: "DESK", label: "Visits & Support" },
            { key: "SYSTEM", label: "Settings & Audit" },
          ] as { key: AdminSection; label: string }[]
        ).map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.navPill,
              section === item.key && styles.navPillActive,
            ]}
            onPress={() => setSection(item.key)}
          >
            <Text
              style={[
                styles.navText,
                section === item.key && { color: "#FFFFFF" },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSection();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : section === "OVERVIEW" ? (
          <>
            {stats && (
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <Users size={16} color={Colors.primary} />
                  <Text style={styles.kpiVal}>
                    {stats.users?.total_users ?? 0}
                  </Text>
                  <Text style={styles.kpiLabel}>Users</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Calendar size={16} color={Colors.primary} />
                  <Text style={styles.kpiVal}>
                    {stats.bookings?.total_bookings ?? 0}
                  </Text>
                  <Text style={styles.kpiLabel}>Bookings</Text>
                </View>
                <View style={styles.kpiCard}>
                  <TrendingUp size={16} color={Colors.secondary} />
                  <Text style={styles.kpiVal}>
                    ₹
                    {Number(
                      stats.financials?.INR?.net_revenue || 0
                    ).toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.kpiLabel}>Net INR</Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            {bookings.slice(0, 12).map((b) => (
              <View key={b.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>
                    {b.guest?.name || "Resident"} · {b.property?.title}
                  </Text>
                  <Text style={styles.badge}>
                    {String(b.status).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {b.check_in_date} → {b.check_out_date} · ₹
                  {Number(b.total_price).toLocaleString("en-IN")} (
                  {b.payment_status})
                </Text>
                {b.payment_status !== "paid" && b.status !== "cancelled" && (
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => handleRecordOfflinePay(b.id)}
                  >
                    <Text style={styles.smallBtnText}>
                      Record Offline Payment
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        ) : section === "OPS" ? (
          <>
            <Text style={styles.sectionTitle}>
              Bed & Unit Matrix ({beds.length})
            </Text>
            {beds.map((u) => (
              <View key={u.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <BedDouble size={15} color={Colors.primary} />
                    <Text style={styles.cardTitle}>
                      {u.identifier} ({u.room_type_name})
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => toggleBedStatus(u)}
                  >
                    <Text style={styles.smallBtnText}>
                      {String(u.status).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.meta}>
                  {u.property_title} · Floor {u.floor}
                </Text>
              </View>
            ))}

            {calendar?.units && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
                  10-Day Calendar Occupancy
                </Text>
                {calendar.units.slice(0, 10).map((cu: any) => (
                  <View key={cu.unit_id} style={styles.card}>
                    <Text style={styles.cardTitle}>
                      {cu.identifier} — {cu.property_title}
                    </Text>
                    <Text style={styles.meta}>
                      Bookings: {cu.bookings?.length || 0} · Blocks:{" "}
                      {cu.blocks?.length || 0} · Holds: {cu.holds?.length || 0}
                    </Text>
                  </View>
                ))}
              </>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
              Active Rate Plans ({rates.length})
            </Text>
            {rates.slice(0, 12).map((rp) => (
              <View key={rp.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {rp.room_type_name} · {rp.duration_type}
                </Text>
                <Text style={styles.meta}>
                  Tariff: ₹{Number(rp.price).toLocaleString("en-IN")} · Deposit: ₹
                  {Number(rp.deposit_amount).toLocaleString("en-IN")}
                </Text>
              </View>
            ))}
          </>
        ) : section === "CRM" ? (
          <>
            <Text style={styles.sectionTitle}>
              Customer CRM ({customers.length})
            </Text>
            {customers.map((c) => (
              <View key={c.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{c.full_name}</Text>
                  <Text style={styles.badge}>{String(c.role).toUpperCase()}</Text>
                </View>
                <Text style={styles.meta}>{c.email}</Text>
                <Text style={styles.meta}>
                  Bookings: {c.bookings_count} · Total Spent: ₹
                  {Number(c.total_spent).toLocaleString("en-IN")}
                </Text>
              </View>
            ))}
          </>
        ) : section === "DESK" ? (
          <>
            <Text style={styles.sectionTitle}>
              Walkthrough Visits ({visits.length})
            </Text>
            {visits.map((v) => (
              <View key={v.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{v.customer_name}</Text>
                  <Text style={styles.badge}>
                    {String(v.status).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {v.property_title} · {String(v.preferred_date).split("T")[0]} (
                  {v.time_slot})
                </Text>
                {v.status === "scheduled" && (
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() =>
                      AdminApi.updateVisit(v.id, "confirmed").then(loadSection)
                    }
                  >
                    <Text style={styles.smallBtnText}>Confirm Visit</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
              Support Desk ({tickets.length})
            </Text>
            {tickets.map((t) => (
              <View key={t.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{t.subject}</Text>
                  <Text style={styles.badge}>
                    {String(t.status).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {t.customer_name} ({t.category}) — {t.message}
                </Text>
                {t.status !== "resolved" && (
                  <View style={{ marginTop: 8, gap: 6 }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Write admin reply..."
                      value={replyMap[t.id] || ""}
                      onChangeText={(txt) =>
                        setReplyMap((m) => ({ ...m, [t.id]: txt }))
                      }
                    />
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={() => handleReplySupport(t.id)}
                    >
                      <Text style={styles.smallBtnText}>Send & Resolve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Platform Config</Text>
            <View style={styles.card}>
              <Text style={styles.meta}>
                Currency: {settings.platform_config?.currency || "INR"} · GST:{" "}
                {settings.platform_config?.gstRatePercent ?? 12}% · Cleaning Buffer:{" "}
                {settings.platform_config?.cleaningBufferMinutes ?? 60} mins
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>
              Audit Logs ({auditLogs.length})
            </Text>
            {auditLogs.slice(0, 20).map((log) => (
              <View key={log.id} style={styles.card}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <FileText size={13} color={Colors.primary} />
                  <Text style={styles.cardTitle}>{log.action}</Text>
                </View>
                <Text style={styles.meta}>
                  {log.actor_email || "system"} · {log.entity_type}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  banner: { backgroundColor: Colors.primary, padding: 16 },
  bannerTitle: { fontSize: 18, fontWeight: "900", color: "#FFFFFF" },
  bannerSub: { fontSize: 11, color: "#D1FAE5" },
  navBar: {
    maxHeight: 52,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  navPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  navText: { fontSize: 12, fontWeight: "800", color: Colors.textSub },
  kpiGrid: { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    ...Shadows.card,
  },
  kpiVal: {
    fontSize: 17,
    fontWeight: "900",
    color: Colors.textMain,
    marginTop: 4,
  },
  kpiLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textMain,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    ...Shadows.card,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: Colors.textMain },
  badge: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  smallBtn: {
    alignSelf: "flex-start",
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 8,
  },
  smallBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  input: {
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    fontSize: 13,
  },
});
