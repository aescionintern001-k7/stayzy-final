export const Colors = {
  // Stayzy Signature Vibrant Orange & PG Theme (Matching Mobile Reference Design)
  primary: "#B31838",          // Signature Brand Orange
  primaryHover: "#E04810",
  primaryLight: "#FFF5ED",     // Soft warm peach for cards & pills
  primaryDark: "#89132D",
  primaryBorder: "#FED7AA",

  // Corporate & Multi-Role Accents
  ownerBlue: "#28262A",        // "Own a PG or Flat?" Card Blue
  ownerBlueDark: "#1D4ED8",
  ownerBlueLight: "#EFF6FF",
  adminPurple: "#28262A",
  whatsapp: "#25D366",         // Floating WhatsApp Action Button
  whatsappDark: "#1EBE5D",

  // Legacy & Secondary Forest Tones
  forest: "#28262A",
  forestLight: "#49474B",
  primaryEmerald: "#059669",

  // Status & Badges
  verifiedGreen: "#16A34A",
  verifiedGreenLight: "#DCFCE7",
  starGold: "#F59E0B",
  accentGold: "#F59E0B",
  starGoldLight: "#FEF3C7",
  accentRed: "#DC2626",
  limeAccent: "#E8F1D5",

  // Backgrounds & Surfaces
  background: "#F8F9FA",       // Clean light neutral app background
  backgroundWarm: "#FAF8F5",
  card: "#FFFFFF",
  surface: "#FFFFFF",

  // Typography
  textMain: "#0F172A",         // Crisp slate dark
  textSub: "#334155",
  textMuted: "#64748B",
  textLight: "#94A3B8",

  // Borders & Dividers
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  divider: "#E2E8F0",

  // Multi-Role Badges
  roleCustomer: "#B31838",
  roleOwner: "#28262A",
  roleAdmin: "#28262A",
};

export const Typography = {
  h1: { fontSize: 24, fontWeight: "800" as const, color: Colors.textMain, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: "700" as const, color: Colors.textMain, letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: "700" as const, color: Colors.textMain },
  body: { fontSize: 14, color: Colors.textMain },
  caption: { fontSize: 12, color: Colors.textMuted },
  small: { fontSize: 11, color: Colors.textMuted },
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  modal: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
};
