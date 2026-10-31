import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema(
  {
    colorName: { type: String, required: true, trim: true },
    colorCode: { type: String, required: true, trim: true },
    images: [{ type: String }],
    price: { type: Number, min: 0 },
    oldPrice: { type: Number, min: 0, default: null },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, trim: true, default: "" },
    options: { type: Map, of: String, default: undefined },
  },
  { _id: true },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, default: null },
    discount: { type: Number, default: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviews: { type: Number, default: 0 },
    stock: { type: Number, default: 20, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    description: { type: String, required: true },
    material: { type: String, default: "" },
    color: { type: String, default: "" },
    dimensions: { type: String, default: "" },
    weight: { type: String, default: "" },
    images: [{ type: String }],
    variants: { type: [productVariantSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.pre("save", function calcDiscount(next) {
  // Keep product.images in sync with variants only (avoid duplicated uploads)
  if (this.variants?.length) {
    const variantImages = this.variants.flatMap((variant) => variant.images || []);
    this.images = [...new Set(variantImages.filter(Boolean))];
  }

  if (this.oldPrice && this.oldPrice > this.price) {
    this.discount = Math.round(
      ((this.oldPrice - this.price) / this.oldPrice) * 100,
    );
  } else {
    this.discount = 0;
  }
  next();
});

export const Product = mongoose.model("Product", productSchema);
