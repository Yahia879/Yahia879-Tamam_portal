import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { randomBytes } from "crypto";

const router = Router();

// إعدادات القيود: 5 ميجابايت وأنواع ملفات محددة
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مسموح به. يسمح فقط بالصور (JPEG, PNG, WEBP) وملفات PDF."));
    }
  },
}).single("file");

router.post("/upload", (req, res) => {
  upload(req, res, async (err) => {
    // معالجة أخطاء multer (الحجم أو الفلتر)
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "حجم الملف كبير جداً. الحد الأقصى هو 5 ميجابايت." });
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
      const fileKey = `proof-documents/${Date.now()}-${randomSuffix}.${fileExtension}`;

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
