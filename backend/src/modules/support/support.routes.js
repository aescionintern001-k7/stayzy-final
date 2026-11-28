import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  createSupportTicket,
  listSupportTickets,
} from "./support.controller.js";
import {
  createSupportTicketSchema,
  listSupportQuerySchema,
} from "./support.validator.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateRequest({ query: listSupportQuerySchema }),
  listSupportTickets
);
router.post(
  "/",
  validateRequest({ body: createSupportTicketSchema }),
  createSupportTicket
);

export default router;
