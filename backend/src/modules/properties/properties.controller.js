import {
  createProperty as createPropertyService,
  getPropertyById as getPropertyByIdService,
  updateProperty as updatePropertyService,
  deleteOrArchiveProperty as deleteOrArchivePropertyService,
  listProperties as listPropertiesService,
  listHostProperties as listHostPropertiesService,
  addPropertyImages as addPropertyImagesService,
  removePropertyImage as removePropertyImageService,
  updatePropertyAmenities as updatePropertyAmenitiesService,
  updatePropertyAvailability as updatePropertyAvailabilityService,
} from "./properties.service.js";

/**
 * POST /api/v1/properties
 * Create a new property listing.
 */
export const createProperty = async (req, res, next) => {
  try {
    const property = await createPropertyService(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: "Property listing created successfully",
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/properties
 * Public listing of active properties.
 */
export const listProperties = async (req, res, next) => {
  try {
    const result = await listPropertiesService(req.query);

    res.status(200).json({
      success: true,
      message: "Properties retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/properties/my-listings
 * List all properties owned by the authenticated host.
 */
export const getMyListings = async (req, res, next) => {
  try {
    const result = await listHostPropertiesService(req.user.id, req.query);

    res.status(200).json({
      success: true,
      message: "Host properties retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/properties/:id
 * Retrieve details of a specific property listing.
 */
export const getProperty = async (req, res, next) => {
  try {
    const property = await getPropertyByIdService(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: "Property details retrieved successfully",
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/properties/:id
 * Update an existing property listing.
 */
export const updateProperty = async (req, res, next) => {
  try {
    const property = await updatePropertyService(
      req.params.id,
      req.body,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Property listing updated successfully",
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/properties/:id
 * Archive or permanently delete a property listing.
 */
export const deleteProperty = async (req, res, next) => {
  try {
    const result = await deleteOrArchivePropertyService(
      req.params.id,
      req.user,
      { permanent: req.query.permanent === "true" }
    );

    res.status(200).json({
      success: true,
      message: result.deleted
        ? "Property listing deleted successfully"
        : "Property listing archived successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/properties/:id/images
 * Add images to a property listing.
 */
export const addImages = async (req, res, next) => {
  try {
    const property = await addPropertyImagesService(
      req.params.id,
      req.body.images,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Listing images added successfully",
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/properties/:id/images
 * Remove an image from a property listing.
 */
export const removeImage = async (req, res, next) => {
  try {
    const property = await removePropertyImageService(
      req.params.id,
      req.body.url,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Listing image removed successfully",
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/properties/:id/amenities
 * Update amenities for a property listing.
 */
export const updateAmenities = async (req, res, next) => {
  try {
    const property = await updatePropertyAmenitiesService(
      req.params.id,
      req.body.amenities,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Listing amenities updated successfully",
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/properties/:id/availability
 * Update availability for a property listing.
 */
export const updateAvailability = async (req, res, next) => {
  try {
    const property = await updatePropertyAvailabilityService(
      req.params.id,
      req.body.is_available,
      req.user
    );

    res.status(200).json({
      success: true,
      message: "Listing availability updated successfully",
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};
