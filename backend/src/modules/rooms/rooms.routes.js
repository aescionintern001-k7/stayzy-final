import { Router } from "express";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { listRooms, getRoomDetail } from "./rooms.controller.js";
import {
  listRoomsQuerySchema,
  roomSlugOrIdParamSchema,
  roomDetailQuerySchema,
} from "./rooms.validator.js";

const router = Router();

router.get("/", validateRequest({ query: listRoomsQuerySchema }), listRooms);
router.get(
  "/:slugOrId",
  validateRequest({
    params: roomSlugOrIdParamSchema,
    query: roomDetailQuerySchema,
  }),
  getRoomDetail
);

export default router;
