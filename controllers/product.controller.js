import { Product } from "../models/Product.js";
import { resolveImageUrls } from "../utils/cloudinaryUpload.js";

export function slugify(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureUniqueProductSlug(baseSlug, excludeId = null) {
  let slug = baseSlug || `product-${Date.now()}`;
  let counter = 2;

  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Product.findOne(query).select("_id");
    if (!exists) return slug;
    slug = `${baseSlug}-${counter++}`;
  }
}

async function prepareProductPayload(body, { excludeId = null, existing } = {}) {
  const payload = { ...body };

  if (Array.isArray(payload.variants) && payload.variants.length) {
    payload.variants = await Promise.all(
      payload.variants.map(async (variant) => ({
        ...variant,
        images: await resolveImageUrls(variant.images || [], {
          folder: "products",
        }),
      })),
    );

    // Product gallery = unique variant images only (no double upload/merge)
    payload.images = [
      ...new Set(payload.variants.flatMap((variant) => variant.images || [])),
    ];
  } else if (payload.images?.length) {
    payload.images = await resolveImageUrls(payload.images, {
      folder: "products",
    });
  }

  const nameForSlug = payload.name ?? existing?.name;
  if (payload.slug) {
    payload.slug = await ensureUniqueProductSlug(
      slugify(payload.slug),
      excludeId,
    );
  } else if (nameForSlug && (payload.name || !existing?.slug)) {
    payload.slug = await ensureUniqueProductSlug(
      slugify(nameForSlug),
      excludeId,
    );
  }

  return payload;
}

export async function getProducts(req, res, next) {
  try {
    const {
      category,
      q,
      minPrice,
      maxPrice,
      minRating,
      sort = "newest",
      featured,
      isNew,
    } = req.query;

    const filter = { isActive: true };

    if (category && category !== "all") filter.category = category;
    if (featured === "true") filter.isFeatured = true;
    if (isNew === "true") filter.isNewArrival = true;
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = Number(minPrice);
      if (maxPrice) priceFilter.$lte = Number(maxPrice);
      filter.$and = [
        ...(filter.$and || []),
        { $or: [{ price: priceFilter }, { "variants.price": priceFilter }] },
      ];
    }
    if (minRating) filter.rating = { $gte: Number(minRating) };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { color: { $regex: q, $options: "i" } },
        { material: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
      ];
    }

    // Newest products always first by default
    let sortOption = { createdAt: -1 };
    if (sort === "featured") sortOption = { isFeatured: -1, createdAt: -1 };
    if (sort === "price-asc") sortOption = { price: 1, createdAt: -1 };
    if (sort === "price-desc") sortOption = { price: -1, createdAt: -1 };
    if (sort === "rating") sortOption = { rating: -1, createdAt: -1 };
    if (sort === "newest") sortOption = { createdAt: -1 };

    const products = await Product.find(filter).sort(sortOption);
    res.json(products);
  } catch (error) {
    next(error);
  }
}

export async function getAllProducts(req, res, next) {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function getProductBySlug(req, res, next) {
  try {
    const product = await Product.findOne({
      slug: String(req.params.slug).toLowerCase(),
      isActive: true,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    if (!req.body?.name?.trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    const payload = await prepareProductPayload(req.body);
    if (!payload.slug) {
      payload.slug = await ensureUniqueProductSlug(slugify(payload.name));
    }

    const product = await Product.create(payload);
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Product slug already exists" });
    }
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const payload = await prepareProductPayload(req.body, {
      excludeId: product._id,
      existing: product,
    });

    Object.assign(product, payload);
    if (!product.slug) {
      product.slug = await ensureUniqueProductSlug(
        slugify(product.name),
        product._id,
      );
    }

    await product.save();
    res.json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Product slug already exists" });
    }
    next(error);
  }
}

export async function addProductVariant(req, res, next) {
  try {
    const variant = {
      ...req.body,
      images: await resolveImageUrls(req.body.images || [], { folder: "products" }),
    };
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.variants.push(variant);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

export async function updateProductVariant(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(req.params.variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    const updates = { ...req.body };
    if (Array.isArray(updates.images)) {
      updates.images = await resolveImageUrls(updates.images, { folder: "products" });
    }
    Object.assign(variant, updates);
    await product.save();
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function deleteProductVariant(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(req.params.variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    variant.deleteOne();
    await product.save();
    res.json(product);
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (error) {
    next(error);
  }
}
