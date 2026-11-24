"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Wifi,
  Utensils,
  Wind,
  ShieldCheck,
  Zap,
  CheckCircle2,
  BedDouble,
  ArrowRight,
  Upload,
  Plus,
  Trash2,
  Camera,
  Layers,
  Clock,
  IndianRupee,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const SAMPLE_PHOTO_PRESETS = [
  {
    title: "Executive Private Studio",
    url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Twin Sharing Room with Work Desk",
    url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Modern Triple Sharing Suite",
    url: "https://images.unsplash.com/photo-1540518614846-7ede433c4ef8?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Building Exterior & Glass Facade",
    url: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Co-working Lounge & Common Area",
    url: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Dining Hall & Clean Kitchen",
    url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80",
  },
];

const AMENITY_OPTIONS = [
  { id: "wifi", label: "300 Mbps Fiber Wi-Fi", icon: Wifi },
  { id: "food", label: "Home Cooked 3-Time Meals", icon: Utensils },
  { id: "ac", label: "Split Air Conditioning (AC)", icon: Wind },
  { id: "housekeeping", label: "Daily Room Housekeeping", icon: CheckCircle2 },
  { id: "power_backup", label: "100% DG Power Backup", icon: Zap },
  { id: "biometric", label: "Keyless Biometric Entry", icon: ShieldCheck },
  { id: "ro_water", label: "Filtered RO Drinking Water", icon: CheckCircle2 },
  { id: "washing_machine", label: "Automatic Washing Machines", icon: Layers },
  { id: "refrigerator", label: "Refrigerator on Every Floor", icon: CheckCircle2 },
  { id: "cctv", label: "24/7 CCTV Surveillance", icon: ShieldCheck },
  { id: "attached_bath", label: "Attached Bathroom with Geyser", icon: CheckCircle2 },
  { id: "study_desk", label: "Ergonomic Work Desk & Chair", icon: CheckCircle2 },
];

