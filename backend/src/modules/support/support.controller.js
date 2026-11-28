import {
  createSupportTicketService,
  listMySupportTicketsService,
} from "./support.service.js";

export const createSupportTicket = async (req, res, next) => {
  try {
    const data = await createSupportTicketService(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: "Support request submitted successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const listSupportTickets = async (req, res, next) => {
  try {
    const data = await listMySupportTicketsService(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      message: "Support tickets retrieved successfully",
      data,
    });
  } catch (error) {
    next(error);
  }
};
