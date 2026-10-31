import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import { getStats } from "../controllers/admin.controller.js";

const router = Router();

router.use(protect, adminOnly);

router.get("/stats", getStats);

export default router;
