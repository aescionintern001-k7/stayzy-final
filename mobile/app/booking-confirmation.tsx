import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BookingApi } from "../src/services/api";
import { useRole } from "../src/context/RoleContext";
import { Colors, Shadows } from "../src/theme/colors";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Calendar,
  KeyRound,
  Home,
  CalendarDays,
  RotateCcw,
} from "lucide-react-native";

export interface BookingConfirmationData {
  id?: string;
  booking_reference?: string | null;
  property_title?: string | null;
  room_type_name?: string | null;
  unit_identifier?: string | null;
  property?: {
    id?: string;
    title?: string | null;
  } | null;
  room_type?: {
    id?: string;
    name?: string | null;
  } | null;
  unit?: {
    id?: string;
    identifier?: string | null;
  } | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  duration_count?: number | null;
  duration_type?: string | null;
  guests_count?: number | null;
  status?: string | null;
  payment_status?: string | null;
  payable_now?: number | null;
  total_price?: number | null;
  balance_remaining?: number | null;
  keyless_code?: string | null;
}

export function formatUnitLabel(unitIdentifier?: string | null): string | null {
  const trimmed = (unitIdentifier || "").trim();
  if (!trimmed) return null;
  if (/^unit\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Unit ${trimmed}`;
}

export default function BookingConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookingId?: string;
    preview?: string;
    bookingReference?: string;
    propertyTitle?: string;
    roomName?: string;
    checkInDate?: string;
    checkOutDate?: string;
    durationCount?: string;
    durationType?: string;
    guestsCount?: string;
    status?: string;
    paymentStatus?: string;
    amountPaid?: string;
    balanceRemaining?: string;
  }>();

  const { isAuthenticated } = useRole();

  const isPreview = params.preview === "1";
  const [booking, setBooking] = useState<BookingConfirmationData | null>(() =>
    isPreview
      ? {
          booking_reference: params.bookingReference || null,
          property_title: params.propertyTitle || null,
          room_type_name: params.roomName || null,
          check_in_date: params.checkInDate || null,
          check_out_date: params.checkOutDate || null,
          duration_count: params.durationCount ? Number(params.durationCount) : null,
          duration_type: params.durationType || null,
          guests_count: params.guestsCount ? Number(params.guestsCount) : null,
          status: params.status || "pending",
          payment_status: params.paymentStatus || "unpaid",
          payable_now: params.amountPaid ? Number(params.amountPaid) : null,
          balance_remaining: params.balanceRemaining
            ? Number(params.balanceRemaining)
            : 0,
        }
      : null
  );
  const [loading, setLoading] = useState(!isPreview && Boolean(params.bookingId));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBooking = useCallback(async () => {
    if (isPreview) return;
    if (!params.bookingId) {
      setErrorMsg("No booking reference provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await BookingApi.getBookingById(params.bookingId);
      setBooking(res.booking || null);
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to load booking confirmation.");
    } finally {
      setLoading(false);
    }
  }, [isPreview, params.bookingId]);

  useEffect(() => {
    if (!isPreview && params.bookingId && isAuthenticated) {
      loadBooking();
    } else if (!isPreview && !isAuthenticated) {
      setLoading(false);
    }
  }, [isPreview, params.bookingId, isAuthenticated, loadBooking]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!isPreview && !isAuthenticated) {
    return (
      <SafeAreaView style={styles.centerWrap}>
        <View style={styles.stateCard}>
          <AlertCircle size={28} color={Colors.primary} />
          <Text style={styles.stateTitle}>Sign In Required</Text>
          <Text style={styles.stateSub}>
            Please sign in to view your booking confirmation.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.primaryBtnText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg || !booking) {
    return (
      <SafeAreaView style={styles.centerWrap}>
        <View style={styles.stateCard}>
          <AlertCircle size={28} color={Colors.accentRed} />
          <Text style={styles.stateTitle}>Confirmation Unavailable</Text>
          <Text style={styles.stateSub}>
            {errorMsg || "Booking details could not be found."}
          </Text>
          {params.bookingId ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={loadBooking}>
              <RotateCcw size={15} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace("/(tabs)/stays")}
          >
            <Text style={styles.secondaryBtnText}>View My Stays</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const normalizedStatus = String(booking.status || "pending").toLowerCase();
  const normalizedPayStatus = String(
    booking.payment_status || "unpaid"
  ).toLowerCase();
  const isConfirmed =
    normalizedStatus === "confirmed" ||
    normalizedStatus === "checked_in" ||
    normalizedStatus === "completed";
  const isPaid = normalizedPayStatus === "paid";

  const amountPaidVal = isPaid
    ? Number(booking.payable_now ?? booking.total_price ?? 0)
    : 0;
  const remainingBalance = Number(booking.balance_remaining || 0);

  const propertyTitle = booking.property?.title || booking.property_title || "—";
  const roomTypeName = booking.room_type?.name || booking.room_type_name || "—";
  const unitLabel = formatUnitLabel(
    booking.unit?.identifier || booking.unit_identifier || null
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={styles.heroCard}>
          <View
            style={[
              styles.iconCircle,
              !isConfirmed && { backgroundColor: Colors.starGoldLight },
            ]}
          >
            {isConfirmed ? (
              <CheckCircle2 size={34} color={Colors.primary} />
            ) : (
              <Clock size={34} color="#92400E" />
            )}
          </View>

          <Text style={styles.statusKicker}>
            {isConfirmed ? "BOOKING CONFIRMED" : `STATUS: ${normalizedStatus.toUpperCase()}`}
          </Text>
          <Text style={styles.heroTitle}>
            {isConfirmed ? "You’re all set for Stayzy!" : "Reservation Recorded"}
          </Text>
          <Text style={styles.heroSub}>
            {isConfirmed && isPaid
              ? "Your stay is confirmed and your payment has been verified."
              : "Awaiting verified payment confirmation from the backend."}
          </Text>

          <View style={styles.refBadge}>
            <Text style={styles.refLabel}>Reference:</Text>
            <Text style={styles.refVal}>
              {booking.booking_reference || "—"}
            </Text>
          </View>
        </View>

        {/* Property & Stay Details */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <MapPin size={16} color={Colors.primary} />
            <Text style={styles.cardTitle}>Stay Details</Text>
          </View>

          <Text style={styles.propName}>{propertyTitle}</Text>
          <Text style={styles.roomName}>
            {roomTypeName}
            {unitLabel ? ` · ${unitLabel}` : ""}
          </Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Check-in</Text>
            <Text style={styles.detailVal}>{booking.check_in_date || "—"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Check-out</Text>
            <Text style={styles.detailVal}>{booking.check_out_date || "—"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailVal}>
              {booking.duration_count && booking.duration_type
                ? `${booking.duration_count} ${booking.duration_type}`
                : "—"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Guests</Text>
            <Text style={styles.detailVal}>
              {booking.guests_count ? String(booking.guests_count) : "—"}
            </Text>
          </View>
        </View>

        {/* Payment & Next Steps */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Calendar size={16} color={Colors.primary} />
            <Text style={styles.cardTitle}>Payment & Next Steps</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking Status</Text>
            <Text style={styles.detailVal}>
              {normalizedStatus.toUpperCase()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Status</Text>
            <Text
              style={[
                styles.detailVal,
                { color: isPaid ? Colors.secondary : "#92400E" },
              ]}
            >
              {isPaid ? "PAID (VERIFIED)" : normalizedPayStatus.toUpperCase()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount Paid</Text>
            <Text style={styles.detailVal}>
              ₹{amountPaidVal.toLocaleString("en-IN")}
            </Text>
          </View>
          {remainingBalance > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Remaining Balance</Text>
              <Text style={styles.detailVal}>
                ₹{remainingBalance.toLocaleString("en-IN")}
              </Text>
            </View>
          )}

          {isConfirmed && isPaid && booking.keyless_code ? (
            <View style={styles.pinBox}>
              <KeyRound size={16} color={Colors.primary} />
              <Text style={styles.pinText}>
                Keyless Entry PIN: {booking.keyless_code}
              </Text>
            </View>
          ) : (
            <Text style={styles.nextStepNote}>
              {isConfirmed && isPaid
                ? "You can manage your stay, rent schedule, and support requests in My Stays."
                : "Complete payment in My Stays to confirm your reservation and unlock keyless check-in."}
            </Text>
          )}
        </View>

        {/* Navigation Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace("/(tabs)/stays")}
        >
          <CalendarDays size={17} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>View My Stays</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace("/(tabs)")}
        >
          <Home size={17} color={Colors.primary} />
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  centerWrap: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },
  stateCard: {
    width: "100%",
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 10,
  },
  stateTitle: { fontSize: 18, fontWeight: "800", color: Colors.textMain },
  stateSub: { fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    alignItems: "center",
    gap: 8,
    ...Shadows.card,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statusKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: Colors.primary,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.textMain,
    textAlign: "center",
  },
  heroSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
  refBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refLabel: { fontSize: 12, fontWeight: "700", color: Colors.textMuted },
  refVal: { fontSize: 13, fontWeight: "900", color: Colors.primary },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    ...Shadows.card,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: Colors.textMain },
  propName: { fontSize: 16, fontWeight: "800", color: Colors.textMain },
  roomName: { fontSize: 13, color: Colors.textMuted },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 6,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 13, color: Colors.textSub },
  detailVal: { fontSize: 13, fontWeight: "800", color: Colors.textMain },
  pinBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  pinText: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  nextStepNote: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
  primaryBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 14, fontWeight: "800" },
});
