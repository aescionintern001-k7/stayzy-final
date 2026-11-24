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
import { useRole, UserRole } from "../src/context/RoleContext";
import { Colors, Shadows } from "../src/theme/colors";
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Home,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react-native";

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithRole, loginAsGuest } = useRole();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStandardLogin = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      router.replace("/");
    } else {
      setErrorMessage(result.error || "Login failed. Please check your credentials.");
    }
  };

  const handleInstantPersonaLogin = async (role: UserRole) => {
    setErrorMessage(null);
    setLoading(true);
    await loginWithRole(role);
    setLoading(false);
    router.replace("/");
  };

  const handleGuestExplore = async () => {
    setErrorMessage(null);
    await loginAsGuest();
    router.replace("/");
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
          <Text style={styles.brandTagline}>Unified PG & Flexible Co-Living Platform</Text>
        </View>

        {/* Login Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>
            Sign in to access your Stayzy workspace.
          </Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color={Colors.accentRed} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* 1-Click Instant Persona Sign-In */}
          <View style={styles.demoSection}>
            <Text style={styles.demoSectionLabel}>1-Click Instant Persona Sign-In</Text>
            <View style={styles.demoButtonsRow}>
              <TouchableOpacity
                style={[styles.demoCard, { borderColor: Colors.forest }]}
                onPress={() => handleInstantPersonaLogin("CUSTOMER")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <User size={16} color={Colors.forest} />
                <View>
                  <Text style={[styles.demoRoleName, { color: Colors.forest }]}>
                    Resident
                  </Text>
                  <Text style={styles.demoRoleSub}>Aarav Sharma</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoCard, { borderColor: Colors.roleOwner }]}
                onPress={() => handleInstantPersonaLogin("OWNER")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Home size={16} color={Colors.roleOwner} />
                <View>
                  <Text style={[styles.demoRoleName, { color: Colors.roleOwner }]}>
                    PG Host
                  </Text>
                  <Text style={styles.demoRoleSub}>Rajesh Sharma</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoCard, { borderColor: Colors.roleAdmin }]}
                onPress={() => handleInstantPersonaLogin("ADMIN")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <ShieldCheck size={16} color={Colors.roleAdmin} />
                <View>
                  <Text style={[styles.demoRoleName, { color: Colors.roleAdmin }]}>
                    Lead Admin
                  </Text>
                  <Text style={styles.demoRoleSub}>Vikramaditya</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Input */}
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

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
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

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleStandardLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.signInButtonText}>Sign In to Stayzy</Text>
                <ArrowRight size={16} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>

          {/* Create Account Link */}
          <View style={styles.footerLinkRow}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text style={styles.footerLink}> Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={handleGuestExplore}
        >
          <Text style={styles.skipBtnText}>Explore Accommodations as Guest</Text>
        </TouchableOpacity>
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
  demoSection: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  demoSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.forest,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  demoButtonsRow: {
    gap: 6,
  },
  demoCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  demoRoleName: {
    fontSize: 12,
    fontWeight: "800",
  },
  demoRoleSub: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginHorizontal: 10,
    fontWeight: "600",
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
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.forest,
    borderRadius: 6,
    height: 42,
    gap: 8,
    marginTop: 6,
    marginBottom: 14,
  },
  signInButtonText: {
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
  skipBtn: {
    alignItems: "center",
    marginTop: 16,
  },
  skipBtnText: {
    fontSize: 12,
    color: Colors.forest,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
