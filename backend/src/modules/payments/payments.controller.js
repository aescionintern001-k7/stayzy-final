import paymentsService from "./payments.service.js";
import { env, isDemoPropertySimulatorEnabled } from "../../config/env.js";

export const createOrder = async (req, res, next) => {
  try {
    const result = await paymentsService.createPaymentOrder(
      req.user.id,
      req.body
    );
    return res.status(201).json({
      success: true,
      message: "Payment order created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const result = await paymentsService.verifyPayment(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const recordFailure = async (req, res, next) => {
  try {
    const payment = await paymentsService.recordPaymentFailure(
      req.user.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Payment failure recorded successfully",
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

export const processRefund = async (req, res, next) => {
  try {
    const result = await paymentsService.processRefund(
      req.user,
      req.params.id,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await paymentsService.getPaymentById(
      req.user,
      req.params.id
    );
    return res.status(200).json({
      success: true,
      message: "Payment retrieved successfully",
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentsByBooking = async (req, res, next) => {
  try {
    const payments = await paymentsService.getPaymentsByBookingId(
      req.user,
      req.params.bookingId
    );
    return res.status(200).json({
      success: true,
      message: "Payments for booking retrieved successfully",
      data: { payments },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPayments = async (req, res, next) => {
  try {
    const result = await paymentsService.getMyPayments(
      req.user.id,
      req.query
    );
    return res.status(200).json({
      success: true,
      message: "Payments retrieved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const result = await paymentsService.handleWebhook(req.body, signature);
    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const reconcilePayment = async (req, res, next) => {
  try {
    const result = await paymentsService.reconcilePayment(req.user, req.body);
    return res.status(200).json({
      success: true,
      message: "Payment reconciliation complete",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const demoSimulate = async (req, res, next) => {
  try {
    if (!isDemoPropertySimulatorEnabled(env)) {
      return res.status(403).json({
        success: false,
        message: "Secure Payment Portal simulator is strictly disabled in production",
      });
    }
    const result = await paymentsService.demoSimulatePayment(req.user, req.body);
    return res.status(200).json({
      success: true,
      message: "Demo property payment simulation completed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createOrder,
  verifyPayment,
  recordFailure,
  processRefund,
  reconcilePayment,
  demoSimulate,
  getPaymentById,
  getPaymentsByBooking,
  getMyPayments,
  handleWebhook,
};
