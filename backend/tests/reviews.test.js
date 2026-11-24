import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";

let server;
let baseUrl;

// Fixtures
let hostUser;
let guestUser1;
let guestUser2;
let adminUser;
let suspendedUser;

let hostToken;
let guestToken1;
let guestToken2;
let adminToken;
let suspendedToken;

let testProperty1;
let testPropertyZeroReviews;

let completedBooking1;
let completedBooking2;
let completedBooking3;
let futureBooking;
let cancelledBooking;

const createToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

const getFutureDate = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPastDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

  // 1. Users
  const hRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'host', 'active') RETURNING id, full_name, email, role`,
    [`Host User ${uniqueSuffix}`, `rev_h_${uniqueSuffix}@example.com`, passwordHash]
  );
  hostUser = hRes.rows[0];
  hostToken = createToken(hostUser);

  const g1Res = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'active') RETURNING id, full_name, email, role`,
    [`Guest Alpha ${uniqueSuffix}`, `rev_g1_${uniqueSuffix}@example.com`, passwordHash]
  );
  guestUser1 = g1Res.rows[0];
  guestToken1 = createToken(guestUser1);

  const g2Res = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'active') RETURNING id, full_name, email, role`,
    [`Guest Beta ${uniqueSuffix}`, `rev_g2_${uniqueSuffix}@example.com`, passwordHash]
  );
  guestUser2 = g2Res.rows[0];
  guestToken2 = createToken(guestUser2);

  const aRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'admin', 'active') RETURNING id, full_name, email, role`,
    [`Admin Rev ${uniqueSuffix}`, `rev_a_${uniqueSuffix}@example.com`, passwordHash]
  );
  adminUser = aRes.rows[0];
  adminToken = createToken(adminUser);

  const sRes = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, account_status)
     VALUES ($1, $2, $3, 'guest', 'suspended') RETURNING id, full_name, email, role`,
    [`Suspended Rev ${uniqueSuffix}`, `rev_s_${uniqueSuffix}@example.com`, passwordHash]
  );
  suspendedUser = sRes.rows[0];
  suspendedToken = createToken(suspendedUser);

  // 2. Properties
  const p1Res = await pool.query(
    `INSERT INTO properties (
       host_id, title, description, property_type, room_type,
       price_per_night, currency, address, city, country,
       max_guests, bedrooms, beds, bathrooms, status, is_available
     ) VALUES (
       $1, 'Hillside Cottage', 'Charming cottage in the hills', 'cottage', 'entire_place',
       120.00, 'USD', '77 Mountain Rd', 'Aspen', 'USA',
       4, 2, 2, 1.5, 'active', true
     ) RETURNING *`,
    [hostUser.id]
  );
  testProperty1 = p1Res.rows[0];

  const pZeroRes = await pool.query(
    `INSERT INTO properties (
       host_id, title, description, property_type, room_type,
       price_per_night, currency, address, city, country,
       max_guests, bedrooms, beds, bathrooms, status, is_available
     ) VALUES (
       $1, 'Brand New Cabin', 'Newly listed cabin with no reviews', 'cabin', 'entire_place',
       90.00, 'USD', '12 Pine St', 'Denver', 'USA',
       2, 1, 1, 1.0, 'active', true
     ) RETURNING *`,
    [hostUser.id]
  );
  testPropertyZeroReviews = pZeroRes.rows[0];

  // 3. Bookings
  // Completed booking 1 (Guest 1, completed stay in the past)
  const b1Res = await pool.query(
    `INSERT INTO bookings (
       property_id, guest_id, check_in_date, check_out_date,
       total_nights, price_per_night, total_price, currency,
       guests_count, status, payment_status
     ) VALUES (
       $1, $2, $3, $4, 3, 120.00, 360.00, 'USD', 2, 'completed', 'paid'
     ) RETURNING *`,
    [testProperty1.id, guestUser1.id, getPastDate(10), getPastDate(7)]
  );
  completedBooking1 = b1Res.rows[0];

  // Completed booking 2 (Guest 2, checkout was yesterday)
  const b2Res = await pool.query(
    `INSERT INTO bookings (
       property_id, guest_id, check_in_date, check_out_date,
       total_nights, price_per_night, total_price, currency,
       guests_count, status, payment_status
     ) VALUES (
       $1, $2, $3, $4, 2, 120.00, 240.00, 'USD', 2, 'confirmed', 'paid'
     ) RETURNING *`,
    [testProperty1.id, guestUser2.id, getPastDate(3), getPastDate(1)]
  );
  completedBooking2 = b2Res.rows[0];

  // Completed booking 3 (Guest 1, another completed stay)
  const b3Res = await pool.query(
    `INSERT INTO bookings (
       property_id, guest_id, check_in_date, check_out_date,
       total_nights, price_per_night, total_price, currency,
       guests_count, status, payment_status
     ) VALUES (
       $1, $2, $3, $4, 2, 120.00, 240.00, 'USD', 1, 'completed', 'paid'
     ) RETURNING *`,
    [testProperty1.id, guestUser1.id, getPastDate(20), getPastDate(18)]
  );
  completedBooking3 = b3Res.rows[0];

  // Future booking (cannot be reviewed yet)
  const bFutureRes = await pool.query(
    `INSERT INTO bookings (
       property_id, guest_id, check_in_date, check_out_date,
       total_nights, price_per_night, total_price, currency,
       guests_count, status, payment_status
     ) VALUES (
       $1, $2, $3, $4, 3, 120.00, 360.00, 'USD', 2, 'confirmed', 'paid'
     ) RETURNING *`,
    [testProperty1.id, guestUser1.id, getFutureDate(5), getFutureDate(8)]
  );
  futureBooking = bFutureRes.rows[0];

  // Cancelled booking (cannot be reviewed)
  const bCancelledRes = await pool.query(
    `INSERT INTO bookings (
       property_id, guest_id, check_in_date, check_out_date,
       total_nights, price_per_night, total_price, currency,
       guests_count, status, payment_status
     ) VALUES (
       $1, $2, $3, $4, 2, 120.00, 240.00, 'USD', 2, 'cancelled', 'unpaid'
     ) RETURNING *`,
    [testProperty1.id, guestUser1.id, getPastDate(5), getPastDate(3)]
  );
  cancelledBooking = bCancelledRes.rows[0];
});

test.after(async () => {
  if (testProperty1) {
    await pool.query("DELETE FROM reviews WHERE property_id IN ($1, $2)", [
      testProperty1.id,
      testPropertyZeroReviews.id,
    ]);
    await pool.query("DELETE FROM bookings WHERE property_id IN ($1, $2)", [
      testProperty1.id,
      testPropertyZeroReviews.id,
    ]);
    await pool.query("DELETE FROM properties WHERE id IN ($1, $2)", [
      testProperty1.id,
      testPropertyZeroReviews.id,
    ]);
  }
  if (hostUser) {
    await pool.query("DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5)", [
      hostUser.id,
      guestUser1.id,
      guestUser2.id,
      adminUser.id,
      suspendedUser.id,
    ]);
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ==========================================
// 1. Authentication & Authorization Controls
// ==========================================

test("POST /reviews - rejects unauthenticated request with 401", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      booking_id: completedBooking1.id,
      rating: 5,
      comment: "Fantastic place!",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test("POST /reviews - rejects suspended user with 403", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${suspendedToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: completedBooking1.id,
      rating: 5,
      comment: "Great experience overall",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("suspended"));
});

test("POST /reviews - rejects user attempting to review another guest's booking with 403", async () => {
  // guestUser2 attempts to review completedBooking1 which belongs to guestUser1
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: completedBooking1.id,
      rating: 5,
      comment: "Trying to review someone else's stay",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("only review bookings made by your own"));
});

test("POST /reviews - rejects host attempting to review own property with 400 or 403", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hostToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: completedBooking1.id,
      rating: 5,
      comment: "I am the host reviewing this",
    }),
  });
  const data = await res.json();

  assert.ok([400, 403].includes(res.status));
  assert.equal(data.success, false);
});

// ==========================================
// 2. Eligibility & Boundary Validations
// ==========================================

test("POST /reviews - returns 404 for non-existent booking UUID", async () => {
  const nonExistentId = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: nonExistentId,
      rating: 5,
      comment: "Valid comment text",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
});

test("POST /reviews - rejects review for cancelled booking with 400", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: cancelledBooking.id,
      rating: 4,
      comment: "Trying to review a cancelled stay",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("cancelled"));
});

test("POST /reviews - rejects review for future stay that has not completed with 400", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: futureBooking.id,
      rating: 5,
      comment: "I have not stayed here yet but reviewing anyway",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("completed"));
});

test("POST /reviews - rejects rating below 1 (e.g. 0) with 400", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: completedBooking1.id,
      rating: 0,
      comment: "Zero rating should fail",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /reviews - rejects rating above 5 (e.g. 6) with 400", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: completedBooking1.id,
      rating: 6,
      comment: "Six rating should fail",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /reviews - rejects non-integer rating (e.g. 4.5) with 400", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: completedBooking1.id,
      rating: 4.5,
      comment: "Decimal rating should fail",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

test("POST /reviews - rejects comment shorter than 5 characters with 400", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: completedBooking1.id,
      rating: 5,
      comment: "Good", // 4 chars
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});

// ==========================================
// 3. Review Creation & Rating Aggregation
// ==========================================

let createdReview1;
let createdReview2;

test("POST /reviews - successfully creates review for completed stay (rating 5) and updates property rating", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: completedBooking1.id,
      rating: 5,
      title: "Unforgettable Weekend!",
      comment: "The cottage was immaculately clean, cozy, and the mountain views were breathtaking.",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  assert.ok(data.data.review.id);
  assert.equal(data.data.review.rating, 5);
  assert.equal(data.data.review.title, "Unforgettable Weekend!");
  assert.ok(data.data.review.author);
  assert.equal(data.data.review.author.id, guestUser1.id);

  // Property rating should now be 5.00 with 1 review
  assert.equal(data.data.property_rating.average_rating, 5.0);
  assert.equal(data.data.property_rating.reviews_count, 1);

  // Verify in database
  const propCheck = await pool.query(
    "SELECT average_rating, reviews_count FROM properties WHERE id = $1",
    [testProperty1.id]
  );
  assert.equal(Number(propCheck.rows[0].average_rating), 5.0);
  assert.equal(Number(propCheck.rows[0].reviews_count), 1);

  createdReview1 = data.data.review;
});

test("POST /reviews - prevents duplicate review for the same booking with 409 Conflict", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: completedBooking1.id,
      rating: 4,
      comment: "Submitting a second review for the same stay should be rejected",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 409);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("already"));
});

test("POST /reviews - creates second review (rating 4) and recalculates average rating to 4.50", async () => {
  const res = await fetch(`${baseUrl}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${guestToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      booking_id: completedBooking2.id,
      rating: 4,
      title: "Great stay",
      comment: "Comfortable beds and very quiet neighborhood. Will visit again.",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.equal(data.success, true);
  assert.equal(data.data.review.rating, 4);

  // Average of 5 and 4 is 4.50
  assert.equal(data.data.property_rating.average_rating, 4.5);
  assert.equal(data.data.property_rating.reviews_count, 2);

  createdReview2 = data.data.review;
});

