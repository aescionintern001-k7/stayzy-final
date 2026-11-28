import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changeCurrentUserPassword,
  listUserFavorites,
  addUserFavorite,
  removeUserFavorite,
  getUsersList,
  getUserById,
  updateUserStatus,
} from "./users.service.js";

/**
 * GET /api/v1/users/me
 * Retrieve the current authenticated user's profile.
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await getCurrentUserProfile(req.user.id);

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/me
 * Update the current authenticated user's profile.
 */
export const updateMe = async (req, res, next) => {
  try {
    const user = await updateCurrentUserProfile(req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users
 * Admin only: List users with pagination, search, and filters.
 */
export const listUsers = async (req, res, next) => {
  try {
    const result = await getUsersList(req.query);

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/users/:id
 * Admin only: Retrieve user details by UUID.
 */
export const getUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);

    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/users/:id/status
 * Admin only: Update a user's account status.
 */
export const changeUserStatus = async (req, res, next) => {
  try {
    const user = await updateUserStatus(req.params.id, req.body.status, req.user.id);

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const result = await changeCurrentUserPassword(req.user.id, req.body);

    res.set("Cache-Control", "no-store, private");
    res.status(200).json({
      success: true,
      message: "Password updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req, res, next) => {
  try {
    const favorites = await listUserFavorites(req.user.id);

    res.status(200).json({
      success: true,
      message: "Favorites retrieved successfully",
      data: { favorites },
    });
  } catch (error) {
    next(error);
  }
};

export const addFavorite = async (req, res, next) => {
  try {
    const result = await addUserFavorite(req.user.id, req.body.room_type_id);

    res.status(201).json({
      success: true,
      message: "Room added to favorites",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (req, res, next) => {
  try {
    const result = await removeUserFavorite(req.user.id, req.params.roomTypeId);

    res.status(200).json({
      success: true,
      message: "Room removed from favorites",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
