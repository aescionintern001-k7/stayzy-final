import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedMoreProperties() {
  console.log("Seeding multi-city inventory (Mumbai, Delhi-NCR, Hyderabad, Pune, Chennai)...");

  // Helper to find location city ID
  const findCityId = async (name: string) => {
    const city = await prisma.locationCity.findFirst({
      where: { name: { contains: name } },
    });
    return city ? city.id : null;
  };

  const mumbaiCityId = await findCityId("Mumbai");
  const delhiCityId = await findCityId("Delhi") || await findCityId("Gurugram");
  const hydCityId = await findCityId("Hyderabad");
  const puneCityId = await findCityId("Pune");
  const chennaiCityId = await findCityId("Chennai");
  const blrCityId = await findCityId("Bengaluru");

  const propertiesData = [
    // 1. Mumbai — Bandra West (Boutique Co-living & Studios)
    {
      name: "Stayzy Seaside — Bandra West",
      slug: "stayzy-seaside-bandra-west",
      tagline: "Artistic luxury co-living minutes from Carter Road and Bandstand",
      description:
        "Nestled in the prime cultural and creative heart of Mumbai, Stayzy Seaside features sunlit private studios, shared designer lofts, rooftop social deck, and high-speed fiber.",
      address: "24, Pali Hill Road, Bandra West",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      contactPhone: "+91 22 4589 1200",
      contactEmail: "bandra@stayzy.in",
      rules: "Quiet hours: 11:00 PM to 7:00 AM. Keycard access 24/7. Non-smoking property.",
      checkInTime: "12:00 PM",
      checkOutTime: "11:00 AM",
      timezone: "Asia/Kolkata",
      coverImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      ]),
      locationCityId: mumbaiCityId,
      roomTypes: [
        {
          name: "Bandra Sea-Breeze Studio",
          slug: "bandra-sea-breeze-studio",
          category: "PRIVATE",
          description: "Premium sea-facing private studio with workstation, King bed, kitchenette, and en-suite bath.",
          sizeSqFt: 280,
          baseCapacity: 1,
          maxCapacity: 2,
          hasAc: true,
          bathroomType: "ATTACHED",
          foodIncluded: false,
          foodDetails: "Gourmet pantry and daily breakfast add-on available",
          keyAmenities: ["Sea View Balcony", "300 Mbps Wi-Fi", "Daikin Inverter AC", "Kitchenette", "Attached Designer Bath", "Smart TV"],
          images: JSON.stringify([
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
          ]),
          rates: [
            { durationType: "HOURLY", price: 450, depositAmount: 0, minDuration: 2, maxDuration: 8, notes: "Day stay pod." },
            { durationType: "DAILY", price: 2400, depositAmount: 1000, minDuration: 1, maxDuration: 21, notes: "Flexible daily stay." },
            { durationType: "WEEKLY", price: 14000, depositAmount: 3000, minDuration: 1, maxDuration: 4, notes: "Weekly creative retreat." },
            { durationType: "MONTHLY", price: 45000, depositAmount: 40000, minDuration: 1, maxDuration: 11, foodMonthlyCharge: 4000, notes: "Monthly lease." },
            { durationType: "YEARLY", price: 500000, depositAmount: 45000, minDuration: 1, maxDuration: 2, notes: "Annual lease package." },
          ],
        },
        {
          name: "Bandra Twin Social Shared Loft",
          slug: "bandra-twin-social-shared-loft",
          category: "TWIN_SHARING",
          description: "Modern twin sharing room with customized storage, high ceilings, ergonomic study setup, and balcony access.",
          sizeSqFt: 260,
          baseCapacity: 1,
          maxCapacity: 2,
          hasAc: true,
          bathroomType: "ATTACHED",
          foodIncluded: true,
          foodDetails: "Home-style breakfast and dinner included",
          keyAmenities: ["Attached Washroom", "Dedicated Work Desks", "High Speed Wi-Fi", "Air Conditioning", "Daily Housekeeping"],
          images: JSON.stringify([
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
          ]),
          rates: [
            { durationType: "DAILY", price: 1400, depositAmount: 500, minDuration: 1, maxDuration: 14, notes: "Per bed daily." },
            { durationType: "WEEKLY", price: 8500, depositAmount: 2000, minDuration: 1, maxDuration: 6, notes: "Per bed weekly." },
            { durationType: "MONTHLY", price: 22000, depositAmount: 20000, minDuration: 1, maxDuration: 11, foodMonthlyCharge: 3500, notes: "Per bed monthly with meals." },
            { durationType: "YEARLY", price: 240000, depositAmount: 20000, minDuration: 1, maxDuration: 2, notes: "Annual plan." },
          ],
        },
      ],
    },

    // 2. Delhi-NCR — Cyber City Gurugram
    {
      name: "Stayzy Skyline — Cyber City Gurugram",
      slug: "stayzy-skyline-cyber-city-gurugram",
      tagline: "Next-gen co-living steps from DLF Cyber City & Rapid Metro",
      description:
        "Built for corporate leaders and tech professionals. Features an on-site gym, co-working lounge with private video conference booths, café, and round-the-clock concierge.",
      address: "Tower 5, DLF Phase 2, Near Cyber City Metro, Gurugram",
      city: "Gurugram",
      state: "Haryana",
      pincode: "122002",
      contactPhone: "+91 124 492 8800",
      contactEmail: "cybercity@stayzy.in",
      rules: "Quiet hours: 11:00 PM to 6:30 AM. Visitors registered at desk. Zero noise tolerance.",
      checkInTime: "12:00 PM",
      checkOutTime: "11:00 AM",
      timezone: "Asia/Kolkata",
      coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      ]),
      locationCityId: delhiCityId,
      roomTypes: [
        {
          name: "Cyber City Corporate Studio",
          slug: "cyber-city-corporate-studio",
          category: "PRIVATE",
          description: "Ultra-sleek private room with high-spec workstation, ergonomic Herman Miller chair, smart lock, and 4K TV.",
          sizeSqFt: 250,
          baseCapacity: 1,
          maxCapacity: 2,
          hasAc: true,
          bathroomType: "ATTACHED",
          foodIncluded: true,
          foodDetails: "Executive breakfast buffet & dinner included",
          keyAmenities: ["Workstation & Ergonomic Chair", "Gigabit Wi-Fi", "Smart TV 50-inch", "Attached Luxury Bath", "Daily Housekeeping", "Buffet Meals"],
          images: JSON.stringify([
            "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
          ]),
          rates: [
            { durationType: "HOURLY", price: 380, depositAmount: 0, minDuration: 2, maxDuration: 10, notes: "Day stay pod." },
            { durationType: "DAILY", price: 2100, depositAmount: 1000, minDuration: 1, maxDuration: 21, notes: "Daily corporate rate." },
            { durationType: "WEEKLY", price: 12500, depositAmount: 2500, minDuration: 1, maxDuration: 4, notes: "Weekly rate." },
            { durationType: "MONTHLY", price: 34000, depositAmount: 30000, minDuration: 1, maxDuration: 11, foodMonthlyCharge: 4000, notes: "All-inclusive monthly." },
            { durationType: "YEARLY", price: 380000, depositAmount: 34000, minDuration: 1, maxDuration: 2, notes: "Annual corporate contract." },
          ],
        },
        {
          name: "Cyber City Dual Executive Room",
          slug: "cyber-city-dual-executive-room",
          category: "TWIN_SHARING",
          description: "High-spec shared room with individual beds, sound-dampened acoustic panels, and separate storage.",
          sizeSqFt: 270,
          baseCapacity: 1,
          maxCapacity: 2,
          hasAc: true,
          bathroomType: "ATTACHED",
          foodIncluded: true,
          foodDetails: "3 daily chef-curated meals included",
          keyAmenities: ["Twin Work Desks", "Attached Washroom", "High-Speed Wi-Fi", "Air Conditioning", "Chef-prepared Meals"],
          images: JSON.stringify([
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
          ]),
          rates: [
            { durationType: "DAILY", price: 1200, depositAmount: 500, minDuration: 1, maxDuration: 14, notes: "Per bed daily." },
            { durationType: "WEEKLY", price: 7200, depositAmount: 1500, minDuration: 1, maxDuration: 8, notes: "Per bed weekly." },
            { durationType: "MONTHLY", price: 18500, depositAmount: 18500, minDuration: 1, maxDuration: 11, foodMonthlyCharge: 3500, notes: "Per bed with food included." },
            { durationType: "YEARLY", price: 200000, depositAmount: 18500, minDuration: 1, maxDuration: 2, notes: "Per bed annual." },
          ],
        },
      ],
    },

    // 3. Hyderabad — Hitec City
    {
      name: "Stayzy Tech Oasis — Hitec City",
      slug: "stayzy-tech-oasis-hitec-city",
      tagline: "Eco-friendly premium co-living near Raheja Mindspace & Cyber Towers",
      description:
        "Modern living surrounded by green courtyards, terrace pool, gaming zone, and high-speed fiber internet. Walk to Microsoft, Google, and Amazon campuses.",
      address: "Plot 88, Vittal Rao Nagar, Madhapur, Hitec City",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      contactPhone: "+91 40 4872 9000",
      contactEmail: "hiteccity@stayzy.in",
      rules: "Quiet hours: 11:00 PM to 6:00 AM. Pool rules apply. Non-smoking campus.",
      checkInTime: "12:00 PM",
      checkOutTime: "11:00 AM",
      timezone: "Asia/Kolkata",
      coverImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      ]),
      locationCityId: hydCityId,
      roomTypes: [
        {
          name: "Mindspace Tech Studio",
          slug: "mindspace-tech-studio",
          category: "PRIVATE",
          description: "Autonomous studio apartment with private balcony, ultra-quiet AC, and dedicated gigabit fiber line.",
          sizeSqFt: 240,
          baseCapacity: 1,
          maxCapacity: 2,
          hasAc: true,
          bathroomType: "ATTACHED",
          foodIncluded: false,
          foodDetails: "Organic dining hall meal pass available",
          keyAmenities: ["Balcony View", "Gigabit Internet", "Inverter AC", "Attached Luxury Bath", "Smart TV"],
          images: JSON.stringify([
            "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
          ]),
          rates: [
            { durationType: "HOURLY", price: 320, depositAmount: 0, minDuration: 2, maxDuration: 10, notes: "Day stay pod." },
            { durationType: "DAILY", price: 1750, depositAmount: 800, minDuration: 1, maxDuration: 21, notes: "Daily stay." },
            { durationType: "WEEKLY", price: 10500, depositAmount: 2000, minDuration: 1, maxDuration: 4, notes: "Weekly rate." },
            { durationType: "MONTHLY", price: 27000, depositAmount: 25000, minDuration: 1, maxDuration: 11, foodMonthlyCharge: 3500, notes: "Monthly lease." },
            { durationType: "YEARLY", price: 300000, depositAmount: 27000, minDuration: 1, maxDuration: 2, notes: "Annual lease." },
          ],
        },
        {
          name: "Hitec Triple Social Hostel Dorm",
          slug: "hitec-triple-social-hostel-dorm",
          category: "TRIPLE_SHARING",
          description: "Vibrant triple sharing room designed for tech interns and community enthusiasts with individual pods.",
          sizeSqFt: 310,
          baseCapacity: 1,
          maxCapacity: 3,
          hasAc: true,
          bathroomType: "ATTACHED",
          foodIncluded: true,
          foodDetails: "3 delicious South & North Indian meals daily",
          keyAmenities: ["Attached Bath", "Pod Beds with Privacy Curtains", "Lockers", "300 Mbps Wi-Fi", "Meals Included"],
          images: JSON.stringify([
            "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
          ]),
          rates: [
            { durationType: "DAILY", price: 750, depositAmount: 500, minDuration: 1, maxDuration: 14, notes: "Per bed daily." },
            { durationType: "WEEKLY", price: 4600, depositAmount: 1000, minDuration: 1, maxDuration: 6, notes: "Per bed weekly." },
            { durationType: "MONTHLY", price: 11500, depositAmount: 11500, minDuration: 1, maxDuration: 11, foodMonthlyCharge: 2500, notes: "Per bed monthly with meals." },
            { durationType: "YEARLY", price: 125000, depositAmount: 11500, minDuration: 1, maxDuration: 2, notes: "Per bed annual." },
          ],
        },
      ],
    },

    // 4. Pune — Koregaon Park
    {
      name: "Stayzy Botanica — Koregaon Park",
      slug: "stayzy-botanica-koregaon-park",
      tagline: "Leafy bohemian co-living oasis in the heart of KP Pune",
      description:
        "Surrounded by lush Banyan trees, independent coffee houses, and organic bistros. Stayzy Botanica features open-air workspaces, yoga studio, and artisanal kitchen.",
      address: "Lane 6, Koregaon Park, Near North Main Road",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      contactPhone: "+91 20 4930 7700",
      contactEmail: "koregaonpark@stayzy.in",
      rules: "Quiet hours: 10:30 PM to 6:30 AM. Green living principles: recycle and conserve power.",
      checkInTime: "12:00 PM",
      checkOutTime: "11:00 AM",
      timezone: "Asia/Kolkata",
      coverImage: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80",
      ]),
      locationCityId: puneCityId,
      roomTypes: [
        {
          name: "KP Garden Suite",
          slug: "kp-garden-suite",
          category: "PRIVATE",
          description: "Charming studio with private sit-out garden deck, rain shower, and sunny work nook.",
          sizeSqFt: 260,
          baseCapacity: 1,
          maxCapacity: 2,
          hasAc: true,
          bathroomType: "ATTACHED",
          foodIncluded: false,
          foodDetails: "Artisanal breakfast bowl subscription available",
          keyAmenities: ["Garden Sit-out", "Quiet AC", "Attached Rain Shower", "Ergonomic Desk", "300 Mbps Wi-Fi"],
          images: JSON.stringify([
            "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
          ]),
          rates: [
            { durationType: "HOURLY", price: 300, depositAmount: 0, minDuration: 2, maxDuration: 8, notes: "Day stay pod." },
            { durationType: "DAILY", price: 1600, depositAmount: 800, minDuration: 1, maxDuration: 21, notes: "Daily stay." },
            { durationType: "WEEKLY", price: 9800, depositAmount: 2000, minDuration: 1, maxDuration: 4, notes: "Weekly rate." },
            { durationType: "MONTHLY", price: 26000, depositAmount: 22000, minDuration: 1, maxDuration: 11, foodMonthlyCharge: 3500, notes: "Monthly lease." },
            { durationType: "YEARLY", price: 280000, depositAmount: 26000, minDuration: 1, maxDuration: 2, notes: "Annual lease." },
          ],
        },
        {
          name: "KP Twin Co-living Room",
          slug: "kp-twin-coliving-room",
          category: "TWIN_SHARING",
          description: "Comfortable twin room with solid pine beds, wide windows looking into the canopy, and attached washroom.",
          sizeSqFt: 250,
          baseCapacity: 1,
          maxCapacity: 2,
          hasAc: true,
          bathroomType: "ATTACHED",
          foodIncluded: true,
          foodDetails: "Daily healthy breakfast and home-style dinner included",
          keyAmenities: ["Attached Washroom", "Twin Work Desks", "Canopy View", "Air Conditioning", "Daily Housekeeping"],
          images: JSON.stringify([
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
          ]),
          rates: [
            { durationType: "DAILY", price: 950, depositAmount: 500, minDuration: 1, maxDuration: 14, notes: "Per bed daily." },
            { durationType: "WEEKLY", price: 5800, depositAmount: 1200, minDuration: 1, maxDuration: 8, notes: "Per bed weekly." },
            { durationType: "MONTHLY", price: 14500, depositAmount: 14500, minDuration: 1, maxDuration: 11, foodMonthlyCharge: 3000, notes: "Per bed with meals included." },
            { durationType: "YEARLY", price: 160000, depositAmount: 14500, minDuration: 1, maxDuration: 2, notes: "Per bed annual." },
          ],
        },
      ],
    },

    // 5. Chennai — OMR IT Corridor
    {
      name: "Stayzy Marina — OMR IT Corridor",
      slug: "stayzy-marina-omr-it-corridor",
      tagline: "Coastal-inspired modern co-living along Chennai's tech highway",
      description:
        "Strategically located on Old Mahabalipuram Road near Sholinganallur and Tidel Park. Features air-conditioned dining, indoor badminton court, and daily housekeeping.",
      address: "142, Rajiv Gandhi Salai (OMR), Near Sholinganallur Junction",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600119",
      contactPhone: "+91 44 4890 5500",
      contactEmail: "omr@stayzy.in",
      rules: "Quiet hours: 11:00 PM to 6:00 AM. 24/7 security with biometric attendance.",
      checkInTime: "12:00 PM",
      checkOutTime: "11:00 AM",
      timezone: "Asia/Kolkata",
      coverImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      ]),
      locationCityId: chennaiCityId,
      roomTypes: [
        {
          name: "OMR Executive Studio",
          slug: "omr-executive-studio",
          category: "PRIVATE",
          description: "Spacious individual studio with powerful AC, workstation, wardrobe, and attached bath with geyser.",
          sizeSqFt: 230,
          baseCapacity: 1,
          maxCapacity: 2,
          hasAc: true,
          bathroomType: "ATTACHED",
          foodIncluded: false,
          foodDetails: "Meal pass available with authentic South Indian & North Indian menus",
          keyAmenities: ["Attached Bathroom", "High-Speed Wi-Fi", "Inverter AC", "Smart TV", "Workstation"],
          images: JSON.stringify([
            "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
          ]),
          rates: [
            { durationType: "HOURLY", price: 280, depositAmount: 0, minDuration: 2, maxDuration: 8, notes: "Day stay pod." },
            { durationType: "DAILY", price: 1500, depositAmount: 700, minDuration: 1, maxDuration: 21, notes: "Daily stay." },
            { durationType: "WEEKLY", price: 9200, depositAmount: 1800, minDuration: 1, maxDuration: 4, notes: "Weekly rate." },
            { durationType: "MONTHLY", price: 24000, depositAmount: 20000, minDuration: 1, maxDuration: 11, foodMonthlyCharge: 3500, notes: "Monthly lease." },
            { durationType: "YEARLY", price: 260000, depositAmount: 24000, minDuration: 1, maxDuration: 2, notes: "Annual lease." },
          ],
        },
        {
          name: "OMR Twin Sharing IT Pod",
          slug: "omr-twin-sharing-it-pod",
          category: "TWIN_SHARING",
          description: "Comfortable twin sharing room with attached bathroom, twin study desks, and full meals package.",
          sizeSqFt: 240,
          baseCapacity: 1,
          maxCapacity: 2,
          hasAc: true,
          bathroomType: "ATTACHED",
          foodIncluded: true,
          foodDetails: "3 delicious home-cooked meals included daily",
          keyAmenities: ["Attached Washroom", "Twin Study Setup", "High Speed Wi-Fi", "Air Conditioning", "Daily Housekeeping"],
          images: JSON.stringify([
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
          ]),
          rates: [
            { durationType: "DAILY", price: 900, depositAmount: 500, minDuration: 1, maxDuration: 14, notes: "Per bed daily." },
            { durationType: "WEEKLY", price: 5500, depositAmount: 1200, minDuration: 1, maxDuration: 8, notes: "Per bed weekly." },
            { durationType: "MONTHLY", price: 13500, depositAmount: 13500, minDuration: 1, maxDuration: 11, foodMonthlyCharge: 3000, notes: "Per bed with meals included." },
            { durationType: "YEARLY", price: 150000, depositAmount: 13500, minDuration: 1, maxDuration: 2, notes: "Per bed annual." },
          ],
        },
      ],
    },
  ];

  for (const p of propertiesData) {
    const property = await prisma.property.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        address: p.address,
        city: p.city,
        state: p.state,
        pincode: p.pincode,
        contactPhone: p.contactPhone,
        contactEmail: p.contactEmail,
        rules: p.rules,
        checkInTime: p.checkInTime,
        checkOutTime: p.checkOutTime,
        timezone: p.timezone,
        coverImage: p.coverImage,
        images: p.images,
        locationCityId: p.locationCityId,
      },
      create: {
        name: p.name,
        slug: p.slug,
        tagline: p.tagline,
        description: p.description,
        address: p.address,
        city: p.city,
        state: p.state,
        pincode: p.pincode,
        contactPhone: p.contactPhone,
        contactEmail: p.contactEmail,
        rules: p.rules,
        checkInTime: p.checkInTime,
        checkOutTime: p.checkOutTime,
        timezone: p.timezone,
        coverImage: p.coverImage,
        images: p.images,
        locationCityId: p.locationCityId,
      },
    });

    console.log(`Upserted property: ${property.name} (${property.city})`);

    let floorCount = 1;
    for (const rt of p.roomTypes) {
      const roomType = await prisma.roomType.upsert({
        where: { slug: rt.slug },
        update: {
          name: rt.name,
          category: rt.category,
          description: rt.description,
          sizeSqFt: rt.sizeSqFt,
          baseCapacity: rt.baseCapacity,
          maxCapacity: rt.maxCapacity,
          hasAc: rt.hasAc,
          bathroomType: rt.bathroomType,
          foodIncluded: rt.foodIncluded,
          foodDetails: rt.foodDetails,
          keyAmenities: JSON.stringify(rt.keyAmenities),
          images: rt.images,
        },
        create: {
          propertyId: property.id,
          name: rt.name,
          slug: rt.slug,
          category: rt.category,
          description: rt.description,
          sizeSqFt: rt.sizeSqFt,
          baseCapacity: rt.baseCapacity,
          maxCapacity: rt.maxCapacity,
          hasAc: rt.hasAc,
          bathroomType: rt.bathroomType,
          foodIncluded: rt.foodIncluded,
          foodDetails: rt.foodDetails,
          keyAmenities: JSON.stringify(rt.keyAmenities),
          images: rt.images,
        },
      });

      // Upsert rate plans
      for (const r of rt.rates) {
        const existingPlan = await prisma.ratePlan.findFirst({
          where: {
            roomTypeId: roomType.id,
            durationType: r.durationType,
          },
        });

        if (existingPlan) {
          await prisma.ratePlan.update({
            where: { id: existingPlan.id },
            data: {
              price: r.price,
              depositAmount: r.depositAmount,
              minDuration: r.minDuration || 1,
              maxDuration: r.maxDuration || null,
              foodMonthlyCharge: r.foodMonthlyCharge || 0,
              notes: r.notes || null,
              isEnabled: true,
            },
          });
        } else {
          await prisma.ratePlan.create({
            data: {
              roomTypeId: roomType.id,
              durationType: r.durationType,
              price: r.price,
              depositAmount: r.depositAmount,
              minDuration: r.minDuration || 1,
              maxDuration: r.maxDuration || null,
              foodMonthlyCharge: r.foodMonthlyCharge || 0,
              notes: r.notes || null,
              isEnabled: true,
            },
          });
        }
      }

      // Check physical rooms
      const existingRooms = await prisma.room.findMany({
        where: { roomTypeId: roomType.id },
      });

      if (existingRooms.length === 0) {
        const physicalRoom = await prisma.room.create({
          data: {
            roomTypeId: roomType.id,
            roomNumber: `Room ${floorCount}01`,
            floor: floorCount,
            status: "ACTIVE",
          },
        });

        const unitsToCreate = rt.category === "PRIVATE" ? 1 : rt.category === "TWIN_SHARING" ? 2 : 3;
        for (let u = 1; u <= unitsToCreate; u++) {
          await prisma.inventoryUnit.create({
            data: {
              roomId: physicalRoom.id,
              identifier: rt.category === "PRIVATE" ? `Room ${floorCount}01` : `Bed ${u}`,
              isBed: rt.category !== "PRIVATE",
              status: "AVAILABLE",
            },
          });
        }
      }
      floorCount++;
    }
  }

  console.log("Successfully seeded rich multi-city property inventory!");
}

if (require.main === module) {
  seedMoreProperties()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
