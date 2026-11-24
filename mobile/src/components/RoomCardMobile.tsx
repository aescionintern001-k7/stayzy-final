import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Share } from "react-native";
import { Colors, Shadows } from "../theme/colors";
import {
  Wifi,
  Shield,
  MapPin,
  Heart,
  Calendar,
  Sparkles,
  ArrowRight,
  Star,
  Users,
} from "lucide-react-native";
import { DetailedRoomData } from "../data/roomsData";
import { useRole } from "../context/RoleContext";

interface RoomCardMobileProps {
  room: DetailedRoomData;
  selectedDuration: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";
  onPress: () => void;
  onBook: () => void;
  onScheduleVisit: () => void;
}

export const RoomCardMobile: React.FC<RoomCardMobileProps> = ({
  room,
  selectedDuration,
  onPress,
  onBook,
  onScheduleVisit,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { isFavorite, toggleFavorite } = useRole();
  const favorite = isFavorite(room.id);

  const images = room.images && room.images.length > 0
    ? room.images
    : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"];

  const currentImage = images[activeImageIndex] || images[0];

  // Calculate price based on selected duration
  const getDisplayPrice = () => {
    switch (selectedDuration) {
      case "HOURLY":
        return { amount: `₹${room.rates.hourly}`, unit: "/ hour" };
      case "DAILY":
        return { amount: `₹${room.rates.daily}`, unit: "/ day" };
      case "WEEKLY":
        return { amount: `₹${room.rates.weekly.toLocaleString("en-IN")}`, unit: "/ week" };
      case "MONTHLY":
      default:
        return { amount: `₹${room.rates.monthly.toLocaleString("en-IN")}`, unit: "/ month" };
    }
  };

  const priceInfo = getDisplayPrice();

  return (
    <View style={styles.cardContainer}>
      {/* Top Image Banner with Floating Badges */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: currentImage }} style={styles.coverImage} resizeMode="cover" />

        {/* Floating Locality & Gender Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.localityBadge}>
            <MapPin size={11} color="#ffffff" />
            <Text style={styles.localityText}>{room.displayLocality}</Text>
          </View>
          <View
            style={[
              styles.genderBadge,
              room.genderEligibility === "FEMALE" && { backgroundColor: "#BE185D" },
              room.genderEligibility === "MALE" && { backgroundColor: "#1D4ED8" },
            ]}
          >
            <Text style={styles.genderText}>
              {room.genderEligibility === "COLIVING"
                ? "Co-Living"
                : room.genderEligibility === "FEMALE"
                ? "Female Only"
                : "Male Only"}
            </Text>
          </View>
        </View>

        {/* Favorite Heart Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(room.id)}
          activeOpacity={0.8}
        >
          <Heart
            size={16}
            color={favorite ? Colors.accentRed : "#ffffff"}
            fill={favorite ? Colors.accentRed : "none"}
          />
        </TouchableOpacity>

        {/* Multi-Image Pagination Dots */}
        {images.length > 1 && (
          <View style={styles.paginationDots}>
            {images.map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setActiveImageIndex(idx)}
                style={[
                  styles.dot,
                  idx === activeImageIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Card Content Body */}
      <TouchableOpacity
        style={styles.contentBody}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {/* Rating & Availability */}
        <View style={styles.topMetaRow}>
          <View style={styles.ratingBadge}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>{room.rating.toFixed(2)}</Text>
            <Text style={styles.reviewsText}>({room.reviewCount})</Text>
          </View>

          <View style={styles.availableBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.availableText}>{room.availableCount} beds available</Text>
          </View>
        </View>

        {/* Title & Property Name */}
        <Text style={styles.roomTitle} numberOfLines={1}>
          {room.name}
        </Text>
        <Text style={styles.propertyName} numberOfLines={1}>
          {room.propertyName}
        </Text>

        {/* Key Amenities Strip */}
        <View style={styles.amenitiesRow}>
          {room.keyAmenities.slice(0, 3).map((amenity, idx) => (
            <View key={idx} style={styles.amenityChip}>
              <Text style={styles.amenityText} numberOfLines={1}>
                ✓ {amenity}
              </Text>
            </View>
          ))}
        </View>

        {/* Price & Action Row */}
        <View style={styles.footerRow}>
          <View>
            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>{priceInfo.amount}</Text>
              <Text style={styles.priceUnit}> {priceInfo.unit}</Text>
            </View>
            <Text style={styles.depositHint}>
              Deposit: ₹{room.rates.depositAmount.toLocaleString("en-IN")} • No lock-in
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.visitButton}
              onPress={onScheduleVisit}
              activeOpacity={0.8}
            >
              <Calendar size={13} color={Colors.forest} />
              <Text style={styles.visitButtonText}>Tour</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bookButton}
              onPress={onBook}
              activeOpacity={0.8}
            >
              <Text style={styles.bookButtonText}>Reserve</Text>
              <ArrowRight size={13} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    overflow: "hidden",
    ...Shadows.card,
  },
  imageWrapper: {
    height: 180,
    width: "100%",
    position: "relative",
    backgroundColor: "#e2e8f0",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  badgeRow: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    gap: 6,
  },
  localityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 61, 43, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  localityText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  genderBadge: {
    backgroundColor: "rgba(18, 61, 43, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  genderText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  favoriteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  paginationDots: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "#ffffff",
    width: 14,
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  contentBody: {
    padding: 14,
  },
  topMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMain,
  },
  reviewsText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#059669",
  },
  availableText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textMain,
    marginBottom: 2,
  },
  propertyName: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500",
    marginBottom: 10,
  },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  amenityChip: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amenityText: {
    fontSize: 10,
    color: Colors.textSub,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primary,
  },
  priceUnit: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  depositHint: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  visitButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  visitButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMain,
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    gap: 4,
  },
  bookButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
  },
});
