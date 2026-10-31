import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { Product } from "../models/Product.js";

dotenv.config();

async function migrateVariants() {
  try {
    await connectDB(process.env.MONGODB_URI);

    const products = await Product.find({
      $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }],
    });

    for (const product of products) {
      product.variants = [
        {
          colorName: product.color || "Default",
          colorCode: "#000000",
          images: product.images || [],
          price: product.price,
          oldPrice: product.oldPrice,
          stock: product.stock,
          sku: "",
        },
      ];
      await product.save();
    }

    console.log(`Migrated ${products.length} products to the variant structure`);
    process.exit(0);
  } catch (error) {
    console.error("Variant migration failed:", error);
    process.exit(1);
  }
}

migrateVariants();
