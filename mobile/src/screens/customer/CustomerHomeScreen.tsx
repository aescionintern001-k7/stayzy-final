import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { CatalogApi, DurationType } from "../../services/api";
import { Colors, Shadows } from "../../theme/colors";
import { RoomCardMobile } from "../../components/RoomCardMobile";
import { WhatsAppFAB } from "../../components/WhatsAppFAB";
import {
  Search,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
} from "lucide-react-native";

const CITY_CARDS = [
  { name: "Bengaluru", hubs: "42+ Hubs", active: true },
  { name: "Chennai", hubs: "28+ Hubs", active: false },
  { name: "Hyderabad", hubs: "31+ Hubs", active: false },
  { name: "Pune", hubs: "24+ Hubs", active: false },
  { name: "Mumbai", hubs: "36+ Hubs", active: false },
  { name: "Delhi NCR", hubs: "39+ Hubs", active: false },
  { name: "Coimbatore", hubs: "18+ Hubs", active: false },
];

const DURATIONS: { key: DurationType; label: string }[] = [
  { key: "HOURLY", label: "Hourly" },
  { key: "DAILY", label: "Daily" },
  { key: "WEEKLY", label: "Weekly" },
  { key: "MONTHLY", label: "Monthly" },
  { key: "YEARLY", label: "Yearly" },
];

const CORRIDORS = [
  "All Bengaluru",
  "Koramangala",
  "HSR Layout",
  "Indiranagar",
  "Whitefield",
];

const CATEGORIES = [
  { key: "ALL", label: "All Stays" },
  { key: "PRIVATE", label: "Private" },
  { key: "TWIN_SHARING", label: "2-Sharing" },
  { key: "TRIPLE_SHARING", label: "3-Sharing" },
  { key: "STUDIO", label: "Studio" },
];

