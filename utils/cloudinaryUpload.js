import { cloudinary, configureCloudinary } from "../config/cloudinary.js";

function ensureConfigured() {
  if (!configureCloudinary()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
    );
  }
}

function folderPath(subfolder = "products") {
  const root = process.env.CLOUDINARY_FOLDER || "thaili";
  return `${root}/${subfolder}`;
}

export function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

export async function uploadImage(source, { folder = "products" } = {}) {
  ensureConfigured();

  const result = await cloudinary.uploader.upload(source, {
    folder: folderPath(folder),
    resource_type: "image",
    overwrite: false,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

export async function uploadImageBuffer(buffer, { folder = "products", mimetype = "image/jpeg" } = {}) {
  ensureConfigured();

  const dataUri = `data:${mimetype};base64,${buffer.toString("base64")}`;
  return uploadImage(dataUri, { folder });
}

/** Turn base64 data URLs into Cloudinary URLs; leave http(s) URLs as-is */
export async function resolveImageUrls(images = [], { folder = "products" } = {}) {
  if (!Array.isArray(images) || images.length === 0) return [];

  const resolved = [];
  for (const image of images) {
    if (!image || typeof image !== "string") continue;

    if (isDataUrl(image)) {
      const uploaded = await uploadImage(image, { folder });
      resolved.push(uploaded.url);
    } else {
      resolved.push(image);
    }
  }

  return resolved;
}

export async function resolveSingleImage(image, { folder = "categories" } = {}) {
  if (!image || typeof image !== "string") return image || "";
  if (!isDataUrl(image)) return image;

  const uploaded = await uploadImage(image, { folder });
  return uploaded.url;
}
