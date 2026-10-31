import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    excerpt: { type: String, default: "", trim: true },
    content: { type: String, required: true },
    coverImage: { type: String, default: "" },
    author: { type: String, default: "SiwCarry", trim: true },
    tags: [{ type: String, trim: true }],
    isPublished: { type: Boolean, default: false },
    metaTitle: { type: String, default: "", trim: true },
    metaDescription: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

blogSchema.index({ isPublished: 1, createdAt: -1 });

export const Blog = mongoose.model("Blog", blogSchema);
