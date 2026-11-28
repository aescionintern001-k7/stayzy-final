import React, { useState, useEffect } from "react";
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
  Modal,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRole } from "../src/context/RoleContext";
import { auth } from "../src/config/firebase";
import { AuthApi } from "../src/services/api";
import { Colors, Shadows } from "../src/theme/colors";

WebBrowser.maybeCompleteAuthSession();
import {
  Leaf,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Compass,
  X,
} from "lucide-react-native";

interface GoogleOAuthButtonProps {
  disabled: boolean;
  googleLoading: boolean;
  setGoogleLoading: (v: boolean) => void;
  setErrorMessage: (v: string | null) => void;
  googleWebClientId: string;
  googleAndroidClientId: string;
  onSuccessToken: (firebaseIdToken: string) => Promise<void>;
}

function ConfiguredGoogleSignInButton({
  disabled,
  googleLoading,
  setGoogleLoading,
  setErrorMessage,
  googleWebClientId,
  googleAndroidClientId,
  onSuccessToken,
}: GoogleOAuthButtonProps) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: googleWebClientId || undefined,
    androidClientId: googleAndroidClientId || undefined,
    selectAccount: true,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === "cancel" || response.type === "dismiss") {
      setGoogleLoading(false);
      setErrorMessage("Google sign-in was cancelled.");
      return;
    }

    if (response.type === "error") {
      setGoogleLoading(false);
      setErrorMessage(
        response.error?.message || "Google sign-in failed. Please try again."
      );
      return;
    }

    if (response.type === "success") {
      const googleIdToken = response.params?.id_token;
      if (!googleIdToken) {
        setGoogleLoading(false);
        setErrorMessage("No Google ID token was returned. Please try again.");
        return;
      }

      (async () => {
        try {
          const credential = GoogleAuthProvider.credential(googleIdToken);
          const userCred = await signInWithCredential(auth, credential);
          const firebaseIdToken = await userCred.user.getIdToken();
          await onSuccessToken(firebaseIdToken);
        } catch (err: any) {
          const code = err?.code || "";
          if (code === "auth/operation-not-allowed") {
            setErrorMessage(
              "Google sign-in is not enabled in Firebase Console for stayzy-2e171."
            );
          } else {
            setErrorMessage(
              err?.message || "Unable to complete Google sign-in right now."
            );
          }
        } finally {
          setGoogleLoading(false);
        }
      })();
    }
  }, [response, onSuccessToken, setErrorMessage, setGoogleLoading]);

  const handlePress = async () => {
    if (disabled || googleLoading) return;
    setErrorMessage(null);
    if (!request) {
      setErrorMessage("Google Sign-In is still initializing. Please try again.");
      return;
    }
    setGoogleLoading(true);
    try {
      await promptAsync();
    } catch (err: any) {
      setGoogleLoading(false);
      setErrorMessage(err?.message || "Unable to open Google Sign-In.");
    }
  };

  return (
    <TouchableOpacity
      style={[styles.googleBtn, (disabled || googleLoading) && { opacity: 0.7 }]}
      onPress={handlePress}
      disabled={disabled || googleLoading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      {googleLoading ? (
        <ActivityIndicator color={Colors.textMain} />
      ) : (
        <>
          <View style={styles.googleBadge}>
            <Text style={styles.googleBadgeText}>G</Text>
          </View>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, googleLogin, loginAsGuest } = useRole();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";
  const isGoogleConfigured =
    Platform.OS === "android"
      ? Boolean(googleAndroidClientId)
      : Boolean(googleWebClientId);

  const handleGoogleToken = async (firebaseIdToken: string) => {
    const result = await googleLogin(firebaseIdToken);
    if (result.success) {
      router.replace("/(tabs)");
    } else {
      setErrorMessage(
        result.error || "Google authentication failed. Please try again."
      );
    }
  };

  // Forgot password modal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter your email/phone and password.");
      return;
    }

    setLoading(true);
    const result = await login(identifier.trim(), password);
    setLoading(false);

    if (result.success) {
      router.replace("/(tabs)");
    } else {
      setErrorMessage(
        result.error || "Sign in failed. Please verify your credentials."
      );
    }
  };

  const handleGoogleNotConfigured = () => {
    if (loading || googleLoading) return;
    setErrorMessage(
      "Google Sign-In requires EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID (and Web Client ID) for Firebase project stayzy-2e171."
    );
  };

  const handleGuestExplore = async () => {
    await loginAsGuest();
    router.replace("/(tabs)");
  };

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      setForgotStatus("Please enter a valid email address.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await AuthApi.forgotPassword(forgotEmail.trim());
      setForgotStatus(
        res.message ||
          "If an active account exists, reset instructions have been issued."
      );
    } catch (err: any) {
      setForgotStatus(err?.message || "Unable to submit request.");
    } finally {
      setForgotLoading(false);
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
          {/* Luxury Green & Ivory Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Leaf size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>
              Stay<Text style={styles.brandAccent}>zy</Text>
            </Text>
            <Text style={styles.brandTagline}>
              Luxury Co-Living & Flexible Stays
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Welcome back</Text>
            <Text style={styles.formSubtitle}>
              Sign in with your Stayzy account to reserve stays, manage visits, or
              access host & admin tools.
            </Text>

            {errorMessage && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={Colors.accentRed} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <Text style={styles.label}>Email Address or Phone Number</Text>
            <View style={styles.inputWrap}>
              <Mail size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="aarav.sharma@example.com or 9876543210"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
              />
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => setForgotOpen(true)}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrap}>
              <Lock size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
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

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (loading || googleLoading) && { opacity: 0.7 },
              ]}
              onPress={handleLogin}
              disabled={loading || googleLoading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {isGoogleConfigured ? (
              <ConfiguredGoogleSignInButton
                disabled={loading}
                googleLoading={googleLoading}
                setGoogleLoading={setGoogleLoading}
                setErrorMessage={setErrorMessage}
                googleWebClientId={googleWebClientId}
                googleAndroidClientId={googleAndroidClientId}
                onSuccessToken={handleGoogleToken}
              />
            ) : (
              <TouchableOpacity
                style={[
                  styles.googleBtn,
                  (loading || googleLoading) && { opacity: 0.7 },
                ]}
                onPress={handleGoogleNotConfigured}
                disabled={loading || googleLoading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <View style={styles.googleBadge}>
                  <Text style={styles.googleBadgeText}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuestExplore}
              disabled={loading || googleLoading}
              activeOpacity={0.8}
            >
              <Compass size={18} color={Colors.primary} />
              <Text style={styles.guestBtnText}>Explore Stays as Guest</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerMuted}>New to Stayzy?</Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text style={styles.footerLink}>Create an account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <Modal visible={forgotOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TouchableOpacity
                  onPress={() => {
                    setForgotOpen(false);
                    setForgotStatus(null);
                  }}
                >
                  <X size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSub}>
                Enter your registered email address and we will issue reset
                instructions.
              </Text>
              <View style={styles.inputWrap}>
                <Mail size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                />
              </View>
              {forgotStatus && (
                <View style={styles.infoBox}>
                  <CheckCircle2 size={16} color={Colors.secondary} />
                  <Text style={styles.infoText}>{forgotStatus}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleForgotSubmit}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingBottom: 40,
  },
  brandContainer: { alignItems: "center", marginBottom: 24 },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    ...Shadows.card,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: Colors.textMain,
    letterSpacing: -0.8,
  },
  brandAccent: { color: Colors.secondary },
  brandTagline: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  formTitle: { fontSize: 22, fontWeight: "800", color: Colors.textMain },
  formSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 19,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accentRedLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, color: Colors.accentRed, flex: 1, fontWeight: "600" },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  infoText: { fontSize: 12, color: Colors.primary, flex: 1, fontWeight: "600" },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSub,
    marginBottom: 6,
    marginTop: 10,
  },
  forgotLink: { fontSize: 12, fontWeight: "700", color: Colors.secondary },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 11, fontWeight: "700", color: Colors.textMuted },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.cardWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  googleBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  googleBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.primary,
  },
  googleBtnText: { fontSize: 14, fontWeight: "700", color: Colors.textMain },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  guestBtnText: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
  },
  footerMuted: { fontSize: 13, color: Colors.textMuted },
  footerLink: { fontSize: 13, fontWeight: "800", color: Colors.secondary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(13,43,34,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.modal,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: Colors.textMain },
  modalSub: { fontSize: 13, color: Colors.textMuted, marginBottom: 14, lineHeight: 19 },
});
