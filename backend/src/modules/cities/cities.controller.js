import { listCitiesService } from "./cities.service.js";

export const listCities = async (req, res, next) => {
  try {
    const data = await listCitiesService(req.query);
    return res.status(200).json({
      success: true,
      message: "Cities retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
