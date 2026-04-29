import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { randomBytes } from "crypto";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "لم يتم رفع أي ملف" });
    }

    // إنشاء اسم ملف فريد
    const fileExtension = req.file.originalname.split(".").pop();
    const randomSuffix = randomBytes(8).toString("hex");
    const fileKey = `proof-documents/${Date.now()}-${randomSuffix}.${fileExtension}`;

    // رفع الملف إلى S3
    const { url } = await storagePut(
      fileKey,
      req.file.buffer,
      req.file.mimetype
    );

    res.json({ url, key: fileKey });
  } catch (error) {
    console.error("خطأ في رفع الملف:", error);
    res.status(500).json({ error: "فشل رفع الملف" });
  }
});

export default router;
