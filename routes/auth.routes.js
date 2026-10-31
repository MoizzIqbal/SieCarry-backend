import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
	adminCheck,
	changePassword,
	forgotPassword,
	getMe,
	login,
	resetPassword,
	signup,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", login);
router.post("/signup", signup);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/me", protect, getMe);
router.patch("/change-password", protect, changePassword);

router.get("/admin-check", protect, adminOnly, adminCheck);

export default router;
