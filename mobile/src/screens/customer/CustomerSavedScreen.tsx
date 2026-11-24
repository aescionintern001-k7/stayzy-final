import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRole } from "../../context/RoleContext";
import { ROOMS_DATA } from "../../data/roomsData";
import { RoomCardMobile } from "../../components/RoomCardMobile";
import { Colors } from "../../theme/colors";
import { Heart, Compass } from "lucide-react-native";

export const CustomerSavedScreen: React.FC<{ onNavigateExplore?: () => void }> = ({
  onNavigateExplore,
}) => {
  const { favorites } = useRole();
  const savedRooms = ROOMS_DATA.filter((r) => favorites.includes(r.id));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Heart size={20} color={Colors.accentRed} fill={Colors.accentRed} />
          <Text style={styles.title}>Saved Accommodations</Text>
        </View>
        <Text style={styles.subtitle}>
          Your shortlisted PGs and co-living studios ({savedRooms.length})
        </Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {savedRooms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Heart size={44} color={Colors.border} />
            <Text style={styles.emptyTitle}>No Saved Stays Yet</Text>
            <Text style={styles.emptyText}>
              Tap the heart icon on any accommodation card to quickly save it for later comparison.
            </Text>
            {onNavigateExplore && (
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={onNavigateExplore}
                activeOpacity={0.8}
              >
                <Compass size={16} color="#ffffff" />
                <Text style={styles.exploreBtnText}>Explore Stays</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          savedRooms.map((room) => (
            <RoomCardMobile
              key={room.id}
              room={room}
              selectedDuration="MONTHLY"
              onPress={() => {}}
              onBook={() => {}}
              onScheduleVisit={() => {}}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.textMain,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  emptyContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textMain,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 18,
  },
  exploreBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.forest,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  exploreBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
});
