import { Router } from "express";
import { protect, adminOnly } from "../middleware/auth.js";
import {
  addProductVariant,
  createProduct,
  deleteProductVariant,
  deleteProduct,
  getAllProducts,
  getProduct,
  getProductBySlug,
  getProducts,
  updateProductVariant,
  updateProduct,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/", getProducts);

router.get("/admin/all", protect, adminOnly, getAllProducts);

router.get("/slug/:slug", getProductBySlug);

router.get("/:id", getProduct);

router.post("/", protect, adminOnly, createProduct);

router.put("/:id", protect, adminOnly, updateProduct);

router.post("/:id/variants", protect, adminOnly, addProductVariant);

router.put("/:id/variants/:variantId", protect, adminOnly, updateProductVariant);

router.delete("/:id/variants/:variantId", protect, adminOnly, deleteProductVariant);

router.delete("/:id", protect, adminOnly, deleteProduct);

export default router;
