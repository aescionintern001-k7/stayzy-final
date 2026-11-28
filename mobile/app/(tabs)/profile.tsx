import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useRole } from "../../src/context/RoleContext";
import { UsersApi, CatalogApi } from "../../src/services/api";
import { Colors, Shadows } from "../../src/theme/colors";
import { User, Lock, LogOut, HelpCircle, Save } from "lucide-react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, refreshProfile } = useRole();

  const [fullName, setFullName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [saving, setSaving] = useState(false);

  const [currPw, setCurrPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [faqs, setFaqs] = useState<any[]>([]);

  useEffect(() => {
    setFullName(user.name);
    setPhone(user.phone);
  }, [user]);

  useEffect(() => {
    CatalogApi.getContent()
      .then((res) => setFaqs(res.content?.faq_content || []))
      .catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await UsersApi.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      });
      await refreshProfile();
      Alert.alert("Saved", "Profile updated.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currPw || newPw.length < 8) {
      Alert.alert("Check Password", "New password must be at least 8 characters.");
      return;
    }
    try {
      await UsersApi.changePassword({
        current_password: currPw,
        new_password: newPw,
      });
      setCurrPw("");
      setNewPw("");
      Alert.alert("Updated", "Your password has been changed.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Incorrect current password");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <User size={28} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email || "Browsing as Guest"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user.backendRole.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {isAuthenticated ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account Details</Text>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
            />
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Save size={15} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Save Profile</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Lock size={16} color={Colors.primary} />
              <Text style={styles.cardTitle}>Change Password</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              secureTextEntry
              value={currPw}
              onChangeText={setCurrPw}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password (8+ chars)"
              secureTextEntry
              value={newPw}
              onChangeText={setNewPw}
            />
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={handlePasswordChange}
            >
              <Text style={styles.outlineBtnText}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In to Sync Your Account</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.primaryBtnText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      {faqs.length > 0 && (
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <HelpCircle size={16} color={Colors.primary} />
            <Text style={styles.cardTitle}>Help & FAQs</Text>
          </View>
          {faqs.map((item, idx) => (
            <View key={idx} style={styles.faqItem}>
              <Text style={styles.faqQ}>{item.question}</Text>
              <Text style={styles.faqA}>{item.answer}</Text>
            </View>
          ))}
        </View>
      )}

      {isAuthenticated && (
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          <LogOut size={16} color={Colors.accentRed} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 20,
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 18, fontWeight: "900", color: "#FFFFFF" },
  email: { fontSize: 12, color: "#D1FAE5", marginTop: 2 },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  roleText: { fontSize: 10, fontWeight: "800", color: "#FFFFFF" },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
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
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSub,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    height: 46,
    borderRadius: 12,
    marginTop: 6,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  outlineBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  outlineBtnText: { color: Colors.primary, fontSize: 13, fontWeight: "800" },
  faqItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  faqQ: { fontSize: 13, fontWeight: "800", color: Colors.textMain },
  faqA: { fontSize: 12, color: Colors.textMuted, marginTop: 3, lineHeight: 18 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.accentRedLight,
  },
  logoutText: { color: Colors.accentRed, fontSize: 14, fontWeight: "800" },
});
