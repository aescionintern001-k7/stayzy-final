import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  getPropertyReviews,
  getMyReviews,
} from "./reviews.controller.js";
import {
  createReviewSchema,
  updateReviewSchema,
  reviewIdParamSchema,
  propertyIdParamSchema,
  listPropertyReviewsQuerySchema,
  listMyReviewsQuerySchema,
} from "./reviews.validator.js";

const router = Router();

// 1. Public: Get reviews for a property
router.get(
  "/property/:propertyId",
  validateRequest({
    params: propertyIdParamSchema,
    query: listPropertyReviewsQuerySchema,
  }),
  getPropertyReviews
);

// 2. Authenticated: Get reviews written by the current user
router.get(
  "/my",
  authenticate,
  validateRequest({ query: listMyReviewsQuerySchema }),
  getMyReviews
);

// 3. Public: Get single review details by ID
router.get(
  "/:id",
  validateRequest({ params: reviewIdParamSchema }),
  getReviewById
);

// 4. Authenticated: Submit a review for a completed stay
router.post(
  "/",
  authenticate,
  validateRequest({ body: createReviewSchema }),
  createReview
);

// 5. Authenticated: Update own review (Author only)
router.patch(
  "/:id",
  authenticate,
  validateRequest({
    params: reviewIdParamSchema,
    body: updateReviewSchema,
  }),
  updateReview
);

// 6. Authenticated: Delete review (Author or Admin)
router.delete(
  "/:id",
  authenticate,
  validateRequest({ params: reviewIdParamSchema }),
  deleteReview
);

export default router;
