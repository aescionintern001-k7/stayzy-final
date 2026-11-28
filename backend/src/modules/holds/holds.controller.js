import {
  createHoldService,
  getHoldByTokenService,
  releaseHoldService,
} from "./holds.service.js";

export const createHold = async (req, res, next) => {
  try {
    const hold = await createHoldService(req.body, req.user || null);
    return res.status(201).json({
      success: true,
      message: "Unit held for 15 minutes",
      data: hold,
    });
  } catch (error) {
    next(error);
  }
};

export const getHold = async (req, res, next) => {
  try {
    const hold = await getHoldByTokenService(req.params.token, req.user || null);
    return res.status(200).json({
      success: true,
      message: "Active hold retrieved",
      data: { hold },
    });
  } catch (error) {
    next(error);
  }
};

export const releaseHold = async (req, res, next) => {
  try {
    const result = await releaseHoldService(req.params.token, req.user || null);
    return res.status(200).json({
      success: true,
      message: result.released ? "Hold released" : "Hold not found or already released",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
