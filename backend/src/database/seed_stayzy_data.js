import bcrypt from "bcrypt";
import pool from "./pool.js";

export async function seedStayzyData() {
  const client = await pool.connect();
  try {
    console.log("=== Seeding Stayzy Comprehensive Production-Ready Data ===");
    await client.query("BEGIN");

    // 1. Create or update Default Users with bcrypt
    const passwordHash = await bcrypt.hash("Password123!", 10);
    const adminPasswordHash = await bcrypt.hash("AdminPassword123!", 10);

    // Admin user
    const adminRes = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role, account_status, is_email_verified, phone)
      VALUES ('Stayzy Admin', 'admin@stayzy.com', $1, 'admin', 'active', true, '+919876543210')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
      RETURNING id
    `, [adminPasswordHash]);
    const adminId = adminRes.rows[0].id;

    // Host user
    const hostRes = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role, account_status, is_email_verified, phone)
      VALUES ('Rajesh Kumar (Stayzy Partner)', 'host@stayzy.com', $1, 'host', 'active', true, '+919876500001')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'host'
      RETURNING id
    `, [passwordHash]);
    const hostId = hostRes.rows[0].id;

    // Resident guest user
    const guestRes = await client.query(`
      INSERT INTO users (full_name, email, password_hash, role, account_status, is_email_verified, phone)
      VALUES ('Aarav Sharma', 'aarav.sharma@example.com', $1, 'guest', 'active', true, '+919876512345')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'guest'
      RETURNING id
    `, [passwordHash]);
    const guestId = guestRes.rows[0].id;

    console.log("[PASS] Seeded Admin, Host, and Resident users.");

    // 2. Define Properties to seed
    const propertiesData = [
      {
        title: "Stayzy Haven — Koramangala",
        description: "Prime co-living nestled near 80 Feet Road & Sony World Signal. Featuring 300 Mbps Wi-Fi, ergonomic work pods, rooftop cafe terrace, and daily nutritious home-cooked meals.",
        property_type: "apartment",
        room_type: "private_room",
        price_per_night: 1200.00,
        address: "Plot 42, 4th Block, 80 Feet Road, Near Sony Signal, Koramangala",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        postal_code: "560034",
        latitude: 12.9352,
        longitude: 77.6245,
        amenities: ["WiFi", "AC", "Power Backup", "Housekeeping", "Food Included", "Washing Machine", "Gym", "CCTV"],
        images: [
          "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"
        ],
        roomTypes: [
          {
            name: "Master Executive Private Room",
            slug: "stayzy-haven-koramangala-private-suite",
            category: "PRIVATE",
            description: "Spacious private bedroom with king-size posturepedic bed, ergonomic desk, private balcony, and attached bathroom.",
            size_sq_ft: 220,
            base_capacity: 1,
            max_capacity: 2,
            has_ac: true,
            bathroom_type: "ATTACHED",
            food_included: true,
            food_details: "Nutritious breakfast and dinner buffet included daily.",
            amenities: ["AC", "Attached Washroom", "High-Speed WiFi", "Ergonomic Desk", "Balcony", "Smart TV"],
            images: [
              "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
              "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80"
            ],
            rates: [
              { duration_type: "HOURLY", price: 150.00, min_duration: 3, max_duration: 12, deposit_amount: 0 },
              { duration_type: "DAILY", price: 1200.00, min_duration: 1, max_duration: 29, deposit_amount: 500 },
              { duration_type: "WEEKLY", price: 7200.00, min_duration: 1, max_duration: 12, deposit_amount: 2000 },
              { duration_type: "MONTHLY", price: 22000.00, min_duration: 1, max_duration: 24, deposit_amount: 10000, food_monthly_charge: 3500 },
              { duration_type: "YEARLY", price: 240000.00, min_duration: 1, max_duration: 3, deposit_amount: 20000 }
            ]
          },
          {
            name: "Co-Living Twin Sharing Room",
            slug: "stayzy-haven-koramangala-twin-sharing",
            category: "TWIN_SHARING",
            description: "Comfortable shared twin room with private wardrobes, individual study desks, and high-speed Wi-Fi.",
            size_sq_ft: 260,
            base_capacity: 1,
            max_capacity: 2,
            has_ac: true,
            bathroom_type: "ATTACHED",
            food_included: true,
            food_details: "Breakfast, lunch (weekends), and dinner buffet.",
            amenities: ["AC", "Attached Washroom", "Dedicated Wardrobe", "Study Desk", "High-Speed WiFi"],
            images: [
              "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
              "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80"
            ],
            rates: [
              { duration_type: "HOURLY", price: 100.00, min_duration: 3, max_duration: 12, deposit_amount: 0 },
              { duration_type: "DAILY", price: 750.00, min_duration: 1, max_duration: 29, deposit_amount: 300 },
              { duration_type: "WEEKLY", price: 4500.00, min_duration: 1, max_duration: 12, deposit_amount: 1500 },
              { duration_type: "MONTHLY", price: 14000.00, min_duration: 1, max_duration: 24, deposit_amount: 7000, food_monthly_charge: 3000 },
              { duration_type: "YEARLY", price: 150000.00, min_duration: 1, max_duration: 3, deposit_amount: 14000 }
            ]
          }
        ]
      },
      {
        title: "Stayzy Heights — HSR Layout",
        description: "Serene co-living retreat in Sector 2, near 27th Main. Offers tranquil living with leafy avenue views, an indoor gym, communal kitchen, and seamless connectivity to Electronic City.",
        property_type: "apartment",
        room_type: "private_room",
        price_per_night: 1100.00,
        address: "189, 17th Cross, Sector 2, HSR Layout",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        postal_code: "560102",
        latitude: 12.9116,
        longitude: 77.6389,
        amenities: ["WiFi", "AC", "Gym", "Power Backup", "Housekeeping", "Terrace Garden", "Security"],
        images: [
          "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"
        ],
        roomTypes: [
          {
            name: "Deluxe Studio Room",
            slug: "stayzy-heights-hsr-studio",
            category: "PRIVATE",
            description: "Modern studio with attached washroom, kitchenette, and private balcony overlooking park.",
            size_sq_ft: 240,
            base_capacity: 1,
            max_capacity: 2,
            has_ac: true,
            bathroom_type: "ATTACHED",
            food_included: false,
            amenities: ["AC", "Attached Washroom", "Kitchenette", "Balcony", "WiFi"],
            images: [
              "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
            ],
            rates: [
              { duration_type: "DAILY", price: 1100.00, min_duration: 1, max_duration: 30, deposit_amount: 500 },
              { duration_type: "MONTHLY", price: 21000.00, min_duration: 1, max_duration: 24, deposit_amount: 10000 }
            ]
          }
        ]
      },
      {
        title: "Stayzy Cyberhub — Gurugram",
        description: "Steps from DLF Cyber City and Rapid Metro. Premium corporate coliving equipped with meeting rooms, barista bar, and high-speed fiber.",
        property_type: "condo",
        room_type: "private_room",
        price_per_night: 1800.00,
        address: "DLF Phase 2, Sector 25, Near Cyber City",
        city: "Gurugram",
        state: "Haryana",
        country: "India",
        postal_code: "122002",
        latitude: 28.4900,
        longitude: 77.0890,
        amenities: ["WiFi", "AC", "Meeting Pods", "Housekeeping", "Power Backup", "Gym", "Lounge"],
        images: [
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
        ],
        roomTypes: [
          {
            name: "Corporate Executive Suite",
            slug: "stayzy-cyberhub-executive-suite",
            category: "PRIVATE",
            description: "High-floor suite with skyline views, acoustic insulation, soundproof work pod, and 24/7 room service.",
            size_sq_ft: 280,
            base_capacity: 1,
            max_capacity: 2,
            has_ac: true,
            bathroom_type: "ATTACHED",
            food_included: true,
            food_details: "Continental breakfast and dinner.",
            amenities: ["AC", "Attached Washroom", "Acoustic Insulation", "Fast Fiber", "Concierge"],
            images: [
              "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
            ],
            rates: [
              { duration_type: "HOURLY", price: 250.00, min_duration: 2, max_duration: 8, deposit_amount: 0 },
              { duration_type: "DAILY", price: 1800.00, min_duration: 1, max_duration: 30, deposit_amount: 1000 },
              { duration_type: "MONTHLY", price: 35000.00, min_duration: 1, max_duration: 12, deposit_amount: 20000 }
            ]
          }
        ]
      },
      {
        title: "Stayzy Silicon — Hitec City",
        description: "Tech-oriented coliving right beside Mindspace and Cyber Towers. Ideal for tech professionals seeking ultra-reliable connectivity and community events.",
        property_type: "apartment",
        room_type: "shared_room",
        price_per_night: 950.00,
        address: "Madhapur Main Road, Near Mindspace Junction, Hitec City",
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        postal_code: "500081",
        latitude: 17.4435,
        longitude: 78.3772,
        amenities: ["WiFi", "AC", "Coworking Space", "Power Backup", "Games Room", "Housekeeping"],
        images: [
          "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
        ],
        roomTypes: [
          {
            name: "Hitec Shared Studio Bed",
            slug: "stayzy-hitec-shared-bed",
            category: "TWIN_SHARING",
            description: "Spacious twin bed configuration with locker storage, study lamp, and high-speed connectivity.",
            size_sq_ft: 220,
            base_capacity: 1,
            max_capacity: 2,
            has_ac: true,
            bathroom_type: "ATTACHED",
            food_included: true,
            amenities: ["AC", "Attached Washroom", "Locker", "Study Lamp", "WiFi"],
            images: [
              "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80"
            ],
            rates: [
              { duration_type: "DAILY", price: 950.00, min_duration: 1, max_duration: 30, deposit_amount: 400 },
              { duration_type: "MONTHLY", price: 13500.00, min_duration: 1, max_duration: 24, deposit_amount: 6000 }
            ]
          }
        ]
      }
    ];

    for (const prop of propertiesData) {
      // Check if property exists by title
      const existingProp = await client.query(
        "SELECT id FROM properties WHERE title = $1 LIMIT 1",
        [prop.title]
      );

      let propertyId;
      if (existingProp.rows.length > 0) {
        propertyId = existingProp.rows[0].id;
        await client.query(`
          UPDATE properties
          SET description = $1, price_per_night = $2, address = $3, city = $4,
              state = $5, country = $6, postal_code = $7, latitude = $8, longitude = $9,
              amenities = $10::jsonb, images = $11::jsonb, status = 'active', is_available = true,
              average_rating = 4.85, reviews_count = 14
          WHERE id = $12
        `, [
          prop.description, prop.price_per_night, prop.address, prop.city,
          prop.state, prop.country, prop.postal_code, prop.latitude, prop.longitude,
          JSON.stringify(prop.amenities), JSON.stringify(prop.images), propertyId
        ]);
      } else {
        const insertRes = await client.query(`
          INSERT INTO properties (
            host_id, title, description, property_type, room_type, price_per_night,
            currency, address, city, state, country, postal_code, latitude, longitude,
            amenities, images, status, is_available, average_rating, reviews_count
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, 'INR', $7, $8, $9, $10, $11, $12, $13,
            $14::jsonb, $15::jsonb, 'active', true, 4.85, 14
          )
          RETURNING id
        `, [
          hostId, prop.title, prop.description, prop.property_type, prop.room_type,
          prop.price_per_night, prop.address, prop.city, prop.state, prop.country,
          prop.postal_code, prop.latitude, prop.longitude, JSON.stringify(prop.amenities),
          JSON.stringify(prop.images)
        ]);
        propertyId = insertRes.rows[0].id;
      }

      // Insert RoomTypes & RatePlans
      for (const rt of prop.roomTypes) {
        const rtRes = await client.query(`
          INSERT INTO room_types (
            property_id, name, slug, category, description, size_sq_ft,
            base_capacity, max_capacity, has_ac, bathroom_type, food_included,
            food_details, amenities, images
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name, description = EXCLUDED.description,
            amenities = EXCLUDED.amenities, images = EXCLUDED.images
          RETURNING id
        `, [
          propertyId, rt.name, rt.slug, rt.category, rt.description, rt.size_sq_ft,
          rt.base_capacity, rt.max_capacity, rt.has_ac, rt.bathroom_type,
          rt.food_included, rt.food_details || null, JSON.stringify(rt.amenities),
          JSON.stringify(rt.images)
        ]);
        const roomTypeId = rtRes.rows[0].id;

        // Insert Rate Plans
        for (const rate of rt.rates) {
          await client.query(`
            INSERT INTO rate_plans (
              room_type_id, duration_type, price, is_enabled, min_duration,
              max_duration, deposit_amount, food_monthly_charge
            )
            VALUES ($1, $2, $3, true, $4, $5, $6, $7)
            ON CONFLICT (room_type_id, duration_type) DO UPDATE SET
              price = EXCLUDED.price,
              min_duration = EXCLUDED.min_duration,
              max_duration = EXCLUDED.max_duration,
              deposit_amount = EXCLUDED.deposit_amount,
              food_monthly_charge = EXCLUDED.food_monthly_charge
          `, [
            roomTypeId, rate.duration_type, rate.price, rate.min_duration,
            rate.max_duration || null, rate.deposit_amount || 0, rate.food_monthly_charge || 0
          ]);
        }

        // Insert physical room and 2 inventory units
        const roomRes = await client.query(`
          INSERT INTO rooms (room_type_id, room_number, floor, status)
          VALUES ($1, '101', 1, 'active')
          RETURNING id
        `, [roomTypeId]);
        const roomId = roomRes.rows[0].id;

        await client.query(`
          INSERT INTO inventory_units (room_id, identifier, is_bed, status)
          VALUES
            ($1, 'Unit A', true, 'available'),
            ($1, 'Unit B', true, 'available')
        `, [roomId]);
      }
    }

    await client.query("COMMIT");
    console.log("=== Stayzy Production Seed Successfully Applied ===");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed error:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith("seed_stayzy_data.js")) {
  seedStayzyData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
