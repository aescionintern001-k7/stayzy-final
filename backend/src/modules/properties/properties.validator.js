import { z } from "zod";

const propertyTypes = [
  "apartment",
  "house",
  "villa",
  "condo",
  "cottage",
  "cabin",
  "studio",
  "chalet",
  "other",
];

const roomTypes = [
  "entire_place",
  "private_room",
  "shared_room",
  "hotel_room",
];

const propertyStatuses = ["active", "inactive", "archived", "draft"];

const imageUrlSchema = z
  .string()
  .trim()
  .url("Image must be a valid URL")
  .max(1000, "Image URL must not exceed 1000 characters")
  .refine((url) => /^https?:\/\//i.test(url), {
    message: "Image URL must use HTTP or HTTPS protocol",
  });

/**
 * Validator for creating a new property listing (POST /api/v1/properties).
 * Host or Admin only.
 */
export const createPropertySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(150, "Title must not exceed 150 characters"),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters"),
    property_type: z.enum(propertyTypes, {
      errorMap: () => ({
        message: `Property type must be one of: ${propertyTypes.join(", ")}`,
      }),
    }),
    room_type: z
      .enum(roomTypes, {
        errorMap: () => ({
          message: `Room type must be one of: ${roomTypes.join(", ")}`,
        }),
      })
      .default("entire_place"),
    price_per_night: z.coerce
      .number()
      .positive("Price per night must be greater than 0"),
    currency: z.string().trim().max(10).default("USD"),
    address: z
      .string()
      .trim()
      .min(3, "Address must be at least 3 characters")
      .max(255),
    city: z
      .string()
      .trim()
      .min(2, "City must be at least 2 characters")
      .max(100),
    state: z.string().trim().max(100).optional().nullable(),
    country: z
      .string()
      .trim()
      .min(2, "Country must be at least 2 characters")
      .max(100),
    postal_code: z.string().trim().max(20).optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
    max_guests: z.coerce
      .number()
      .int()
      .min(1, "Maximum guests must be at least 1")
      .default(1),
    bedrooms: z.coerce
      .number()
      .int()
      .min(0, "Bedrooms cannot be negative")
      .default(1),
    beds: z.coerce
      .number()
      .int()
      .min(0, "Beds cannot be negative")
      .default(1),
    bathrooms: z.coerce
      .number()
      .min(0, "Bathrooms cannot be negative")
      .default(1.0),
    amenities: z.array(z.string().trim().min(1)).default([]),
    images: z.array(imageUrlSchema).default([]),
    status: z
      .enum(["active", "inactive", "draft"], {
        errorMap: () => ({
          message: "Initial status must be active, inactive, or draft",
        }),
      })
      .default("active"),
    is_available: z.boolean().default(true),
  })
  .strict();

/**
 * Validator for updating an existing property listing (PATCH /api/v1/properties/:id).
 */
export const updatePropertySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(150, "Title must not exceed 150 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters")
      .optional(),
    property_type: z.enum(propertyTypes).optional(),
    room_type: z.enum(roomTypes).optional(),
    price_per_night: z.coerce
      .number()
      .positive("Price per night must be greater than 0")
      .optional(),
    currency: z.string().trim().max(10).optional(),
    address: z.string().trim().min(3).max(255).optional(),
    city: z.string().trim().min(2).max(100).optional(),
    state: z.string().trim().max(100).optional().nullable(),
    country: z.string().trim().min(2).max(100).optional(),
    postal_code: z.string().trim().max(20).optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
    longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
    max_guests: z.coerce.number().int().min(1).optional(),
    bedrooms: z.coerce.number().int().min(0).optional(),
    beds: z.coerce.number().int().min(0).optional(),
    bathrooms: z.coerce.number().min(0).optional(),
    amenities: z.array(z.string().trim().min(1)).optional(),
    images: z.array(imageUrlSchema).optional(),
    status: z.enum(propertyStatuses).optional(),
    is_available: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });

/**
 * Validator for route parameters containing a property UUID.
 */
export const propertyIdParamSchema = z
  .object({
    id: z.string().uuid("Invalid property ID format. Must be a valid UUID"),
  })
  .strict();

/**
 * Validator for adding images to a property (POST /api/v1/properties/:id/images).
 */
export const addImagesSchema = z
  .object({
    images: z
      .array(imageUrlSchema)
      .min(1, "At least one image URL must be provided"),
  })
  .strict();

/**
 * Validator for removing an image from a property (DELETE /api/v1/properties/:id/images).
 */
export const removeImageSchema = z
  .object({
    url: imageUrlSchema,
  })
  .strict();

/**
 * Validator for updating listing amenities (PATCH /api/v1/properties/:id/amenities).
 */
export const updateAmenitiesSchema = z
  .object({
    amenities: z.array(z.string().trim().min(1)),
  })
  .strict();

/**
 * Validator for updating listing availability (PATCH /api/v1/properties/:id/availability).
 */
export const updateAvailabilitySchema = z
  .object({
    is_available: z.boolean({
      required_error: "is_available boolean is required",
    }),
  })
  .strict();

/**
 * Validator for querying/listing properties (GET /api/v1/properties).
 */
export const listPropertiesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    city: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    property_type: z.enum(propertyTypes).optional(),
    room_type: z.enum(roomTypes).optional(),
    host_id: z.string().uuid().optional(),
    min_price: z.coerce.number().min(0).optional(),
    max_price: z.coerce.number().min(0).optional(),
    status: z.enum(propertyStatuses).optional(),
    is_available: z
      .string()
      .transform((val) => val === "true" || val === "1")
      .optional(),
  })
  .strict();
