import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { timestamps: true },
);

export const Category = mongoose.model("Category", categorySchema);
