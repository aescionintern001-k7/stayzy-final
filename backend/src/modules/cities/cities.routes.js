import { Router } from "express";
import { z } from "zod";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { listCities } from "./cities.controller.js";

const listCitiesQuerySchema = z
  .object({
    letter: z.string().trim().length(1).optional(),
    q: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    popularOnly: z.union([z.boolean(), z.string()]).optional(),
    activeOnly: z.union([z.boolean(), z.string()]).optional(),
  })
  .strict();

const router = Router();
router.get("/", validateRequest({ query: listCitiesQuerySchema }), listCities);

export default router;
