import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  createBlog,
  deleteBlog,
  getAdminBlog,
  getAllBlogs,
  getBlog,
  getBlogBySlug,
  getBlogs,
  updateBlog,
} from "../controllers/blog.controller.js";

const router = Router();

// Website (public)
router.get("/", getBlogs);
router.get("/slug/:slug", getBlogBySlug);

// Admin panel
router.get("/admin/all", protect, adminOnly, getAllBlogs);
router.get("/admin/:id", protect, adminOnly, getAdminBlog);
router.post("/", protect, adminOnly, createBlog);
router.put("/:id", protect, adminOnly, updateBlog);
router.delete("/:id", protect, adminOnly, deleteBlog);

// Website — by id (keep after /admin routes)
router.get("/:id", getBlog);

export default router;
