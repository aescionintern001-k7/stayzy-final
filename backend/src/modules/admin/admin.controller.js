import adminService from "./admin.service.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    return res.status(200).json({
      success: true,
      message: "Admin dashboard statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminProperties = async (req, res, next) => {
  try {
    const result = await adminService.getAdminProperties(req.query);
    return res.status(200).json({
      success: true,
      message: "Properties retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const moderateProperty = async (req, res, next) => {
  try {
    const property = await adminService.moderateProperty(
      req.user.id,
      req.params.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Property moderation status updated successfully",
      data: { property },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminBookings = async (req, res, next) => {
  try {
    const result = await adminService.getAdminBookings(req.query);
    return res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminBookingStatus = async (req, res, next) => {
  try {
    const booking = await adminService.updateAdminBookingStatus(
      req.params.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelAdminBooking = async (req, res, next) => {
  try {
    const booking = await adminService.cancelAdminBooking(
      req.user.id,
      req.params.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Booking cancelled administratively",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminPayments = async (req, res, next) => {
  try {
    const result = await adminService.getAdminPayments(req.query);
    return res.status(200).json({
      success: true,
      message: "Payment transactions retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getRevenueReport = async (req, res, next) => {
  try {
    const report = await adminService.getRevenueReport(req.query);
    return res.status(200).json({
      success: true,
      message: "Revenue report generated successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminReviews = async (req, res, next) => {
  try {
    const result = await adminService.getAdminReviews(req.query);
    return res.status(200).json({
      success: true,
      message: "Reviews retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminReview = async (req, res, next) => {
  try {
    const result = await adminService.deleteAdminReview(
      req.user,
      req.params.id
    );
    return res.status(200).json({
      success: true,
      message: "Review deleted administratively",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getDashboardStats,
  getAdminProperties,
  moderateProperty,
  getAdminBookings,
  updateAdminBookingStatus,
  cancelAdminBooking,
  getAdminPayments,
  getRevenueReport,
  getAdminReviews,
  deleteAdminReview,
};
