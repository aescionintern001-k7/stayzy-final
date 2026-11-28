import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { CatalogApi, UsersApi } from "../../services/api";
import { useRole } from "../../context/RoleContext";
import { Colors } from "../../theme/colors";
import { RoomCardMobile } from "../../components/RoomCardMobile";
import { Heart, AlertCircle } from "lucide-react-native";

export function CustomerSavedScreen(_props: { onNavigateExplore?: () => void } = {}) {
  const router = useRouter();
  const { favorites, isAuthenticated } = useRole();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    setErrorMsg(null);
    try {
      if (isAuthenticated) {
        const res = await UsersApi.getFavorites();
        const normalized = (res.favorites || []).map((f: any) => ({
          id: f.room_type_id,
          slug: f.room?.slug,
          name: f.room?.name,
          images: f.room?.images || [],
          hasAc: f.room?.has_ac,
          foodIncluded: f.room?.food_included,
          genderEligibility: f.room?.gender_eligibility || "COLIVING",
          property: f.property,
          currentRatePlan: f.room?.starting_price
            ? { durationType: "MONTHLY", price: f.room.starting_price }
            : null,
          allRatePlans: f.room?.starting_price
            ? [{ durationType: "MONTHLY", price: f.room.starting_price }]
            : [],
          availableCount: 1,
        }));
        setRooms(normalized);
      } else {
        const res = await CatalogApi.listRooms({ durationType: "MONTHLY" });
        setRooms((res.rooms || []).filter((r: any) => favorites.includes(r.id)));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to load saved stays.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, favorites]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadFavorites();
          }}
          tintColor={Colors.primary}
        />
      }
    >
      <Text style={styles.title}>Saved Stays ({rooms.length})</Text>
      {errorMsg && (
        <View style={styles.errorBox}>
          <AlertCircle size={15} color={Colors.accentRed} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : rooms.length === 0 ? (
        <View style={styles.emptyBox}>
          <Heart size={32} color={Colors.primary} />
          <Text style={styles.emptyTitle}>No saved rooms yet</Text>
          <Text style={styles.emptySub}>
            Tap the heart icon on any Stayzy room to shortlist it here.
          </Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.ctaText}>Browse Bengaluru Stays</Text>
          </TouchableOpacity>
        </View>
      ) : (
        rooms.map((room) => (
          <RoomCardMobile
            key={room.id}
            room={room}
            selectedDuration="MONTHLY"
            onPress={() =>
              router.push({
                pathname: "/room/[id]",
                params: { id: room.slug || room.id, duration: "MONTHLY" },
              })
            }
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.textMain,
    marginBottom: 14,
  },
  emptyBox: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.textMain,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  cta: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
  },
  ctaText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accentRedLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: { fontSize: 12, color: Colors.accentRed, fontWeight: "700", flex: 1 },
});