// ==========================================
// 4. Review Retrieval & Listings
// ==========================================

test("GET /reviews/:id - retrieves single review by UUID with author and property info", async () => {
  const res = await fetch(`${baseUrl}/reviews/${createdReview1.id}`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.review.id, createdReview1.id);
  assert.equal(data.data.review.rating, 5);
  assert.ok(data.data.review.author);
  assert.ok(data.data.review.property);
});

test("GET /reviews/:id - returns 404 for non-existent review UUID", async () => {
  const nonExistentId = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/reviews/${nonExistentId}`);
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
});

test("GET /properties/:propertyId/reviews - returns paginated reviews with rating distribution", async () => {
  const res = await fetch(`${baseUrl}/properties/${testProperty1.id}/reviews`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.summary.average_rating, 4.5);
  assert.equal(data.data.summary.reviews_count, 2);
  assert.equal(data.data.summary.rating_distribution[5], 1);
  assert.equal(data.data.summary.rating_distribution[4], 1);
  assert.equal(data.data.summary.rating_distribution[3], 0);
  assert.equal(data.data.reviews.length, 2);
  assert.equal(data.data.pagination.total_items, 2);
});

test("GET /properties/:propertyId/reviews - supports sorting by highest rating", async () => {
  const res = await fetch(
    `${baseUrl}/properties/${testProperty1.id}/reviews?sort=highest_rating`
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.reviews[0].rating, 5);
  assert.equal(data.data.reviews[1].rating, 4);
});

test("GET /properties/:propertyId/reviews - supports sorting by lowest rating", async () => {
  const res = await fetch(
    `${baseUrl}/properties/${testProperty1.id}/reviews?sort=lowest_rating`
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.reviews[0].rating, 4);
  assert.equal(data.data.reviews[1].rating, 5);
});

test("GET /properties/:propertyId/reviews - handles zero-review property cleanly", async () => {
  const res = await fetch(
    `${baseUrl}/properties/${testPropertyZeroReviews.id}/reviews`
  );
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.summary.average_rating, 0.0);
  assert.equal(data.data.summary.reviews_count, 0);
  assert.equal(data.data.reviews.length, 0);
  assert.equal(data.data.pagination.total_items, 0);
});

test("GET /properties/:propertyId/reviews - returns 404 for non-existent property UUID", async () => {
  const nonExistentId = crypto.randomUUID();
  const res = await fetch(`${baseUrl}/properties/${nonExistentId}/reviews`);
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
});

test("GET /reviews/my - returns paginated reviews written by current user", async () => {
  const res = await fetch(`${baseUrl}/reviews/my`, {
    headers: { Authorization: `Bearer ${guestToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data.reviews));
  assert.ok(data.data.reviews.length >= 1);
  assert.equal(data.data.reviews[0].guest_id, guestUser1.id);
});

