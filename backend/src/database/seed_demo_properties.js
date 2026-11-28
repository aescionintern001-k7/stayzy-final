import crypto from "node:crypto";
import bcrypt from "bcrypt";
import pool from "./pool.js";

/**
 * Idempotent DEMO/SAMPLE property seeder for staging and presentation.
 * - Does NOT overwrite existing users, passwords, or real records.
 * - Clearly marks every seeded listing as [DEMO] sample data.
 * - Safe to run multiple times without creating duplicate properties, rooms, or units.
 */
export async function seedDemoProperties() {
  const client = await pool.connect();
  try {
    console.log("=== Seeding Stayzy DEMO/SAMPLE Properties (Idempotent) ===");
    await client.query("BEGIN");

    const randomSecret = crypto.randomBytes(24).toString("hex");
    const demoPasswordHash = await bcrypt.hash(randomSecret, 10);

    // Ensure a non-privileged demo host exists without touching any real user
    await client.query(
      `
      INSERT INTO users (full_name, email, password_hash, role, account_status, is_email_verified)
      VALUES ('Stayzy Demo Catalog Host', 'demo.catalog@stayzy.local', $1, 'host', 'active', true)
      ON CONFLICT (email) DO NOTHING
      `,
      [demoPasswordHash]
    );

    const hostRes = await client.query(
      `SELECT id FROM users WHERE email = 'demo.catalog@stayzy.local' LIMIT 1`
    );
    const hostId = hostRes.rows[0]?.id;
    if (!hostId) {
      throw new Error("Unable to resolve demo catalog host.");
    }

    const demoProperties = [
      {
        title: "[DEMO] Stayzy Haven — Koramangala",
        description:
          "SAMPLE / DEMO LISTING: Co-living concept in Koramangala 4th Block featuring high-speed Wi-Fi, ergonomic study desks, and daily meal options.",
        property_type: "apartment",
        room_type: "private_room",
        price_per_night: 22000.0,
        address: "Sample Location, 4th Block, Koramangala",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        postal_code: "560034",
        latitude: 12.9352,
        longitude: 77.6245,
        amenities: ["WiFi", "AC", "Power Backup", "Housekeeping", "Food Included", "Washing Machine"],
        images: [
          "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
        ],
        roomTypes: [
          {
            name: "[DEMO] Executive Private Room",
            slug: "demo-stayzy-haven-koramangala-private",
            category: "PRIVATE",
            description: "Sample private room with attached washroom, ergonomic workspace, and AC.",
            size_sq_ft: 220,
            base_capacity: 1,
            max_capacity: 2,
            has_ac: true,
            bathroom_type: "ATTACHED",
            food_included: true,
            food_details: "Sample meal plan available.",
            amenities: ["AC", "Attached Washroom", "WiFi", "Work Desk"],
            images: [
              "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
            ],
            rates: [
              { duration_type: "DAILY", price: 1200.0, min_duration: 1, max_duration: 29, deposit_amount: 500 },
              { duration_type: "MONTHLY", price: 22000.0, min_duration: 1, max_duration: 24, deposit_amount: 10000, food_monthly_charge: 3500 },
            ],
          },
        ],
      },
      {
        title: "[DEMO] Stayzy Heights — HSR Layout",
        description:
          "SAMPLE / DEMO LISTING: Co-living concept in HSR Layout Sector 2 with quiet residential streets, gym access, and coworking lounge.",
        property_type: "apartment",
        room_type: "shared_room",
        price_per_night: 18000.0,
        address: "Sample Location, Sector 2, HSR Layout",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        postal_code: "560102",
        latitude: 12.9121,
        longitude: 77.6446,
        amenities: ["WiFi", "AC", "Gym", "Housekeeping", "Power Backup", "CCTV"],
        images: [
          "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
        ],
        roomTypes: [
          {
            name: "[DEMO] Twin Sharing Studio",
            slug: "demo-stayzy-heights-hsr-twin",
            category: "TWIN_SHARING",
            description: "Sample twin-sharing room with dedicated wardrobes and study desks.",
            size_sq_ft: 250,
            base_capacity: 1,
            max_capacity: 2,
            has_ac: true,
            bathroom_type: "ATTACHED",
            food_included: true,
            food_details: "Sample breakfast and dinner included.",
            amenities: ["AC", "Attached Washroom", "WiFi", "Study Desk"],
            images: [
              "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
            ],
            rates: [
              { duration_type: "DAILY", price: 850.0, min_duration: 1, max_duration: 29, deposit_amount: 500 },
              { duration_type: "MONTHLY", price: 18000.0, min_duration: 1, max_duration: 24, deposit_amount: 7500, food_monthly_charge: 3000 },
            ],
          },
        ],
      },
      {
        title: "[DEMO] Stayzy Lofts — Indiranagar",
        description:
          "SAMPLE / DEMO LISTING: Modern studio suites in Indiranagar near 100 Feet Road, designed for remote professionals.",
        property_type: "studio",
        room_type: "entire_place",
        price_per_night: 28000.0,
        address: "Sample Location, 100 Feet Road, Indiranagar",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        postal_code: "560038",
        latitude: 12.9784,
        longitude: 77.6408,
        amenities: ["WiFi", "AC", "Kitchenette", "Housekeeping", "Laundry"],
        images: [
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
        ],
        roomTypes: [
          {
            name: "[DEMO] Designer Private Studio",
            slug: "demo-stayzy-lofts-indiranagar-studio",
            category: "STUDIO",
            description: "Sample studio suite with kitchenette, smart TV, and high-speed Wi-Fi.",
            size_sq_ft: 300,
            base_capacity: 1,
            max_capacity: 2,
            has_ac: true,
            bathroom_type: "ATTACHED",
            food_included: false,
            food_details: "Self-cooking kitchenette.",
            amenities: ["AC", "Kitchenette", "WiFi", "Smart TV"],
            images: [
              "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
            ],
            rates: [
              { duration_type: "DAILY", price: 1500.0, min_duration: 1, max_duration: 29, deposit_amount: 1000 },
              { duration_type: "MONTHLY", price: 28000.0, min_duration: 1, max_duration: 24, deposit_amount: 15000, food_monthly_charge: 0 },
            ],
          },
        ],
      },
      {
        title: "[DEMO] Stayzy Tech Park — Whitefield",
        description:
          "SAMPLE / DEMO LISTING: Co-living residence in Whitefield near ITPL with shuttle connectivity and quiet study zones.",
        property_type: "apartment",
        room_type: "private_room",
        price_per_night: 16000.0,
        address: "Sample Location, ITPL Main Road, Whitefield",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        postal_code: "560066",
        latitude: 12.9698,
        longitude: 77.7499,
        amenities: ["WiFi", "AC", "Power Backup", "Housekeeping", "Food Included"],
        images: [
          "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
        ],
        roomTypes: [
          {
            name: "[DEMO] Tech Hub Private Room",
            slug: "demo-stayzy-whitefield-private",
            category: "PRIVATE",
            description: "Sample private room ideal for tech professionals working in Whitefield.",
            size_sq_ft: 200,
            base_capacity: 1,
            max_capacity: 1,
            has_ac: true,
            bathroom_type: "ATTACHED",
            food_included: true,
            food_details: "Sample daily meals included.",
            amenities: ["AC", "Attached Washroom", "WiFi", "Power Backup"],
            images: [
              "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
            ],
            rates: [
              { duration_type: "DAILY", price: 950.0, min_duration: 1, max_duration: 29, deposit_amount: 500 },
              { duration_type: "MONTHLY", price: 16000.0, min_duration: 1, max_duration: 24, deposit_amount: 8500, food_monthly_charge: 3000 },
            ],
          },
        ],
      },
    ];

    for (const prop of demoProperties) {
      const existingProp = await client.query(
        `SELECT id FROM properties WHERE title = $1 LIMIT 1`,
        [prop.title]
      );

      let propertyId;
      if (existingProp.rows.length > 0) {
        propertyId = existingProp.rows[0].id;
        await client.query(
          `
          UPDATE properties
          SET description = $1, price_per_night = $2, address = $3, city = $4,
              state = $5, country = $6, postal_code = $7, latitude = $8, longitude = $9,
              amenities = $10::jsonb, images = $11::jsonb, status = 'active', is_available = true,
              is_demo = TRUE
          WHERE id = $12
          `,
          [
            prop.description,
            prop.price_per_night,
            prop.address,
            prop.city,
            prop.state,
            prop.country,
            prop.postal_code,
            prop.latitude,
            prop.longitude,
            JSON.stringify(prop.amenities),
            JSON.stringify(prop.images),
            propertyId,
          ]
        );
      } else {
        const insertRes = await client.query(
          `
          INSERT INTO properties (
            host_id, title, description, property_type, room_type, price_per_night,
            currency, address, city, state, country, postal_code, latitude, longitude,
            amenities, images, status, is_available, is_demo, average_rating, reviews_count
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, 'INR', $7, $8, $9, $10, $11, $12, $13,
            $14::jsonb, $15::jsonb, 'active', true, TRUE, 4.8, 12
          )
          RETURNING id
          `,
          [
            hostId,
            prop.title,
            prop.description,
            prop.property_type,
            prop.room_type,
            prop.price_per_night,
            prop.address,
            prop.city,
            prop.state,
            prop.country,
            prop.postal_code,
            prop.latitude,
            prop.longitude,
            JSON.stringify(prop.amenities),
            JSON.stringify(prop.images),
          ]
        );
        propertyId = insertRes.rows[0].id;
      }

      for (const rt of prop.roomTypes) {
        const rtRes = await client.query(
          `
          INSERT INTO room_types (
            property_id, name, slug, category, description, size_sq_ft,
            base_capacity, max_capacity, has_ac, bathroom_type, food_included,
            food_details, amenities, images
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            amenities = EXCLUDED.amenities,
            images = EXCLUDED.images
          RETURNING id
          `,
          [
            propertyId,
            rt.name,
            rt.slug,
            rt.category,
            rt.description,
            rt.size_sq_ft,
            rt.base_capacity,
            rt.max_capacity,
            rt.has_ac,
            rt.bathroom_type,
            rt.food_included,
            rt.food_details || null,
            JSON.stringify(rt.amenities),
            JSON.stringify(rt.images),
          ]
        );
        const roomTypeId = rtRes.rows[0].id;

        for (const rate of rt.rates) {
          await client.query(
            `
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
            `,
            [
              roomTypeId,
              rate.duration_type,
              rate.price,
              rate.min_duration,
              rate.max_duration || null,
              rate.deposit_amount || 0,
              rate.food_monthly_charge || 0,
            ]
          );
        }

        // Idempotently ensure room '101' and 2 beds exist
        const existingRoom = await client.query(
          `SELECT id FROM rooms WHERE room_type_id = $1 AND room_number = '101' LIMIT 1`,
          [roomTypeId]
        );
        let roomId = existingRoom.rows[0]?.id;
        if (!roomId) {
          const roomRes = await client.query(
            `INSERT INTO rooms (room_type_id, room_number, floor, status) VALUES ($1, '101', 1, 'active') RETURNING id`,
            [roomTypeId]
          );
          roomId = roomRes.rows[0].id;
        }

        const existingUnits = await client.query(
          `SELECT identifier FROM inventory_units WHERE room_id = $1`,
          [roomId]
        );
        const unitSet = new Set(existingUnits.rows.map((u) => u.identifier));
        for (const bedId of ["101-A", "101-B"]) {
          if (!unitSet.has(bedId)) {
            await client.query(
              `INSERT INTO inventory_units (room_id, identifier, is_bed, status) VALUES ($1, $2, true, 'available')`,
              [roomId, bedId]
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    console.log("[PASS] Seeded 4 idempotent [DEMO] Bengaluru properties.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[FAIL] Demo property seed failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith("seed_demo_properties.js")) {
  seedDemoProperties()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
