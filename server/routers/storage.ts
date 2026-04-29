import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { requestAttachments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// أنواع الملفات المسموح بها
const ALLOWED_FILE_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  all: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
};

// الحد الأقصى لحجم الملف (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// توليد معرف فريد للملف
function generateFileKey(userId: number, originalName: string, folder: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || 'bin';
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
  return `${folder}/${userId}/${timestamp}-${random}-${sanitizedName}`;
}

// تحديد نوع الملف
function getFileCategory(mimeType: string): "image" | "document" {
  if (ALLOWED_FILE_TYPES.image.includes(mimeType)) {
    return "image";
  }
  return "document";
}

export const storageRouter = router({
  // رفع ملف للطلب
  uploadRequestAttachment: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      fileName: z.string(),
      fileData: z.string(), // Base64 encoded
      mimeType: z.string(),
      category: z.enum(["site_photo", "land_deed", "plan", "invoice", "other"]).optional().default("other"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      // التحقق من نوع الملف
      if (!ALLOWED_FILE_TYPES.all.includes(input.mimeType)) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "نوع الملف غير مسموح. الأنواع المسموحة: صور (JPG, PNG, WebP, GIF) ومستندات (PDF, Word)" 
        });
      }

      // تحويل Base64 إلى Buffer
      const fileBuffer = Buffer.from(input.fileData, 'base64');

      // التحقق من حجم الملف
      if (fileBuffer.length > MAX_FILE_SIZE) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "حجم الملف يتجاوز الحد المسموح (10 ميجابايت)" 
        });
      }

      // رفع الملف إلى S3
      const fileKey = generateFileKey(ctx.user.id, input.fileName, `requests/${input.requestId}/${input.category}`);
      
      try {
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

        // حفظ معلومات المرفق في قاعدة البيانات
        const result = await db.insert(requestAttachments).values({
          requestId: input.requestId,
          fileName: input.fileName,
          fileUrl: url,
          fileType: getFileCategory(input.mimeType),
          fileSize: fileBuffer.length,
          uploadedBy: ctx.user.id,
        });

        return {
          id: Number(result[0].insertId),
          url,
          fileName: input.fileName,
          fileType: getFileCategory(input.mimeType),
          fileSize: fileBuffer.length,
        };
      } catch (error) {
        console.error("Error uploading file:", error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "فشل في رفع الملف. يرجى المحاولة مرة أخرى" 
        });
      }
    }),

  // الحصول على مرفقات الطلب
  getRequestAttachments: protectedProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return [];
      }

      const attachments = await db
        .select()
        .from(requestAttachments)
        .where(eq(requestAttachments.requestId, input.requestId));

      return attachments;
    }),

  // حذف مرفق
  deleteAttachment: protectedProcedure
    .input(z.object({
      attachmentId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      // التحقق من أن المستخدم هو من رفع الملف أو لديه صلاحيات إدارية
      const [attachment] = await db
        .select()
        .from(requestAttachments)
        .where(eq(requestAttachments.id, input.attachmentId))
        .limit(1);

      if (!attachment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المرفق غير موجود" });
      }

      const isAdmin = ["super_admin", "system_admin", "projects_office"].includes(ctx.user.role);
      if (attachment.uploadedBy !== ctx.user.id && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية حذف هذا المرفق" });
      }

      await db.delete(requestAttachments).where(eq(requestAttachments.id, input.attachmentId));

      return { success: true };
    }),

  // رفع ملفات متعددة للطلب
  uploadMultipleAttachments: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      files: z.array(z.object({
        fileName: z.string(),
        fileData: z.string(),
        mimeType: z.string(),
        category: z.enum(["site_photo", "land_deed", "plan", "invoice", "other"]).optional().default("other"),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const results = [];

      for (const file of input.files) {
        // التحقق من نوع الملف
        if (!ALLOWED_FILE_TYPES.all.includes(file.mimeType)) {
          continue; // تخطي الملفات غير المسموحة
        }

        const fileBuffer = Buffer.from(file.fileData, 'base64');

        // التحقق من حجم الملف
        if (fileBuffer.length > MAX_FILE_SIZE) {
          continue; // تخطي الملفات الكبيرة
        }

        const fileKey = generateFileKey(ctx.user.id, file.fileName, `requests/${input.requestId}/${file.category}`);

        try {
          const { url } = await storagePut(fileKey, fileBuffer, file.mimeType);

          const result = await db.insert(requestAttachments).values({
            requestId: input.requestId,
            fileName: file.fileName,
            fileUrl: url,
            fileType: getFileCategory(file.mimeType),
            fileSize: fileBuffer.length,
            uploadedBy: ctx.user.id,
          });

          results.push({
            id: Number(result[0].insertId),
            url,
            fileName: file.fileName,
            fileType: getFileCategory(file.mimeType),
            fileSize: fileBuffer.length,
          });
        } catch (error) {
          console.error("Error uploading file:", file.fileName, error);
        }
      }

      return results;
    }),
});
