import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { organizationSettings, signatories } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const organizationRouter = router({
  // جلب إعدادات الجمعية
  getSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

    const settings = await db.select().from(organizationSettings).limit(1);
    
    if (settings.length === 0) {
      // إرجاع قيم افتراضية إذا لم توجد إعدادات
      return {
        id: null,
        organizationName: "",
        organizationNameShort: "",
        licenseNumber: "",
        administrativeSupervisor: "",
        technicalSupervisor: "",
        boardChairmanName: "",
        executiveDirectorName: "",
        accountantName: "",
        aboutOrganization: "",
        address: "",
        city: "",
        phone: "",
        email: "",
        website: "",
        logoUrl: "",
        stampUrl: "",
        secondaryLogoUrl: "",
        bankName: "",
        bankAccountName: "",
        iban: "",
        contractPrefix: "CON",
        contractFooterText: "",
        contractTermsAndConditions: "",
        colorPrimary1: "#09707e",
        colorPrimary2: "#0891b2",
        colorSecondary1: "#6366f1",
        colorSecondary2: "#f59e0b",
        colorSecondary3: "#ef4444",
        colorSecondary4: "#8b5cf6",
        colorSecondary5: "#10b981",
        authorizedSignatory: "",
        signatoryTitle: "",
        signatoryPhone: "",
        signatoryEmail: "",
      };
    }
    
    return settings[0];
  }),

  // تحديث إعدادات الجمعية
  updateSettings: protectedProcedure
    .input(z.object({
      // بيانات الجمعية الأساسية
      organizationName: z.string().min(1, "اسم الجمعية مطلوب"),
      organizationNameShort: z.string().optional(),
      licenseNumber: z.string().optional(),
      administrativeSupervisor: z.string().optional(),
      technicalSupervisor: z.string().optional(),
      boardChairmanName: z.string().optional(),
      executiveDirectorName: z.string().optional(),
      accountantName: z.string().optional(),
      aboutOrganization: z.string().optional(),
      // بيانات التواصل
      address: z.string().optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
      website: z.string().optional(),
      // الشعارات والأختام
      logoUrl: z.string().optional(),
      stampUrl: z.string().optional(),
      secondaryLogoUrl: z.string().optional(),
      // البيانات البنكية
      bankName: z.string().optional(),
      bankAccountName: z.string().optional(),
      iban: z.string().optional(),
      // إعدادات العقود
      contractPrefix: z.string().optional(),
      contractFooterText: z.string().optional(),
      contractTermsAndConditions: z.string().optional(),
      // الألوان
      colorPrimary1: z.string().optional(),
      colorPrimary2: z.string().optional(),
      colorSecondary1: z.string().optional(),
      colorSecondary2: z.string().optional(),
      colorSecondary3: z.string().optional(),
      colorSecondary4: z.string().optional(),
      colorSecondary5: z.string().optional(),
      // بيانات المفوض بالتوقيع
      authorizedSignatory: z.string().optional(),
      signatoryTitle: z.string().optional(),
      signatoryPhone: z.string().optional(),
      signatoryEmail: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من صلاحية المستخدم (مدير النظام أو المدير العام أو مكتب المشاريع)
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تعديل إعدادات الجمعية" });
      }

      // التحقق من وجود إعدادات سابقة
      const existingSettings = await db.select().from(organizationSettings).limit(1);

      // الحفاظ على الشعارات الموجودة إذا لم تُمرر قيمة جديدة
      const existing = existingSettings[0];
      const settingsData = {
        organizationName: input.organizationName,
        organizationNameShort: input.organizationNameShort || null,
        licenseNumber: input.licenseNumber || null,
        administrativeSupervisor: input.administrativeSupervisor || null,
        technicalSupervisor: input.technicalSupervisor || null,
        boardChairmanName: input.boardChairmanName || null,
        executiveDirectorName: input.executiveDirectorName || null,
        accountantName: input.accountantName || null,
        aboutOrganization: input.aboutOrganization || null,
        address: input.address || null,
        city: input.city || null,
        phone: input.phone || null,
        email: input.email || null,
        website: input.website || null,
        // الحفاظ على الشعارات الموجودة إذا لم تُمرر قيمة جديدة
        logoUrl: input.logoUrl !== undefined ? (input.logoUrl || null) : (existing?.logoUrl || null),
        stampUrl: input.stampUrl !== undefined ? (input.stampUrl || null) : (existing?.stampUrl || null),
        secondaryLogoUrl: input.secondaryLogoUrl !== undefined ? (input.secondaryLogoUrl || null) : (existing?.secondaryLogoUrl || null),
        bankName: input.bankName || null,
        bankAccountName: input.bankAccountName || null,
        iban: input.iban || null,
        contractPrefix: input.contractPrefix || "CON",
        contractFooterText: input.contractFooterText || null,
        contractTermsAndConditions: input.contractTermsAndConditions || null,
        colorPrimary1: input.colorPrimary1 || "#09707e",
        colorPrimary2: input.colorPrimary2 || "#0891b2",
        colorSecondary1: input.colorSecondary1 || "#6366f1",
        colorSecondary2: input.colorSecondary2 || "#f59e0b",
        colorSecondary3: input.colorSecondary3 || "#ef4444",
        colorSecondary4: input.colorSecondary4 || "#8b5cf6",
        colorSecondary5: input.colorSecondary5 || "#10b981",
        authorizedSignatory: input.authorizedSignatory || null,
        signatoryTitle: input.signatoryTitle || null,
        signatoryPhone: input.signatoryPhone || null,
        signatoryEmail: input.signatoryEmail || null,
        updatedBy: ctx.user.id,
      };

      if (existingSettings.length === 0) {
        // إنشاء إعدادات جديدة
        await db.insert(organizationSettings).values(settingsData);
      } else {
        // تحديث الإعدادات الموجودة
        await db.update(organizationSettings)
          .set(settingsData)
          .where(eq(organizationSettings.id, existingSettings[0].id));
      }

      return { success: true, message: "تم حفظ إعدادات الجمعية بنجاح" };
    }),

  // رفع الشعار
  uploadLogo: protectedProcedure
    .input(z.object({
      type: z.enum(["logo", "stamp", "secondaryLogo"]),
      fileData: z.string(), // Base64 encoded file
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من صلاحية المستخدم
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية رفع الشعارات" });
      }

      // استيراد دالة التخزين
      const { storagePut } = await import("../storage");

      // تحويل Base64 إلى Buffer
      const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // إنشاء اسم فريد للملف
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const extension = input.fileName.split(".").pop() || "png";
      const fileKey = `organization/${input.type}-${timestamp}-${randomSuffix}.${extension}`;

      // رفع الملف
      let url: string;
      try {
        const result = await storagePut(fileKey, buffer, input.mimeType);
        url = result.url;
      } catch (storageError: any) {
        console.error('[uploadLogo] Storage error:', storageError?.message || storageError);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `فشل رفع الملف: ${storageError?.message || 'خطأ في التخزين'}` });
      }

      // تحديث الإعدادات
      const existingSettings = await db.select().from(organizationSettings).limit(1);
      
      const fieldMap = {
        logo: "logoUrl",
        stamp: "stampUrl",
        secondaryLogo: "secondaryLogoUrl",
      };
      
      const updateField = fieldMap[input.type];

      if (existingSettings.length === 0) {
        // إنشاء إعدادات جديدة مع الشعار
        await db.insert(organizationSettings).values({
          organizationName: "الجمعية",
          [updateField]: url,
          updatedBy: ctx.user.id,
        });
      } else {
        // تحديث الشعار في الإعدادات الموجودة
        await db.update(organizationSettings)
          .set({ [updateField]: url, updatedBy: ctx.user.id })
          .where(eq(organizationSettings.id, existingSettings[0].id));
      }

      return { success: true, url };
    }),

  // ==================== مفوضو التوقيع ====================

  // جلب جميع المفوضين
  getSignatories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

    const signatoryList = await db
      .select()
      .from(signatories)
      .where(eq(signatories.isActive, true))
      .orderBy(signatories.sortOrder);

    return signatoryList;
  }),

  // إضافة مفوض جديد
  addSignatory: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "اسم المفوض مطلوب"),
      title: z.string().min(1, "المنصب مطلوب"),
      nationalId: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
      signatureUrl: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من الصلاحية
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية إضافة مفوضين" });
      }

      // إذا كان المفوض الجديد افتراضي، ألغِ الافتراضي من الآخرين
      if (input.isDefault) {
        await db.update(signatories).set({ isDefault: false }).where(eq(signatories.isDefault, true));
      }

      // حساب الترتيب
      const existingSignatories = await db.select().from(signatories);
      const nextOrder = existingSignatories.length;

      await db.insert(signatories).values({
        name: input.name,
        title: input.title,
        nationalId: input.nationalId || null,
        phone: input.phone || null,
        email: input.email || null,
        signatureUrl: input.signatureUrl || null,
        isDefault: input.isDefault || false,
        sortOrder: nextOrder,
        createdBy: ctx.user.id,
      });

      return { success: true, message: "تم إضافة المفوض بنجاح" };
    }),

  // تحديث مفوض
  updateSignatory: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1, "اسم المفوض مطلوب"),
      title: z.string().min(1, "المنصب مطلوب"),
      nationalId: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
      signatureUrl: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من الصلاحية
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تعديل المفوضين" });
      }

      // إذا كان المفوض افتراضي، ألغِ الافتراضي من الآخرين
      if (input.isDefault) {
        await db.update(signatories).set({ isDefault: false }).where(eq(signatories.isDefault, true));
      }

      await db.update(signatories)
        .set({
          name: input.name,
          title: input.title,
          nationalId: input.nationalId || null,
          phone: input.phone || null,
          email: input.email || null,
          signatureUrl: input.signatureUrl || null,
          isDefault: input.isDefault || false,
        })
        .where(eq(signatories.id, input.id));

      return { success: true, message: "تم تحديث بيانات المفوض بنجاح" };
    }),

  // حذف مفوض (تعطيل)
  deleteSignatory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من الصلاحية
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية حذف المفوضين" });
      }

      // تعطيل بدلاً من الحذف
      await db.update(signatories)
        .set({ isActive: false })
        .where(eq(signatories.id, input.id));

      return { success: true, message: "تم حذف المفوض بنجاح" };
    }),

  // تعيين مفوض افتراضي
  setDefaultSignatory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من الصلاحية
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تعيين المفوض الافتراضي" });
      }

      // إلغاء الافتراضي من الجميع
      await db.update(signatories).set({ isDefault: false }).where(eq(signatories.isDefault, true));

      // تعيين المفوض الجديد كافتراضي
      await db.update(signatories)
        .set({ isDefault: true })
        .where(eq(signatories.id, input.id));

      return { success: true, message: "تم تعيين المفوض الافتراضي بنجاح" };
    }),
});
