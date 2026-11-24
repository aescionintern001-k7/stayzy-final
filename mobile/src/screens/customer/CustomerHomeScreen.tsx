import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../components/Header";
import { RoomCardMobile } from "../../components/RoomCardMobile";
import { WhatsAppFAB } from "../../components/WhatsAppFAB";
import { Colors, Shadows } from "../../theme/colors";
import { ROOMS_DATA, DetailedRoomData } from "../../data/roomsData";
import { useRole } from "../../context/RoleContext";
import { createBooking, scheduleTourVisit } from "../../services/stayzyFirebase";
import {
  Home,
  Building,
  MapPin,
  Search,
  ChevronRight,
  Headphones,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X,
  Clock,
  Calendar,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

export const CustomerHomeScreen: React.FC = () => {
  const router = useRouter();
  const { user, setRole } = useRole();
  const [selectedCity, setSelectedCity] = useState("Bengaluru");
  const [localityQuery, setLocalityQuery] = useState("");
  const [propertyType, setPropertyType] = useState<"PG" | "FLAT">("PG");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDuration, setSelectedDuration] = useState<
    "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY"
  >("MONTHLY");

  // Booking Modal State
  const [selectedBookingRoom, setSelectedBookingRoom] =
    useState<DetailedRoomData | null>(null);
  const [bookingSuccessVisible, setBookingSuccessVisible] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Schedule Visit Modal State
  const [selectedVisitRoom, setSelectedVisitRoom] =
    useState<DetailedRoomData | null>(null);
  const [visitSlot, setVisitSlot] = useState("11:00 AM - 12:00 PM");
  const [visitSuccess, setVisitSuccess] = useState(false);
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);

  // Filtered rooms
  const filteredRooms = ROOMS_DATA.filter((room) => {
    // City / Locality filter
    if (localityQuery.trim()) {
      const match =
        room.address.toLowerCase().includes(localityQuery.toLowerCase()) ||
        room.name.toLowerCase().includes(localityQuery.toLowerCase()) ||
        room.propertyName.toLowerCase().includes(localityQuery.toLowerCase());
      if (!match) return false;
    }

    // Gender / Category quick filter
    if (selectedCategory === "BOYS" && room.genderEligibility !== "MALE") {
      return false;
    }
    if (selectedCategory === "GIRLS" && room.genderEligibility !== "FEMALE") {
      return false;
    }
    if (selectedCategory === "COLIVING" && room.genderEligibility !== "COLIVING") {
      return false;
    }

    return true;
  });

  const handleBookNow = (room: DetailedRoomData) => {
    setSelectedBookingRoom(room);
  };

  const handleConfirmBooking = async () => {
    if (!selectedBookingRoom) return;
    setIsSubmittingBooking(true);
    const ref = "STAY-" + Math.floor(100000 + Math.random() * 900000);
    const rent =
      selectedDuration === "HOURLY"
        ? selectedBookingRoom.rates.hourly
        : selectedDuration === "DAILY"
        ? selectedBookingRoom.rates.daily
        : selectedDuration === "WEEKLY"
        ? selectedBookingRoom.rates.weekly
        : selectedBookingRoom.rates.monthly;

    try {
      await createBooking({
        bookingId: ref,
        roomId: selectedBookingRoom.id,
        roomName: selectedBookingRoom.name,
        propertyName: selectedBookingRoom.propertyName,
        locality: selectedBookingRoom.displayLocality,
        durationPlan: selectedDuration,
        rentAmount: rent,
        depositAmount: selectedBookingRoom.rates.depositAmount,
        totalAmount: rent + selectedBookingRoom.rates.depositAmount,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
      });
    } catch (e) {
      console.log("Booking error:", e);
    } finally {
      setIsSubmittingBooking(false);
      setBookingRef(ref);
      setSelectedBookingRoom(null);
      setBookingSuccessVisible(true);
    }
  };

  const handleScheduleVisit = (room: DetailedRoomData) => {
    setSelectedVisitRoom(room);
  };

  const handleConfirmVisit = async () => {
    if (!selectedVisitRoom) return;
    setIsSubmittingVisit(true);
    const ref = "VISIT-" + Math.floor(10000 + Math.random() * 90000);

    try {
      await scheduleTourVisit({
        visitId: ref,
        roomId: selectedVisitRoom.id,
        propertyName: selectedVisitRoom.propertyName,
        address: selectedVisitRoom.address,
        timeSlot: visitSlot,
        userId: user.id,
        userName: user.name,
        userPhone: user.phone,
      });
    } catch (e) {
      console.log("Visit schedule error:", e);
    } finally {
      setIsSubmittingVisit(false);
      setSelectedVisitRoom(null);
      setVisitSuccess(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Professional Header */}
      <Header
        selectedCity={selectedCity}
        onSelectCity={(city) => setSelectedCity(city)}
        onSearchPress={() => {}}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. HERO SECTION (Orange Gradient + Elevated Search Card) */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Find your perfect stay</Text>

          {/* Elevated White Search Card */}
          <View style={styles.searchCard}>
            {/* PG vs Flat Toggle */}
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.typeToggleTab,
                  propertyType === "PG" && styles.typeToggleTabActive,
                ]}
                onPress={() => setPropertyType("PG")}
                activeOpacity={0.8}
              >
                <Home
                  size={16}
                  color={propertyType === "PG" ? "#FFFFFF" : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeToggleText,
                    propertyType === "PG" && styles.typeToggleTextActive,
                  ]}
                >
                  PG
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeToggleTab,
                  propertyType === "FLAT" && styles.typeToggleTabActive,
                ]}
                onPress={() => setPropertyType("FLAT")}
                activeOpacity={0.8}
              >
                <Building
                  size={16}
                  color={propertyType === "FLAT" ? "#FFFFFF" : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeToggleText,
                    propertyType === "FLAT" && styles.typeToggleTextActive,
                  ]}
                >
                  Flat
                </Text>
              </TouchableOpacity>
            </View>

            {/* City & Locality Input Field */}
            <View style={styles.locationInputBox}>
              <View style={styles.cityPill}>
                <MapPin size={14} color={Colors.primary} />
                <Text style={styles.cityName}>{selectedCity}</Text>
              </View>
              <TextInput
                style={styles.localityInput}
                placeholder={`Locality in ${selectedCity}...`}
                placeholderTextColor="#94A3B8"
                value={localityQuery}
                onChangeText={setLocalityQuery}
              />
            </View>

            {/* Big Orange Search Button */}
            <TouchableOpacity
              style={styles.searchButton}
              activeOpacity={0.85}
              onPress={() => {}}
            >
              <Search size={18} color="#FFFFFF" />
              <Text style={styles.searchButtonText}>
                {propertyType === "PG" ? "Search PGs" : "Search Flats"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. OWNER CALLOUT BANNER (Royal Blue Card) */}
        <View style={styles.ownerBannerWrapper}>
          <TouchableOpacity
            style={styles.ownerBanner}
            activeOpacity={0.9}
            onPress={() => {
              setRole("OWNER");
              Alert.alert(
                "Host Console Active",
                "Switched to PG Host Rajesh Sharma. View occupancy tracker and tenant visits!"
              );
            }}
          >
            <View style={styles.ownerIconCircle}>
              <Home size={22} color="#2563EB" />
            </View>
            <View style={styles.ownerTextCol}>
              <Text style={styles.ownerHeading}>Own a PG or flat?</Text>
              <Text style={styles.ownerSubheading}>
                Login to list & manage your property leads
              </Text>
            </View>
            <View style={styles.ownerArrowCircle}>
              <ChevronRight size={18} color="#2563EB" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. CATEGORY CARDS (Boys, Girls, Co-Living with Real Images) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          {selectedCategory !== "ALL" && (
            <TouchableOpacity onPress={() => setSelectedCategory("ALL")}>
              <Text style={styles.resetFilterText}>Clear Filter</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {/* Card 1: PG For Boys */}
          <TouchableOpacity
            style={[
              styles.categoryImageCard,
              selectedCategory === "BOYS" && styles.categoryCardActive,
            ]}
            onPress={() =>
              setSelectedCategory(selectedCategory === "BOYS" ? "ALL" : "BOYS")
            }
            activeOpacity={0.85}
          >
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80",
              }}
              style={styles.categoryImage}
            />
            <View style={styles.categoryOverlay}>
              <View style={styles.categoryLabelRow}>
                <View style={styles.categoryArrowBadge}>
                  <ArrowRight size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.categoryLabelText}>PG For Boys</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 2: PG For Girls */}
          <TouchableOpacity
            style={[
              styles.categoryImageCard,
              selectedCategory === "GIRLS" && styles.categoryCardActive,
            ]}
            onPress={() =>
              setSelectedCategory(selectedCategory === "GIRLS" ? "ALL" : "GIRLS")
            }
            activeOpacity={0.85}
          >
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=600&q=80",
              }}
              style={styles.categoryImage}
            />
            <View style={styles.categoryOverlay}>
              <View style={styles.categoryLabelRow}>
                <View style={styles.categoryArrowBadge}>
                  <ArrowRight size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.categoryLabelText}>PG For Girls</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 3: PG For Co-Living */}
          <TouchableOpacity
            style={[
              styles.categoryImageCard,
              selectedCategory === "COLIVING" && styles.categoryCardActive,
            ]}
            onPress={() =>
              setSelectedCategory(
                selectedCategory === "COLIVING" ? "ALL" : "COLIVING"
              )
            }
            activeOpacity={0.85}
          >
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80",
              }}
              style={styles.categoryImage}
            />
            <View style={styles.categoryOverlay}>
              <View style={styles.categoryLabelRow}>
                <View style={styles.categoryArrowBadge}>
                  <ArrowRight size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.categoryLabelText}>PG For Co-Living</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* 4. 24/7 SUPPORT CARD */}
        <View style={styles.supportCardWrapper}>
          <View style={styles.supportCard}>
            <View style={styles.supportIconBox}>
              <Headphones size={22} color={Colors.primary} />
            </View>
            <View style={styles.supportTextBox}>
              <Text style={styles.supportHeader}>24/7 SUPPORT</Text>
              <Text style={styles.supportBody}>
                Our dedicated support team is always available to help you find
                the best PG or flat that fits your needs and budget.
              </Text>
            </View>
          </View>
          {/* Pagination Dots */}
          <View style={styles.dotsRow}>
            <View style={styles.dotInactive} />
            <View style={styles.dotActive} />
            <View style={styles.dotInactive} />
          </View>
        </View>

        {/* 5. ROOM CATALOG (Find PGs Based on your need) */}
        <View style={styles.catalogHeader}>
          <Text style={styles.catalogHeading}>Find PGs Based on your need</Text>
          <Text style={styles.catalogSub}>
            {filteredRooms.length} verified spaces available in {selectedCity}
          </Text>
        </View>

        {/* Duration Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.durationPillsScroll}
        >
          {(
            [
              { key: "HOURLY", label: "Hourly", sub: "₹99/hr" },
              { key: "DAILY", label: "Daily", sub: "₹750/day" },
              { key: "WEEKLY", label: "Weekly", sub: "₹4,500/wk" },
              { key: "MONTHLY", label: "Monthly", sub: "₹14,500/mo" },
            ] as const
          ).map((item) => {
            const active = selectedDuration === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.durationPill, active && styles.durationPillActive]}
                onPress={() => setSelectedDuration(item.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.durationPillLabel,
                    active && styles.durationPillLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.durationPillSub,
                    active && styles.durationPillSubActive,
                  ]}
                >
                  {item.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Room Cards List */}
        <View style={styles.roomsList}>
          {filteredRooms.map((room) => (
            <RoomCardMobile
              key={room.id}
              room={room}
              selectedDuration={selectedDuration}
              onPress={() => router.push(`/room/${room.id}`)}
              onBook={() => handleBookNow(room)}
              onScheduleVisit={() => handleScheduleVisit(room)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button for WhatsApp Support */}
      <WhatsAppFAB />

      {/* 6. BOOKING CHECKOUT MODAL */}
      <Modal
        visible={!!selectedBookingRoom}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBookingRoom(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Booking Checkout</Text>
              <TouchableOpacity onPress={() => setSelectedBookingRoom(null)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedBookingRoom && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.bookingRoomName}>
                  {selectedBookingRoom.name}
                </Text>
                <Text style={styles.bookingPropName}>
                  {selectedBookingRoom.propertyName}
                </Text>

                <View style={styles.priceBreakdownBox}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Duration Plan:</Text>
                    <Text style={styles.breakdownVal}>{selectedDuration}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Rent Charge:</Text>
                    <Text style={styles.breakdownVal}>
                      ₹
                      {(
                        selectedDuration === "HOURLY"
                          ? selectedBookingRoom.rates.hourly
                          : selectedDuration === "DAILY"
                          ? selectedBookingRoom.rates.daily
                          : selectedDuration === "WEEKLY"
                          ? selectedBookingRoom.rates.weekly
                          : selectedBookingRoom.rates.monthly
                      )?.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Security Deposit (Refundable):
                    </Text>
                    <Text style={styles.breakdownVal}>
                      ₹{selectedBookingRoom.rates.depositAmount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Platform Fee & GST:</Text>
                    <Text style={styles.breakdownVal}>₹0 (Free Demo)</Text>
                  </View>
                  <View style={styles.breakdownDivider} />
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownTotalLabel}>Total Payable:</Text>
                    <Text style={styles.breakdownTotalVal}>
                      ₹
                      {(
                        (selectedDuration === "HOURLY"
                          ? selectedBookingRoom.rates.hourly
                          : selectedDuration === "DAILY"
                          ? selectedBookingRoom.rates.daily
                          : selectedDuration === "WEEKLY"
                          ? selectedBookingRoom.rates.weekly
                          : selectedBookingRoom.rates.monthly) +
                        selectedBookingRoom.rates.depositAmount
                      ).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.confirmPayBtn, isSubmittingBooking && { opacity: 0.7 }]}
                  onPress={handleConfirmBooking}
                  disabled={isSubmittingBooking}
                  activeOpacity={0.85}
                >
                  <Sparkles size={18} color="#FFFFFF" />
                  <Text style={styles.confirmPayBtnText}>
                    {isSubmittingBooking ? "Confirming with Firebase..." : "Confirm Instant Booking"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 7. BOOKING SUCCESS MODAL */}
      <Modal
        visible={bookingSuccessVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBookingSuccessVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <CheckCircle2 size={36} color="#16A34A" />
            </View>
            <Text style={styles.successHeading}>Booking Confirmed!</Text>
            <Text style={styles.successSub}>
              Reference ID: <Text style={styles.boldText}>{bookingRef}</Text>
            </Text>
            <View style={styles.stayPassPreview}>
              <Text style={styles.passTitle}>Your Resident Pass Is Active:</Text>
              <Text style={styles.passDetail}>
                🔑 Keyless Door PIN:{" "}
                <Text style={styles.codeText}>8921#</Text>
              </Text>
              <Text style={styles.passDetail}>
                📶 300 Mbps Wi-Fi:{" "}
                <Text style={styles.codeText}>stayzy@koramangala</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewStaysBtn}
              onPress={() => {
                setBookingSuccessVisible(false);
                router.push("/stays");
              }}
            >
              <Text style={styles.viewStaysBtnText}>View in My Stay Pass</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 8. SCHEDULE VISIT MODAL */}
      <Modal
        visible={!!selectedVisitRoom}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedVisitRoom(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Schedule Property Walkthrough</Text>
              <TouchableOpacity onPress={() => setSelectedVisitRoom(null)}>
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedVisitRoom && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.bookingRoomName}>
                  {selectedVisitRoom.propertyName}
                </Text>
                <Text style={styles.bookingPropName}>
                  {selectedVisitRoom.address}
                </Text>

                <Text style={styles.slotHeading}>Select Visit Time Window:</Text>
                {[
                  "10:00 AM - 11:00 AM",
                  "11:00 AM - 12:00 PM",
                  "03:00 PM - 04:00 PM",
                  "05:00 PM - 06:00 PM",
                ].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.slotOption,
                      visitSlot === s && styles.slotOptionSelected,
                    ]}
                    onPress={() => setVisitSlot(s)}
                  >
                    <Clock
                      size={16}
                      color={visitSlot === s ? Colors.primary : Colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.slotText,
                        visitSlot === s && styles.slotTextSelected,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.confirmPayBtn, isSubmittingVisit && { opacity: 0.7 }]}
                  onPress={handleConfirmVisit}
                  disabled={isSubmittingVisit}
                  activeOpacity={0.85}
                >
                  <Calendar size={18} color="#FFFFFF" />
                  <Text style={styles.confirmPayBtnText}>
                    {isSubmittingVisit ? "Scheduling Tour..." : "Schedule Free Visit"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 9. VISIT SUCCESS MODAL */}
      <Modal
        visible={visitSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setVisitSuccess(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <CheckCircle2 size={36} color="#16A34A" />
            </View>
            <Text style={styles.successHeading}>Walkthrough Tour Scheduled!</Text>
            <Text style={styles.successSub}>
              Host Rajesh Sharma has been notified. We will send directions &
              gate entry OTP to your phone.
            </Text>
            <TouchableOpacity
              style={styles.viewStaysBtn}
              onPress={() => setVisitSuccess(false)}
            >
              <Text style={styles.viewStaysBtnText}>Awesome, Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 90,
  },
  heroSection: {
    backgroundColor: Colors.primary,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    ...Shadows.card,
  },
  typeToggleRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  typeToggleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  typeToggleTabActive: {
    backgroundColor: Colors.primary,
    ...Shadows.card,
  },
  typeToggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  typeToggleTextActive: {
    color: "#FFFFFF",
  },
  locationInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 14,
  },
  cityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    marginRight: 10,
  },
  cityName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMain,
  },
  localityInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMain,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 10,
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  ownerBannerWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  ownerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 16,
    padding: 14,
    ...Shadows.card,
  },
  ownerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  ownerTextCol: {
    flex: 1,
  },
  ownerHeading: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  ownerSubheading: {
    fontSize: 11,
    color: "#DBEAFE",
    marginTop: 2,
    fontWeight: "500",
  },
  ownerArrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textMain,
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryImageCard: {
    width: 140,
    height: 150,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  categoryCardActive: {
    borderWidth: 2.5,
    borderColor: Colors.primary,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  categoryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryArrowBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabelText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  supportCardWrapper: {
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 16,
  },
  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 16,
    padding: 14,
  },
  supportIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  supportTextBox: {
    flex: 1,
  },
  supportHeader: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  supportBody: {
    fontSize: 11,
    color: "#475569",
    marginTop: 2,
    lineHeight: 16,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  dotActive: {
    width: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#CBD5E1",
  },
  catalogHeader: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  catalogHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textMain,
  },
  catalogSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  durationPillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  durationPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  durationPillActive: {
    backgroundColor: "#FFF7ED",
    borderColor: Colors.primary,
  },
  durationPillLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMain,
  },
  durationPillLabelActive: {
    color: Colors.primary,
  },
  durationPillSub: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  durationPillSubActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  roomsList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textMain,
  },
  bookingRoomName: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textMain,
  },
  bookingPropName: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 14,
  },
  priceBreakdownBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMain,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 8,
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textMain,
  },
  breakdownTotalVal: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.primary,
  },
  confirmPayBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  confirmPayBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 24,
    marginBottom: "auto",
    marginTop: "auto",
    padding: 24,
    alignItems: "center",
  },
  successIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successHeading: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textMain,
  },
  successSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  boldText: {
    fontWeight: "800",
    color: Colors.textMain,
  },
  stayPassPreview: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 14,
    width: "100%",
    marginVertical: 16,
  },
  passTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#16A34A",
    marginBottom: 6,
  },
  passDetail: {
    fontSize: 12,
    color: Colors.textMain,
    marginVertical: 2,
  },
  codeText: {
    fontWeight: "800",
    color: Colors.primary,
  },
  viewStaysBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  viewStaysBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  slotHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMain,
    marginBottom: 10,
  },
  slotOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  slotOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#FFF7ED",
  },
  slotText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMain,
  },
  slotTextSelected: {
    color: Colors.primary,
    fontWeight: "800",
  },
});
