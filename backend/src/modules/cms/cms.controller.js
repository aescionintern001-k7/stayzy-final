import { getPublicContentService } from "./cms.service.js";

export const getPublicContent = async (req, res, next) => {
  try {
    const data = await getPublicContentService();
    return res.status(200).json({
      success: true,
      message: "Site content retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
