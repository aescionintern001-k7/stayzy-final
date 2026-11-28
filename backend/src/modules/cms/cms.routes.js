import { Router } from "express";
import { getPublicContent } from "./cms.controller.js";

const router = Router();
router.get("/", getPublicContent);

export default router;
