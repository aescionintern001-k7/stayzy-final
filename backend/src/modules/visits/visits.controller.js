import {
  scheduleVisitService,
  getMyVisitsService,
  getOwnerVisitsService,
  updateVisitStatusService,
} from "./visits.service.js";

export const scheduleVisit = async (req, res, next) => {
  try {
    const data = await scheduleVisitService(req.body, req.user || null);
    return res.status(201).json({
      success: true,
      message: "Walkthrough visit scheduled successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyVisits = async (req, res, next) => {
  try {
    const data = await getMyVisitsService(req.user.id);
    return res.status(200).json({
      success: true,
      message: "Your visits retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnerVisits = async (req, res, next) => {
  try {
    const data = await getOwnerVisitsService(req.user);
    return res.status(200).json({
      success: true,
      message: "Owner property visits retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVisitStatus = async (req, res, next) => {
  try {
    const data = await updateVisitStatusService(
      req.params.id,
      req.user,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Visit status updated successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
