import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewNavigation } from "react-native-webview";

// Local emulator test URL; replace with deployed HTTPS URL via EXPO_PUBLIC_WEB_APP_URL for production.
const DEFAULT_LOCAL_TEST_WEB_URL = "http://10.0.2.2:3012";
const WEB_APP_URL = (
  process.env.EXPO_PUBLIC_WEB_APP_URL || DEFAULT_LOCAL_TEST_WEB_URL
).trim();

const EXTERNAL_SCHEMES = new Set([
  "tel:",
  "mailto:",
  "whatsapp:",
  "upi:",
  "tez:",
  "phonepe:",
  "paytmmp:",
  "gpay:",
  "intent:",
]);

function isExternalWhatsAppUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "wa.me" || host === "api.whatsapp.com" || host === "chat.whatsapp.com";
  } catch {
    return false;
  }
}

async function openExternalSafely(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  } catch {
    // Prevent crash when no external handler app is installed
  }
}

export default function RootLayout() {
  const webViewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const stayzyOrigin = useMemo(() => {
    try {
      return new URL(WEB_APP_URL).origin;
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBackRef.current && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    canGoBackRef.current = Boolean(navState.canGoBack);
  }, []);

  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      const { url } = request;
      if (!url || url === "about:blank") return true;

      try {
        const parsed = new URL(url);

        if (EXTERNAL_SCHEMES.has(parsed.protocol)) {
          void openExternalSafely(url);
          return false;
        }

        if (isExternalWhatsAppUrl(url)) {
          void openExternalSafely(url);
          return false;
        }

        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          if (stayzyOrigin && parsed.origin === stayzyOrigin) {
            return true;
          }
          // Allow Razorpay hosted checkout inside WebView if encountered; open other external HTTPS links in browser
          if (parsed.hostname.endsWith("razorpay.com")) {
            return true;
          }
          void openExternalSafely(url);
          return false;
        }

        void openExternalSafely(url);
        return false;
      } catch {
        return true;
      }
    },
    [stayzyOrigin]
  );

  const handleRetry = useCallback(() => {
    setHasError(false);
    setLoading(true);
    webViewRef.current?.reload();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {hasError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to load Stayzy</Text>
            <Text style={styles.errorText}>
              Check your connection and make sure the Stayzy server is running.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: WEB_APP_URL }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            cacheEnabled
            androidLayerType="hardware"
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled
            setSupportMultipleWindows={false}
            originWhitelist={[
              "http://*",
              "https://*",
              "tel:*",
              "mailto:*",
              "whatsapp:*",
              "upi:*",
              "tez:*",
              "phonepe:*",
              "paytmmp:*",
              "gpay:*",
              "intent:*",
            ]}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onLoadStart={() => {
              setLoading(true);
              setHasError(false);
            }}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
          />
        )}

        {loading && !hasError && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#123D2B" />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  webview: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#123D2B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