// ==========================================
// 5. Review Updates & Re-aggregation
// ==========================================

test("PATCH /reviews/:id - prevents non-author from editing review with 403", async () => {
  // guestUser2 tries to edit createdReview1 (written by guestUser1)
  const res = await fetch(`${baseUrl}/reviews/${createdReview1.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken2}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rating: 1 }),
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
  assert.ok(data.message.toLowerCase().includes("not authorized"));
});

test("PATCH /reviews/:id - author successfully updates rating from 5 to 2 and recalculates property rating", async () => {
  const res = await fetch(`${baseUrl}/reviews/${createdReview1.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${guestToken1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rating: 2,
      comment: "Updated: Experienced power outage and heating problems during the stay.",
    }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.equal(data.data.review.rating, 2);

  // New average: (2 + 4) / 2 = 3.00
  assert.equal(data.data.property_rating.average_rating, 3.0);
  assert.equal(data.data.property_rating.reviews_count, 2);

  // Confirm in database
  const propCheck = await pool.query(
    "SELECT average_rating FROM properties WHERE id = $1",
    [testProperty1.id]
  );
  assert.equal(Number(propCheck.rows[0].average_rating), 3.0);
});

// ==========================================
// 6. Review Deletion & Re-aggregation
// ==========================================

test("DELETE /reviews/:id - prevents unauthorized user from deleting review with 403", async () => {
  // guestUser2 tries to delete createdReview1
  const res = await fetch(`${baseUrl}/reviews/${createdReview1.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${guestToken2}` },
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test("DELETE /reviews/:id - author successfully deletes own review and recalculates rating", async () => {
  const res = await fetch(`${baseUrl}/reviews/${createdReview1.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${guestToken1}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);

  // Only review2 (rating 4) remains: average should now be 4.00, count 1
  assert.equal(data.data.property_rating.average_rating, 4.0);
  assert.equal(data.data.property_rating.reviews_count, 1);
});

test("DELETE /reviews/:id - admin can delete review for moderation and reset property rating to 0 when last review deleted", async () => {
  // Admin deletes createdReview2 (last review on testProperty1)
  const res = await fetch(`${baseUrl}/reviews/${createdReview2.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);

  // 0 reviews remain -> average rating reset to 0.00, count 0
  assert.equal(data.data.property_rating.average_rating, 0.0);
  assert.equal(data.data.property_rating.reviews_count, 0);

  // Confirm database reflects 0
  const propCheck = await pool.query(
    "SELECT average_rating, reviews_count FROM properties WHERE id = $1",
    [testProperty1.id]
  );
  assert.equal(Number(propCheck.rows[0].average_rating), 0.0);
  assert.equal(Number(propCheck.rows[0].reviews_count), 0);
});

// ==========================================
// 7. Security & Parameterized Query Safety
// ==========================================

test("GET /properties/:propertyId/reviews - rejects invalid sort parameter with 400", async () => {
  const res = await fetch(
    `${baseUrl}/properties/${testProperty1.id}/reviews?sort=%27%20OR%201%3D1--`
  );
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.success, false);
});