export default function NewPGUploadPage() {
  const router = useRouter();
  const toast = useToast();

  // Basic Information
  const [name, setName] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [locality, setLocality] = useState("Koramangala");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("560034");
  const [contactPhone, setContactPhone] = useState("+91 98450 88990");
  const [contactEmail, setContactEmail] = useState("partner@stayzy.com");
  const [googleMapsLink, setGoogleMapsLink] = useState("");

  // Target Community
  const [gender, setGender] = useState<"COLIVING" | "FEMALE" | "MALE">("COLIVING");
  const [communityType, setCommunityType] = useState("Working Professionals & Digital Nomads");

  // Selected Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "300 Mbps Fiber Wi-Fi",
    "Home Cooked 3-Time Meals",
    "Split Air Conditioning (AC)",
    "Daily Room Housekeeping",
    "100% DG Power Backup",
    "Keyless Biometric Entry",
  ]);

  // Room Sharing & Pricing
  const [privateMonthly, setPrivateMonthly] = useState("18500");
  const [privateDaily, setPrivateDaily] = useState("1499");
  const [privateHourly, setPrivateHourly] = useState("249");

  const [twinMonthly, setTwinMonthly] = useState("12000");
  const [twinDaily, setTwinDaily] = useState("899");

  const [tripleMonthly, setTripleMonthly] = useState("8500");

  const [securityDeposit, setSecurityDeposit] = useState("10000");
  const [electricityType, setElectricityType] = useState("BESCOM Metered (Per Unit)");

  // Photos
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([
    SAMPLE_PHOTO_PRESETS[0].url,
    SAMPLE_PHOTO_PRESETS[1].url,
    SAMPLE_PHOTO_PRESETS[3].url,
  ]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");

  // Rules & Timings
  const [gateClosingTime, setGateClosingTime] = useState("24/7 Digital Entry (No curfew)");
  const [visitorPolicy, setVisitorPolicy] = useState("Allowed in common lounge till 9:00 PM");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleAmenity = (label: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label]
    );
  };

  const togglePresetPhoto = (url: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(url) ? prev.filter((p) => p !== url) : [...prev, url]
    );
  };

  const addCustomPhoto = () => {
    if (!customPhotoUrl.trim()) return;
    if (!selectedPhotos.includes(customPhotoUrl)) {
      setSelectedPhotos([...selectedPhotos, customPhotoUrl]);
    }
    setCustomPhotoUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name,
        city,
        locality,
        address: `${address}, ${locality}, ${city} - ${pincode}`,
        pincode,
        contactPhone,
        contactEmail,
        gender,
        communityType,
        tagline: `${communityType} PG in ${locality}, ${city}`,
        description: `Verified Stayzy PG property located in ${locality}. Features modern furnished rooms, ${selectedAmenities.slice(0, 4).join(", ")}, chef meals, and 24/7 security.`,
        amenities: selectedAmenities,
        coverImage: selectedPhotos[0] || SAMPLE_PHOTO_PRESETS[0].url,
        images: selectedPhotos,
        monthlyRentStart: Number(tripleMonthly) || Number(twinMonthly) || Number(privateMonthly) || 9500,
        totalBeds: 24,
        roomTypes: [
          {
            name: "Executive Private Studio",
            category: "PRIVATE",
            monthlyRate: Number(privateMonthly),
            dailyRate: Number(privateDaily),
            hourlyRate: Number(privateHourly),
          },
          {
            name: "Solo Rider Twin Sharing Room",
            category: "TWIN_SHARING",
            monthlyRate: Number(twinMonthly),
            dailyRate: Number(twinDaily),
          },
          {
            name: "Shared Adventure Triple Room",
            category: "TRIPLE_SHARING",
            monthlyRate: Number(tripleMonthly),
          },
        ],
        rules: `Gate: ${gateClosingTime}. Visitors: ${visitorPolicy}. Electricity: ${electricityType}. Refundable Deposit: ₹${securityDeposit}.`,
      };

      const res = await fetch("/api/owner/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to list property.");
      }

      toast.success("Property Published", `"${name}" has been listed.`);
      setSuccess(true);
      setTimeout(() => {
        router.push("/owner/properties");
      }, 1800);
    } catch (err: any) {
      toast.error("Submission Failed", err.message || "Could not publish property.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg border border-[#E8E6DF] p-12 text-center shadow-card space-y-4 max-w-xl mx-auto my-12 animate-in zoom-in-95">
        <div className="w-16 h-16 rounded-md bg-[#E8F1D5] text-[#123D2B] flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-[#123D2B]">PG Property Listed Successfully!</h2>
        <p className="text-sm text-[#5E6E65] max-w-md mx-auto leading-relaxed">
          <strong>{name}</strong> is now registered in your Property Partner catalog and published across Stayzy search.
        </p>
        <div className="pt-2 text-xs text-[#7B8B82] font-semibold">
          Redirecting to your properties dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-6 border-b border-[#E8E6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#123D2B] bg-[#E8F1D5] px-2.5 py-1 rounded-md">
            Property Partner Onboarding
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123D2B] tracking-tight mt-1.5">
            Upload & List New PG Property
          </h1>
          <p className="text-xs sm:text-sm text-[#5E6E65] mt-1">
            Fill in your PG building details, amenities, sharing tariffs, and genuine photographs.
          </p>
        </div>

        <Link
          href="/owner"
          className="text-xs font-bold text-[#5E6E65] hover:text-[#123D2B] transition-colors"
        >
          ← Back to Partner Overview
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Basic Property Info */}
        <div className="bg-white rounded-lg border border-[#E8E6DF] p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EDE4]">
            <Building2 className="w-5 h-5 text-[#123D2B]" />
            <h2 className="text-base font-bold text-[#123D2B]">1. PG Property Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold uppercase text-[#5E6E65]">
                PG / Hostel / Building Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Stayzy Sai Balaji Luxury Coliving"
                className="w-full h-11 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium focus:ring-1 focus:ring-[#123D2B]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#5E6E65]">City *</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full h-11 px-3 rounded-md border border-[#D5D2C7] bg-[#FAF8F5] text-xs font-bold text-[#123D2B] cursor-pointer"
              >
                <option value="Bengaluru">Bengaluru</option>
                <option value="Chennai">Chennai</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Pune">Pune</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Delhi NCR">Delhi NCR</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#5E6E65]">Locality / Area Hub *</label>
              <input
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Koramangala, HSR Layout, Whitefield, OMR"
                className="w-full h-11 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold uppercase text-[#5E6E65]">Full Street Address *</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. #42, 80 Feet Road, 4th Block, near Sony World Signal"
                className="w-full h-11 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#5E6E65]">Contact Phone *</label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full h-11 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#5E6E65]">Contact Email *</label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full h-11 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Living Type & Community Policy */}
        <div className="bg-white rounded-lg border border-[#E8E6DF] p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EDE4]">
            <MapPin className="w-5 h-5 text-[#123D2B]" />
            <h2 className="text-base font-bold text-[#123D2B]">2. Community & Gender Eligibility</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#5E6E65]">Resident Gender Policy *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full h-11 px-3 rounded-md border border-[#D5D2C7] bg-[#FAF8F5] text-xs font-bold text-[#123D2B] cursor-pointer"
              >
                <option value="COLIVING">Co-Living (Unisex / Professional)</option>
                <option value="FEMALE">Women's Accommodation (Ladies PG)</option>
                <option value="MALE">Men's Accommodation (Gents PG)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#5E6E65]">Primary Target Group</label>
              <select
                value={communityType}
                onChange={(e) => setCommunityType(e.target.value)}
                className="w-full h-11 px-3 rounded-md border border-[#D5D2C7] bg-[#FAF8F5] text-xs font-bold text-[#123D2B] cursor-pointer"
              >
                <option value="Working Professionals & Tech Nomads">Working Professionals & Tech Nomads</option>
                <option value="College & University Students">College & University Students</option>
                <option value="Corporate Executive Stays">Corporate Executive Stays</option>
                <option value="All Resident Demographics">All Resident Demographics</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Key Amenities Selection */}
        <div className="bg-white rounded-lg border border-[#E8E6DF] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EDE4]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#123D2B]" />
              <h2 className="text-base font-bold text-[#123D2B]">3. Included Facilities & Amenities</h2>
            </div>
            <span className="text-xs text-[#5E6E65]">Select all that apply</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {AMENITY_OPTIONS.map((item) => {
              const Icon = item.icon;
              const isChecked = selectedAmenities.includes(item.label);

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggleAmenity(item.label)}
                  className={`p-3 rounded-md border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    isChecked
                      ? "bg-[#E8F1D5]/40 border-[#123D2B] text-[#123D2B] font-bold shadow-2xs"
                      : "bg-[#FAF8F5] border-[#E8E6DF] text-[#5E6E65] hover:border-[#123D2B]/30"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      isChecked ? "bg-[#123D2B] text-white" : "bg-white text-[#7B8B82] border border-[#E8E6DF]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Room Sharing Tariffs */}
        <div className="bg-white rounded-lg border border-[#E8E6DF] p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EDE4]">
            <IndianRupee className="w-5 h-5 text-[#123D2B]" />
            <h2 className="text-base font-bold text-[#123D2B]">4. Room Sharing Rates & Deposit</h2>
          </div>

          <div className="space-y-4">
            {/* Private Studio */}
            <div className="p-4 rounded-md bg-[#FAF8F5] border border-[#E8E6DF] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#123D2B] flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4 text-[#123D2B]" />
                  Private Studio / 1-Sharing Room
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#E8F1D5] text-[#123D2B]">
                  Single / Couple
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#5E6E65]">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    value={privateMonthly}
                    onChange={(e) => setPrivateMonthly(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-white text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#5E6E65]">Daily Stay (₹/night)</label>
                  <input
                    type="number"
                    value={privateDaily}
                    onChange={(e) => setPrivateDaily(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#5E6E65]">Hourly Pod (₹/hr)</label>
                  <input
                    type="number"
                    value={privateHourly}
                    onChange={(e) => setPrivateHourly(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Twin Sharing */}
            <div className="p-4 rounded-md bg-[#FAF8F5] border border-[#E8E6DF] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#123D2B] flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4 text-[#123D2B]" />
                  Twin Sharing Room (Solo Rider)
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white text-[#5E6E65] border border-[#D5D2C7]">
                  2 Beds
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#5E6E65]">Monthly Rent per Bed (₹)</label>
                  <input
                    type="number"
                    value={twinMonthly}
                    onChange={(e) => setTwinMonthly(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-white text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#5E6E65]">Daily Stay per Bed (₹/night)</label>
                  <input
                    type="number"
                    value={twinDaily}
                    onChange={(e) => setTwinDaily(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Triple Sharing */}
            <div className="p-4 rounded-md bg-[#FAF8F5] border border-[#E8E6DF] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#123D2B] flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4 text-[#123D2B]" />
                  Triple Sharing Room (Shared Adventure)
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white text-[#5E6E65] border border-[#D5D2C7]">
                  3 Beds
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#5E6E65]">Monthly Rent per Bed (₹)</label>
                  <input
                    type="number"
                    value={tripleMonthly}
                    onChange={(e) => setTripleMonthly(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-white text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#5E6E65]">Refundable Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-[#D5D2C7] bg-white text-xs font-bold text-emerald-800"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: Photo Gallery */}
        <div className="bg-white rounded-lg border border-[#E8E6DF] p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EDE4]">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#123D2B]" />
              <h2 className="text-base font-bold text-[#123D2B]">5. Property Photo Gallery</h2>
            </div>
            <span className="text-xs text-[#5E6E65]">{selectedPhotos.length} photos selected</span>
          </div>

          <div className="space-y-4">
            <span className="text-xs text-[#5E6E65] block">
              Click to select from verified high-resolution PG room presets or enter custom photo URLs:
            </span>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SAMPLE_PHOTO_PRESETS.map((preset, idx) => {
                const isSelected = selectedPhotos.includes(preset.url);
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => togglePresetPhoto(preset.url)}
                    className={`relative rounded-md overflow-hidden aspect-4/3 border-2 transition-all cursor-pointer group ${
                      isSelected ? "border-[#123D2B] ring-2 ring-[#123D2B]/30" : "border-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[10px] font-bold text-white leading-tight">
                        {preset.title}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#123D2B] text-white flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Photo URL Input */}
            <div className="flex gap-2 pt-2">
              <input
                type="url"
                value={customPhotoUrl}
                onChange={(e) => setCustomPhotoUrl(e.target.value)}
                placeholder="Or paste external photo URL (Unsplash, Cloudinary, etc.)..."
                className="flex-1 h-10 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
              />
              <button
                type="button"
                onClick={addCustomPhoto}
                className="px-4 py-2 rounded-md bg-[#FAF8F5] border border-[#D5D2C7] text-xs font-bold text-[#123D2B] hover:bg-[#F0EDE4] transition-colors"
              >
                Add Photo
              </button>
            </div>
          </div>
        </div>

        {/* Step 6: House Rules & Timings */}
        <div className="bg-white rounded-lg border border-[#E8E6DF] p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F0EDE4]">
            <Clock className="w-5 h-5 text-[#123D2B]" />
            <h2 className="text-base font-bold text-[#123D2B]">6. House Rules & Timings</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#5E6E65]">Gate Timings / Curfew</label>
              <input
                type="text"
                value={gateClosingTime}
                onChange={(e) => setGateClosingTime(e.target.value)}
                placeholder="e.g. 24/7 Digital Entry or Closes at 11:00 PM"
                className="w-full h-11 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-[#5E6E65]">Visitor Policy</label>
              <input
                type="text"
                value={visitorPolicy}
                onChange={(e) => setVisitorPolicy(e.target.value)}
                placeholder="e.g. Guests allowed in lounge till 9:00 PM"
                className="w-full h-11 px-3 rounded-md border border-[#D5D2C7] bg-[#FDFCF9] text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link
            href="/owner"
            className="px-6 py-3 rounded-md border border-[#D5D2C7] text-xs font-bold text-[#5E6E65] hover:bg-[#FAF8F5] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md bg-[#123D2B] text-white text-sm font-extrabold hover:bg-[#0E2F21] shadow-sm transition-all hover:shadow cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-[#E8F1D5]" />
            <span>{submitting ? "Publishing PG..." : "Publish PG Property Live"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
