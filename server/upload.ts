import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { randomBytes } from "crypto";

const router = Router();

// إعدادات القيود: 50 ميجابايت وأنواع ملفات مسموح بها (الصور، الفيديوهات، والمستندات والملفات المضغوطة)
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-matroska",
  "video/avi",
  "video/x-msvideo",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/octet-stream"
];
const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "webp", "gif", 
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", 
  "mp4", "webm", "ogg", "mov", "mkv", "avi", 
  "zip", "rar"
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    const extension = file.originalname.split(".").pop()?.toLowerCase() || "";
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مسموح به. يسمح بالصور، الفيديوهات، والمستندات والملفات المضغوطة فقط."));
    }
  },
}).single("file");

router.post("/upload", (req, res) => {
  upload(req, res, async (err) => {
    // معالجة أخطاء multer (الحجم أو الفلتر)
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "حجم الملف كبير جداً. الحد الأقصى هو 50 ميجابايت." });
      }
      return res.status(400).json({ error: `خطأ في الرفع: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "لم يتم رفع أي ملف" });
      }

      // إنشاء اسم ملف فريد
      const fileExtension = req.file.originalname.split(".").pop();
      const randomSuffix = randomBytes(8).toString("hex");
      const folderParam = (req.query.folder || req.body.folder || "proof-documents").toString().replace(/[^a-zA-Z0-9_-]/g, "");
      const fileKey = `${folderParam}/${Date.now()}-${randomSuffix}.${fileExtension}`;

      // رفع الملف إلى التخزين
      const { url } = await storagePut(
        fileKey,
        req.file.buffer,
        req.file.mimetype
      );

      res.json({ url, key: fileKey });
    } catch (error) {
      console.error("خطأ في معالجة الملف:", error);
      res.status(500).json({ error: "فشل معالجة الملف المرفوع" });
    }
  });
});

export default router;
