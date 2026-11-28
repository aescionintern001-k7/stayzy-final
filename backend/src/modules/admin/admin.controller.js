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

export const createAdminUser = async (req, res, next) => {
  try {
    const user = await adminService.createAdminUser(req.user, req.body);
    return res.status(201).json({ success: true, message: "User created", data: { user } });
  } catch (error) {
    next(error);
  }
};

export const updateAdminUserRole = async (req, res, next) => {
  try {
    const user = await adminService.updateAdminUserRole(req.user, req.params.id, req.body);
    return res.status(200).json({ success: true, message: "User role updated", data: { user } });
  } catch (error) {
    next(error);
  }
};

export const getAdminCustomers = async (req, res, next) => {
  try {
    const data = await adminService.getAdminCustomers(req.query);
    return res.status(200).json({ success: true, message: "Customers retrieved", data });
  } catch (error) {
    next(error);
  }
};

export const getAdminRooms = async (req, res, next) => {
  try {
    const data = await adminService.getAdminRooms(req.query);
    return res.status(200).json({ success: true, message: "Rooms retrieved", data });
  } catch (error) {
    next(error);
  }
};

export const createAdminRoom = async (req, res, next) => {
  try {
    const data = await adminService.createAdminRoom(req.user, req.body);
    return res.status(201).json({ success: true, message: "Room type created", data });
  } catch (error) {
    next(error);
  }
};

export const getAdminBeds = async (req, res, next) => {
  try {
    const data = await adminService.getAdminBeds(req.query);
    return res.status(200).json({ success: true, message: "Inventory units retrieved", data });
  } catch (error) {
    next(error);
  }
};

export const manageAdminBed = async (req, res, next) => {
  try {
    const data = await adminService.manageAdminBed(req.user, req.body);
    return res.status(200).json({ success: true, message: "Inventory unit updated", data });
  } catch (error) {
    next(error);
  }
};

export const createAvailabilityBlock = async (req, res, next) => {
  try {
    const data = await adminService.createAvailabilityBlock(req.user, req.body);
    return res.status(201).json({ success: true, message: "Availability block created", data });
  } catch (error) {
    next(error);
  }
};

export const deleteAvailabilityBlock = async (req, res, next) => {
  try {
    const data = await adminService.deleteAvailabilityBlock(req.user, req.params.id);
    return res.status(200).json({ success: true, message: "Availability block removed", data });
  } catch (error) {
    next(error);
  }
};

export const getAdminCalendar = async (req, res, next) => {
  try {
    const data = await adminService.getAdminCalendar(req.query);
    return res.status(200).json({ success: true, message: "Occupancy calendar retrieved", data });
  } catch (error) {
    next(error);
  }
};

export const getAdminRates = async (req, res, next) => {
  try {
    const data = await adminService.getAdminRates(req.query);
    return res.status(200).json({ success: true, message: "Rate plans retrieved", data });
  } catch (error) {
    next(error);
  }
};

export const updateAdminRate = async (req, res, next) => {
  try {
    const data = await adminService.updateAdminRate(req.user, req.params.id, req.body);
    return res.status(200).json({ success: true, message: "Rate plan updated", data });
  } catch (error) {
    next(error);
  }
};

export const createOfflineBooking = async (req, res, next) => {
  try {
    const data = await adminService.createOfflineBooking(req.user, req.body);
    return res.status(201).json({ success: true, message: "Offline booking created", data });
  } catch (error) {
    next(error);
  }
};

export const recordOfflinePayment = async (req, res, next) => {
  try {
    const data = await adminService.recordOfflinePayment(req.user, req.body);
    return res.status(201).json({ success: true, message: "Offline payment recorded", data });
  } catch (error) {
    next(error);
  }
};

export const getAdminVisits = async (req, res, next) => {
  try {
    const data = await adminService.getAdminVisits(req.query);
    return res.status(200).json({ success: true, message: "Visit requests retrieved", data });
  } catch (error) {
    next(error);
  }
};

export const updateAdminVisit = async (req, res, next) => {
  try {
    const data = await adminService.updateAdminVisit(req.user, req.params.id, req.body);
    return res.status(200).json({ success: true, message: "Visit updated", data });
  } catch (error) {
    next(error);
  }
};

export const getAdminSupportTickets = async (req, res, next) => {
  try {
    const data = await adminService.getAdminSupportTickets(req.query);
    return res.status(200).json({ success: true, message: "Support tickets retrieved", data });
  } catch (error) {
    next(error);
  }
};

export const replyAdminSupportTicket = async (req, res, next) => {
  try {
    const data = await adminService.replyAdminSupportTicket(req.user, req.params.id, req.body);
    return res.status(200).json({ success: true, message: "Support reply recorded", data });
  } catch (error) {
    next(error);
  }
};

export const getAdminContent = async (req, res, next) => {
  try {
    const data = await adminService.getAdminContent();
    return res.status(200).json({ success: true, message: "Site content retrieved", data });
  } catch (error) {
    next(error);
  }
};

export const updateAdminContent = async (req, res, next) => {
  try {
    const data = await adminService.updateAdminContent(req.user, req.body);
    return res.status(200).json({ success: true, message: "Site content updated", data });
  } catch (error) {
    next(error);
  }
};

export const getAdminSettings = async (req, res, next) => {
  try {
    const data = await adminService.getAdminSettings();
    return res.status(200).json({ success: true, message: "Platform settings retrieved", data });
  } catch (error) {
    next(error);
  }
};

export const updateAdminSettings = async (req, res, next) => {
  try {
    const data = await adminService.updateAdminSettings(req.user, req.body);
    return res.status(200).json({ success: true, message: "Platform settings updated", data });
  } catch (error) {
    next(error);
  }
};

export const getAdminAuditLogs = async (req, res, next) => {
  try {
    const data = await adminService.getAdminAuditLogs(req.query);
    return res.status(200).json({ success: true, message: "Audit logs retrieved", data });
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
  createAdminUser,
  updateAdminUserRole,
  getAdminCustomers,
  getAdminRooms,
  createAdminRoom,
  getAdminBeds,
  manageAdminBed,
  createAvailabilityBlock,
  deleteAvailabilityBlock,
  getAdminCalendar,
  getAdminRates,
  updateAdminRate,
  createOfflineBooking,
  recordOfflinePayment,
  getAdminVisits,
  updateAdminVisit,
  getAdminSupportTickets,
  replyAdminSupportTicket,
  getAdminContent,
  updateAdminContent,
  getAdminSettings,
  updateAdminSettings,
  getAdminAuditLogs,
};
