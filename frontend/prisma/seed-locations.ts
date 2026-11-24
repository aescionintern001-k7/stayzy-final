import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedWorldwideLocations() {
  console.log("Seeding comprehensive worldwide location hierarchy (Countries, Regions, A-Z Cities)...");

  // 1. Countries
  const countriesData = [
    { code: "IN", name: "India" },
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "AE", name: "United Arab Emirates" },
    { code: "SG", name: "Singapore" },
    { code: "CA", name: "Canada" },
    { code: "DE", name: "Germany" },
    { code: "AU", name: "Australia" },
    { code: "FR", name: "France" },
    { code: "JP", name: "Japan" },
    { code: "NL", name: "Netherlands" },
    { code: "ES", name: "Spain" },
    { code: "IT", name: "Italy" },
    { code: "CH", name: "Switzerland" },
    { code: "IE", name: "Ireland" },
    { code: "NZ", name: "New Zealand" },
    { code: "MY", name: "Malaysia" },
    { code: "TH", name: "Thailand" },
    { code: "ID", name: "Indonesia" },
    { code: "ZA", name: "South Africa" },
    { code: "BR", name: "Brazil" },
    { code: "MX", name: "Mexico" },
    { code: "SE", name: "Sweden" },
    { code: "NO", name: "Norway" },
    { code: "DK", name: "Denmark" },
    { code: "CN", name: "China" },
    { code: "GR", name: "Greece" },
    { code: "HR", name: "Croatia" },
  ];

  const countryMap = new Map<string, string>();
  for (const c of countriesData) {
    const record = await prisma.locationCountry.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: { code: c.code, name: c.name },
    });
    countryMap.set(c.code, record.id);
  }

  // 2. Sample Regions
  const regionsData = [
    { countryCode: "IN", name: "Karnataka", code: "KA" },
    { countryCode: "IN", name: "Maharashtra", code: "MH" },
    { countryCode: "IN", name: "Delhi-NCR", code: "DL" },
    { countryCode: "IN", name: "Haryana", code: "HR" },
    { countryCode: "IN", name: "Uttar Pradesh", code: "UP" },
    { countryCode: "IN", name: "Telangana", code: "TG" },
    { countryCode: "IN", name: "Tamil Nadu", code: "TN" },
    { countryCode: "IN", name: "West Bengal", code: "WB" },
    { countryCode: "IN", name: "Gujarat", code: "GJ" },
    { countryCode: "IN", name: "Rajasthan", code: "RJ" },
    { countryCode: "IN", name: "Kerala", code: "KL" },
    { countryCode: "IN", name: "Punjab", code: "PB" },
    { countryCode: "US", name: "California", code: "CA" },
    { countryCode: "US", name: "New York", code: "NY" },
    { countryCode: "US", name: "Texas", code: "TX" },
    { countryCode: "US", name: "Illinois", code: "IL" },
    { countryCode: "US", name: "Washington", code: "WA" },
    { countryCode: "GB", name: "England", code: "ENG" },
    { countryCode: "GB", name: "Scotland", code: "SCT" },
    { countryCode: "DE", name: "Bavaria", code: "BY" },
    { countryCode: "DE", name: "Berlin", code: "BE" },
    { countryCode: "AE", name: "Dubai", code: "DXB" },
    { countryCode: "AE", name: "Abu Dhabi", code: "AUH" },
    { countryCode: "AU", name: "New South Wales", code: "NSW" },
    { countryCode: "AU", name: "Victoria", code: "VIC" },
    { countryCode: "CA", name: "Ontario", code: "ON" },
    { countryCode: "CA", name: "British Columbia", code: "BC" },
  ];

  const regionMap = new Map<string, string>();
  for (const r of regionsData) {
    const countryId = countryMap.get(r.countryCode);
    if (!countryId) continue;
    const record = await prisma.locationRegion.upsert({
      where: { countryId_name: { countryId, name: r.name } },
      update: { code: r.code },
      create: { countryId, name: r.name, code: r.code },
    });
    regionMap.set(`${r.countryCode}:${r.name}`, record.id);
  }

  // 3. Comprehensive Global Cities (Covering A through Z completely)
  const rawCities: Array<{
    name: string;
    country: string;
    region?: string;
    lat: number;
    lng: number;
    isPopular?: boolean;
  }> = [
    // A
    { name: "Adilabad", country: "IN", region: "Telangana", lat: 19.6641, lng: 78.532 },
    { name: "Adoni", country: "IN", region: "Telangana", lat: 15.6322, lng: 77.2728 },
    { name: "Agartala", country: "IN", lat: 23.8315, lng: 91.2868 },
    { name: "Agra", country: "IN", region: "Uttar Pradesh", lat: 27.1767, lng: 78.0081, isPopular: true },
    { name: "Ahmedabad", country: "IN", region: "Gujarat", lat: 23.0225, lng: 72.5714, isPopular: true },
    { name: "Ahmednagar", country: "IN", region: "Maharashtra", lat: 19.0948, lng: 74.748 },
    { name: "Ajmer", country: "IN", region: "Rajasthan", lat: 26.4499, lng: 74.6399 },
    { name: "Akanwali", country: "IN", region: "Punjab", lat: 29.9142, lng: 75.3854 },
    { name: "Akbarpur", country: "IN", region: "Uttar Pradesh", lat: 26.4385, lng: 82.5447 },
    { name: "Akola", country: "IN", region: "Maharashtra", lat: 20.7002, lng: 77.0082 },
    { name: "Alappuzha", country: "IN", region: "Kerala", lat: 9.4981, lng: 76.3388 },
    { name: "Aligarh", country: "IN", region: "Uttar Pradesh", lat: 27.8974, lng: 78.088 },
    { name: "Alipurduar", country: "IN", region: "West Bengal", lat: 26.4919, lng: 89.5271 },
    { name: "Alwar", country: "IN", region: "Rajasthan", lat: 27.553, lng: 76.6346 },
    { name: "Amarpatan", country: "IN", lat: 24.3167, lng: 80.9833 },
    { name: "Ambala", country: "IN", region: "Haryana", lat: 30.3782, lng: 76.7767 },
    { name: "Ambur", country: "IN", region: "Tamil Nadu", lat: 12.7904, lng: 78.7166 },
    { name: "Amethi", country: "IN", region: "Uttar Pradesh", lat: 26.1558, lng: 81.8159 },
    { name: "Amnour", country: "IN", lat: 25.8667, lng: 84.95 },
    { name: "Amravati", country: "IN", region: "Maharashtra", lat: 20.9374, lng: 77.7796 },
    { name: "Amreli", country: "IN", region: "Gujarat", lat: 21.6032, lng: 71.2221 },
    { name: "Amritsar", country: "IN", region: "Punjab", lat: 31.634, lng: 74.8723, isPopular: true },
    { name: "Anand", country: "IN", region: "Gujarat", lat: 22.5645, lng: 72.9289 },
    { name: "Anandapur", country: "IN", lat: 21.2167, lng: 86.1167 },
    { name: "Anandpur Sahib", country: "IN", region: "Punjab", lat: 31.2361, lng: 76.4989 },
    { name: "Anantapur", country: "IN", lat: 14.6819, lng: 77.6006 },
    { name: "Angul", country: "IN", lat: 20.8407, lng: 85.1017 },
    { name: "Ankleshwar", country: "IN", region: "Gujarat", lat: 21.6264, lng: 73.0039 },
    { name: "Arrah", country: "IN", lat: 25.556, lng: 84.6603 },
    { name: "Asansol", country: "IN", region: "West Bengal", lat: 23.6739, lng: 86.9524 },
    { name: "Aurangabad", country: "IN", region: "Maharashtra", lat: 19.8762, lng: 75.3433 },
    { name: "Ayodhya", country: "IN", region: "Uttar Pradesh", lat: 26.7922, lng: 82.1998, isPopular: true },
    { name: "Azamgarh", country: "IN", region: "Uttar Pradesh", lat: 26.0738, lng: 83.1859 },
    { name: "Amsterdam", country: "NL", lat: 52.3676, lng: 4.9041, isPopular: true },
    { name: "Austin", country: "US", region: "Texas", lat: 30.2672, lng: -97.7431, isPopular: true },
    { name: "Atlanta", country: "US", lat: 33.749, lng: -84.388, isPopular: true },
    { name: "Adelaide", country: "AU", lat: -34.9285, lng: 138.6007 },
    { name: "Auckland", country: "NZ", lat: -36.8485, lng: 174.7633, isPopular: true },
    { name: "Athens", country: "GR", lat: 37.9838, lng: 23.7275 },
    { name: "Abu Dhabi", country: "AE", region: "Abu Dhabi", lat: 24.4539, lng: 54.3773, isPopular: true },
    { name: "Antwerp", country: "NL", lat: 51.2194, lng: 4.4025 },

    // B
    { name: "Bengaluru", country: "IN", region: "Karnataka", lat: 12.9716, lng: 77.5946, isPopular: true },
    { name: "Bangalore", country: "IN", region: "Karnataka", lat: 12.9716, lng: 77.5946, isPopular: true },
    { name: "Bhopal", country: "IN", lat: 23.2599, lng: 77.4126, isPopular: true },
    { name: "Bhubaneswar", country: "IN", lat: 20.2961, lng: 85.8245, isPopular: true },
    { name: "Bikaner", country: "IN", region: "Rajasthan", lat: 28.0229, lng: 73.3119 },
    { name: "Bilaspur", country: "IN", lat: 22.0797, lng: 82.1409 },
    { name: "Bokaro", country: "IN", lat: 23.6693, lng: 86.1511 },
    { name: "Bareilly", country: "IN", region: "Uttar Pradesh", lat: 28.367, lng: 79.4304 },
    { name: "Belgaum", country: "IN", region: "Karnataka", lat: 15.8497, lng: 74.4977 },
    { name: "Bellary", country: "IN", region: "Karnataka", lat: 15.1394, lng: 76.9214 },
    { name: "Bhagalpur", country: "IN", lat: 25.2425, lng: 86.9842 },
    { name: "Bhavnagar", country: "IN", region: "Gujarat", lat: 21.7645, lng: 72.1519 },
    { name: "Bhilai", country: "IN", lat: 21.2167, lng: 81.3833 },
    { name: "Bhilwara", country: "IN", region: "Rajasthan", lat: 25.3407, lng: 74.6313 },
    { name: "Bhiwandi", country: "IN", region: "Maharashtra", lat: 19.2967, lng: 73.0631 },
    { name: "Bidar", country: "IN", region: "Karnataka", lat: 17.9104, lng: 77.5199 },
    { name: "Bijnor", country: "IN", region: "Uttar Pradesh", lat: 29.3724, lng: 78.1358 },
    { name: "Bodh Gaya", country: "IN", lat: 24.6961, lng: 84.9869 },
    { name: "Berlin", country: "DE", region: "Berlin", lat: 52.52, lng: 13.405, isPopular: true },
    { name: "Boston", country: "US", lat: 42.3601, lng: -71.0589, isPopular: true },
    { name: "Birmingham", country: "GB", region: "England", lat: 52.4862, lng: -1.8904 },
    { name: "Brisbane", country: "AU", lat: -27.4698, lng: 153.0251, isPopular: true },
    { name: "Bangkok", country: "TH", lat: 13.7563, lng: 100.5018, isPopular: true },
    { name: "Barcelona", country: "ES", lat: 41.3879, lng: 2.1699, isPopular: true },
    { name: "Brussels", country: "NL", lat: 50.8503, lng: 4.3517 },
    { name: "Budapest", country: "DE", lat: 47.4979, lng: 19.0402 },
    { name: "Bristol", country: "GB", region: "England", lat: 51.4545, lng: -2.5879 },

    // C
    { name: "Chennai", country: "IN", region: "Tamil Nadu", lat: 13.0827, lng: 80.2707, isPopular: true },
    { name: "Chandigarh", country: "IN", region: "Punjab", lat: 30.7333, lng: 76.7794, isPopular: true },
    { name: "Coimbatore", country: "IN", region: "Tamil Nadu", lat: 11.0168, lng: 76.9558, isPopular: true },
    { name: "Cuttack", country: "IN", lat: 20.4625, lng: 85.883 },
    { name: "Chittoor", country: "IN", lat: 13.2172, lng: 79.1003 },
    { name: "Cooch Behar", country: "IN", region: "West Bengal", lat: 26.3452, lng: 89.4482 },
    { name: "Calicut", country: "IN", region: "Kerala", lat: 11.2588, lng: 75.7804 },
    { name: "Chicago", country: "US", region: "Illinois", lat: 41.8781, lng: -87.6298, isPopular: true },
    { name: "Calgary", country: "CA", lat: 51.0447, lng: -114.0719, isPopular: true },
    { name: "Cape Town", country: "ZA", lat: -33.9249, lng: 18.4241, isPopular: true },
    { name: "Copenhagen", country: "DK", lat: 55.6761, lng: 12.5683, isPopular: true },
    { name: "Cologne", country: "DE", lat: 50.9375, lng: 6.9603 },
    { name: "Canberra", country: "AU", lat: -35.2809, lng: 149.13 },
    { name: "Cambridge", country: "GB", region: "England", lat: 52.2053, lng: 0.1218 },

    // D
    { name: "Delhi", country: "IN", region: "Delhi-NCR", lat: 28.7041, lng: 77.1025, isPopular: true },
    { name: "New Delhi", country: "IN", region: "Delhi-NCR", lat: 28.6139, lng: 77.209, isPopular: true },
    { name: "Dehradun", country: "IN", lat: 30.3165, lng: 78.0322, isPopular: true },
    { name: "Dhanbad", country: "IN", lat: 23.7957, lng: 86.4304 },
    { name: "Dharamshala", country: "IN", lat: 32.219, lng: 76.3234 },
    { name: "Dhule", country: "IN", region: "Maharashtra", lat: 20.9042, lng: 74.7749 },
    { name: "Dibrugarh", country: "IN", lat: 27.4728, lng: 94.912 },
    { name: "Durgapur", country: "IN", region: "West Bengal", lat: 23.5204, lng: 87.3119 },
    { name: "Davanagere", country: "IN", region: "Karnataka", lat: 14.4644, lng: 75.9218 },
    { name: "Dallas", country: "US", region: "Texas", lat: 32.7767, lng: -96.797, isPopular: true },
    { name: "Dublin", country: "IE", lat: 53.3498, lng: -6.2603, isPopular: true },
    { name: "Dubai", country: "AE", region: "Dubai", lat: 25.2048, lng: 55.2708, isPopular: true },
    { name: "Denver", country: "US", lat: 39.7392, lng: -104.9903, isPopular: true },
    { name: "Durban", country: "ZA", lat: -29.8587, lng: 31.0218 },
    { name: "Dortmund", country: "DE", lat: 51.5136, lng: 7.4653 },

    // E
    { name: "Ernakulam", country: "IN", region: "Kerala", lat: 9.9816, lng: 76.2999, isPopular: true },
    { name: "Erode", country: "IN", region: "Tamil Nadu", lat: 11.341, lng: 77.7172 },
    { name: "Eluru", country: "IN", lat: 16.7107, lng: 81.0952 },
    { name: "Etawah", country: "IN", region: "Uttar Pradesh", lat: 26.7769, lng: 79.0238 },
    { name: "Edinburgh", country: "GB", region: "Scotland", lat: 55.9533, lng: -3.1883, isPopular: true },
    { name: "Edmonton", country: "CA", lat: 53.5461, lng: -113.4938 },
    { name: "Eindhoven", country: "NL", lat: 51.4416, lng: 5.4697 },
    { name: "Essen", country: "DE", lat: 51.4556, lng: 7.0116 },
    { name: "Exeter", country: "GB", region: "England", lat: 50.7184, lng: -3.5339 },

    // F
    { name: "Faridabad", country: "IN", region: "Haryana", lat: 28.4089, lng: 77.3178 },
    { name: "Firozabad", country: "IN", region: "Uttar Pradesh", lat: 27.1593, lng: 78.3957 },
    { name: "Faizabad", country: "IN", region: "Uttar Pradesh", lat: 26.773, lng: 82.146 },
    { name: "Frankfurt", country: "DE", lat: 50.1109, lng: 8.6821, isPopular: true },
    { name: "Florence", country: "IT", lat: 43.7696, lng: 11.2558 },
    { name: "Fukuoka", country: "JP", lat: 33.5904, lng: 130.4017 },
    { name: "Fresno", country: "US", region: "California", lat: 36.7468, lng: -119.7726 },

    // G
    { name: "Gurgaon", country: "IN", region: "Haryana", lat: 28.4595, lng: 77.0266, isPopular: true },
    { name: "Gurugram", country: "IN", region: "Haryana", lat: 28.4595, lng: 77.0266, isPopular: true },
    { name: "Guwahati", country: "IN", lat: 26.1445, lng: 91.7362, isPopular: true },
    { name: "Gwalior", country: "IN", lat: 26.2183, lng: 78.1828 },
    { name: "Gaya", country: "IN", lat: 24.7914, lng: 85.0002 },
    { name: "Gandhinagar", country: "IN", region: "Gujarat", lat: 23.2156, lng: 72.6369 },
    { name: "Ghaziabad", country: "IN", region: "Uttar Pradesh", lat: 28.6692, lng: 77.4538 },
    { name: "Gorakhpur", country: "IN", region: "Uttar Pradesh", lat: 26.7606, lng: 83.3732 },
    { name: "Gulbarga", country: "IN", region: "Karnataka", lat: 17.3297, lng: 76.8343 },
    { name: "Guntur", country: "IN", lat: 16.3067, lng: 80.4365 },
    { name: "Geneva", country: "CH", lat: 46.2044, lng: 6.1432, isPopular: true },
    { name: "Glasgow", country: "GB", region: "Scotland", lat: 55.8642, lng: -4.2518 },
    { name: "Gold Coast", country: "AU", lat: -28.0167, lng: 153.4 },
    { name: "Guangzhou", country: "CN", lat: 23.1291, lng: 113.2644 },

    // H
    { name: "Hyderabad", country: "IN", region: "Telangana", lat: 17.385, lng: 78.4867, isPopular: true },
    { name: "Hubli", country: "IN", region: "Karnataka", lat: 15.3647, lng: 75.124 },
    { name: "Haridwar", country: "IN", lat: 29.9457, lng: 78.1642 },
    { name: "Hoshiarpur", country: "IN", region: "Punjab", lat: 31.5273, lng: 75.9149 },
    { name: "Haldwani", country: "IN", lat: 29.2183, lng: 79.513 },
    { name: "Hassan", country: "IN", region: "Karnataka", lat: 13.0033, lng: 76.1004 },
    { name: "Houston", country: "US", region: "Texas", lat: 29.7604, lng: -95.3698, isPopular: true },
    { name: "Hamburg", country: "DE", lat: 53.5511, lng: 9.9937, isPopular: true },
    { name: "Helsinki", country: "SE", lat: 60.1699, lng: 24.9384, isPopular: true },
    { name: "Hong Kong", country: "CN", lat: 22.3193, lng: 114.1694, isPopular: true },
    { name: "Hobart", country: "AU", lat: -42.8821, lng: 147.3272 },

    // I
    { name: "Indore", country: "IN", lat: 22.7196, lng: 75.8577, isPopular: true },
    { name: "Imphal", country: "IN", lat: 24.817, lng: 93.9368 },
    { name: "Itanagar", country: "IN", lat: 27.0844, lng: 93.6053 },
    { name: "Indianapolis", country: "US", lat: 39.7684, lng: -86.1581 },
    { name: "Innsbruck", country: "DE", lat: 47.2692, lng: 11.4041 },
    { name: "Istanbul", country: "GR", lat: 41.0082, lng: 28.9784, isPopular: true },
    { name: "Irvine", country: "US", region: "California", lat: 33.6846, lng: -117.8265 },

    // J
    { name: "Jaipur", country: "IN", region: "Rajasthan", lat: 26.9124, lng: 75.7873, isPopular: true },
    { name: "Jalandhar", country: "IN", region: "Punjab", lat: 31.326, lng: 75.5762 },
    { name: "Jammu", country: "IN", lat: 32.7266, lng: 74.857 },
    { name: "Jamnagar", country: "IN", region: "Gujarat", lat: 22.4707, lng: 70.0577 },
    { name: "Jamshedpur", country: "IN", lat: 22.8046, lng: 86.2029 },
    { name: "Jhansi", country: "IN", region: "Uttar Pradesh", lat: 25.4484, lng: 78.5685 },
    { name: "Jodhpur", country: "IN", region: "Rajasthan", lat: 26.2389, lng: 73.0243, isPopular: true },
    { name: "Jabalpur", country: "IN", lat: 23.1815, lng: 79.9864 },
    { name: "Jakarta", country: "ID", lat: -6.2088, lng: 106.8456, isPopular: true },
    { name: "Johannesburg", country: "ZA", lat: -26.2041, lng: 28.0473, isPopular: true },
    { name: "Jersey City", country: "US", lat: 40.7178, lng: -74.0431 },

    // K
    { name: "Kolkata", country: "IN", region: "West Bengal", lat: 22.5726, lng: 88.3639, isPopular: true },
    { name: "Kochi", country: "IN", region: "Kerala", lat: 9.9312, lng: 76.2673, isPopular: true },
    { name: "Kanpur", country: "IN", region: "Uttar Pradesh", lat: 26.4499, lng: 80.3319 },
    { name: "Kozhikode", country: "IN", region: "Kerala", lat: 11.2588, lng: 75.7804 },
    { name: "Kota", country: "IN", region: "Rajasthan", lat: 25.2138, lng: 75.8648 },
    { name: "Kolhapur", country: "IN", region: "Maharashtra", lat: 16.705, lng: 74.2433 },
    { name: "Kakinada", country: "IN", lat: 16.9891, lng: 82.2475 },
    { name: "Kannur", country: "IN", region: "Kerala", lat: 11.8745, lng: 75.3704 },
    { name: "Karnal", country: "IN", region: "Haryana", lat: 29.6857, lng: 76.9905 },
    { name: "Kyoto", country: "JP", lat: 35.0116, lng: 135.7681, isPopular: true },
    { name: "Kansas City", country: "US", lat: 39.0997, lng: -94.5786 },
    { name: "Kuala Lumpur", country: "MY", lat: 3.139, lng: 101.6869, isPopular: true },

    // L
    { name: "Lucknow", country: "IN", region: "Uttar Pradesh", lat: 26.8467, lng: 80.9462, isPopular: true },
    { name: "Ludhiana", country: "IN", region: "Punjab", lat: 30.901, lng: 75.8573 },
    { name: "Latur", country: "IN", region: "Maharashtra", lat: 18.4088, lng: 76.5604 },
    { name: "Leh", country: "IN", lat: 34.1526, lng: 77.5771, isPopular: true },
    { name: "London", country: "GB", region: "England", lat: 51.5074, lng: -0.1278, isPopular: true },
    { name: "Los Angeles", country: "US", region: "California", lat: 34.0522, lng: -118.2437, isPopular: true },
    { name: "Lisbon", country: "ES", lat: 38.7223, lng: -9.1393, isPopular: true },
    { name: "Liverpool", country: "GB", region: "England", lat: 53.4084, lng: -2.9916 },
    { name: "Lyon", country: "FR", lat: 45.764, lng: 4.8357 },
    { name: "Leeds", country: "GB", region: "England", lat: 53.8008, lng: -1.5491 },

    // M
    { name: "Mumbai", country: "IN", region: "Maharashtra", lat: 19.076, lng: 72.8777, isPopular: true },
    { name: "Madurai", country: "IN", region: "Tamil Nadu", lat: 9.9252, lng: 78.1198 },
    { name: "Mangalore", country: "IN", region: "Karnataka", lat: 12.9141, lng: 74.856, isPopular: true },
    { name: "Meerut", country: "IN", region: "Uttar Pradesh", lat: 28.9845, lng: 77.7064 },
    { name: "Mysore", country: "IN", region: "Karnataka", lat: 12.2958, lng: 76.6394, isPopular: true },
    { name: "Moradabad", country: "IN", region: "Uttar Pradesh", lat: 28.8351, lng: 78.7747 },
    { name: "Muzaffarpur", country: "IN", lat: 26.1209, lng: 85.3647 },
    { name: "Mathura", country: "IN", region: "Uttar Pradesh", lat: 27.4924, lng: 77.6737 },
    { name: "Munich", country: "DE", region: "Bavaria", lat: 48.1351, lng: 11.582, isPopular: true },
    { name: "Madrid", country: "ES", lat: 40.4168, lng: -3.7038, isPopular: true },
    { name: "Melbourne", country: "AU", region: "Victoria", lat: -37.8136, lng: 144.9631, isPopular: true },
    { name: "Manchester", country: "GB", region: "England", lat: 53.4808, lng: -2.2426, isPopular: true },
    { name: "Montreal", country: "CA", lat: 45.5017, lng: -73.5673, isPopular: true },
    { name: "Milan", country: "IT", lat: 45.4642, lng: 9.19, isPopular: true },
    { name: "Miami", country: "US", lat: 25.7617, lng: -80.1918, isPopular: true },

    // N
    { name: "Noida", country: "IN", region: "Uttar Pradesh", lat: 28.5355, lng: 77.391, isPopular: true },
    { name: "Greater Noida", country: "IN", region: "Uttar Pradesh", lat: 28.4744, lng: 77.504 },
    { name: "Nagpur", country: "IN", region: "Maharashtra", lat: 21.1458, lng: 79.0882, isPopular: true },
    { name: "Nashik", country: "IN", region: "Maharashtra", lat: 19.9975, lng: 73.7898 },
    { name: "Nanded", country: "IN", region: "Maharashtra", lat: 19.1383, lng: 77.321 },
    { name: "Nellore", country: "IN", lat: 14.4426, lng: 79.9865 },
    { name: "New York", country: "US", region: "New York", lat: 40.7128, lng: -74.006, isPopular: true },
    { name: "Nashville", country: "US", lat: 36.1627, lng: -86.7816 },
    { name: "Nuremberg", country: "DE", region: "Bavaria", lat: 49.4521, lng: 11.0767 },
    { name: "Nice", country: "FR", lat: 43.7102, lng: 7.262 },
    { name: "Nagoya", country: "JP", lat: 35.1815, lng: 136.9066 },

    // O
    { name: "Ooty", country: "IN", region: "Tamil Nadu", lat: 11.4102, lng: 76.695, isPopular: true },
    { name: "Osmanabad", country: "IN", region: "Maharashtra", lat: 18.1856, lng: 76.0418 },
    { name: "Ongole", country: "IN", lat: 15.5057, lng: 80.0499 },
    { name: "Oslo", country: "NO", lat: 59.9139, lng: 10.7522, isPopular: true },
    { name: "Orlando", country: "US", lat: 28.5383, lng: -81.3792, isPopular: true },
    { name: "Osaka", country: "JP", lat: 34.6937, lng: 135.5023, isPopular: true },
    { name: "Oxford", country: "GB", region: "England", lat: 51.752, lng: -1.2577 },
    { name: "Ottawa", country: "CA", region: "Ontario", lat: 45.4215, lng: -75.6972 },

    // P
    { name: "Pune", country: "IN", region: "Maharashtra", lat: 18.5204, lng: 73.8567, isPopular: true },
    { name: "Patna", country: "IN", lat: 25.5941, lng: 85.1376, isPopular: true },
    { name: "Panaji", country: "IN", lat: 15.4909, lng: 73.8278, isPopular: true },
    { name: "Pondicherry", country: "IN", region: "Tamil Nadu", lat: 11.9416, lng: 79.8083, isPopular: true },
    { name: "Prayagraj", country: "IN", region: "Uttar Pradesh", lat: 25.4358, lng: 81.8463 },
    { name: "Puri", country: "IN", lat: 19.8135, lng: 85.8312 },
    { name: "Panipat", country: "IN", region: "Haryana", lat: 29.3909, lng: 76.9635 },
    { name: "Patiala", country: "IN", region: "Punjab", lat: 30.3398, lng: 76.3869 },
    { name: "Paris", country: "FR", lat: 48.8566, lng: 2.3522, isPopular: true },
    { name: "Phoenix", country: "US", lat: 33.4484, lng: -112.074, isPopular: true },
    { name: "Perth", country: "AU", lat: -31.9505, lng: 115.8605, isPopular: true },
    { name: "Prague", country: "DE", lat: 50.0755, lng: 14.4378, isPopular: true },
    { name: "Porto", country: "ES", lat: 41.1579, lng: -8.6291 },

    // Q
    { name: "Qadian", country: "IN", region: "Punjab", lat: 31.8167, lng: 75.2833 },
    { name: "Quilandy", country: "IN", region: "Kerala", lat: 11.4395, lng: 75.6961 },
    { name: "Quebec City", country: "CA", lat: 46.8139, lng: -71.208 },
    { name: "Quito", country: "BR", lat: -0.1807, lng: -78.4678 },
    { name: "Qingdao", country: "CN", lat: 36.0671, lng: 120.3826 },
    { name: "Queenstown", country: "NZ", lat: -45.0312, lng: 168.6626 },

    // R
    { name: "Raipur", country: "IN", lat: 21.2514, lng: 81.6296 },
    { name: "Rajkot", country: "IN", region: "Gujarat", lat: 22.3039, lng: 70.8022 },
    { name: "Ranchi", country: "IN", lat: 23.3441, lng: 85.3096, isPopular: true },
    { name: "Rourkela", country: "IN", lat: 22.2604, lng: 84.8536 },
    { name: "Rohtak", country: "IN", region: "Haryana", lat: 28.8955, lng: 76.6066 },
    { name: "Rishikesh", country: "IN", lat: 30.0869, lng: 78.2676, isPopular: true },
    { name: "Rome", country: "IT", lat: 41.9028, lng: 12.4964, isPopular: true },
    { name: "Rotterdam", country: "NL", lat: 51.9244, lng: 4.4777 },
    { name: "Raleigh", country: "US", lat: 35.7796, lng: -78.6382 },
    { name: "Reykjavik", country: "NO", lat: 64.1466, lng: -21.9426 },
    { name: "Rio de Janeiro", country: "BR", lat: -22.9068, lng: -43.1729, isPopular: true },

    // S
    { name: "Surat", country: "IN", region: "Gujarat", lat: 21.1702, lng: 72.8311, isPopular: true },
    { name: "Srinagar", country: "IN", lat: 34.0837, lng: 74.7973, isPopular: true },
    { name: "Shimla", country: "IN", lat: 31.1048, lng: 77.1734, isPopular: true },
    { name: "Siliguri", country: "IN", region: "West Bengal", lat: 26.7271, lng: 88.3953 },
    { name: "Salem", country: "IN", region: "Tamil Nadu", lat: 11.6643, lng: 78.146 },
    { name: "Saharanpur", country: "IN", region: "Uttar Pradesh", lat: 29.9671, lng: 77.5452 },
    { name: "Shillong", country: "IN", lat: 25.5788, lng: 91.8933 },
    { name: "Solapur", country: "IN", region: "Maharashtra", lat: 17.6599, lng: 75.9064 },
    { name: "San Francisco", country: "US", region: "California", lat: 37.7749, lng: -122.4194, isPopular: true },
    { name: "Sydney", country: "AU", region: "New South Wales", lat: -33.8688, lng: 151.2093, isPopular: true },
    { name: "Singapore", country: "SG", lat: 1.3521, lng: 103.8198, isPopular: true },
    { name: "Seattle", country: "US", region: "Washington", lat: 47.6062, lng: -122.3321, isPopular: true },
    { name: "Stockholm", country: "SE", lat: 59.3293, lng: 18.0686, isPopular: true },
    { name: "Seoul", country: "JP", lat: 37.5665, lng: 126.978, isPopular: true },
    { name: "Stuttgart", country: "DE", lat: 48.7758, lng: 9.1829 },

    // T
    { name: "Thiruvananthapuram", country: "IN", region: "Kerala", lat: 8.5241, lng: 76.9366, isPopular: true },
    { name: "Thane", country: "IN", region: "Maharashtra", lat: 19.2183, lng: 72.9781 },
    { name: "Tiruchirappalli", country: "IN", region: "Tamil Nadu", lat: 10.7905, lng: 78.7047 },
    { name: "Tirupati", country: "IN", lat: 13.6288, lng: 79.4192, isPopular: true },
    { name: "Thrissur", country: "IN", region: "Kerala", lat: 10.5276, lng: 76.2144 },
    { name: "Tokyo", country: "JP", lat: 35.6762, lng: 139.6503, isPopular: true },
    { name: "Toronto", country: "CA", region: "Ontario", lat: 43.6532, lng: -79.3832, isPopular: true },
    { name: "Tampa", country: "US", lat: 27.9506, lng: -82.4572 },
    { name: "Turin", country: "IT", lat: 45.0703, lng: 7.6869 },
    { name: "Taipei", country: "JP", lat: 25.033, lng: 121.5654 },

    // U
    { name: "Udaipur", country: "IN", region: "Rajasthan", lat: 24.5854, lng: 73.7125, isPopular: true },
    { name: "Ujjain", country: "IN", lat: 23.1765, lng: 75.7885 },
    { name: "Udupi", country: "IN", region: "Karnataka", lat: 13.3409, lng: 74.7421 },
    { name: "Ulhasnagar", country: "IN", region: "Maharashtra", lat: 19.2215, lng: 73.1645 },
    { name: "Utrecht", country: "NL", lat: 52.0907, lng: 5.1214 },
    { name: "Ulsan", country: "JP", lat: 35.5384, lng: 129.3114 },
    { name: "Umea", country: "SE", lat: 63.8258, lng: 20.263 },

    // V
    { name: "Varanasi", country: "IN", region: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, isPopular: true },
    { name: "Vadodara", country: "IN", region: "Gujarat", lat: 22.3072, lng: 73.1812 },
    { name: "Vijayawada", country: "IN", lat: 16.5062, lng: 80.648 },
    { name: "Visakhapatnam", country: "IN", lat: 17.6868, lng: 83.2185, isPopular: true },
    { name: "Vellore", country: "IN", region: "Tamil Nadu", lat: 12.9165, lng: 79.1325 },
    { name: "Vancouver", country: "CA", region: "British Columbia", lat: 49.2827, lng: -123.1207, isPopular: true },
    { name: "Vienna", country: "DE", lat: 48.2082, lng: 16.3738, isPopular: true },
    { name: "Valencia", country: "ES", lat: 39.4699, lng: -0.3763 },
    { name: "Venice", country: "IT", lat: 45.4408, lng: 12.3155 },

    // W
    { name: "Warangal", country: "IN", region: "Telangana", lat: 17.9689, lng: 79.5941 },
    { name: "Wardha", country: "IN", region: "Maharashtra", lat: 20.7453, lng: 78.6022 },
    { name: "Wayanad", country: "IN", region: "Kerala", lat: 11.6854, lng: 76.132, isPopular: true },
    { name: "Washington D.C.", country: "US", lat: 38.9072, lng: -77.0369, isPopular: true },
    { name: "Warsaw", country: "DE", lat: 52.2297, lng: 21.0122 },
    { name: "Wellington", country: "NZ", lat: -41.2865, lng: 174.7762 },
    { name: "Winnipeg", country: "CA", lat: 49.8951, lng: -97.1384 },

    // X
    { name: "Xiamen", country: "CN", lat: 24.4798, lng: 118.0894 },
    { name: "Xi'an", country: "CN", lat: 34.3416, lng: 108.9398, isPopular: true },
    { name: "Xining", country: "CN", lat: 36.6232, lng: 101.7789 },
    { name: "Xalapa", country: "MX", lat: 19.5438, lng: -96.9102 },
    { name: "Xanthi", country: "GR", lat: 41.1349, lng: 24.888 },

    // Y
    { name: "Yamunanagar", country: "IN", region: "Haryana", lat: 30.129, lng: 77.2674 },
    { name: "Yavatmal", country: "IN", region: "Maharashtra", lat: 20.3888, lng: 78.1204 },
    { name: "Yokohama", country: "JP", lat: 35.4437, lng: 139.638, isPopular: true },
    { name: "York", country: "GB", region: "England", lat: 53.9599, lng: -1.0873 },
    { name: "Yangon", country: "TH", lat: 16.8661, lng: 96.1951 },

    // Z
    { name: "Zirakpur", country: "IN", region: "Punjab", lat: 30.6425, lng: 76.8173 },
    { name: "Zurich", country: "CH", lat: 47.3769, lng: 8.5417, isPopular: true },
    { name: "Zagreb", country: "HR", lat: 45.815, lng: 15.9819 },
    { name: "Zaragoza", country: "ES", lat: 41.6488, lng: -0.8891 },
    { name: "Zadar", country: "HR", lat: 44.1194, lng: 15.2314 },
  ];

  console.log(`Inserting/updating ${rawCities.length} global cities...`);

  let count = 0;
  for (const c of rawCities) {
    const countryId = countryMap.get(c.country);
    if (!countryId) continue;

    const regionKey = c.region ? `${c.country}:${c.region}` : null;
    const regionId = regionKey ? regionMap.get(regionKey) || null : null;

    const firstLetter = c.name.trim().charAt(0).toUpperCase();
    const slug = `${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${c.country.toLowerCase()}`;

    await prisma.locationCity.upsert({
      where: { slug },
      update: {
        name: c.name,
        countryId,
        regionId,
        latitude: c.lat,
        longitude: c.lng,
        firstLetter,
        isPopular: c.isPopular || false,
      },
      create: {
        name: c.name,
        slug,
        countryId,
        regionId,
        latitude: c.lat,
        longitude: c.lng,
        firstLetter,
        isPopular: c.isPopular || false,
      },
    });
    count++;
  }

  // Link existing properties to their location cities
  const blrCity = await prisma.locationCity.findFirst({ where: { name: "Bengaluru" } });
  if (blrCity) {
    await prisma.property.updateMany({
      where: { city: "Bengaluru" },
      data: { locationCityId: blrCity.id },
    });
  }

  console.log(`Successfully seeded ${count} worldwide location cities across A-Z!`);
}

// Auto run if called directly
if (require.main === module) {
  seedWorldwideLocations()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

