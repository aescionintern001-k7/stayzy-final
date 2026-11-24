export interface RoomRatePlans {
  hourly: number;
  daily: number;
  weekly: number;
  monthly: number;
  depositAmount: number;
  foodMonthlyCharge: number;
}

export interface DetailedRoomData {
  id: string;
  slug: string;
  name: string;
  propertyName: string;
  tagline: string;
  description: string;
  displayLocality: string;
  address: string;
  city: string;
  category: "PRIVATE" | "DOUBLE" | "TRIPLE";
  categoryLabel: string;
  genderEligibility: "COLIVING" | "MALE" | "FEMALE";
  sizeSqFt: number;
  rating: number;
  reviewCount: number;
  rates: RoomRatePlans;
  images: string[];
  keyAmenities: string[];
  rules: string[];
  hostName: string;
  hostPhone: string;
  availableCount: number;
}

export const ROOMS_DATA: DetailedRoomData[] = [
  {
    id: "room-1",
    slug: "deluxe-private-studio-suite",
    name: "Deluxe Private Studio Suite",
    propertyName: "Stayzy Haven — Koramangala",
    tagline: "Flagship coliving hub in Koramangala 4th Block, 80ft Road",
    description:
      "Centrally positioned in Bengaluru's primary startup ecosystem. Features ergonomic work pod, high-speed 300 Mbps fiber Wi-Fi, attached luxury washroom, daily housekeeping, and 24/7 security with biometric keyless lock access.",
    displayLocality: "Koramangala 4th Block",
    address: "84, 4th Cross, 5th Block, Koramangala, Bengaluru, Karnataka 560034",
    city: "Bengaluru",
    category: "PRIVATE",
    categoryLabel: "Private Studio",
    genderEligibility: "COLIVING",
    sizeSqFt: 220,
    rating: 4.92,
    reviewCount: 38,
    rates: {
      hourly: 199,
      daily: 1600,
      weekly: 9500,
      monthly: 28000,
      depositAmount: 15000,
      foodMonthlyCharge: 3500,
    },
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
    ],
    keyAmenities: [
      "300 Mbps Fiber Wi-Fi",
      "Attached Private Washroom",
      "Keyless Digital Door Lock",
      "Dedicated Ergonomic Workstation",
      "Air Conditioning (AC)",
      "Daily Housekeeping",
      "Power Backup 24/7",
      "Terrace Community Cafe",
    ],
    rules: [
      "Gate open 24/7 with digital smart lock access",
      "Visitors allowed in common coworking lounge",
      "No smoking inside bedrooms",
      "Quiet hours observed after 11:00 PM",
    ],
    hostName: "Rajesh Sharma",
    hostPhone: "+91 80 4567 8900",
    availableCount: 2,
  },
  {
    id: "room-2",
    slug: "solo-day-stay-work-pod",
    name: "Solo Day-Stay & Work Pod",
    propertyName: "Stayzy Heights — HSR Layout",
    tagline: "Serene co-living retreat in Sector 2, near 27th Main",
    description:
      "Stayzy Heights offers tranquil living with leafy avenue views, an indoor gym, communal kitchen, and seamless connectivity to Electronic City and Bellandur tech corridors. Perfect for techies needing a quiet focus zone.",
    displayLocality: "HSR Layout Sector 2",
    address: "189, 17th Cross, Sector 2, HSR Layout, Bengaluru, Karnataka 560102",
    city: "Bengaluru",
    category: "PRIVATE",
    categoryLabel: "Work & Stay Pod",
    genderEligibility: "COLIVING",
    sizeSqFt: 180,
    rating: 4.88,
    reviewCount: 29,
    rates: {
      hourly: 149,
      daily: 1200,
      weekly: 7500,
      monthly: 22000,
      depositAmount: 12000,
      foodMonthlyCharge: 3200,
    },
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    ],
    keyAmenities: [
      "High Speed Wi-Fi",
      "Ergonomic Herman Miller Chair",
      "Full Power Backup",
      "Rooftop Sunset Lounge",
      "RO Water Station",
      "Washing Machine & Dryer",
    ],
    rules: [
      "Keyless QR entry enabled",
      "Coworking desk access included",
      "Pets allowed on terrace floors",
    ],
    hostName: "Rajesh Sharma",
    hostPhone: "+91 80 4567 8901",
    availableCount: 3,
  },
  {
    id: "room-3",
    slug: "urban-minimalist-studio",
    name: "Urban Minimalist Studio",
    propertyName: "Stayzy Urban — Indiranagar",
    tagline: "Vibrant living off 100 Feet Road, walking distance to Metro",
    description:
      "Stayzy Urban puts you in the heartbeat of Bengaluru's most creative neighborhood. Steps away from artisan cafes, boutique studios, and quick 10-minute transit to Central Business District (MG Road).",
    displayLocality: "Indiranagar 100ft Rd",
    address: "712, 12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru 560038",
    city: "Bengaluru",
    category: "PRIVATE",
    categoryLabel: "Urban Studio",
    genderEligibility: "COLIVING",
    sizeSqFt: 250,
    rating: 4.96,
    reviewCount: 44,
    rates: {
      hourly: 249,
      daily: 2100,
      weekly: 12500,
      monthly: 34000,
      depositAmount: 20000,
      foodMonthlyCharge: 4000,
    },
    images: [
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
    ],
    keyAmenities: [
      "Walking Distance to Metro",
      "43-inch 4K Smart TV",
      "Attached Balcony with Greenery",
      "Biometric Door Lock",
      "High Speed Wi-Fi",
      "Modular Kitchen Access",
    ],
    rules: [
      "Strict zero-noise policy after 11 PM",
      "Secure keyless elevator access",
    ],
    hostName: "Ananya Deshmukh",
    hostPhone: "+91 80 4567 8902",
    availableCount: 1,
  },
  {
    id: "room-4",
    slug: "executive-twin-sharing",
    name: "Executive Twin Sharing Room",
    propertyName: "Stayzy Haven — Koramangala",
    tagline: "Spacious twin sharing with individual study desks and lockers",
    description:
      "Comfortable and cost-effective double occupancy room designed for working professionals. Equipped with individual study tables, partitioned wardrobes with digital lockers, and attached ensuite bathroom.",
    displayLocality: "Koramangala 4th Block",
    address: "84, 4th Cross, 5th Block, Koramangala, Bengaluru, Karnataka 560034",
    city: "Bengaluru",
    category: "DOUBLE",
    categoryLabel: "2-Sharing Room",
    genderEligibility: "MALE",
    sizeSqFt: 240,
    rating: 4.82,
    reviewCount: 22,
    rates: {
      hourly: 120,
      daily: 950,
      weekly: 5800,
      monthly: 18500,
      depositAmount: 10000,
      foodMonthlyCharge: 3500,
    },
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
    ],
    keyAmenities: [
      "Individual Solid Wood Twin Bed",
      "Personal Digital Safe Locker",
      "3 Fresh Homestyle Meals Included",
      "Attached Western Washroom",
      "High Speed Wi-Fi",
      "Weekly Linen Change",
    ],
    rules: [
      "Male residents only",
      "Alcohol not permitted inside sharing rooms",
    ],
    hostName: "Rajesh Sharma",
    hostPhone: "+91 80 4567 8900",
    availableCount: 4,
  },
  {
    id: "room-5",
    slug: "women-premium-triple-sharing",
    name: "Women's Premium 3-Sharing Suite",
    propertyName: "Stayzy Heights — HSR Layout",
    tagline: "Safe, secure, and vibrant community living for women professionals",
    description:
      "Specially curated for women in tech and corporate roles. Features female warden, round-the-clock CCTV in perimeter, biometric gated entry, personal study corners, and healthy organic meal plans.",
    displayLocality: "HSR Layout Sector 2",
    address: "189, 17th Cross, Sector 2, HSR Layout, Bengaluru, Karnataka 560102",
    city: "Bengaluru",
    category: "TRIPLE",
    categoryLabel: "3-Sharing Suite",
    genderEligibility: "FEMALE",
    sizeSqFt: 300,
    rating: 4.94,
    reviewCount: 31,
    rates: {
      hourly: 99,
      daily: 750,
      weekly: 4500,
      monthly: 14500,
      depositAmount: 8000,
      foodMonthlyCharge: 3000,
    },
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    ],
    keyAmenities: [
      "24/7 Gated Security & Female Warden",
      "Healthy North & South Indian Meals",
      "High Speed Fiber Wi-Fi",
      "Large Storage Wardrobes",
      "Automatic Washing Machines",
      "RO Purified Water",
    ],
    rules: [
      "Women residents only",
      "Keypad entry enabled 24 hours",
    ],
    hostName: "Kavita Reddy",
    hostPhone: "+91 80 4567 8903",
    availableCount: 3,
  },
];
