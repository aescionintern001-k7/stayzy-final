import reviewsService from "./reviews.service.js";

export const createReview = async (req, res, next) => {
  try {
    const result = await reviewsService.createReview(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewById = async (req, res, next) => {
  try {
    const review = await reviewsService.getReviewById(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Review retrieved successfully",
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const result = await reviewsService.updateReview(
      req.user,
      req.params.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const result = await reviewsService.deleteReview(req.user, req.params.id);
    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPropertyReviews = async (req, res, next) => {
  try {
    const result = await reviewsService.getPropertyReviews(
      req.params.propertyId,
      req.query
    );
    return res.status(200).json({
      success: true,
      message: "Property reviews retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req, res, next) => {
  try {
    const result = await reviewsService.getMyReviews(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      message: "Your reviews retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  getPropertyReviews,
  getMyReviews,
};
