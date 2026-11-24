import React from "react";
import { TouchableOpacity, StyleSheet, Linking, Alert } from "react-native";
import { MessageCircle } from "lucide-react-native";
import { Colors, Shadows } from "../theme/colors";

interface WhatsAppFABProps {
  phone?: string;
  message?: string;
}

export const WhatsAppFAB: React.FC<WhatsAppFABProps> = ({
  phone = "919876543210",
  message = "Hello Stayzy Support, I need assistance with PG & Co-Living booking.",
}) => {
  const handlePress = async () => {
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    const webUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      Alert.alert("WhatsApp Support", "Connecting to Stayzy 24/7 Helpline: +91 80 4567 8900");
    }
  };

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityLabel="Contact Support on WhatsApp"
    >
      <MessageCircle size={28} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.whatsapp,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    ...Shadows.floating,
  },
});
