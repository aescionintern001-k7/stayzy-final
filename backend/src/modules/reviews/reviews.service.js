import pool from "../../database/pool.js";

const REVIEW_COLUMNS = [
  "id",
  "booking_id",
  "property_id",
  "guest_id",
  "rating",
  "title",
  "comment",
  "created_at",
  "updated_at",
];

const SELECT_REVIEW_SQL = REVIEW_COLUMNS.map((col) => `r.${col}`).join(", ");

const formatReviewRow = (row) => {
  if (!row) return null;

  const review = {
    id: row.id,
    booking_id: row.booking_id,
    property_id: row.property_id,
    guest_id: row.guest_id,
    rating: Number.parseInt(row.rating, 10),
    title: row.title,
    comment: row.comment,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.author_full_name !== undefined) {
    review.author = {
      id: row.guest_id,
      full_name: row.author_full_name,
      profile_image_url: row.author_profile_image_url,
    };
  }

  if (row.property_title !== undefined) {
    review.property = {
      id: row.property_id,
      title: row.property_title,
      city: row.property_city,
      country: row.property_country,
    };
  }

  return review;
};

/**
 * Recomputes and updates the average_rating and reviews_count for a property.
 */
const recalculatePropertyRating = async (client, propertyId) => {
  const aggRes = await client.query(
    `
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00) AS avg_rating,
             COUNT(*)::int AS count
      FROM reviews
      WHERE property_id = $1
    `,
    [propertyId]
  );

  const avgRating = Number.parseFloat(aggRes.rows[0].avg_rating);
  const reviewsCount = Number.parseInt(aggRes.rows[0].count, 10);

  await client.query(
    `
      UPDATE properties
      SET average_rating = $1,
          reviews_count = $2,
          updated_at = NOW()
      WHERE id = $3
    `,
    [avgRating, reviewsCount, propertyId]
  );

  return { average_rating: avgRating, reviews_count: reviewsCount };
};

/**
 * Create a new review for an eligible completed booking.
 */
