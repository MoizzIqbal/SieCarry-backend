import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  variantId: { type: mongoose.Schema.Types.ObjectId },
  colorName: String,
  colorCode: String,
  sku: String,
  name: String,
  image: String,
  price: Number,
  quantity: Number,
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, default: "" },
      country: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "card", "bank_transfer"],
      default: "cod",
    },
    paymentProof: { type: String, default: "" },
    items: [orderItemSchema],
    totals: {
      subtotal: { type: Number, required: true },
      shipping: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      grandTotal: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const Order = mongoose.model("Order", orderSchema);