export function CustomerHomeScreen() {
  const router = useRouter();
  const [selectedDuration, setSelectedDuration] =
    useState<DurationType>("MONTHLY");
  const [selectedCorridor, setSelectedCorridor] = useState("All Bengaluru");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [rooms, setRooms] = useState<any[]>([]);
  const [heroContent, setHeroContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [roomsRes, cmsRes] = await Promise.all([
        CatalogApi.listRooms({
          city: "Bengaluru",
          durationType: selectedDuration,
          locality:
            selectedCorridor !== "All Bengaluru" ? selectedCorridor : undefined,
          category: selectedCategory !== "ALL" ? selectedCategory : undefined,
        }),
        CatalogApi.getContent().catch(() => ({ content: {} as Record<string, any> })),
      ]);
      setRooms(roomsRes.rooms || []);
      if (cmsRes.content?.hero_content) {
        setHeroContent(cmsRes.content.hero_content);
      }
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDuration, selectedCorridor, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
        {/* Luxury Dark Green Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Sparkles size={12} color={Colors.primary} />
            <Text style={styles.heroBadgeText}>LUXURY CO-LIVING · BENGALURU</Text>
          </View>
          <Text style={styles.heroTitle}>
            {heroContent?.title ||
              "Modern Co-Living & Stays, Designed for Effortless Living"}
          </Text>
          <Text style={styles.heroSub}>
            {heroContent?.subtitle ||
              "Hourly, Daily, Weekly, Monthly & Yearly verified rooms with 100% refundable deposits."}
          </Text>

          <TouchableOpacity
            style={styles.searchPill}
            onPress={() => router.push("/(tabs)/search")}
            activeOpacity={0.88}
          >
            <Search size={18} color={Colors.primary} />
            <Text style={styles.searchPillText}>
              Search Koramangala, HSR, Indiranagar...
            </Text>
            <View style={styles.searchPillGo}>
              <Text style={styles.searchPillGoText}>Filter</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* City Selection Cards (Bengaluru Active, Others Coming Soon) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Your City</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/search")}>
            <Text style={styles.sectionLink}>300+ Cities →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.citiesRow}
        >
          {CITY_CARDS.map((city) => (
            <View
              key={city.name}
              style={[
                styles.cityCard,
                city.active ? styles.cityCardActive : styles.cityCardDisabled,
              ]}
            >
              {!city.active && (
                <View style={styles.comingSoonBadge}>
                  <Clock size={9} color={Colors.primary} />
                  <Text style={styles.comingSoonText}>COMING SOON</Text>
                </View>
              )}
              <View style={[styles.cityIconBox, !city.active && { opacity: 0.45 }]}>
                <Building2
                  size={22}
                  color={city.active ? Colors.primary : Colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.cityName,
                  city.active && { color: Colors.primary },
                  !city.active && { opacity: 0.5 },
                ]}
              >
                {city.name}
              </Text>
              <Text
                style={[
                  styles.cityHubs,
                  !city.active && { opacity: 0.45 },
                ]}
              >
                {city.hubs}
              </Text>
              {city.active && <View style={styles.activeIndicatorBar} />}
            </View>
          ))}
        </ScrollView>

        {/* Corridor Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CORRIDORS.map((loc) => {
            const active = selectedCorridor === loc;
            return (
              <TouchableOpacity
                key={loc}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCorridor(loc)}
              >
                <MapPin
                  size={12}
                  color={active ? "#FFFFFF" : Colors.primary}
                />
                <Text
                  style={[styles.chipText, active && { color: "#FFFFFF" }]}
                >
                  {loc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Duration Selector */}
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 12 }]}>
          Flexible Stay Plans
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {DURATIONS.map((d) => {
            const active = selectedDuration === d.key;
            return (
              <TouchableOpacity
                key={d.key}
                style={[styles.durationTab, active && styles.durationTabActive]}
                onPress={() => setSelectedDuration(d.key)}
              >
                <Text
                  style={[
                    styles.durationTabText,
                    active && { color: "#FFFFFF" },
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((c) => {
            const active = selectedCategory === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.catPill, active && styles.catPillActive]}
                onPress={() => setSelectedCategory(c.key)}
              >
                <Text
                  style={[
                    styles.catPillText,
                    active && { color: Colors.primary, fontWeight: "800" },
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Live Rooms List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Verified Stays ({rooms.length})
          </Text>
          <View style={styles.verifiedTag}>
            <ShieldCheck size={13} color={Colors.secondary} />
            <Text style={styles.verifiedTagText}>Live Postgres</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={{ marginVertical: 40 }}
            />
          ) : rooms.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No rooms match this filter</Text>
              <Text style={styles.emptySub}>
                Try switching corridor or stay duration to see available rooms.
              </Text>
            </View>
          ) : (
            rooms.map((room) => (
              <RoomCardMobile
                key={room.id}
                room={room}
                selectedDuration={selectedDuration}
                onPress={() =>
                  router.push({
                    pathname: "/room/[id]",
                    params: { id: room.slug || room.id, duration: selectedDuration },
                  })
                }
              />
            ))
          )}
        </View>

        {/* Explore Stayzy across 300+ cities Banner (Bengaluru Only Active) */}
        <View style={styles.exploreBanner}>
          <Text style={styles.exploreTitle}>
            Explore Stayzy across <Text style={{ color: "#34D399" }}>300+</Text>{" "}
            cities
          </Text>
          <Text style={styles.exploreSub}>
            Discover curated PGs, co-living studios, and corporate suites.
          </Text>
          <View style={styles.exploreBtnRow}>
            <TouchableOpacity
              style={styles.exploreCityBtn}
              onPress={() => router.push("/(tabs)/search")}
            >
              <Text style={styles.exploreCityBtnText}>Bengaluru</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <WhatsAppFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  heroCard: {
    margin: 16,
    padding: 20,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    ...Shadows.floating,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 12,
  },
  heroBadgeText: { fontSize: 10, fontWeight: "800", color: Colors.primary },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 28,
  },
  heroSub: {
    fontSize: 13,
    color: "#D1FAE5",
    marginTop: 8,
    lineHeight: 19,
  },
  searchPill: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchPillText: { flex: 1, fontSize: 13, color: Colors.textMuted },
  searchPillGo: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  searchPillGoText: { fontSize: 11, fontWeight: "800", color: Colors.primary },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: Colors.textMain },
  sectionLink: { fontSize: 12, fontWeight: "800", color: Colors.secondary },
  citiesRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 6 },
  cityCard: {
    width: 118,
    height: 120,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    position: "relative",
    ...Shadows.card,
  },
  cityCardActive: {
    borderColor: Colors.secondary,
    borderWidth: 1.8,
  },
  cityCardDisabled: {
    opacity: 0.72,
    backgroundColor: Colors.cardWarm,
  },
  comingSoonBadge: {
    position: "absolute",
    top: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  comingSoonText: { fontSize: 8, fontWeight: "800", color: Colors.primary },
  cityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    marginTop: 6,
  },
  cityName: { fontSize: 13, fontWeight: "800", color: Colors.textMain },
  cityHubs: { fontSize: 11, color: Colors.secondary, fontWeight: "700", marginTop: 2 },
  activeIndicatorBar: {
    position: "absolute",
    bottom: 0,
    width: "65%",
    height: 3.5,
    backgroundColor: Colors.secondary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  chipsRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: "700", color: Colors.textMain },
  durationTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  durationTabActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  durationTabText: { fontSize: 12, fontWeight: "800", color: Colors.textSub },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catPillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.secondary,
  },
  catPillText: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  verifiedTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  verifiedTagText: { fontSize: 11, fontWeight: "700", color: Colors.secondary },
  emptyCard: {
    backgroundColor: Colors.card,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: Colors.textMain },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  exploreBanner: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  exploreTitle: { fontSize: 19, fontWeight: "900", color: "#FFFFFF" },
  exploreSub: { fontSize: 12, color: "#D1FAE5", marginTop: 4 },
  exploreBtnRow: { flexDirection: "row", marginTop: 14 },
  exploreCityBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  exploreCityBtnText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
});