export const createReview = async (
  userId,
  { booking_id, rating, title, comment }
) => {
  // 1. Verify user exists and is active
  const userRes = await pool.query(
    "SELECT id, account_status, full_name, profile_image_url FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const user = userRes.rows[0];
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  if (user.account_status === "suspended") {
    const error = new Error("Your account has been suspended");
    error.status = 403;
    throw error;
  }

  // 2. Look up booking details with property info
  const bookingRes = await pool.query(
    `
      SELECT b.id, b.property_id, b.guest_id, b.check_in_date, b.check_out_date,
             b.status, b.payment_status, p.host_id, p.title AS property_title,
             p.city AS property_city, p.country AS property_country
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE b.id = $1
      LIMIT 1
    `,
    [booking_id]
  );

  const booking = bookingRes.rows[0];
  if (!booking) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  // 3. Verify eligibility rules
  if (booking.guest_id !== userId) {
    const error = new Error("You can only review bookings made by your own account");
    error.status = 403;
    throw error;
  }

  if (booking.host_id === userId) {
    const error = new Error("Hosts cannot review their own properties");
    error.status = 400;
    throw error;
  }

  if (booking.status === "cancelled") {
    const error = new Error("Cannot submit a review for a cancelled booking");
    error.status = 400;
    throw error;
  }

  // Check whether stay is completed
  const now = new Date();
  const checkoutDate = new Date(booking.check_out_date);
  const isStayCompleted =
    booking.status === "completed" || checkoutDate <= now;

  if (!isStayCompleted) {
    const error = new Error(
      "You can only review a booking after the stay has been completed"
    );
    error.status = 400;
    throw error;
  }

  // 4. Check for duplicate review
  const existingReviewRes = await pool.query(
    "SELECT id FROM reviews WHERE booking_id = $1 LIMIT 1",
    [booking.id]
  );
  if (existingReviewRes.rows.length > 0) {
    const error = new Error(
      "A review has already been submitted for this booking"
    );
    error.status = 409;
    throw error;
  }

  // 5. Insert review & update property rating aggregates atomically
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertRes = await client.query(
      `
        INSERT INTO reviews (
          booking_id, property_id, guest_id, rating, title, comment
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        booking.id,
        booking.property_id,
        userId,
        rating,
        title || null,
        comment,
      ]
    );

    const ratingSummary = await recalculatePropertyRating(
      client,
      booking.property_id
    );

    await client.query("COMMIT");

    const reviewRow = insertRes.rows[0];
    reviewRow.author_full_name = user.full_name;
    reviewRow.author_profile_image_url = user.profile_image_url;
    reviewRow.property_title = booking.property_title;
    reviewRow.property_city = booking.property_city;
    reviewRow.property_country = booking.property_country;

    return {
      review: formatReviewRow(reviewRow),
      property_rating: ratingSummary,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    // Handle unique constraint violation race condition if duplicate
    if (err.code === "23505") {
      const error = new Error(
        "A review has already been submitted for this booking"
      );
      error.status = 409;
      throw error;
    }
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Retrieve a single review by ID.
 */
export const getReviewById = async (reviewId) => {
  const reviewRes = await pool.query(
    `
      SELECT ${SELECT_REVIEW_SQL},
             u.full_name AS author_full_name,
             u.profile_image_url AS author_profile_image_url,
             p.title AS property_title,
             p.city AS property_city,
             p.country AS property_country
      FROM reviews r
      JOIN users u ON r.guest_id = u.id
      JOIN properties p ON r.property_id = p.id
      WHERE r.id = $1
      LIMIT 1
    `,
    [reviewId]
  );

  const review = reviewRes.rows[0];
  if (!review) {
    const error = new Error("Review not found");
    error.status = 404;
    throw error;
  }

  return formatReviewRow(review);
};

/**
 * Update an existing review (Author only).
 */
export const updateReview = async (user, reviewId, updateData) => {
  const reviewRes = await pool.query(
    `
      SELECT r.*, p.title AS property_title, p.city AS property_city, p.country AS property_country
      FROM reviews r
      JOIN properties p ON r.property_id = p.id
      WHERE r.id = $1
      LIMIT 1
    `,
    [reviewId]
  );

  const review = reviewRes.rows[0];
  if (!review) {
    const error = new Error("Review not found");
    error.status = 404;
    throw error;
  }

  // Only the review author can edit the review
  if (review.guest_id !== user.id) {
    const error = new Error("You are not authorized to edit this review");
    error.status = 403;
    throw error;
  }

  const updates = [];
  const params = [];

  if (updateData.rating !== undefined) {
    params.push(updateData.rating);
    updates.push(`rating = $${params.length}`);
  }

  if (updateData.title !== undefined) {
    params.push(updateData.title);
    updates.push(`title = $${params.length}`);
  }

  if (updateData.comment !== undefined) {
    params.push(updateData.comment);
    updates.push(`comment = $${params.length}`);
  }

  updates.push("updated_at = NOW()");
  params.push(review.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updatedRes = await client.query(
      `
        UPDATE reviews
        SET ${updates.join(", ")}
        WHERE id = $${params.length}
        RETURNING *
      `,
      params
    );

    let ratingSummary;
    if (updateData.rating !== undefined) {
      ratingSummary = await recalculatePropertyRating(
        client,
        review.property_id
      );
    }

    await client.query("COMMIT");

    const updatedRow = updatedRes.rows[0];
    updatedRow.author_full_name = user.full_name;
    updatedRow.author_profile_image_url = user.profile_image_url;
    updatedRow.property_title = review.property_title;
    updatedRow.property_city = review.property_city;
    updatedRow.property_country = review.property_country;

    return {
      review: formatReviewRow(updatedRow),
      ...(ratingSummary ? { property_rating: ratingSummary } : {}),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Delete a review (Author or Admin).
 */
export const deleteReview = async (user, reviewId) => {
  const reviewRes = await pool.query(
    "SELECT id, property_id, guest_id FROM reviews WHERE id = $1 LIMIT 1",
    [reviewId]
  );

  const review = reviewRes.rows[0];
  if (!review) {
    const error = new Error("Review not found");
    error.status = 404;
    throw error;
  }

  const isAuthor = review.guest_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isAuthor && !isAdmin) {
    const error = new Error("You are not authorized to delete this review");
    error.status = 403;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM reviews WHERE id = $1", [review.id]);

    const ratingSummary = await recalculatePropertyRating(
      client,
      review.property_id
    );

    await client.query("COMMIT");

    return {
      id: review.id,
      property_id: review.property_id,
      property_rating: ratingSummary,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get paginated reviews for a property with rating distribution breakdown.
 */
export const getPropertyReviews = async (
  propertyId,
  { page = 1, limit = 10, sort = "newest" } = {}
) => {
  // 1. Check property existence
  const propRes = await pool.query(
    "SELECT id, title, average_rating, reviews_count FROM properties WHERE id = $1 LIMIT 1",
    [propertyId]
  );
  const property = propRes.rows[0];
  if (!property) {
    const error = new Error("Property not found");
    error.status = 404;
    throw error;
  }

  // 2. Calculate rating distribution (counts for 1..5 stars)
  const distRes = await pool.query(
    `
      SELECT rating, COUNT(*)::int AS count
      FROM reviews
      WHERE property_id = $1
      GROUP BY rating
    `,
    [propertyId]
  );

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of distRes.rows) {
    ratingDistribution[row.rating] = Number.parseInt(row.count, 10);
  }

  // 3. Count total reviews for pagination
  const countRes = await pool.query(
    "SELECT COUNT(*)::int AS total FROM reviews WHERE property_id = $1",
    [propertyId]
  );
  const totalItems = countRes.rows[0].total;

  // 4. Determine sort ordering
  let orderBy = "r.created_at DESC";
  if (sort === "oldest") {
    orderBy = "r.created_at ASC";
  } else if (sort === "highest_rating") {
    orderBy = "r.rating DESC, r.created_at DESC";
  } else if (sort === "lowest_rating") {
    orderBy = "r.rating ASC, r.created_at DESC";
  }

  const offset = (page - 1) * limit;

  // 5. Query reviews list with author info
  const reviewsRes = await pool.query(
    `
      SELECT ${SELECT_REVIEW_SQL},
             u.full_name AS author_full_name,
             u.profile_image_url AS author_profile_image_url
      FROM reviews r
      JOIN users u ON r.guest_id = u.id
      WHERE r.property_id = $1
      ORDER BY ${orderBy}
      LIMIT $2 OFFSET $3
    `,
    [propertyId, limit, offset]
  );

  return {
    property: {
      id: property.id,
      title: property.title,
    },
    summary: {
      average_rating: Number.parseFloat(property.average_rating),
      reviews_count: Number.parseInt(property.reviews_count, 10),
      rating_distribution: ratingDistribution,
    },
    reviews: reviewsRes.rows.map(formatReviewRow),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit) || 1,
    },
  };
};

/**
 * Get paginated list of reviews written by the authenticated user.
 */
export const getMyReviews = async (userId, { page = 1, limit = 10 } = {}) => {
  const countRes = await pool.query(
    "SELECT COUNT(*)::int AS total FROM reviews WHERE guest_id = $1",
    [userId]
  );
  const totalItems = countRes.rows[0].total;

  const offset = (page - 1) * limit;

  const reviewsRes = await pool.query(
    `
      SELECT ${SELECT_REVIEW_SQL},
             u.full_name AS author_full_name,
             u.profile_image_url AS author_profile_image_url,
             p.title AS property_title,
             p.city AS property_city,
             p.country AS property_country
      FROM reviews r
      JOIN users u ON r.guest_id = u.id
      JOIN properties p ON r.property_id = p.id
      WHERE r.guest_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );

  return {
    reviews: reviewsRes.rows.map(formatReviewRow),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit) || 1,
    },
  };
};

export default {
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  getPropertyReviews,
  getMyReviews,
};
