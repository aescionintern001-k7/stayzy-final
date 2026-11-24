import {
  createBooking as createBookingService,
  checkPropertyAvailability as checkPropertyAvailabilityService,
  getGuestBookings as getGuestBookingsService,
  getPropertyReservations as getPropertyReservationsService,
  getBookingById as getBookingByIdService,
  cancelBooking as cancelBookingService,
  updateBookingStatus as updateBookingStatusService,
  calculatePricingService,
} from "./bookings.service.js";

/**
 * POST /api/v1/bookings
 * Create a new property booking.
 */
export const createBooking = async (req, res, next) => {
  try {
    const booking = await createBookingService(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/bookings/availability
 * Check property availability and price for a given date range.
 */
export const checkAvailability = async (req, res, next) => {
  try {
    const result = await checkPropertyAvailabilityService(req.query);

    res.status(200).json({
      success: true,
      message: "Availability checked successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/bookings
 * Retrieve booking history for the authenticated guest.
 */
export const getMyBookings = async (req, res, next) => {
  try {
    const result = await getGuestBookingsService(req.user.id, req.query);

    res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/bookings/property/:propertyId
 * Retrieve all reservations for a specific property (Host/Admin only).
 */
export const getPropertyReservations = async (req, res, next) => {
  try {
    const result = await getPropertyReservationsService(
      req.params.propertyId,
      req.user,
      req.query
    );

    res.status(200).json({
      success: true,
      message: "Property reservations retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/bookings/:id
 * Retrieve specific booking details (Guest, Host, or Admin).
 */
export const getBooking = async (req, res, next) => {
  try {
    const booking = await getBookingByIdService(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: "Booking details retrieved successfully",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/bookings/:id/cancel
 * Cancel a booking (Guest, Host, or Admin).
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await cancelBookingService(
      req.params.id,
      req.user,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/bookings/:id/status
 * Update booking status (Host or Admin).
 */
export const updateBookingStatus = async (req, res, next) => {
  try {
    const booking = await updateBookingStatusService(
      req.params.id,
      req.body.status,
      req.user,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/bookings/calculate-pricing
 * GET /api/v1/bookings/calculate-pricing
 * Authoritatively calculate booking pricing and rate plan breakdown.
 */
export const calculatePricing = async (req, res, next) => {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const result = await calculatePricingService(params);

    res.status(200).json({
      success: true,
      message: "Pricing calculated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
