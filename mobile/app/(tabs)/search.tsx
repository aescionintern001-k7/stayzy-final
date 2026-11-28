import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { CatalogApi, DurationType } from "../../src/services/api";
import { Colors } from "../../src/theme/colors";
import { RoomCardMobile } from "../../src/components/RoomCardMobile";
import { Search, SlidersHorizontal, Globe, RotateCcw, AlertCircle } from "lucide-react-native";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DURATIONS: DurationType[] = [
  "HOURLY",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
];

export default function SearchScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"ROOMS" | "CITIES">("ROOMS");
  const [query, setQuery] = useState("");
  const [durationType, setDurationType] = useState<DurationType>("MONTHLY");
  const [hasAc, setHasAc] = useState(false);
  const [foodIncluded, setFoodIncluded] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">(
    "newest"
  );
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cities state
  const [selectedLetter, setSelectedLetter] = useState<string>("B");
  const [cities, setCities] = useState<any[]>([]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    durationType !== "MONTHLY" ||
    hasAc ||
    foodIncluded ||
    availableOnly ||
    sortBy !== "newest";

  const handleClearFilters = () => {
    setQuery("");
    setDurationType("MONTHLY");
    setHasAc(false);
    setFoodIncluded(false);
    setAvailableOnly(false);
    setSortBy("newest");
  };

  const fetchRooms = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await CatalogApi.listRooms(
          {
            search: query.trim() || undefined,
            durationType,
            hasAc: hasAc ? true : undefined,
            foodIncluded: foodIncluded ? true : undefined,
            availableOnly: availableOnly ? true : undefined,
            sortBy,
          },
          { signal }
        );
        setRooms(res.rooms || []);
      } catch (err: any) {
        if (err?.status === 499 || err?.details?.isCancelled) return;
        setRooms([]);
        setErrorMsg(
          err?.message || "Unable to load stays. Please check your connection."
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [query, durationType, hasAc, foodIncluded, availableOnly, sortBy]
  );

  const fetchCities = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await CatalogApi.listCities(
          {
            letter: query.trim() ? undefined : selectedLetter,
            q: query.trim() || undefined,
          },
          { signal }
        );
        setCities(res.cities || []);
      } catch (err: any) {
        if (err?.status === 499 || err?.details?.isCancelled) return;
        setCities([]);
        setErrorMsg(
          err?.message || "Unable to load cities. Please check your connection."
        );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [selectedLetter, query]
  );

  useEffect(() => {
    const controller = new AbortController();
    const delay = query.trim().length > 0 ? 250 : 0;
    const timer = setTimeout(() => {
      if (mode === "ROOMS") {
        fetchRooms(controller.signal);
      } else {
        fetchCities(controller.signal);
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mode, query, fetchRooms, fetchCities]);

  return (
    <View style={styles.container}>
      {/* Mode Switcher */}
      <View style={styles.modeBar}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "ROOMS" && styles.modeBtnActive]}
          onPress={() => setMode("ROOMS")}
        >
          <SlidersHorizontal
            size={14}
            color={mode === "ROOMS" ? "#FFFFFF" : Colors.primary}
          />
          <Text
            style={[styles.modeBtnText, mode === "ROOMS" && { color: "#FFFFFF" }]}
          >
            Search Stays
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "CITIES" && styles.modeBtnActive]}
          onPress={() => setMode("CITIES")}
        >
          <Globe
            size={14}
            color={mode === "CITIES" ? "#FFFFFF" : Colors.primary}
          />
          <Text
            style={[
              styles.modeBtnText,
              mode === "CITIES" && { color: "#FFFFFF" },
            ]}
          >
            300+ Cities A–Z
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Search size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={
            mode === "ROOMS"
              ? "Search room, Koramangala, Indiranagar..."
              : "Search any city or state..."
          }
          placeholderTextColor={Colors.textLight}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </View>

      {mode === "ROOMS" ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.filterChip,
                  durationType === d && styles.filterChipActive,
                ]}
                onPress={() => setDurationType(d)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    durationType === d && { color: "#FFFFFF" },
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              style={[styles.filterChip, hasAc && styles.filterChipActive]}
              onPress={() => setHasAc((v) => !v)}
            >
              <Text
                style={[styles.filterChipText, hasAc && { color: "#FFFFFF" }]}
              >
                AC Only
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                foodIncluded && styles.filterChipActive,
              ]}
              onPress={() => setFoodIncluded((v) => !v)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  foodIncluded && { color: "#FFFFFF" },
                ]}
              >
                Meals Included
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                availableOnly && styles.filterChipActive,
              ]}
              onPress={() => setAvailableOnly((v) => !v)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  availableOnly && { color: "#FFFFFF" },
                ]}
              >
                Available Now
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                sortBy === "price_asc" && styles.filterChipActive,
              ]}
              onPress={() =>
                setSortBy((s) => (s === "price_asc" ? "price_desc" : "price_asc"))
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  sortBy === "price_asc" && { color: "#FFFFFF" },
                ]}
              >
                Price {sortBy === "price_asc" ? "↑" : "↓"}
              </Text>
            </TouchableOpacity>
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.clearChip}
                onPress={handleClearFilters}
              >
                <RotateCcw size={12} color={Colors.primary} />
                <Text style={styles.clearChipText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            {loading ? (
              <ActivityIndicator
                size="large"
                color={Colors.primary}
                style={{ marginTop: 40 }}
              />
            ) : errorMsg ? (
              <View style={styles.errorCard}>
                <AlertCircle size={24} color={Colors.accentRed} />
                <Text style={styles.errorTitle}>Could not load stays</Text>
                <Text style={styles.errorSub}>{errorMsg}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRooms()}>
                  <RotateCcw size={14} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : rooms.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  No rooms found matching these filters.
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    style={styles.clearEmptyBtn}
                    onPress={handleClearFilters}
                  >
                    <Text style={styles.clearEmptyBtnText}>Clear Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              rooms.map((room) => (
                <RoomCardMobile
                  key={room.id}
                  room={room}
                  selectedDuration={durationType}
                  onPress={() =>
                    router.push({
                      pathname: "/room/[id]",
                      params: { id: room.slug || room.id, duration: durationType },
                    })
                  }
                />
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.letterBar}
          >
            {LETTERS.map((l) => (
              <TouchableOpacity
                key={l}
                style={[
                  styles.letterBtn,
                  selectedLetter === l && styles.letterBtnActive,
                ]}
                onPress={() => setSelectedLetter(l)}
              >
                <Text
                  style={[
                    styles.letterText,
                    selectedLetter === l && { color: "#FFFFFF" },
                  ]}
                >
                  {l}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              cities.map((c, idx) => (
                <TouchableOpacity
                  key={`${c.name}-${idx}`}
                  style={styles.cityRow}
                  disabled={c.isComingSoon}
                  onPress={() => {
                    setMode("ROOMS");
                    setQuery(c.name);
                  }}
                >
                  <View>
                    <Text style={styles.cityRowName}>{c.name}</Text>
                    <Text style={styles.cityRowSub}>
                      {c.region ? `${c.region}, ` : ""}
                      {c.country}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.cityStatusPill,
                      c.isComingSoon && { backgroundColor: Colors.cardWarm },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cityStatusText,
                        c.isComingSoon && { color: Colors.textMuted },
                      ]}
                    >
                      {c.propertyCount > 0
                        ? `${c.propertyCount} Live Stays`
                        : "Coming Soon"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  modeBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  modeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeBtnText: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textMain },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 5 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  filterChipText: { fontSize: 12, fontWeight: "700", color: Colors.textSub },
  clearChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  clearChipText: { fontSize: 12, fontWeight: "800", color: Colors.primary },
  emptyWrap: { alignItems: "center", marginTop: 40, gap: 12 },
  emptyText: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: 14,
  },
  clearEmptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  clearEmptyBtnText: { fontSize: 13, fontWeight: "800", color: Colors.primary },
  errorCard: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    marginTop: 24,
    gap: 8,
  },
  errorTitle: { fontSize: 15, fontWeight: "800", color: Colors.textMain },
  errorSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 6,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  retryBtnText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  letterBar: { paddingHorizontal: 16, gap: 6, paddingVertical: 8 },
  letterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  letterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  letterText: { fontSize: 13, fontWeight: "800", color: Colors.textMain },
  cityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  cityRowName: { fontSize: 15, fontWeight: "800", color: Colors.textMain },
  cityRowSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cityStatusPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  cityStatusText: { fontSize: 11, fontWeight: "800", color: Colors.primary },
});
