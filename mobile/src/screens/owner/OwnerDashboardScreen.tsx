import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import {
  PropertiesApi,
  BookingApi,
  VisitSupportApi,
} from "../../services/api";
import { Colors, Shadows } from "../../theme/colors";
import { Building2, CalendarDays, Plus, X, CheckCircle2 } from "lucide-react-native";

export function OwnerDashboardScreen() {
  const [tab, setTab] = useState<"PROPERTIES" | "RESERVATIONS" | "VISITS">(
    "PROPERTIES"
  );
  const [listings, setListings] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Property Wizard modal
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [address, setAddress] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("18000");
  const [roomName, setRoomName] = useState("Private Executive Suite");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [pRes, bRes, vRes] = await Promise.all([
        PropertiesApi.getMyListings().catch(() => ({ properties: [] })),
        BookingApi.getOwnerBookings().catch(() => ({ reservations: [] })),
        VisitSupportApi.getOwnerVisits().catch(() => ({ visits: [] })),
      ]);
      setListings(pRes.properties || []);
      setReservations(bRes.reservations || []);
      setVisits(vRes.visits || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProperty = async () => {
    if (!title.trim() || !address.trim()) {
      Alert.alert("Missing Fields", "Enter property title and address.");
      return;
    }
    setSubmitting(true);
    try {
      const mPrice = Number(monthlyPrice) || 18000;
      const dPrice = Math.max(500, Math.round(mPrice / 22));
      await PropertiesApi.createProperty({
        title: title.trim(),
        description: `${title.trim()} co-living residence in ${city}`,
        property_type: "apartment",
        room_type: "private_room",
        price_per_night: dPrice,
        currency: "INR",
        address: address.trim(),
        city: city.trim(),
        country: "India",
        max_guests: 2,
        room_types: [
          {
            name: roomName.trim() || "Private Room",
            category: "PRIVATE",
            room_numbers: ["101", "102"],
            beds_per_room: 1,
            rate_plans: [
              { duration_type: "DAILY", price: dPrice, deposit_amount: 500 },
              {
                duration_type: "MONTHLY",
                price: mPrice,
                deposit_amount: Math.round(mPrice * 0.5),
              },
            ],
          },
        ],
      });
      setAddOpen(false);
      setTitle("");
      setAddress("");
      Alert.alert("Property Listed", "Rooms, beds, and rate plans provisioned.");
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingStatus = async (id: string, status: string) => {
    try {
      await BookingApi.updateStatus(id, status);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Status update failed");
    }
  };

  const handleVisitStatus = async (id: string, status: string) => {
    try {
      await VisitSupportApi.updateVisitStatus(id, status);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Visit update failed");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle}>PG Host Portal</Text>
          <Text style={styles.bannerSub}>
            {listings.length} Properties · {reservations.length} Reservations
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Plus size={16} color={Colors.primary} />
          <Text style={styles.addBtnText}>Add Stay</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {(["PROPERTIES", "RESERVATIONS", "VISITS"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabPill, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && { color: "#FFFFFF" }]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : tab === "PROPERTIES" ? (
          listings.map((p) => (
            <View key={p.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Building2 size={16} color={Colors.primary} />
                <Text style={styles.cardTitle}>{p.title}</Text>
                <Text style={styles.badge}>{String(p.status).toUpperCase()}</Text>
              </View>
              <Text style={styles.meta}>
                {p.address}, {p.city}
              </Text>
              <Text style={styles.price}>
                From ₹{Number(p.price_per_night).toLocaleString("en-IN")}/night
              </Text>
            </View>
          ))
        ) : tab === "RESERVATIONS" ? (
          reservations.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardHead}>
                <CalendarDays size={16} color={Colors.primary} />
                <Text style={styles.cardTitle}>
                  {r.guest?.full_name || r.guest_name || "Guest"}
                </Text>
                <Text style={styles.badge}>{String(r.status).toUpperCase()}</Text>
              </View>
              <Text style={styles.meta}>
                {r.property?.title} · {r.check_in_date} → {r.check_out_date}
              </Text>
              <Text style={styles.price}>
                ₹{Number(r.total_price).toLocaleString("en-IN")} (
                {r.payment_status})
              </Text>
              {r.status === "confirmed" && (
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => handleBookingStatus(r.id, "checked_in")}
                  >
                    <CheckCircle2 size={13} color="#FFFFFF" />
                    <Text style={styles.smallBtnText}>Check In</Text>
                  </TouchableOpacity>
                </View>
              )}
              {r.status === "checked_in" && (
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => handleBookingStatus(r.id, "completed")}
                  >
                    <Text style={styles.smallBtnText}>Mark Completed</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        ) : (
          visits.map((v) => (
            <View key={v.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{v.customer_name}</Text>
                <Text style={styles.badge}>{String(v.status).toUpperCase()}</Text>
              </View>
              <Text style={styles.meta}>
                {v.property_title} · {String(v.preferred_date).split("T")[0]} at{" "}
                {v.time_slot}
              </Text>
              <Text style={styles.meta}>{v.customer_phone}</Text>
              {v.status === "scheduled" && (
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => handleVisitStatus(v.id, "confirmed")}
                  >
                    <Text style={styles.smallBtnText}>Confirm Tour</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={addOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Add Property & Rooms</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Property Title (e.g. Stayzy Koramangala)"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Street Address"
              value={address}
              onChangeText={setAddress}
            />
            <TextInput
              style={styles.input}
              placeholder="City (Bengaluru)"
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={styles.input}
              placeholder="Room Category Name"
              value={roomName}
              onChangeText={setRoomName}
            />
            <TextInput
              style={styles.input}
              placeholder="Monthly Tariff INR (e.g. 18000)"
              keyboardType="number-pad"
              value={monthlyPrice}
              onChangeText={setMonthlyPrice}
            />
            <TouchableOpacity
              style={styles.cta}
              onPress={handleCreateProperty}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaText}>Publish Listing</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  banner: {
    backgroundColor: Colors.primary,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerTitle: { fontSize: 19, fontWeight: "900", color: "#FFFFFF" },
  bannerSub: { fontSize: 12, color: "#D1FAE5", marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.cardWarm,
    alignItems: "center",
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 11, fontWeight: "800", color: Colors.textSub },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    ...Shadows.card,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: Colors.textMain },
  badge: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  meta: { fontSize: 12, color: Colors.textMuted },
  price: { fontSize: 15, fontWeight: "900", color: Colors.primary, marginTop: 6 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  smallBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(13,43,34,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  cta: {
    backgroundColor: Colors.primary,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  ctaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
