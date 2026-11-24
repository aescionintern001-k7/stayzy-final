import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import pool from "../src/database/pool.js";

let server;
let baseUrl;

let testHost;
const seededProperties = [];

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // Insert Host
  const hostRes = await pool.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, account_status)
      VALUES ($1, $2, $3, 'host', 'active')
      RETURNING id, full_name, email, role, account_status
    `,
    [`Search Host ${uniqueSuffix}`, `search_host_${uniqueSuffix}@example.com`, passwordHash]
  );
  testHost = hostRes.rows[0];

  // Seed 5 distinct properties with various attributes for search & filter tests
  const propConfigs = [
    {
      title: `Miami Seaside Studio ${uniqueSuffix}`,
      description: "Sunny ocean view studio right on the beach boardwalk.",
      property_type: "studio",
      room_type: "entire_place",
      price_per_night: 80,
      currency: "USD",
      address: "100 Ocean Drive",
      city: "Miami",
      state: "Florida",
      country: "United States",
      max_guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: ["wifi", "air_conditioning", "beach_access"],
      status: "active",
      is_available: true,
    },
    {
      title: `Aspen Luxury Ski Chalet ${uniqueSuffix}`,
      description: "Magnificent alpine wooden chalet with heated pool and fireplace.",
      property_type: "chalet",
      room_type: "entire_place",
      price_per_night: 450,
      currency: "USD",
      address: "200 Snow Peak Road",
      city: "Aspen",
      state: "Colorado",
      country: "United States",
      max_guests: 8,
      bedrooms: 4,
      beds: 5,
      bathrooms: 3.5,
      amenities: ["wifi", "fireplace", "pool", "hot_tub", "ski_in_ski_out"],
      status: "active",
      is_available: true,
    },
    {
      title: `Tokyo Central Modern Apartment ${uniqueSuffix}`,
      description: "Quiet and clean apartment located near Shinjuku railway station.",
      property_type: "apartment",
      room_type: "entire_place",
      price_per_night: 130,
      currency: "USD",
      address: "3-4-1 Shinjuku",
      city: "Tokyo",
      state: "Kanto",
      country: "Japan",
      max_guests: 3,
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      amenities: ["wifi", "air_conditioning", "kitchen", "elevator"],
      status: "active",
      is_available: true,
    },
    {
      title: `Paris Montmartre Cozy Room ${uniqueSuffix}`,
      description: "Charming private room with balcony overlooking the Eiffel Tower.",
      property_type: "apartment",
      room_type: "private_room",
      price_per_night: 65,
      currency: "USD",
      address: "12 Rue des Abbesses",
      city: "Paris",
      state: "Ile-de-France",
      country: "France",
      max_guests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      amenities: ["wifi", "balcony"],
      status: "active",
      is_available: true,
    },
    {
      title: `Unavailable Desert Villa ${uniqueSuffix}`,
      description: "Private oasis currently undergoing scheduled maintenance.",
      property_type: "villa",
      room_type: "entire_place",
      price_per_night: 600,
      currency: "USD",
      address: "99 Sand Dune Way",
      city: "Scottsdale",
      state: "Arizona",
      country: "United States",
      max_guests: 10,
      bedrooms: 5,
      beds: 6,
      bathrooms: 4,
      amenities: ["wifi", "pool", "air_conditioning"],
      status: "active",
      is_available: false,
    },
  ];

  for (const p of propConfigs) {
    const res = await pool.query(
      `
        INSERT INTO properties (
          host_id, title, description, property_type, room_type,
          price_per_night, currency, address, city, state, country,
          max_guests, bedrooms, beds, bathrooms, amenities, status, is_available
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16::jsonb, $17, $18
        )
        RETURNING *
      `,
      [
        testHost.id,
        p.title,
        p.description,
        p.property_type,
        p.room_type,
        p.price_per_night,
        p.currency,
        p.address,
        p.city,
        p.state,
        p.country,
        p.max_guests,
        p.bedrooms,
        p.beds,
        p.bathrooms,
        JSON.stringify(p.amenities),
        p.status,
        p.is_available,
      ]
    );
    seededProperties.push(res.rows[0]);
  }
});

test.after(async () => {
  if (testHost) {
    await pool.query("DELETE FROM users WHERE id = $1", [testHost.id]);
  }
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

// ==========================================
// 1. Basic Public Search & /search Route Alias
// ==========================================

test("GET /properties - public request returns active available properties with pagination", async () => {
  const res = await fetch(`${baseUrl}/properties?host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  // Default is_available is true; desert villa is is_available=false, so 4 should return
  assert.equal(data.data.properties.length, 4);
  assert.equal(data.data.pagination.total, 4);
  assert.equal(data.data.pagination.page, 1);
  assert.equal(data.data.pagination.limit, 10);
});

