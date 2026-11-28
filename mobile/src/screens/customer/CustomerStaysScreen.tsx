import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import {
  BookingApi,
  PaymentApi,
  VisitSupportApi,
} from "../../services/api";
import { useRole } from "../../context/RoleContext";
import { PendingBookingStorage } from "../../services/secureStorage";
import {
  classifyBookingFailure,
  recoverPendingBookingByKey,
} from "../../utils/bookingResilience";
import { Colors, Shadows } from "../../theme/colors";
import {
  KeyRound,
  Calendar,
  CreditCard,
  MessageSquarePlus,
  RefreshCw,
  X,
} from "lucide-react-native";

export function CustomerStaysScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useRole();
  const payLockRef = useRef(false);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  const [tab, setTab] = useState<"BOOKINGS" | "PAYMENTS" | "VISITS" | "SUPPORT">(
    "BOOKINGS"
  );
  const [bookings, setBookings] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Support ticket modal
  const [ticketOpen, setTicketOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<
    "general" | "maintenance" | "housekeeping" | "payment"
  >("maintenance");

  const loadAll = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setRefreshing(false);
      setErrorMsg(null);
      return;
    }
    setErrorMsg(null);
    try {
      if (user?.id) {
        const pending = await PendingBookingStorage.getForUser(user.id);
        if (pending) {
          const rec = await recoverPendingBookingByKey({
            idempotencyKey: pending.idempotencyKey,
            deps: {
              recoverByIdempotencyKey: BookingApi.recoverByIdempotencyKey,
              clearPending: PendingBookingStorage.clear,
            },
          });
          setRecoveryNotice(rec.state === "RECOVERING" ? rec.message || null : null);
        } else {
          setRecoveryNotice(null);
        }
      }
      const [bRes, pRes, vRes, sRes] = await Promise.all([
        BookingApi.getMyBookings(),
        PaymentApi.getMyPayments(),
        VisitSupportApi.getMyVisits(),
        VisitSupportApi.getMySupportTickets(),
      ]);
      setBookings(bRes.bookings || []);
      setSchedules(pRes.schedules || []);
      setRefunds(pRes.refunds || []);
      setVisits(vRes.visits || []);
      setTickets(sRes.tickets || []);
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to load your stays from the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handlePayNow = async (bookingId: string, scheduleId?: string) => {
    if (payLockRef.current) return;
    payLockRef.current = true;
    setPayingBookingId(bookingId);
    try {
      const orderRes = await PaymentApi.createOrder({
        booking_id: bookingId,
        payment_schedule_id: scheduleId,
        idempotency_key: `mob_${bookingId.slice(0, 12)}`,
      });
      if (__DEV__) {
        await PaymentApi.demoSimulate({
          booking_id: bookingId,
          razorpay_order_id: orderRes.order.id,
          payment_schedule_id: scheduleId,
          outcome: "SUCCESS",
        });
        await PendingBookingStorage.clear();
        Alert.alert("Payment Successful", "Transaction verified & synced.");
        loadAll();
      } else {
        Alert.alert(
          "Order Ready",
          `Razorpay Order ${orderRes.order.id} created. Complete via checkout.`
        );
      }
    } catch (err: any) {
      const classified = classifyBookingFailure(err);
      if (classified.kind === "UNCERTAIN") {
        try {
          const rec = await PaymentApi.reconcile({ booking_id: bookingId });
          if (rec.reconciled && rec.booking?.payment_status === "paid") {
            await PendingBookingStorage.clear();
            Alert.alert("Payment Verified", "Your payment was confirmed.");
            loadAll();
            return;
          }
        } catch {
          // Ignore reconcile error and show safe uncertain message
        }
        Alert.alert(
          "Payment Status Uncertain",
          "We're checking your payment status. Refresh My Stays before retrying."
        );
        loadAll();
      } else {
        Alert.alert("Payment Failed", err?.message || "Could not process payment");
      }
    } finally {
      payLockRef.current = false;
      setPayingBookingId(null);
    }
  };

  const handleExtend = async (bookingId: string) => {
    try {
      const res = await BookingApi.extendBooking(bookingId, 1);
      Alert.alert(
        "Stay Extended",
        `Extended through ${res.extension.new_check_out_date} (+₹${res.extension.delta_total})`
      );
      loadAll();
    } catch (err: any) {
      Alert.alert("Cannot Extend", err?.message || "Unit conflict on extension");
    }
  };

  const handleCancel = (bookingId: string) => {
    Alert.alert(
      "Cancel Booking",
      "Refund is calculated automatically (>48h 100%, 24-48h 50% base + deposit, <24h deposit only).",
      [
        { text: "Keep Stay", style: "cancel" },
        {
          text: "Confirm Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await BookingApi.cancelBooking(bookingId);
              const refundAmt = res.booking?.refund?.amount || 0;
              Alert.alert(
                "Booking Cancelled",
                refundAmt > 0
                  ? `Refund initiated: ₹${refundAmt.toLocaleString("en-IN")}`
                  : "Reservation cancelled."
              );
              loadAll();
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Could not cancel");
            }
          },
        },
      ]
    );
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) return;
    try {
      await VisitSupportApi.createSupportTicket({
        category,
        subject: subject.trim(),
        message: message.trim(),
      });
      setTicketOpen(false);
      setSubject("");
      setMessage("");
      loadAll();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not submit ticket");
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerCard}>
        <Text style={styles.emptyTitle}>Sign in to view your Stays</Text>
        <Text style={styles.emptySub}>
          Access keyless room PINs, rent schedules, walkthrough tours & support.
        </Text>
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.ctaBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {(["BOOKINGS", "PAYMENTS", "VISITS", "SUPPORT"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabPill, tab === t && styles.tabPillActive]}
            onPress={() => setTab(t)}
          >
            <Text
              style={[styles.tabText, tab === t && { color: "#FFFFFF" }]}
            >
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadAll();
            }}
            tintColor={Colors.primary}
          />
        }
      >
        {recoveryNotice && (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: "#EAF5E5", borderColor: "#E6DFD1", borderWidth: 1 },
            ]}
          >
            <Text style={[styles.errorText, { color: "#064B35" }]}>
              {recoveryNotice}
            </Text>
          </View>
        )}
        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : tab === "BOOKINGS" ? (
          bookings.length === 0 ? (
            <Text style={styles.emptySub}>No bookings yet.</Text>
          ) : (
            bookings.map((b) => (
              <View key={b.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.refText}>
                    {b.booking_reference || b.id.slice(0, 8)}
                  </Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>
                      {String(b.status).toUpperCase()} ·{" "}
                      {String(b.payment_status).toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.propTitle}>
                  {b.property?.title || "Stayzy Residence"}
                </Text>
                <Text style={styles.metaText}>
                  {b.room_type?.name || "Room"} · {b.check_in_date} →{" "}
                  {b.check_out_date}
                </Text>
                <Text style={styles.priceText}>
                  Total ₹{Number(b.total_price).toLocaleString("en-IN")}
                </Text>

                {b.keyless_code &&
                  ["confirmed", "checked_in"].includes(b.status) &&
                  b.payment_status === "paid" && (
                    <View style={styles.pinBox}>
                      <KeyRound size={15} color={Colors.primary} />
                      <Text style={styles.pinText}>
                        Keyless Access PIN: {b.keyless_code}
                      </Text>
                    </View>
                  )}

                <View style={styles.actionRow}>
                  {b.payment_status !== "paid" && b.status !== "cancelled" && (
                    <TouchableOpacity
                      style={[
                        styles.smallPrimary,
                        payingBookingId === b.id && { opacity: 0.65 },
                      ]}
                      onPress={() => handlePayNow(b.id)}
                      disabled={payingBookingId === b.id}
                    >
                      <CreditCard size={13} color="#FFFFFF" />
                      <Text style={styles.smallPrimaryText}>
                        {payingBookingId === b.id ? "Processing..." : "Pay Now"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {["pending", "confirmed", "checked_in"].includes(b.status) && (
                    <>
                      <TouchableOpacity
                        style={styles.smallOutline}
                        onPress={() => handleExtend(b.id)}
                      >
                        <RefreshCw size={13} color={Colors.primary} />
                        <Text style={styles.smallOutlineText}>+1 Extend</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.smallOutline,
                          { borderColor: Colors.accentRed },
                        ]}
                        onPress={() => handleCancel(b.id)}
                      >
                        <Text
                          style={[
                            styles.smallOutlineText,
                            { color: Colors.accentRed },
                          ]}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )
        ) : tab === "PAYMENTS" ? (
          <>
            <Text style={styles.subHeader}>Upcoming Installments</Text>
            {schedules.length === 0 ? (
              <Text style={styles.emptySub}>No scheduled installments.</Text>
            ) : (
              schedules.map((s) => (
                <View key={s.id} style={styles.card}>
                  <Text style={styles.propTitle}>{s.description}</Text>
                  <Text style={styles.metaText}>
                    Due: {String(s.due_date).split("T")[0]} · Status: {s.status}
                  </Text>
                  <View style={styles.cardTop}>
                    <Text style={styles.priceText}>
                      ₹{Number(s.amount).toLocaleString("en-IN")}
                    </Text>
                    {s.status === "PENDING" && (
                      <TouchableOpacity
                        style={styles.smallPrimary}
                        onPress={() => handlePayNow(s.booking_id, s.id)}
                      >
                        <Text style={styles.smallPrimaryText}>Pay Installment</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
            {refunds.length > 0 && (
              <>
                <Text style={[styles.subHeader, { marginTop: 12 }]}>Refunds</Text>
                {refunds.map((r) => (
                  <View key={r.id} style={styles.card}>
                    <Text style={styles.propTitle}>
                      ₹{Number(r.amount).toLocaleString("en-IN")} · {r.status}
                    </Text>
                    <Text style={styles.metaText}>{r.reason}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        ) : tab === "VISITS" ? (
          visits.length === 0 ? (
            <Text style={styles.emptySub}>No walkthrough visits scheduled.</Text>
          ) : (
            visits.map((v) => (
              <View key={v.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.propTitle}>{v.property_title}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>
                      {String(v.status).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.metaText}>
                  <Calendar size={12} color={Colors.primary} />{" "}
                  {String(v.preferred_date).split("T")[0]} at {v.time_slot}
                </Text>
              </View>
            ))
          )
        ) : (
          <>
            <TouchableOpacity
              style={[styles.ctaBtn, { marginBottom: 14, alignSelf: "stretch" }]}
              onPress={() => setTicketOpen(true)}
            >
              <MessageSquarePlus size={16} color="#FFFFFF" />
              <Text style={styles.ctaBtnText}>Raise New Support Ticket</Text>
            </TouchableOpacity>
            {tickets.map((t) => (
              <View key={t.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.propTitle}>{t.subject}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>
                      {String(t.status).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.metaText}>{t.message}</Text>
                {t.admin_reply && (
                  <View style={styles.pinBox}>
                    <Text style={styles.pinText}>Reply: {t.admin_reply}</Text>
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={ticketOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.cardTop}>
              <Text style={styles.propTitle}>New Support Request</Text>
              <TouchableOpacity onPress={() => setTicketOpen(false)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", gap: 6, marginVertical: 10 }}>
              {(["maintenance", "housekeeping", "payment", "general"] as const).map(
                (c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.smallOutline,
                      category === c && { backgroundColor: Colors.primaryLight },
                    ]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={styles.smallOutlineText}>{c}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Subject"
              value={subject}
              onChangeText={setSubject}
            />
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: "top", paddingTop: 10 }]}
              placeholder="Describe the issue..."
              multiline
              value={message}
              onChangeText={setMessage}
            />
            <TouchableOpacity style={styles.ctaBtn} onPress={handleCreateTicket}>
              <Text style={styles.ctaBtnText}>Submit Ticket</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabRow: {
    flexDirection: "row",
    gap: 6,
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
  tabPillActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: "800", color: Colors.textSub },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    ...Shadows.card,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  refText: { fontSize: 11, fontWeight: "800", color: Colors.textMuted },
  statusPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: "800", color: Colors.primary },
  propTitle: { fontSize: 15, fontWeight: "800", color: Colors.textMain },
  metaText: { fontSize: 12, color: Colors.textMuted, marginTop: 3 },
  priceText: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.primary,
    marginTop: 6,
  },
  pinBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  pinText: { fontSize: 12, fontWeight: "800", color: Colors.primary, flex: 1 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  smallPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallPrimaryText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  smallOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  smallOutlineText: { color: Colors.primary, fontSize: 11, fontWeight: "800" },
  centerCard: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: Colors.textMain },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 6,
  },
  subHeader: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textMain,
    marginBottom: 8,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    height: 46,
    borderRadius: 14,
    marginTop: 16,
  },
  ctaBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
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
  errorBox: {
    backgroundColor: Colors.accentRedLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: { fontSize: 12, fontWeight: "700", color: Colors.accentRed },
});
