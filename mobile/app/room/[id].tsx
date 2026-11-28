import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CatalogApi,
  BookingApi,
  VisitSupportApi,
  DurationType,
} from "../../src/services/api";
import { useRole } from "../../src/context/RoleContext";
import { Colors, Shadows } from "../../src/theme/colors";
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Users,
  Maximize2,
  Snowflake,
  Bath,
  ShieldCheck,
  Calendar,
  Clock,
  Phone,
  Check,
  X,
  ArrowRight,
  Utensils,
  RotateCcw,
  AlertCircle,
} from "lucide-react-native";

const DURATIONS: DurationType[] = [
  "HOURLY",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
];

const VISIT_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "04:00 PM",
  "06:00 PM",
];

function getDefaultStartDate(): string {
  const d = new Date(Date.now() + 86400000);
  return d.toISOString().split("T")[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function isValidFutureOrTodayDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parsed = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  if (parsed.toISOString().split("T")[0] !== dateStr) return false;
  return dateStr >= getTodayDate();
}

export default function RoomDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; duration?: string }>();
  const { user, isAuthenticated, isFavorite, toggleFavorite } = useRole();

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  // Reserve Your Stay state
  const [durationType, setDurationType] = useState<DurationType>(
    (params.duration as DurationType) || "MONTHLY"
  );
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [startTime, setStartTime] = useState("10:00");
  const [durationCount, setDurationCount] = useState(1);
  const [includeFood, setIncludeFood] = useState(false);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [ratePlan, setRatePlan] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const bookingLockRef = useRef(false);
  const skipInitialCalcRef = useRef(false);

  // Walkthrough Visit modal
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitName, setVisitName] = useState(user.name || "");
  const [visitPhone, setVisitPhone] = useState(user.phone || "");
  const [visitEmail, setVisitEmail] = useState(user.email || "");
  const [visitDate, setVisitDate] = useState(getDefaultStartDate());
  const [visitSlot, setVisitSlot] = useState("11:00 AM");
  const [visitBusy, setVisitBusy] = useState(false);

  const loadRoom = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const res = await CatalogApi.getRoomDetail(params.id, {
        durationType,
        durationCount,
        startDate,
        startTime,
        includeFood,
      });
      setRoom(res.room);
      if (res.room?.pricing) {
        skipInitialCalcRef.current = true;
        setBreakdown(res.room.pricing);
      }
      if (
        res.room?.allRatePlans?.length > 0 &&
        !res.room.allRatePlans.some((r: any) => r.durationType === durationType)
      ) {
        skipInitialCalcRef.current = false;
        setDurationType(res.room.allRatePlans[0].durationType);
      }
    } catch (err: any) {
      Alert.alert("Unavailable", err?.message || "Could not load room details");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  const recalculatePricing = useCallback(async () => {
    if (!room?.id) return;
    if (!isValidFutureOrTodayDate(startDate)) {
      setCalcError("Enter a valid check-in date (YYYY-MM-DD) today or later.");
      return;
    }
    if (durationType === "HOURLY" && !/^\d{2}:\d{2}$/.test(startTime.trim())) {
      setCalcError("Enter a valid start time in 24h HH:MM format.");
      return;
    }

    setCalculating(true);
    setCalcError(null);
    try {
      const res = await BookingApi.calculatePricing({
        room_type_id: room.id,
        duration_type: durationType,
        duration_count: durationCount,
        start_date: startDate,
        start_time: startTime,
        include_food: includeFood,
      });
      setBreakdown(res.breakdown);
      if (res.ratePlan) setRatePlan(res.ratePlan);
    } catch (err: any) {
      setCalcError(err?.message || "Unable to calculate pricing. Please retry.");
    } finally {
      setCalculating(false);
    }
  }, [room?.id, durationType, durationCount, startDate, startTime, includeFood]);

  // Live server pricing recalculation (debounced for text inputs, skips duplicate initial mount fetch)
  useEffect(() => {
    if (!room?.id) return;
    if (skipInitialCalcRef.current) {
      skipInitialCalcRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      recalculatePricing();
    }, 200);
    return () => clearTimeout(timer);
  }, [room?.id, recalculatePricing]);

  const handleProceedToBook = async () => {
    if (bookingLockRef.current) return;
    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to lock your room and complete reservation.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/login") },
        ]
      );
      return;
    }

    if (!room?.id || calcError) {
      Alert.alert("Check Selection", calcError || "Select a valid plan first.");
      return;
    }

    bookingLockRef.current = true;
    setBookingBusy(true);
    try {
      const hold = await BookingApi.createHold({
        room_type_id: room.id,
        duration_type: durationType,
        start_date: startDate,
        start_time: durationType === "HOURLY" ? startTime : undefined,
        duration_count: durationCount,
        include_food: includeFood,
        guest_email: user.email || undefined,
      });

      router.push({
        pathname: "/checkout",
        params: {
          holdToken: hold.hold_token,
          roomTypeId: room.id,
          roomName: room.name,
          propertyName: room.property?.title || "Stayzy Residence",
          locality: room.displayLocality || room.property?.city || "Bengaluru",
          roomImage: images[0] || "",
          durationType,
          durationCount: String(durationCount),
          startDate,
          startTime,
          includeFood: includeFood ? "1" : "0",
        },
      });
    } catch (err: any) {
      Alert.alert(
        "Unable to Hold Room",
        err?.message || "All units are reserved for these dates."
      );
    } finally {
      bookingLockRef.current = false;
      setBookingBusy(false);
    }
  };

  const handleScheduleVisit = async () => {
    setVisitBusy(true);
    try {
      await VisitSupportApi.scheduleVisit({
        property_id: room.property?.id,
        room_type_id: room.id,
        customer_name: visitName.trim(),
        customer_phone: visitPhone.trim(),
        customer_email: visitEmail.trim(),
        preferred_date: visitDate.trim(),
        time_slot: visitSlot,
      });
      setVisitOpen(false);
      Alert.alert(
        "Walkthrough Scheduled",
        "Our Community Host will call you shortly to confirm your tour."
      );
    } catch (err: any) {
      Alert.alert("Check Details", err?.message || "Could not schedule visit");
    } finally {
      setVisitBusy(false);
    }
  };

  if (loading || !room) {
    return (
      <SafeAreaView style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const images: string[] =
    room.images?.length > 0
      ? room.images
      : room.property?.images?.length > 0
      ? room.property.images
      : [
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
        ];

  const availableDurations = (room.allRatePlans || []).map(
    (rp: any) => rp.durationType
  );
  const activeRatePlan =
    ratePlan?.durationType === durationType
      ? ratePlan
      : (room.allRatePlans || []).find((rp: any) => rp.durationType === durationType) ||
        null;
  const minDur = Number(activeRatePlan?.minDuration || 1);
  const maxDur = activeRatePlan?.maxDuration ? Number(activeRatePlan.maxDuration) : null;
  const availableBeds = Number(room.availableBeds ?? 1);
  const isSoldOut = availableBeds <= 0;
  const fav = isFavorite(room.id);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Action Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.topBreadcrumb} numberOfLines={1}>
          {room.name}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => toggleFavorite(room.id)}
          >
            <Heart
              size={18}
              color={fav ? Colors.accentRed : Colors.textMain}
              fill={fav ? Colors.accentRed : "none"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              Share.share({
                message: `Check out ${room.name} at ${room.property?.title} on Stayzy!`,
              })
            }
          >
            <Share2 size={18} color={Colors.textMain} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Locality Header */}
        <View style={styles.headerBlock}>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>
              PREMIUM CO-LIVING SPACE · {room.availableCount} BEDS LEFT
            </Text>
          </View>
          <Text style={styles.roomTitle}>{room.name}</Text>
          <View style={styles.addrRow}>
            <MapPin size={14} color={Colors.secondary} />
            <Text style={styles.addrText}>
              {room.property?.address}, {room.property?.city}
            </Text>
          </View>
        </View>

        {/* 4-Card Spec Grid */}
        <View style={styles.specGrid}>
          <View style={styles.specCard}>
            <Users size={16} color={Colors.primary} />
            <Text style={styles.specLabel}>Occupancy</Text>
            <Text style={styles.specVal}>{room.maxCapacity}+ Persons</Text>
          </View>
          <View style={styles.specCard}>
            <Maximize2 size={16} color={Colors.primary} />
            <Text style={styles.specLabel}>Area</Text>
            <Text style={styles.specVal}>{room.sizeSqFt} Sq.ft</Text>
          </View>
          <View style={styles.specCard}>
            <Snowflake size={16} color={Colors.primary} />
            <Text style={styles.specLabel}>Cooling</Text>
            <Text style={styles.specVal}>
              {room.hasAc ? "Split AC" : "Ventilated"}
            </Text>
          </View>
          <View style={styles.specCard}>
            <Bath size={16} color={Colors.primary} />
            <Text style={styles.specLabel}>Washroom</Text>
            <Text style={styles.specVal}>
              {room.bathroomType === "ATTACHED" ? "Attached" : "Shared"}
            </Text>
          </View>
        </View>

        {/* Photo Gallery */}
        <View style={styles.galleryWrap}>
          <Image
            source={{ uri: images[activePhoto] }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.photoCounter}>
            <Text style={styles.photoCounterText}>
              {activePhoto + 1} / {images.length}
            </Text>
          </View>
          {images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}
            >
              {images.map((uri, i) => (
                <TouchableOpacity key={uri + i} onPress={() => setActivePhoto(i)}>
                  <Image
                    source={{ uri }}
                    style={[
                      styles.thumb,
                      activePhoto === i && styles.thumbActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* About this space */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About this space</Text>
          <Text style={styles.bodyText}>
            {room.description || room.property?.description}
          </Text>
        </View>

        {/* Amenities */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What this room includes</Text>
          <View style={styles.amenitiesWrap}>
            {(room.amenities || ["Wi-Fi", "Housekeeping", "Power Backup"]).map(
              (a: string) => (
                <View key={a} style={styles.amenityPill}>
                  <Check size={12} color={Colors.secondary} />
                  <Text style={styles.amenityText}>{a}</Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* Reserve Your Stay Widget */}
        <View style={[styles.card, styles.reserveCard]}>
          <Text style={styles.reserveTitle}>Reserve Your Stay</Text>
          <Text style={styles.reserveSub}>Select your preferred duration</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.durRow}
          >
            {DURATIONS.filter((d) => availableDurations.includes(d)).map((d) => {
              const active = durationType === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.durBtn, active && styles.durBtnActive]}
                  onPress={() => {
                    setDurationType(d);
                    const nextPlan = (room.allRatePlans || []).find(
                      (rp: any) => rp.durationType === d
                    );
                    setDurationCount(Number(nextPlan?.minDuration || 1));
                    if (d !== "MONTHLY" && d !== "YEARLY") {
                      setIncludeFood(false);
                    }
                  }}
                >
                  <Text
                    style={[styles.durBtnText, active && { color: "#FFFFFF" }]}
                  >
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Check-in Date</Text>
              <View style={styles.inputBox}>
                <Calendar size={15} color={Colors.primary} />
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
            <View style={{ width: 115 }}>
              <Text style={styles.inputLabel}>
                {durationType === "HOURLY"
                  ? "Hours"
                  : durationType === "DAILY"
                  ? "Days"
                  : durationType === "WEEKLY"
                  ? "Weeks"
                  : durationType === "YEARLY"
                  ? "Years"
                  : "Months"}
              </Text>
              <View style={styles.counterBox}>
                <TouchableOpacity
                  style={styles.cntBtn}
                  onPress={() =>
                    setDurationCount((c) => Math.max(minDur, c - 1))
                  }
                >
                  <Text style={styles.cntBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.cntVal}>{durationCount}</Text>
                <TouchableOpacity
                  style={styles.cntBtn}
                  onPress={() =>
                    setDurationCount((c) => (maxDur ? Math.min(maxDur, c + 1) : c + 1))
                  }
                >
                  <Text style={styles.cntBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {durationType === "HOURLY" && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.inputLabel}>Start Time (24h HH:MM)</Text>
              <View style={styles.inputBox}>
                <Clock size={15} color={Colors.primary} />
                <TextInput
                  style={styles.input}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="10:00"
                />
              </View>
            </View>
          )}

          {/* Dining Plan Toggle (Monthly / Yearly when offered) */}
          {(durationType === "MONTHLY" || durationType === "YEARLY") &&
            Number(activeRatePlan?.foodMonthlyCharge || 0) > 0 && (
              <TouchableOpacity
                style={[
                  styles.diningToggle,
                  includeFood && styles.diningToggleActive,
                ]}
                onPress={() => setIncludeFood((v) => !v)}
              >
                <Utensils size={16} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.diningTitle}>Daily 3-Meal Dining Plan</Text>
                  <Text style={styles.diningSub}>
                    +₹{Number(activeRatePlan.foodMonthlyCharge).toLocaleString("en-IN")}
                    /mo (Breakfast, Lunch & Dinner)
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkSquare,
                    includeFood && { backgroundColor: Colors.primary },
                  ]}
                >
                  {includeFood && <Check size={13} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            )}

          {calculating ? (
            <View style={styles.calcLoadingBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.calcLoadingText}>
                Calculating exact rate & dates...
              </Text>
            </View>
          ) : calcError ? (
            <View style={styles.calcErrorBox}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <AlertCircle size={15} color={Colors.accentRed} />
                <Text style={styles.calcError}>{calcError}</Text>
              </View>
              <TouchableOpacity
                style={styles.retrySmallBtn}
                onPress={recalculatePricing}
              >
                <RotateCcw size={12} color="#FFFFFF" />
                <Text style={styles.retrySmallText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : breakdown ? (
            <View style={styles.breakdownBox}>
              {breakdown.checkOutDate ? (
                <View style={styles.lineItem}>
                  <Text style={styles.lineLabel}>Check-out Date</Text>
                  <Text style={styles.lineVal}>{breakdown.checkOutDate}</Text>
                </View>
              ) : null}
              {breakdown.monthEndAdjustmentNote ? (
                <Text style={styles.policyHint}>
                  {breakdown.monthEndAdjustmentNote}
                </Text>
              ) : null}
              <View style={styles.lineItem}>
                <Text style={styles.lineLabel}>
                  Base Tariff
                  {breakdown.unitPrice
                    ? ` (₹${Number(breakdown.unitPrice).toLocaleString("en-IN")} × ${
                        breakdown.durationCount || durationCount
                      })`
                    : ""}
                </Text>
                <Text style={styles.lineVal}>
                  ₹{Number(breakdown.baseAmount).toLocaleString("en-IN")}
                </Text>
              </View>
              {Number(breakdown.foodCharge ?? breakdown.foodAmount ?? 0) > 0 && (
                <View style={styles.lineItem}>
                  <Text style={styles.lineLabel}>Dining Plan</Text>
                  <Text style={styles.lineVal}>
                    ₹
                    {Number(
                      breakdown.foodCharge ?? breakdown.foodAmount ?? 0
                    ).toLocaleString("en-IN")}
                  </Text>
                </View>
              )}
              <View style={styles.lineItem}>
                <Text style={styles.lineLabel}>
                  GST & Taxes ({breakdown.gstRatePercent ?? 12}%)
                </Text>
                <Text style={styles.lineVal}>
                  ₹{Number(breakdown.taxes).toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.lineItem}>
                <Text style={[styles.lineLabel, { color: Colors.secondary }]}>
                  100% Refundable Deposit
                </Text>
                <Text style={[styles.lineVal, { color: Colors.secondary }]}>
                  ₹{Number(breakdown.depositAmount).toLocaleString("en-IN")}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Payable Now</Text>
                  {breakdown.balanceRemaining > 0 && (
                    <Text style={styles.scheduleHint}>
                      + {breakdown.schedule?.length || 11} monthly installments
                    </Text>
                  )}
                </View>
                <Text style={styles.totalVal}>
                  ₹{Number(breakdown.payableNow).toLocaleString("en-IN")}
                </Text>
              </View>

              <Text style={styles.policyHint}>
                Electricity: {activeRatePlan?.electricityRule || "Included in rent"} · Zero brokerage · Deposit refunded within 5 business days of checkout inspection.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.bookCta,
              (bookingBusy || calculating || Boolean(calcError) || !breakdown || isSoldOut) && {
                opacity: 0.55,
              },
            ]}
            onPress={handleProceedToBook}
            disabled={bookingBusy || calculating || Boolean(calcError) || !breakdown || isSoldOut}
          >
            {bookingBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : isSoldOut ? (
              <Text style={styles.bookCtaText}>Sold Out — No Beds Available</Text>
            ) : (
              <>
                <Text style={styles.bookCtaText}>Proceed to Book</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
          <View style={styles.secureNote}>
            <ShieldCheck size={14} color={Colors.secondary} />
            <Text style={styles.secureNoteText}>
              Locks bed for 15 minutes · Secure Razorpay Checkout
            </Text>
          </View>
        </View>

        {/* Questions / Schedule Walkthrough */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Have questions about this stay?</Text>
          <Text style={styles.bodyText}>
            Connect with the Stayzy operations desk or schedule an in-person
            walkthrough visit.
          </Text>
          <View style={styles.visitBtnRow}>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => setVisitOpen(true)}
            >
              <Calendar size={15} color={Colors.primary} />
              <Text style={styles.outlineBtnText}>Schedule Visit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() =>
                Alert.alert("Stayzy Concierge", "Operations Desk: +91 98765 00001")
              }
            >
              <Phone size={15} color={Colors.primary} />
              <Text style={styles.outlineBtnText}>Call Desk</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* House Rules & Timings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>House Rules & Check-in Timings</Text>
          <View style={styles.timingRow}>
            <View style={styles.timingBox}>
              <Text style={styles.timingLabel}>Standard Check-in</Text>
              <Text style={styles.timingVal}>
                {room.property?.checkInTime || "12:00 PM"}
              </Text>
            </View>
            <View style={styles.timingBox}>
              <Text style={styles.timingLabel}>Standard Check-out</Text>
              <Text style={styles.timingVal}>
                {room.property?.checkOutTime || "11:00 AM"}
              </Text>
            </View>
          </View>
          {room.property?.rules && (
            <Text style={[styles.bodyText, { marginTop: 10 }]}>
              {room.property.rules}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Walkthrough Visit Modal */}
      <Modal visible={visitOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Schedule Walkthrough Visit</Text>
              <TouchableOpacity onPress={() => setVisitOpen(false)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={visitName}
              onChangeText={setVisitName}
              placeholder="Aarav Sharma"
            />
            <Text style={styles.inputLabel}>10-Digit Mobile Phone</Text>
            <TextInput
              style={styles.modalInput}
              value={visitPhone}
              onChangeText={setVisitPhone}
              placeholder="9876543210"
              keyboardType="phone-pad"
            />
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.modalInput}
              value={visitEmail}
              onChangeText={setVisitEmail}
              placeholder="aarav@example.com"
              autoCapitalize="none"
            />
            <Text style={styles.inputLabel}>Preferred Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={visitDate}
              onChangeText={setVisitDate}
            />

            <Text style={styles.inputLabel}>Time Slot</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 6 }}
            >
              {VISIT_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.durBtn,
                    visitSlot === slot && styles.durBtnActive,
                  ]}
                  onPress={() => setVisitSlot(slot)}
                >
                  <Text
                    style={[
                      styles.durBtnText,
                      visitSlot === slot && { color: "#FFFFFF" },
                    ]}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.bookCta}
              onPress={handleScheduleVisit}
              disabled={visitBusy}
            >
              {visitBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.bookCtaText}>Confirm Tour Slot</Text>
              )}
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
  },
  safeArea: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.cardWarm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topBreadcrumb: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textMain,
  },
  scrollContent: { padding: 16, paddingBottom: 50 },
  headerBlock: { marginBottom: 14 },
  premiumBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  premiumBadgeText: { fontSize: 10, fontWeight: "800", color: Colors.primary },
  roomTitle: { fontSize: 24, fontWeight: "900", color: Colors.textMain },
  addrRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  addrText: { fontSize: 13, color: Colors.textMuted, flex: 1 },
  specGrid: { flexDirection: "row", gap: 8, marginBottom: 14 },
  specCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  specLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  specVal: { fontSize: 11, fontWeight: "800", color: Colors.textMain, marginTop: 2 },
  galleryWrap: { marginBottom: 14, position: "relative" },
  heroImage: { width: "100%", height: 220, borderRadius: 20 },
  photoCounter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(13,43,34,0.78)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCounterText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  thumbRow: { gap: 8, marginTop: 8 },
  thumb: { width: 64, height: 48, borderRadius: 10, opacity: 0.7 },
  thumbActive: { opacity: 1, borderWidth: 2, borderColor: Colors.secondary },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    ...Shadows.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textMain,
    marginBottom: 8,
  },
  bodyText: { fontSize: 13, color: Colors.textSub, lineHeight: 20 },
  amenitiesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  amenityText: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  reserveCard: { borderColor: Colors.primaryBorder, borderWidth: 1.5 },
  reserveTitle: { fontSize: 18, fontWeight: "900", color: Colors.textMain },
  reserveSub: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  durRow: { gap: 8, marginBottom: 14 },
  durBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  durBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  durBtnText: { fontSize: 12, fontWeight: "800", color: Colors.textMain },
  formRow: { flexDirection: "row", gap: 10 },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSub,
    marginBottom: 5,
    marginTop: 4,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
  },
  input: { flex: 1, fontSize: 13, color: Colors.textMain },
  counterBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 8,
  },
  cntBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cntBtnText: { fontSize: 16, fontWeight: "800", color: Colors.primary },
  cntVal: { fontSize: 14, fontWeight: "800", color: Colors.textMain },
  diningToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  diningToggleActive: { borderColor: Colors.secondary, borderWidth: 1.5 },
  diningTitle: { fontSize: 13, fontWeight: "800", color: Colors.textMain },
  diningSub: { fontSize: 11, color: Colors.textMuted },
  checkSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  calcLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 10,
  },
  calcLoadingText: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  calcErrorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.accentRedLight,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    gap: 8,
  },
  calcError: { flex: 1, color: Colors.accentRed, fontSize: 12, fontWeight: "700" },
  retrySmallBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retrySmallText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  policyHint: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: 4,
  },
  breakdownBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 8,
  },
  lineItem: { flexDirection: "row", justifyContent: "space-between" },
  lineLabel: { fontSize: 13, color: Colors.textSub },
  lineVal: { fontSize: 13, fontWeight: "700", color: Colors.textMain },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: { fontSize: 15, fontWeight: "800", color: Colors.textMain },
  scheduleHint: { fontSize: 11, color: Colors.secondary, fontWeight: "700" },
  totalVal: { fontSize: 22, fontWeight: "900", color: Colors.primary },
  bookCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 14,
    marginTop: 14,
  },
  bookCtaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  secureNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  secureNoteText: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },
  visitBtnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  outlineBtnText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  timingRow: { flexDirection: "row", gap: 10 },
  timingBox: {
    flex: 1,
    backgroundColor: Colors.cardWarm,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timingLabel: { fontSize: 11, color: Colors.textMuted },
  timingVal: { fontSize: 14, fontWeight: "800", color: Colors.textMain, marginTop: 2 },
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
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: Colors.textMain },
  modalInput: {
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textMain,
    marginBottom: 6,
  },
});