test("GET /properties/search - alias route behaves identically to /properties", async () => {
  const res = await fetch(`${baseUrl}/properties/search?host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.properties.length, 4);
});

test("GET /properties - returns empty array when no listings match query", async () => {
  const res = await fetch(`${baseUrl}/properties?city=NonExistentCityName12345`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.properties.length, 0);
  assert.equal(data.data.pagination.total, 0);
  assert.equal(data.data.pagination.total_pages, 0);
});

// ==========================================
// 2. Keyword & Location Search
// ==========================================

test("GET /properties - searches by general keyword (search param)", async () => {
  const res = await fetch(`${baseUrl}/properties?search=Eiffel&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 1);
  assert.ok(data.data.properties[0].title.includes("Paris"));
});

test("GET /properties - searches by 'q' alias keyword param", async () => {
  const res = await fetch(`${baseUrl}/properties?q=Shinjuku&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 1);
  assert.ok(data.data.properties[0].title.includes("Tokyo"));
});

test("GET /properties - searches by location query across city/state/country", async () => {
  const res = await fetch(`${baseUrl}/properties?location=Colorado&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 1);
  assert.equal(data.data.properties[0].city, "Aspen");
});

test("GET /properties - filters by structured city, state, country", async () => {
  const res = await fetch(`${baseUrl}/properties?country=Japan&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 1);
  assert.equal(data.data.properties[0].country, "Japan");
});

// ==========================================
// 3. Price Range Filtering
// ==========================================

test("GET /properties - filters by min_price", async () => {
  const res = await fetch(`${baseUrl}/properties?min_price=200&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  // Aspen chalet ($450) matches
  assert.equal(data.data.properties.length, 1);
  assert.equal(data.data.properties[0].price_per_night, 450);
});

test("GET /properties - filters by max_price", async () => {
  const res = await fetch(`${baseUrl}/properties?max_price=100&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  // Paris ($65) and Miami ($80)
  assert.equal(data.data.properties.length, 2);
  for (const p of data.data.properties) {
    assert.ok(p.price_per_night <= 100);
  }
});

test("GET /properties - filters by both min_price and max_price combined", async () => {
  const res = await fetch(`${baseUrl}/properties?min_price=70&max_price=150&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  // Miami ($80) and Tokyo ($130)
  assert.equal(data.data.properties.length, 2);
  for (const p of data.data.properties) {
    assert.ok(p.price_per_night >= 70 && p.price_per_night <= 150);
  }
});

test("GET /properties - rejects invalid price range where min_price > max_price with 400", async () => {
  const res = await fetch(`${baseUrl}/properties?min_price=300&max_price=100`);
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

// ==========================================
// 4. Property Type & Room Type Filtering
// ==========================================

test("GET /properties - filters by single property_type", async () => {
  const res = await fetch(`${baseUrl}/properties?property_type=chalet&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 1);
  assert.equal(data.data.properties[0].property_type, "chalet");
});

test("GET /properties - filters by multiple comma-separated property_types", async () => {
  const res = await fetch(`${baseUrl}/properties?property_type=studio,chalet&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 2);
  const types = data.data.properties.map((p) => p.property_type);
  assert.ok(types.includes("studio"));
  assert.ok(types.includes("chalet"));
});

test("GET /properties - filters by room_type", async () => {
  const res = await fetch(`${baseUrl}/properties?room_type=private_room&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 1);
  assert.equal(data.data.properties[0].room_type, "private_room");
});

// ==========================================
// 5. Amenities Filtering
// ==========================================

test("GET /properties - filters by single amenity", async () => {
  const res = await fetch(`${baseUrl}/properties?amenities=beach_access&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 1);
  assert.ok(data.data.properties[0].amenities.includes("beach_access"));
});

test("GET /properties - filters by multiple amenities requiring all to match", async () => {
  const res = await fetch(`${baseUrl}/properties?amenities=fireplace,pool&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  // Only Aspen chalet has both fireplace AND pool
  assert.equal(data.data.properties.length, 1);
  assert.ok(data.data.properties[0].amenities.includes("fireplace"));
  assert.ok(data.data.properties[0].amenities.includes("pool"));
});

// ==========================================
// 6. Capacity Filtering (Guests, Bedrooms, Bathrooms)
// ==========================================

test("GET /properties - filters by minimum guest capacity", async () => {
  const res = await fetch(`${baseUrl}/properties?guests=6&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 1);
  assert.equal(data.data.properties[0].city, "Aspen");
});

test("GET /properties - filters by minimum bedrooms and bathrooms", async () => {
  const res = await fetch(`${baseUrl}/properties?bedrooms=4&bathrooms=3&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 1);
  assert.equal(data.data.properties[0].city, "Aspen");
});

// ==========================================
// 7. Availability Filtering & Date Validation
// ==========================================

test("GET /properties - filters explicitly by is_available=false", async () => {
  const res = await fetch(`${baseUrl}/properties?is_available=false&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 1);
  assert.equal(data.data.properties[0].is_available, false);
});

test("GET /properties - validates valid check_in and check_out date range", async () => {
  const res = await fetch(
    `${baseUrl}/properties?check_in=2026-12-01&check_out=2026-12-10&host_id=${testHost.id}`
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
});

test("GET /properties - rejects invalid date range (check_in >= check_out) with 400", async () => {
  const res = await fetch(
    `${baseUrl}/properties?check_in=2026-12-15&check_out=2026-12-10&host_id=${testHost.id}`
  );
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

// ==========================================
// 8. Sorting Capabilities
// ==========================================

test("GET /properties - sorts by price ascending (price_asc)", async () => {
  const res = await fetch(`${baseUrl}/properties?sort_by=price_asc&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  const prices = data.data.properties.map((p) => p.price_per_night);
  for (let i = 0; i < prices.length - 1; i++) {
    assert.ok(prices[i] <= prices[i + 1]);
  }
});

test("GET /properties - sorts by price descending (price_desc)", async () => {
  const res = await fetch(`${baseUrl}/properties?sort_by=price_desc&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  const prices = data.data.properties.map((p) => p.price_per_night);
  for (let i = 0; i < prices.length - 1; i++) {
    assert.ok(prices[i] >= prices[i + 1]);
  }
});

test("GET /properties - sorts by title descending (name_desc)", async () => {
  const res = await fetch(`${baseUrl}/properties?sort_by=name_desc&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  const titles = data.data.properties.map((p) => p.title);
  for (let i = 0; i < titles.length - 1; i++) {
    assert.ok(titles[i] >= titles[i + 1]);
  }
});

test("GET /properties - supports sort=price&order=asc parameters", async () => {
  const res = await fetch(`${baseUrl}/properties?sort=price&order=asc&host_id=${testHost.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  const prices = data.data.properties.map((p) => p.price_per_night);
  for (let i = 0; i < prices.length - 1; i++) {
    assert.ok(prices[i] <= prices[i + 1]);
  }
});

// ==========================================
// 9. Pagination
// ==========================================

test("GET /properties - pagination page navigation works", async () => {
  const page1Res = await fetch(`${baseUrl}/properties?page=1&limit=2&host_id=${testHost.id}`);
  const page1Data = await page1Res.json();

  const page2Res = await fetch(`${baseUrl}/properties?page=2&limit=2&host_id=${testHost.id}`);
  const page2Data = await page2Res.json();

  assert.equal(page1Res.status, 200);
  assert.equal(page2Res.status, 200);
  assert.equal(page1Data.data.properties.length, 2);
  assert.equal(page2Data.data.properties.length, 2);
  assert.notEqual(page1Data.data.properties[0].id, page2Data.data.properties[0].id);
});

test("GET /properties - rejects page exceeding limit (> 100) with 400", async () => {
  const res = await fetch(`${baseUrl}/properties?limit=101`);
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

// ==========================================
// 10. Multi-Filter Composition & SQL Injection Safety
// ==========================================

test("GET /properties - successfully combines multiple filters simultaneously", async () => {
  const query = new URLSearchParams({
    host_id: testHost.id,
    country: "United States",
    min_price: "50",
    max_price: "200",
    property_type: "studio,apartment",
    amenities: "wifi,air_conditioning",
    guests: "2",
    sort_by: "price_asc",
  });

  const res = await fetch(`${baseUrl}/properties?${query.toString()}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 1);
  assert.equal(data.data.properties[0].city, "Miami");
});

test("GET /properties - safely handles SQL injection in location parameter", async () => {
  const sqlInjection = "' OR '1'='1";
  const res = await fetch(
    `${baseUrl}/properties?location=${encodeURIComponent(sqlInjection)}&host_id=${testHost.id}`
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 0);
});

test("GET /properties - safely handles SQL injection in search parameter", async () => {
  const sqlInjection = "'; DROP TABLE properties; --";
  const res = await fetch(
    `${baseUrl}/properties?search=${encodeURIComponent(sqlInjection)}&host_id=${testHost.id}`
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.data.properties.length, 0);

  // Verify properties table is intact
  const verifyRes = await fetch(`${baseUrl}/properties?host_id=${testHost.id}`);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.data.properties.length, 4);
});
