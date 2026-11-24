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
import { useRole } from "../src/context/RoleContext";
import { Colors, Shadows } from "../src/theme/colors";
import {
  Sparkles,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from "lucide-react-native";

export default function RegisterScreen() {
  const router = useRouter();
  const { registerUser } = useRole();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
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
      phone.trim() || "+91 98765 00000",
      password
    );
    setLoading(false);

    if (result.success) {
      router.replace("/");
    } else {
      setErrorMessage(result.error || "Registration failed. Try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Sparkles size={24} color="#ffffff" />
          </View>
          <Text style={styles.brandTitle}>
            Stay<Text style={styles.brandAccent}>zy</Text>
          </Text>
          <Text style={styles.brandTagline}>Create your Resident Account</Text>
        </View>

        {/* Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Join Stayzy Community</Text>
          <Text style={styles.formSubtitle}>
            Unlock flexible co-living with instant digital room key access.
          </Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color={Colors.accentRed} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputFieldWrapper}>
              <User size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                placeholder="e.g. Aarav Sharma"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                style={styles.textInput}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputFieldWrapper}>
              <Mail size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                placeholder="name@example.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.textInput}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mobile Phone</Text>
            <View style={styles.inputFieldWrapper}>
              <Phone size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                placeholder="+91 98765 43210"
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.textInput}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password (Min 6 chars)</Text>
            <View style={styles.inputFieldWrapper}>
              <Lock size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.textInput}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={16} color={Colors.textMuted} />
                ) : (
                  <Eye size={16} color={Colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputFieldWrapper}>
              <Lock size={16} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                style={styles.textInput}
              />
            </View>
          </View>

          {/* Security note */}
          <View style={styles.securityNote}>
            <ShieldCheck size={14} color={Colors.forest} />
            <Text style={styles.securityNoteText}>
              All resident registrations are automatically provisioned as CUSTOMER with zero admin privilege exposure.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.registerButtonText}>Create Stayzy Account</Text>
                <ArrowRight size={16} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>

          {/* Link to Login */}
          <View style={styles.footerLinkRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.footerLink}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 40,
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.forest,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: Colors.textMain,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: Colors.forest,
  },
  brandTagline: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    ...Shadows.card,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textMain,
  },
  formSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
    marginBottom: 16,
    lineHeight: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    borderRadius: 6,
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 11,
    color: Colors.accentRed,
    fontWeight: "600",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSub,
    marginBottom: 5,
  },
  inputFieldWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 42,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMain,
    fontWeight: "500",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primaryLight,
    padding: 8,
    borderRadius: 6,
    marginBottom: 14,
  },
  securityNoteText: {
    fontSize: 10,
    color: Colors.forest,
    fontWeight: "600",
    flex: 1,
    lineHeight: 14,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.forest,
    borderRadius: 6,
    height: 42,
    gap: 8,
    marginBottom: 14,
  },
  registerButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#ffffff",
  },
  footerLinkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  footerLink: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.forest,
  },
});
