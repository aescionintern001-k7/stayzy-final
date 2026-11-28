import { listRoomsService, getRoomDetailService } from "./rooms.service.js";

export const listRooms = async (req, res, next) => {
  try {
    const data = await listRoomsService(req.query);
    return res.status(200).json({
      success: true,
      message: "Rooms retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getRoomDetail = async (req, res, next) => {
  try {
    const data = await getRoomDetailService(req.params.slugOrId, req.query);
    return res.status(200).json({
      success: true,
      message: "Room details retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
