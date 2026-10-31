import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  uploadImages,
  uploadMultiple,
  uploadSingle,
} from "../controllers/upload.controller.js";

const router = Router();

router.post("/", protect, adminOnly, uploadSingle, uploadImages);
router.post("/multiple", protect, adminOnly, uploadMultiple, uploadImages);

export default router;
