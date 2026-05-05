import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// المسار المحلي للمرفقات
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// التأكد من وجود المجلد
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * حفظ ملف محلياً
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  const filePath = path.join(UPLOADS_DIR, key);
  const dirPath = path.dirname(filePath);

  // إنشاء المجلدات الفرعية إذا لم تكن موجودة
  if (!fs.existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }

  // حفظ الملف
  await writeFile(filePath, data);

  // إنشاء رابط محلي (يفترض أن الخادم يقدم مجلد uploads كمسار ثابت /uploads)
  const url = `/uploads/${key}`;

  return { key, url };
}

/**
 * الحصول على رابط الملف (محلي)
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const key = relKey.replace(/^\/+/, "");
  return {
    key,
    url: `/uploads/${key}`,
  };
}

/**
 * حذف ملف محلي
 */
export async function storageDelete(relKey: string): Promise<void> {
  const key = relKey.replace(/^\/+/, "");
  const filePath = path.join(UPLOADS_DIR, key);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
