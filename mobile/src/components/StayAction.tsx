import React from "react";
import { Pressable, Text } from "react-native";
import {
  ArrowRight,
  Heart,
  CalendarDays,
  Settings2,
  Check,
  MinusCircle,
  CalendarPlus,
  MessageSquare,
  Building2,
} from "lucide-react-native";
const icons = {
  "Save PG": Heart,
  "Remove from saved": Heart,
  "Select dates": CalendarDays,
  "Approve listing": Check,
  "Manage rate and beds": Settings2,
  "Request visit": CalendarPlus,
  "Contact support": MessageSquare,
  "Submit for approval": Building2,
  "Cancel reservation": MinusCircle,
};
export function StayAction({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) {
  const Icon = icons[title as keyof typeof icons] || ArrowRight;
  const primary = /reserve|submit|approve|publish/i.test(title);
  const color = primary ? "#fff" : "#27272b";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: primary ? "#b31838" : "#dedcdd",
        backgroundColor: primary ? "#b31838" : pressed ? "#edebec" : "#fff",
        opacity: disabled ? 0.55 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
      })}
    >
      <Icon size={18} color={color} strokeWidth={1.7} />
      <Text style={{ color, fontWeight: "600" }}>{title}</Text>
    </Pressable>
  );
}
