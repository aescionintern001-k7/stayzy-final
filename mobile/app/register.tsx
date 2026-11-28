import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRole } from "../src/context/RoleContext";
import { Colors, Shadows } from "../src/theme/colors";
import {
  Leaf,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Home,
} from "lucide-react-native";

export default function RegisterScreen() {
  const router = useRouter();
  const { registerUser } = useRole();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<"guest" | "host">("guest");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);

    if (name.trim().length < 2) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await registerUser(
      name.trim(),
      email.trim(),
      phone.trim(),
      password,
      accountType
    );
    setLoading(false);

    if (result.success) {
      router.replace("/(tabs)");
    } else {
      setErrorMessage(result.error || "Registration failed. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Leaf size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>
              Stay<Text style={styles.brandAccent}>zy</Text>
            </Text>
            <Text style={styles.brandTagline}>Create your Stayzy Account</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Join Stayzy</Text>
            <Text style={styles.formSubtitle}>
              Book verified co-living rooms or list your property with Stayzy.
            </Text>

            {errorMessage && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={Colors.accentRed} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <Text style={styles.label}>Account Type</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleChip,
                  accountType === "guest" && styles.roleChipActive,
                ]}
                onPress={() => setAccountType("guest")}
              >
                <User
                  size={16}
                  color={accountType === "guest" ? "#FFFFFF" : Colors.primary}
                />
                <Text
                  style={[
                    styles.roleChipText,
                    accountType === "guest" && { color: "#FFFFFF" },
                  ]}
                >
                  Resident
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleChip,
                  accountType === "host" && styles.roleChipActive,
                ]}
                onPress={() => setAccountType("host")}
              >
                <Home
                  size={16}
                  color={accountType === "host" ? "#FFFFFF" : Colors.primary}
                />
                <Text
                  style={[
                    styles.roleChipText,
                    accountType === "host" && { color: "#FFFFFF" },
                  ]}
                >
                  PG Host / Owner
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Full Legal Name</Text>
            <View style={styles.inputWrap}>
              <User size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Aarav Sharma"
                placeholderTextColor={Colors.textLight}
                value={name}
                onChangeText={setName}
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrap}>
              <Mail size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="aarav@example.com"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.label}>Mobile Phone (Optional)</Text>
            <View style={styles.inputWrap}>
              <Phone size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor={Colors.textLight}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <Text style={styles.label}>Password (min 8 characters)</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Create strong password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                {showPassword ? (
                  <EyeOff size={18} color={Colors.textMuted} />
                ) : (
                  <Eye size={18} color={Colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Repeat password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerMuted}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 40 },
  brandContainer: { alignItems: "center", marginBottom: 18, marginTop: 8 },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    ...Shadows.card,
  },
  brandTitle: { fontSize: 28, fontWeight: "900", color: Colors.textMain },
  brandAccent: { color: Colors.secondary },
  brandTagline: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  formTitle: { fontSize: 20, fontWeight: "800", color: Colors.textMain },
  formSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accentRedLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, color: Colors.accentRed, flex: 1, fontWeight: "600" },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSub,
    marginBottom: 6,
    marginTop: 10,
  },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  roleChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryLight,
  },
  roleChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleChipText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  input: { flex: 1, fontSize: 14, color: Colors.textMain },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 14,
    marginTop: 20,
    ...Shadows.card,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  footerMuted: { fontSize: 13, color: Colors.textMuted },
  footerLink: { fontSize: 13, fontWeight: "800", color: Colors.secondary },
});
