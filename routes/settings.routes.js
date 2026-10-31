import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  getPublicSettings,
  getSettings,
  updateSettings,
} from "../controllers/settings.controller.js";

const router = Router();

// Website (public)
router.get("/public", getPublicSettings);

// Admin panel
router.get("/", protect, adminOnly, getSettings);
router.put("/", protect, adminOnly, updateSettings);

export default router;
