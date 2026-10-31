import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import { Product } from "../models/Product.js";
import {
  ensureUniqueProductSlug,
  slugify,
} from "../controllers/product.controller.js";

dotenv.config();

async function migrateProductSlugs() {
  try {
    await connectDB(process.env.MONGODB_URI);

    const products = await Product.find({
      $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
    });

    let updated = 0;
    for (const product of products) {
      const base = slugify(product.name) || `product-${product._id}`;
      product.slug = await ensureUniqueProductSlug(base, product._id);
      await product.save();
      updated += 1;
      console.log(`${product.name} → ${product.slug}`);
    }

    console.log(`Migrated slugs for ${updated} products`);
    process.exit(0);
  } catch (error) {
    console.error("Product slug migration failed:", error);
    process.exit(1);
  }
}

migrateProductSlugs();
