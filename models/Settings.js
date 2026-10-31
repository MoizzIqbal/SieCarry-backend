import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "app" },
    deliveryCharges: { type: Number, required: true, min: 0, default: 0 },
    freeShippingMinOrder: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

export const Settings = mongoose.model("Settings", settingsSchema);
