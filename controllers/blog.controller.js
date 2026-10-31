import { Blog } from "../models/Blog.js";
import { resolveSingleImage } from "../utils/cloudinaryUpload.js";

function slugify(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(baseSlug, excludeId = null) {
  let slug = baseSlug || `blog-${Date.now()}`;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await Blog.findOne(query).select("_id");
    if (!exists) return slug;
    slug = `${baseSlug}-${counter++}`;
  }
}

async function prepareBlogPayload(body, { excludeId = null } = {}) {
  const payload = { ...body };

  if (payload.title && !payload.slug) {
    payload.slug = slugify(payload.title);
  } else if (payload.slug) {
    payload.slug = slugify(payload.slug);
  }

  if (payload.slug) {
    payload.slug = await ensureUniqueSlug(payload.slug, excludeId);
  }

  if (payload.coverImage) {
    payload.coverImage = await resolveSingleImage(payload.coverImage, {
      folder: "blogs",
    });
  }

  if (typeof payload.tags === "string") {
    payload.tags = payload.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (Array.isArray(payload.tags)) {
    payload.tags = payload.tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  return payload;
}

/** Website — published blogs only */
export async function getBlogs(req, res, next) {
  try {
    const { q, tag } = req.query;
    const filter = { isPublished: true };

    if (tag) filter.tags = tag;
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { excerpt: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
        { tags: { $regex: q, $options: "i" } },
      ];
    }

    const blogs = await Blog.find(filter).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    next(error);
  }
}

/** Admin — all blogs (draft + published) */
export async function getAllBlogs(req, res, next) {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    next(error);
  }
}

/** Website — single published blog by id */
export async function getBlog(req, res, next) {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog || !blog.isPublished) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.json(blog);
  } catch (error) {
    next(error);
  }
}

/** Website — single published blog by slug */
export async function getBlogBySlug(req, res, next) {
  try {
    const blog = await Blog.findOne({
      slug: String(req.params.slug).toLowerCase(),
      isPublished: true,
    });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.json(blog);
  } catch (error) {
    next(error);
  }
}

/** Admin — single blog by id (any status) */
export async function getAdminBlog(req, res, next) {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.json(blog);
  } catch (error) {
    next(error);
  }
}

export async function createBlog(req, res, next) {
  try {
    const { title, content } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!content?.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }

    const payload = await prepareBlogPayload(req.body);
    const blog = await Blog.create(payload);
    res.status(201).json(blog);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Blog slug already exists" });
    }
    next(error);
  }
}

export async function updateBlog(req, res, next) {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const payload = await prepareBlogPayload(req.body, {
      excludeId: blog._id,
    });

    Object.assign(blog, payload);
    await blog.save();
    res.json(blog);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Blog slug already exists" });
    }
    next(error);
  }
}

export async function deleteBlog(req, res, next) {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.json({ message: "Blog deleted" });
  } catch (error) {
    next(error);
  }
}
