import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BookingApi, CatalogApi, PaymentApi, DurationType } from "../src/services/api";
import { useRole } from "../src/context/RoleContext";
import { validateCheckoutDetails } from "../src/utils/checkoutValidation";
import { PendingBookingStorage } from "../src/services/secureStorage";
import {
  BookingRequestState,
  classifyBookingFailure,
  executeResilientBookingAttempt,
  recoverPendingBookingByKey,
} from "../src/utils/bookingResilience";
import { Colors, Shadows } from "../src/theme/colors";
import {
  ArrowLeft,
  Clock,
  Check,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  RefreshCw,
  BedDouble,
} from "lucide-react-native";

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    holdToken: string;
    roomTypeId: string;
    roomName: string;
    propertyName: string;
    locality: string;
    roomImage?: string;
    durationType: DurationType;
    durationCount: string;
    startDate: string;
    startTime?: string;
    includeFood?: string;
  }>();

  const { user, isAuthenticated } = useRole();

  const [hold, setHold] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [imageUri, setImageUri] = useState<string | null>(
    params.roomImage?.trim() ? params.roomImage.trim() : null
  );
  const [imageFailed, setImageFailed] = useState(false);
  const [roomMeta, setRoomMeta] = useState<{
    propertyName?: string;
    roomName?: string;
    locality?: string;
  }>({});
  const [secondsLeft, setSecondsLeft] = useState(900);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState(user.name || "");
  const [guestEmail, setGuestEmail] = useState(user.email || "");
  const [guestPhone, setGuestPhone] = useState(user.phone || "");
  const [guestsCount, setGuestsCount] = useState("1");
  const [specialRequests, setSpecialRequests] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const bookingIdempotencyKeyRef = useRef<string>(
    `mob_bk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payMessage, setPayMessage] = useState<string | null>(null);
  const [bookingState, setBookingState] = useState<BookingRequestState>("IDLE");
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (!params.roomTypeId) {
      setLoadError("Missing room selection. Please go back and select a room.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [holdRes, calcRes, roomRes] = await Promise.all([
        params.holdToken ? BookingApi.getHold(params.holdToken) : null,
        BookingApi.calculatePricing({
          room_type_id: params.roomTypeId,
          duration_type: (params.durationType || "MONTHLY") as DurationType,
          duration_count: Number(params.durationCount || 1),
          start_date: params.startDate,
          start_time: params.startTime,
          include_food: params.includeFood === "1",
        }),
        !params.roomImage?.trim()
          ? CatalogApi.getRoomDetail(params.roomTypeId).catch(() => null)
          : null,
      ]);
      if (holdRes?.hold) {
        setHold(holdRes.hold);
        setSecondsLeft(holdRes.hold.remaining_seconds ?? 900);
      }
      setBreakdown(calcRes.breakdown);
      if (roomRes?.room) {
        const fetchedImg =
          roomRes.room.images?.[0] || roomRes.room.property?.images?.[0] || null;
        if (fetchedImg) {
          setImageUri(fetchedImg);
          setImageFailed(false);
        }
        setRoomMeta({
          propertyName: roomRes.room.property?.title,
          roomName: roomRes.room.name,
          locality: roomRes.room.displayLocality || roomRes.room.property?.city,
        });
      }
    } catch (err: any) {
      setLoadError(
        err?.message || "Unable to load booking summary. Please retry."
      );
    } finally {
      setLoading(false);
    }
  }, [
    params.holdToken,
    params.roomTypeId,
    params.durationType,
    params.durationCount,
    params.startDate,
    params.startTime,
    params.includeFood,
  ]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Restore any interrupted booking attempt for this user on mount / app reopen
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !params.roomTypeId) return;
    let active = true;
    (async () => {
      const pending = await PendingBookingStorage.getForUser(user.id);
      if (!active || !pending || pending.roomTypeId !== params.roomTypeId) return;
      bookingIdempotencyKeyRef.current = pending.idempotencyKey;
      setBookingState("RECOVERING");
      setRecoveryNotice(
        "We're checking whether your booking was completed. Please don't submit another booking while we verify your reservation."
      );
      const rec = await recoverPendingBookingByKey({
        idempotencyKey: pending.idempotencyKey,
        deps: {
          recoverByIdempotencyKey: BookingApi.recoverByIdempotencyKey,
          clearPending: PendingBookingStorage.clear,
        },
      });
      if (!active) return;
      setBookingState(rec.state);
      if (rec.booking && rec.state === "CONFIRMED") {
        router.replace({
          pathname: "/booking-confirmation",
          params: { bookingId: rec.booking.id },
        });
        return;
      }
      if (rec.booking && rec.state === "PAYMENT_PENDING") {
        setActiveBooking(rec.booking);
        setRecoveryNotice(
          "Your reservation was already recorded. Complete payment to confirm your stay."
        );
        return;
      }
      setRecoveryNotice(rec.message || null);
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id, params.roomTypeId, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const validateBookingForm = (): string | null =>
    validateCheckoutDetails({
      isAuthenticated,
      guestName,
      guestEmail,
      guestPhone,
      guestsCount,
      termsAccepted,
      hasHoldToken: Boolean(params.holdToken),
      secondsLeft,
      hasActiveBooking: Boolean(activeBooking),
    });

  const handleCheckRecoveryStatus = async () => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setBookingState("RECOVERING");
    setRecoveryNotice(
      "We're checking whether your booking was completed. Please don't submit another booking while we verify your reservation."
    );
    try {
      const rec = await recoverPendingBookingByKey({
        idempotencyKey: bookingIdempotencyKeyRef.current,
        deps: {
          recoverByIdempotencyKey: BookingApi.recoverByIdempotencyKey,
          clearPending: PendingBookingStorage.clear,
        },
      });
      setBookingState(rec.state);
      if (rec.booking && rec.state === "CONFIRMED") {
        router.replace({
          pathname: "/booking-confirmation",
          params: { bookingId: rec.booking.id },
        });
        return;
      }
      if (rec.booking && rec.state === "PAYMENT_PENDING") {
        setActiveBooking(rec.booking);
        setRecoveryNotice(
          "Your reservation was found. Tap Pay & Confirm Stay to complete payment."
        );
        return;
      }
      setRecoveryNotice(rec.message || null);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const handleConfirmAndPay = async () => {
    if (submitLockRef.current) return;
    setBookingState("VALIDATING");
    const validationError = validateBookingForm();
    if (validationError) {
      setFormError(validationError);
      setBookingState("IDLE");
      return;
    }
    setFormError(null);
    setRecoveryNotice(null);

    setSubmitting(true);
    try {
      const attempt = await executeResilientBookingAttempt({
        submitLockRef,
        idempotencyKey: bookingIdempotencyKeyRef.current,
        userId: user.id || "",
        roomTypeId: params.roomTypeId,
        startDate: params.startDate,
        holdToken: params.holdToken,
        activeBooking,
        bookingPayload: {
          room_type_id: params.roomTypeId,
          hold_token: params.holdToken,
          duration_type: params.durationType,
          start_date: params.startDate,
          start_time: params.startTime,
          duration_count: Number(params.durationCount || 1),
          include_food: params.includeFood === "1",
          guests_count: Number(guestsCount || 1),
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim(),
          guest_phone: guestPhone.trim(),
          special_requests: specialRequests.trim() || undefined,
        },
        deps: {
          createBooking: BookingApi.createBooking,
          recoverByIdempotencyKey: BookingApi.recoverByIdempotencyKey,
          savePending: PendingBookingStorage.save,
          clearPending: PendingBookingStorage.clear,
        },
        onStateChange: (nextState, msg) => {
          setBookingState(nextState);
          if (msg) setRecoveryNotice(msg);
        },
      });

      if (attempt.skipped) return;
      if (attempt.requiresAuth) {
        Alert.alert("Sign In Required", attempt.message || "Please sign in to continue.", [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/login") },
        ]);
        return;
      }
      if (!attempt.booking) {
        if (attempt.state === "FAILED_FINAL") {
          setFormError(attempt.message || "Unable to complete reservation.");
        }
        return;
      }

      const booking = attempt.booking;
      setActiveBooking(booking);

      if (attempt.state === "CONFIRMED") {
        router.replace({
          pathname: "/booking-confirmation",
          params: { bookingId: booking.id },
        });
        return;
      }

      const orderRes = await PaymentApi.createOrder({
        booking_id: booking.id,
        idempotency_key: `mob_${booking.id.slice(0, 12)}`,
      });
      setActiveOrder(orderRes.order);
      setPayMessage(null);
      setPaymentModalOpen(true);
    } catch (err: any) {
      const classified = classifyBookingFailure(err);
      if (classified.kind === "UNCERTAIN") {
        setPayMessage(
          "Payment initiation timed out. Tap Reconcile Status or Retry Order."
        );
        setPaymentModalOpen(true);
      } else {
        Alert.alert("Checkout Error", err?.message || "Could not initiate payment");
      }
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const handleSimulateOutcome = async (
    outcome: "SUCCESS" | "PENDING" | "FAILED"
  ) => {
    if (!activeBooking || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setPayMessage(null);
    try {
      const res = await PaymentApi.demoSimulate({
        booking_id: activeBooking.id,
        razorpay_order_id: activeOrder?.id,
        outcome,
      });

      if (outcome === "SUCCESS") {
        await PendingBookingStorage.clear();
        setBookingState("CONFIRMED");
        setPaymentModalOpen(false);
        router.replace({
          pathname: "/booking-confirmation",
          params: { bookingId: activeBooking.id },
        });
      } else if (outcome === "PENDING") {
        setPayMessage(
          "Bank confirmation pending. Tap Reconcile or Retry to complete."
        );
      } else {
        setPayMessage("Payment declined. Tap Retry Order to generate a fresh attempt.");
      }
    } catch (err: any) {
      const classified = classifyBookingFailure(err);
      if (classified.kind === "UNCERTAIN") {
        // Check backend payment/booking state before allowing another attempt
        try {
          const rec = await PaymentApi.reconcile({ booking_id: activeBooking.id });
          if (rec.reconciled && rec.booking?.payment_status === "paid") {
            await PendingBookingStorage.clear();
            setBookingState("CONFIRMED");
            setPaymentModalOpen(false);
            router.replace({
              pathname: "/booking-confirmation",
              params: { bookingId: activeBooking.id },
            });
            return;
          }
        } catch {
          // Fall through to safe status notice
        }
        setPayMessage(
          "Payment response timed out. Tap Reconcile Status to verify before retrying."
        );
      } else {
        setPayMessage(err?.message || "Payment gateway error");
      }
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const handleRetryOrder = async () => {
    if (!activeBooking || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const res = await PaymentApi.createOrder({
        booking_id: activeBooking.id,
        idempotency_key: `mob_${activeBooking.id.slice(0, 12)}`,
      });
      setActiveOrder(res.order);
      setPayMessage(`Fresh retry order ready: ${res.order.id}`);
    } catch (err: any) {
      setPayMessage(err?.message || "Retry failed");
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const handleReconcile = async () => {
    if (!activeBooking || submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const res = await PaymentApi.reconcile({ booking_id: activeBooking.id });
      setPayMessage(`Reconciliation status: ${res.action}`);
      if (res.reconciled && res.booking?.payment_status === "paid") {
        await PendingBookingStorage.clear();
        setBookingState("CONFIRMED");
        setPaymentModalOpen(false);
        router.replace({
          pathname: "/booking-confirmation",
          params: { bookingId: activeBooking.id },
        });
      }
    } catch (err: any) {
      setPayMessage(err?.message || "Reconcile error");
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.loaderWrap}>
        <View style={styles.errorCard}>
          <AlertCircle size={28} color={Colors.primary} />
          <Text style={styles.errorTitle}>Sign In Required</Text>
          <Text style={styles.errorSub}>
            Please sign in to review guest details and reserve your stay.
          </Text>
          <TouchableOpacity
            style={styles.payCta}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.payCtaText}>Go to Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.closeModalBtn, { marginTop: 10 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.closeModalText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.loaderWrap}>
        <View style={styles.errorCard}>
          <AlertCircle size={28} color={Colors.accentRed} />
          <Text style={styles.errorTitle}>Unable to Load Summary</Text>
          <Text style={styles.errorSub}>{loadError}</Text>
          <TouchableOpacity style={styles.payCta} onPress={loadSummary}>
            <RefreshCw size={16} color="#FFFFFF" />
            <Text style={styles.payCtaText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.closeModalBtn, { marginTop: 10 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.closeModalText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={async () => {
            if (params.holdToken && !activeBooking) {
              await BookingApi.releaseHold(params.holdToken).catch(() => {});
            }
            router.back();
          }}
        >
          <ArrowLeft size={20} color={Colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Review & Complete Booking</Text>
        {params.holdToken ? (
          <View style={styles.holdPill}>
            <Clock size={12} color="#92400E" />
            <Text style={styles.holdText}>
              {mm}:{ss}
            </Text>
          </View>
        ) : (
          <View style={styles.holdPill}>
            <ShieldCheck size={12} color={Colors.primary} />
            <Text style={[styles.holdText, { color: Colors.primary }]}>Review</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.instantBadge}>
          <Text style={styles.instantText}>INSTANT RESERVATION</Text>
        </View>
        <Text style={styles.pageTitle}>Review & Complete Your Booking</Text>
        <Text style={styles.pageSub}>
          Double-check your details and proceed with secure Razorpay payment.
        </Text>

        {/* Step 1: Resident & Contact Details */}
        <View style={styles.card}>
          <View style={styles.stepHead}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Resident & Contact Details</Text>
          </View>

          <Text style={styles.label}>Full Legal Name</Text>
          <TextInput
            style={styles.input}
            value={guestName}
            onChangeText={(v) => {
              setGuestName(v);
              if (formError) setFormError(null);
            }}
            placeholder="Aarav Sharma"
          />

          <Text style={styles.label}>Email Address (for Receipt & PIN)</Text>
          <TextInput
            style={styles.input}
            value={guestEmail}
            onChangeText={(v) => {
              setGuestEmail(v);
              if (formError) setFormError(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="aarav@example.com"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Mobile Phone</Text>
              <TextInput
                style={styles.input}
                value={guestPhone}
                onChangeText={(v) => {
                  setGuestPhone(v);
                  if (formError) setFormError(null);
                }}
                keyboardType="phone-pad"
                placeholder="+91 98765 43210"
              />
            </View>
            <View style={{ width: 95 }}>
              <Text style={styles.label}>Guests</Text>
              <TextInput
                style={styles.input}
                value={guestsCount}
                onChangeText={(v) => {
                  setGuestsCount(v);
                  if (formError) setFormError(null);
                }}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>Special Requests (Optional)</Text>
          <TextInput
            style={styles.input}
            value={specialRequests}
            onChangeText={setSpecialRequests}
            placeholder="High floor, late check-in..."
          />
        </View>

        {/* Step 2: Terms & House Rules */}
        <View style={styles.card}>
          <View style={styles.stepHead}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Terms & House Rules</Text>
          </View>

          <View style={styles.rulesBox}>
            <Text style={styles.ruleLine}>
              ✓ Security Deposit: 100% refundable against any damages.
            </Text>
            <Text style={styles.ruleLine}>
              ✓ Tiered Cancellation: Full refund {">"}48h; 50% base + deposit 24–48h.
            </Text>
            <Text style={styles.ruleLine}>
              ✓ Quiet Hours: 10:30 PM to 6:30 AM for a peaceful stay.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.agreeRow}
            onPress={() => {
              setTermsAccepted((v) => !v);
              if (formError) setFormError(null);
            }}
          >
            <View
              style={[
                styles.checkBox,
                termsAccepted && { backgroundColor: Colors.primary },
              ]}
            >
              {termsAccepted && <Check size={13} color="#FFFFFF" />}
            </View>
            <Text style={styles.agreeText}>
              I acknowledge the Stayzy Booking Guidelines, Cancellation Terms, and
              confirm guest details are accurate.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stay Summary */}
        <View style={[styles.card, styles.summaryCardOuter]}>
          <View style={styles.summaryHeaderBar}>
            <BedDouble size={18} color={Colors.primary} />
            <Text style={styles.summaryHeaderTitle}>Stay Summary</Text>
          </View>
          <View style={styles.summaryBody}>
            <View style={styles.propRow}>
              <View style={styles.thumbBox}>
                {imageUri && !imageFailed ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.thumbImg}
                    resizeMode="cover"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <BedDouble size={24} color={Colors.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryProp} numberOfLines={2}>
                  {params.propertyName || roomMeta.propertyName || "Stayzy Residence"}
                </Text>
                <Text style={styles.summaryRoom} numberOfLines={2}>
                  {params.roomName || roomMeta.roomName || "Verified Room"} ·{" "}
                  {params.locality || roomMeta.locality || "Bengaluru"}
                </Text>
              </View>
            </View>
            {hold?.unit && (
              <Text style={styles.unitTag}>
                Assigned Bed/Unit: {hold.unit.identifier} (Floor {hold.unit.floor})
              </Text>
            )}

          {breakdown && (
            <View style={styles.totals}>
              <View style={styles.totLine}>
                <Text style={styles.totLabel}>Stay Type</Text>
                <Text style={styles.totVal}>
                  {breakdown.durationType} ({breakdown.durationCount}{" "}
                  {breakdown.durationType === "HOURLY"
                    ? "hr"
                    : breakdown.durationType === "DAILY"
                    ? "night"
                    : breakdown.durationType === "WEEKLY"
                    ? "wk"
                    : breakdown.durationType === "YEARLY"
                    ? "yr"
                    : "mo"}
                  {Number(breakdown.durationCount) > 1 ? "s" : ""})
                </Text>
              </View>
              <View style={styles.totLine}>
                <Text style={styles.totLabel}>Check-in</Text>
                <Text style={styles.totVal}>{breakdown.checkInDate}</Text>
              </View>
              <View style={styles.totLine}>
                <Text style={styles.totLabel}>Check-out</Text>
                <Text style={styles.totVal}>{breakdown.checkOutDate}</Text>
              </View>
              <View style={styles.totLine}>
                <Text style={styles.totLabel}>Base Tariff</Text>
                <Text style={styles.totVal}>
                  ₹{Number(breakdown.baseAmount).toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.totLine}>
                <Text style={styles.totLabel}>Dining Plan</Text>
                <Text style={styles.totVal}>
                  {Number(breakdown.foodCharge ?? breakdown.foodAmount ?? 0) > 0
                    ? `₹${Number(
                        breakdown.foodCharge ?? breakdown.foodAmount ?? 0
                      ).toLocaleString("en-IN")}`
                    : "Not Included"}
                </Text>
              </View>
              <View style={styles.totLine}>
                <Text style={styles.totLabel}>
                  GST & Taxes ({breakdown.gstRatePercent ?? 12}%)
                </Text>
                <Text style={styles.totVal}>
                  ₹{Number(breakdown.taxes).toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.totLine}>
                <Text style={[styles.totLabel, { color: Colors.secondary }]}>
                  Refundable Deposit
                </Text>
                <Text style={[styles.totVal, { color: Colors.secondary }]}>
                  ₹{Number(breakdown.depositAmount).toLocaleString("en-IN")}
                </Text>
              </View>

              <View style={styles.dueRow}>
                <View>
                  <Text style={styles.dueLabel}>Due Today</Text>
                  {breakdown.balanceRemaining > 0 && (
                    <Text style={{ fontSize: 11, color: Colors.secondary, fontWeight: "700" }}>
                      + {breakdown.schedule?.length || 11} monthly installments
                    </Text>
                  )}
                </View>
                <Text style={styles.dueVal}>
                  ₹{Number(breakdown.payableNow).toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          )}

          {recoveryNotice ? (
            <View
              style={[
                styles.noticeBox,
                {
                  flexDirection: "column",
                  alignItems: "flex-start",
                  backgroundColor: "#EAF5E5",
                  borderWidth: 1,
                  borderColor: "#E6DFD1",
                  padding: 12,
                  marginBottom: 8,
                },
              ]}
            >
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#064B35" }}>
                {bookingState === "RECOVERING"
                  ? "Booking is taking longer than expected"
                  : "Reservation Status"}
              </Text>
              <Text style={{ fontSize: 12, color: "#064B35", marginTop: 2 }}>
                {recoveryNotice}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.simSecondaryBtn, { flex: 0, paddingHorizontal: 12, height: 34 }]}
                  onPress={handleCheckRecoveryStatus}
                  disabled={submitting}
                >
                  <RefreshCw size={12} color="#064B35" />
                  <Text style={[styles.simSecText, { color: "#064B35" }]}>
                    Check booking status
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.simSecondaryBtn, { flex: 0, paddingHorizontal: 12, height: 34 }]}
                  onPress={() => router.replace("/(tabs)/stays")}
                >
                  <Text style={[styles.simSecText, { color: "#064B35" }]}>
                    View My Stays
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {formError ? (
            <View style={styles.formErrorBox}>
              <AlertCircle size={15} color={Colors.accentRed} />
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.payCta, submitting && { opacity: 0.7 }]}
            onPress={handleConfirmAndPay}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <CreditCard size={18} color="#FFFFFF" />
                <Text style={styles.payCtaText}>
                  Pay ₹{Number(breakdown?.payableNow || 0).toLocaleString("en-IN")}{" "}
                  & Confirm Stay
                </Text>
              </>
            )}
          </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Razorpay Test Checkout & Simulator Modal */}
      <Modal visible={paymentModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <ShieldCheck size={22} color={Colors.secondary} />
              <Text style={styles.modalTitle}>Razorpay Test Checkout</Text>
            </View>
            <Text style={styles.modalSub}>
              Order ID: {activeOrder?.id} · Amount: ₹
              {Number(activeOrder?.amount || 0).toLocaleString("en-IN")}
            </Text>

            {payMessage && (
              <View style={styles.noticeBox}>
                <AlertCircle size={15} color={Colors.primary} />
                <Text style={styles.noticeText}>{payMessage}</Text>
              </View>
            )}

            {__DEV__ ? (
              <View style={{ gap: 10, marginTop: 10 }}>
                <Text style={styles.devNote}>
                  Development Test Mode Simulator (disabled automatically in
                  production):
                </Text>
                <TouchableOpacity
                  style={styles.simSuccessBtn}
                  onPress={() => handleSimulateOutcome("SUCCESS")}
                  disabled={submitting}
                >
                  <Text style={styles.simBtnText}>
                    Complete Test Payment (Success)
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={styles.simSecondaryBtn}
                    onPress={() => handleSimulateOutcome("PENDING")}
                    disabled={submitting}
                  >
                    <Text style={styles.simSecText}>Simulate Pending</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.simSecondaryBtn,
                      { borderColor: Colors.accentRed },
                    ]}
                    onPress={() => handleSimulateOutcome("FAILED")}
                    disabled={submitting}
                  >
                    <Text style={[styles.simSecText, { color: Colors.accentRed }]}>
                      Simulate Failure
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    style={styles.simSecondaryBtn}
                    onPress={handleRetryOrder}
                    disabled={submitting}
                  >
                    <RefreshCw size={13} color={Colors.primary} />
                    <Text style={styles.simSecText}>Retry Order</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.simSecondaryBtn}
                    onPress={handleReconcile}
                    disabled={submitting}
                  >
                    <Text style={styles.simSecText}>Reconcile Status</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.modalSub}>
                Complete payment using your Razorpay Checkout token and tap
                Reconcile.
              </Text>
            )}

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setPaymentModalOpen(false)}
            >
              <Text style={styles.closeModalText}>Save & Pay Later in My Stays</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorCard: {
    width: "100%",
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 8,
  },
  errorTitle: { fontSize: 18, fontWeight: "800", color: Colors.textMain },
  errorSub: { fontSize: 13, color: Colors.textMuted, textAlign: "center", marginBottom: 8 },
  formErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accentRedLight,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  formErrorText: { flex: 1, fontSize: 12, fontWeight: "700", color: Colors.accentRed },
  summaryCardOuter: {
    borderColor: Colors.primaryBorder,
    padding: 0,
    overflow: "hidden",
  },
  summaryHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryBorder,
  },
  summaryHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
  },
  summaryBody: { padding: 16 },
  propRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumbBox: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  safeArea: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.cardWarm,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontSize: 15, fontWeight: "800", color: Colors.textMain },
  holdPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.starGoldLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  holdText: { fontSize: 12, fontWeight: "800", color: "#92400E" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  instantBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  instantText: { fontSize: 10, fontWeight: "800", color: Colors.primary },
  pageTitle: { fontSize: 22, fontWeight: "900", color: Colors.textMain },
  pageSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, marginBottom: 14 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    ...Shadows.card,
  },
  stepHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  stepTitle: { fontSize: 16, fontWeight: "800", color: Colors.textMain },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSub,
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textMain,
  },
  row: { flexDirection: "row", gap: 10 },
  rulesBox: {
    backgroundColor: Colors.cardWarm,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  ruleLine: { fontSize: 12, color: Colors.textSub },
  agreeRow: { flexDirection: "row", gap: 10, marginTop: 12, alignItems: "flex-start" },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  agreeText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  summaryTitle: { fontSize: 17, fontWeight: "900", color: Colors.primary },
  summaryProp: { fontSize: 15, fontWeight: "800", color: Colors.textMain, marginTop: 6 },
  summaryRoom: { fontSize: 12, color: Colors.textMuted },
  unitTag: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryLight,
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  totals: { marginTop: 12, gap: 6 },
  totLine: { flexDirection: "row", justifyContent: "space-between" },
  totLabel: { fontSize: 13, color: Colors.textMuted },
  totVal: { fontSize: 13, fontWeight: "700", color: Colors.textMain },
  dueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dueLabel: { fontSize: 16, fontWeight: "800", color: Colors.textMain },
  dueVal: { fontSize: 22, fontWeight: "900", color: Colors.primary },
  payCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 14,
    marginTop: 14,
  },
  payCtaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(13,43,34,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  modalHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: Colors.textMain },
  modalSub: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  noticeText: { flex: 1, fontSize: 12, color: Colors.primary, fontWeight: "700" },
  devNote: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },
  simSuccessBtn: {
    backgroundColor: Colors.secondary,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  simBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  simSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cardWarm,
  },
  simSecText: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  closeModalBtn: { alignItems: "center", marginTop: 14, paddingVertical: 8 },
  closeModalText: { fontSize: 13, fontWeight: "700", color: Colors.textMuted },
});
