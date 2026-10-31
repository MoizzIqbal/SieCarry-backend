import { Category } from "../models/Category.js";
import { resolveSingleImage } from "../utils/cloudinaryUpload.js";

export async function getCategories(req, res, next) {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const payload = { ...req.body };
    if (payload.image) {
      payload.image = await resolveSingleImage(payload.image, {
        folder: "categories",
      });
    }
    const category = await Category.create(payload);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const payload = { ...req.body };
    if (payload.image) {
      payload.image = await resolveSingleImage(payload.image, {
        folder: "categories",
      });
    }

    const category = await Category.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (error) {
    next(error);
  }
}
