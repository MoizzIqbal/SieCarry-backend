import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  createOrder,
  deleteOrder,
  getOrder,
  getOrderByNumber,
  getOrders,
  updateOrderStatus,
} from "../controllers/order.controller.js";

const router = Router();

router.post("/", createOrder);

router.get("/number/:orderNumber", getOrderByNumber);

router.get("/", protect, adminOnly, getOrders);

router.get("/:id", protect, adminOnly, getOrder);

router.patch("/:id/status", protect, adminOnly, updateOrderStatus);

router.delete("/:id", protect, adminOnly, deleteOrder);

export default router;
