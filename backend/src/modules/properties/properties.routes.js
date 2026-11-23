import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  createProperty,
  listProperties,
  getMyListings,
  getProperty,
  updateProperty,
  deleteProperty,
  addImages,
  removeImage,
  updateAmenities,
  updateAvailability,
} from "./properties.controller.js";
import {
  createPropertySchema,
  updatePropertySchema,
  propertyIdParamSchema,
  addImagesSchema,
  removeImageSchema,
  updateAmenitiesSchema,
  updateAvailabilitySchema,
  listPropertiesQuerySchema,
} from "./properties.validator.js";

const router = Router();

/**
 * Optional authentication middleware for public endpoints.
 * Populates req.user if a valid Bearer token is provided.
 */
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    // Silently continue without req.user for optional authentication
  }

  next();
};

// -------------------------------------------------------------
// Public Routes: Search & Listing Discovery (BE-06 & BE-07)
// -------------------------------------------------------------

// List active properties with search and filters (public)
router.get("/", validateRequest({ query: listPropertiesQuerySchema }), listProperties);

// Explicit search alias route (public)
router.get("/search", validateRequest({ query: listPropertiesQuerySchema }), listProperties);

// -------------------------------------------------------------
// Host / Admin Routes (Require Authentication)
// -------------------------------------------------------------

// Get all listings for the authenticated host
router.get(
  "/my-listings",
  authenticate,
  authorize("host", "admin"),
  validateRequest({ query: listPropertiesQuerySchema }),
  getMyListings
);

// Create a new property listing (host, admin only)
router.post(
  "/",
  authenticate,
  authorize("host", "admin"),
  validateRequest({ body: createPropertySchema }),
  createProperty
);

// Get property details by ID (public, but owner/admin can view inactive/draft/archived)
router.get(
  "/:id",
  optionalAuthenticate,
  validateRequest({ params: propertyIdParamSchema }),
  getProperty
);

// Update property listing (owner host or admin)
router.patch(
  "/:id",
  authenticate,
  authorize("host", "admin"),
  validateRequest({ params: propertyIdParamSchema, body: updatePropertySchema }),
  updateProperty
);

// Delete / archive property listing (owner host or admin)
router.delete(
  "/:id",
  authenticate,
  authorize("host", "admin"),
  validateRequest({ params: propertyIdParamSchema }),
  deleteProperty
);

// Listing image management: Add images
router.post(
  "/:id/images",
  authenticate,
  authorize("host", "admin"),
  validateRequest({ params: propertyIdParamSchema, body: addImagesSchema }),
  addImages
);

// Listing image management: Remove an image
router.delete(
  "/:id/images",
  authenticate,
  authorize("host", "admin"),
  validateRequest({ params: propertyIdParamSchema, body: removeImageSchema }),
  removeImage
);

// Amenities management
router.patch(
  "/:id/amenities",
  authenticate,
  authorize("host", "admin"),
  validateRequest({ params: propertyIdParamSchema, body: updateAmenitiesSchema }),
  updateAmenities
);

// Availability management
router.patch(
  "/:id/availability",
  authenticate,
  authorize("host", "admin"),
  validateRequest({ params: propertyIdParamSchema, body: updateAvailabilitySchema }),
  updateAvailability
);

export default router;
