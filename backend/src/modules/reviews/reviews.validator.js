import { z } from "zod";

export const createReviewSchema = z.object({
  booking_id: z.string().uuid("Invalid booking UUID"),
  rating: z
    .number({ required_error: "Rating is required" })
    .int("Rating must be an integer")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  title: z
    .string()
    .trim()
    .max(150, "Review title must not exceed 150 characters")
    .optional(),
  comment: z
    .string({ required_error: "Review comment is required" })
    .trim()
    .min(5, "Review comment must be at least 5 characters")
    .max(2000, "Review comment cannot exceed 2000 characters"),
});

export const updateReviewSchema = z
  .object({
    rating: z
      .number()
      .int("Rating must be an integer")
      .min(1, "Rating must be between 1 and 5")
      .max(5, "Rating must be between 1 and 5")
      .optional(),
    title: z
      .string()
      .trim()
      .max(150, "Review title must not exceed 150 characters")
      .optional(),
    comment: z
      .string()
      .trim()
      .min(5, "Review comment must be at least 5 characters")
      .max(2000, "Review comment cannot exceed 2000 characters")
      .optional(),
  })
  .refine(
    (data) =>
      data.rating !== undefined ||
      data.title !== undefined ||
      data.comment !== undefined,
    {
      message: "At least one field (rating, title, or comment) must be provided for update",
    }
  );

export const reviewIdParamSchema = z.object({
  id: z.string().uuid("Invalid review UUID"),
});

export const propertyIdParamSchema = z.object({
  propertyId: z.string().uuid("Invalid property UUID"),
});

export const listPropertyReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z
    .enum(["newest", "oldest", "highest_rating", "lowest_rating"])
    .default("newest"),
});

export const listMyReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export default {
  createReviewSchema,
  updateReviewSchema,
  reviewIdParamSchema,
  propertyIdParamSchema,
  listPropertyReviewsQuerySchema,
  listMyReviewsQuerySchema,
};
