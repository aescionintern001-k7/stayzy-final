export const Colors = {
  // Stayzy Luxury Co-Living Brand Identity (Matching Website)
  primary: "#064B35",
  primaryHover: "#07965F",
  secondary: "#07965F",
  primaryLight: "#EAF5E5",
  primaryDark: "#043425",
  primaryBorder: "#C6E3D0",

  // Multi-Role Accents
  ownerBlue: "#064B35",
  ownerBlueDark: "#043425",
  ownerBlueLight: "#EAF5E5",
  adminPurple: "#0D2B22",
  whatsapp: "#25D366",
  whatsappDark: "#1EBE5D",

  // Forest & Emerald Tones
  forest: "#064B35",
  forestLight: "#0E6B4D",
  primaryEmerald: "#07965F",

  // Status & Badges
  verifiedGreen: "#07965F",
  verifiedGreenLight: "#EAF5E5",
  starGold: "#D97706",
  accentGold: "#F59E0B",
  starGoldLight: "#FEF3C7",
  accentRed: "#DC2626",
  accentRedLight: "#FEE2E2",
  limeAccent: "#EAF5E5",

  // Warm Ivory / Cream Backgrounds & Surfaces
  background: "#FCFAF4",
  backgroundWarm: "#F6F1E5",
  card: "#FFFFFF",
  cardWarm: "#FAF7EE",
  surface: "#FFFFFF",

  // Typography
  textMain: "#0D2B22",
  textSub: "#2E4A40",
  textMuted: "#5E726A",
  textLight: "#8BA097",

  // Warm Beige Borders & Dividers
  border: "#E6DFD1",
  borderLight: "#F0ECE1",
  divider: "#E6DFD1",

  // Role Badges
  roleCustomer: "#07965F",
  roleOwner: "#064B35",
  roleAdmin: "#0D2B22",
};

export const Typography = {
  h1: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.textMain,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.textMain,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.textMain,
  },
  body: {
    fontSize: 14,
    color: Colors.textMain,
  },
  caption: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  small: {
    fontSize: 11,
    color: Colors.textMuted,
  },
};

export const Shadows = {
  card: {
    shadowColor: "#064B35",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  floating: {
    shadowColor: "#064B35",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  modal: {
    shadowColor: "#064B35",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
};
