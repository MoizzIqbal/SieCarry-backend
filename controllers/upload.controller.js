import multer from "multer";
import { uploadImageBuffer } from "../utils/cloudinaryUpload.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!file.mimetype?.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

export const uploadSingle = upload.single("image");
export const uploadMultiple = upload.array("images", 10);

export async function uploadImages(req, res, next) {
  try {
    const folder = req.body?.folder || "products";
    const files = req.files?.length
      ? req.files
      : req.file
        ? [req.file]
        : [];

    if (!files.length) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const uploaded = [];
    for (const file of files) {
      const result = await uploadImageBuffer(file.buffer, {
        folder,
        mimetype: file.mimetype,
      });
      uploaded.push(result);
    }

    if (uploaded.length === 1) {
      return res.status(201).json(uploaded[0]);
    }

    res.status(201).json({
      images: uploaded.map((item) => item.url),
      items: uploaded,
    });
  } catch (error) {
    next(error);
  }
}
