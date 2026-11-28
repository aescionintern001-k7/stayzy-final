import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Shadows } from "../theme/colors";
import { DurationType } from "../services/api";
import { useRole } from "../context/RoleContext";
import {
  MapPin,
  Heart,
  Wifi,
  Snowflake,
  Utensils,
  Users,
  ArrowRight,
  Star,
} from "lucide-react-native";

export interface RoomCardProps {
  room: any;
  selectedDuration: DurationType;
  onPress: () => void;
  onBook?: () => void;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80";

export const RoomCardMobile: React.FC<RoomCardProps> = ({
  room,
  selectedDuration,
  onPress,
  onBook,
}) => {
  const { isFavorite, toggleFavorite } = useRole();
  const [imgIdx] = useState(0);
  const fav = isFavorite(room.id);

  const images: string[] =
    Array.isArray(room.images) && room.images.length > 0
      ? room.images
      : room.property?.coverImage
      ? [room.property.coverImage]
      : [FALLBACK_IMAGE];

  const matchedPlan =
    (room.allRatePlans || []).find(
      (rp: any) => rp.durationType === selectedDuration
    ) || room.currentRatePlan;

  const displayAmount = matchedPlan
    ? Number(matchedPlan.price).toLocaleString("en-IN")
    : "—";

  const unitLabel =
    selectedDuration === "HOURLY"
      ? "/ hr"
      : selectedDuration === "DAILY"
      ? "/ day"
      : selectedDuration === "WEEKLY"
      ? "/ wk"
      : selectedDuration === "YEARLY"
      ? "/ yr"
      : "/ mo";

  const avail = Number(room.availableCount ?? room.available_count ?? 0);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={styles.imageBox}>
        <Image
          source={{ uri: images[imgIdx] || FALLBACK_IMAGE }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.topRow}>
          <View style={styles.localityPill}>
            <MapPin size={11} color="#FFFFFF" />
            <Text style={styles.localityText} numberOfLines={1}>
              {room.displayLocality || room.property?.city || "Bengaluru"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => toggleFavorite(room.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Heart
              size={16}
              color={fav ? Colors.accentRed : "#FFFFFF"}
              fill={fav ? Colors.accentRed : "none"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomBadges}>
          <View
            style={[
              styles.availPill,
              avail === 0 && { backgroundColor: "rgba(220,38,38,0.9)" },
            ]}
          >
            <Text style={styles.availText}>
              {avail > 0 ? `${avail} Beds Available` : "Sold Out"}
            </Text>
          </View>
          <View style={styles.genderPill}>
            <Text style={styles.genderText}>
              {room.genderEligibility === "FEMALE"
                ? "Women Only"
                : room.genderEligibility === "MALE"
                ? "Men Only"
                : "Co-Living"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {room.name}
          </Text>
          {room.property?.averageRating > 0 && (
            <View style={styles.ratingBox}>
              <Star size={12} color={Colors.starGold} fill={Colors.starGold} />
              <Text style={styles.ratingText}>
                {Number(room.property.averageRating).toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.propName} numberOfLines={1}>
          {room.property?.title || room.property?.name || "Stayzy Residence"}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Users size={12} color={Colors.primary} />
            <Text style={styles.metaText}>{room.maxCapacity || 2} Guests</Text>
          </View>
          {room.hasAc && (
            <View style={styles.metaChip}>
              <Snowflake size={12} color={Colors.primary} />
              <Text style={styles.metaText}>Split AC</Text>
            </View>
          )}
          {room.foodIncluded && (
            <View style={styles.metaChip}>
              <Utensils size={12} color={Colors.primary} />
              <Text style={styles.metaText}>Meals</Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Wifi size={12} color={Colors.primary} />
            <Text style={styles.metaText}>Wi-Fi</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View>
            <Text style={styles.priceLabel}>
              {selectedDuration.charAt(0) +
                selectedDuration.slice(1).toLowerCase()}{" "}
              Tariff
            </Text>
            <View style={styles.priceLine}>
              <Text style={styles.priceValue}>₹{displayAmount}</Text>
              <Text style={styles.priceUnit}>{unitLabel}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.bookBtn}
            onPress={onBook || onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.bookBtnText}>Reserve</Text>
            <ArrowRight size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    marginBottom: 16,
    ...Shadows.card,
  },
  imageBox: { height: 190, position: "relative", backgroundColor: Colors.cardWarm },
  image: { width: "100%", height: "100%" },
  topRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  localityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(6,75,53,0.88)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    maxWidth: "75%",
  },
  localityText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  heartBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(13,43,34,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBadges: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    gap: 8,
  },
  availPill: {
    backgroundColor: "rgba(7,150,95,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  genderPill: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genderText: { color: Colors.textMain, fontSize: 11, fontWeight: "700" },
  body: { padding: 16 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: Colors.textMain },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.starGoldLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  ratingText: { fontSize: 11, fontWeight: "800", color: "#92400E" },
  propName: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  metaText: { fontSize: 11, fontWeight: "700", color: Colors.primary },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  priceLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },
  priceLine: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  priceValue: { fontSize: 20, fontWeight: "900", color: Colors.primary },
  priceUnit: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  bookBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});
