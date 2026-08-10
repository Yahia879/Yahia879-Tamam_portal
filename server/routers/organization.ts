import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { organizationSettings, signatories, users, userPermissions, permissions, userRoleAssignments, roles } from "../../drizzle/schema";
import { eq, and, ne, sql, inArray, isNull, or } from "drizzle-orm";
import { calculateUserPermissions } from "../permissions";

async function ensureSignatoriesUserIdColumn(db: any) {
  try {
    await db.execute(sql`ALTER TABLE signatories ADD COLUMN userId INT NULL;`);
  } catch (e) {
    // Ignore error if column already exists
  }
}

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
        officialReportsName: "",
        licenseNumber: "",
        administrativeSupervisor: "",
        technicalSupervisor: "",
        boardChairmanName: "",
        executiveDirectorName: "",
        accountantName: "",
        pmoManagerName: "",
        csrManagerName: "",
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
        metaTitle: "",
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
      officialReportsName: z.string().optional(),
      licenseNumber: z.string().optional(),
      administrativeSupervisor: z.string().optional(),
      technicalSupervisor: z.string().optional(),
      boardChairmanName: z.string().optional(),
      executiveDirectorName: z.string().optional(),
      accountantName: z.string().optional(),
      pmoManagerName: z.string().optional(),
      csrManagerName: z.string().optional(),
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
      technicalSupervisorLogoUrl: z.string().optional(),
      administrativeSupervisorLogoUrl: z.string().optional(),
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
      metaTitle: z.string().optional(),
      // بيانات المفوض بالتوقيع
      authorizedSignatory: z.string().optional(),
      signatoryTitle: z.string().optional(),
      signatoryPhone: z.string().optional(),
      signatoryEmail: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من صلاحية المستخدم (مدير النظام أو المدير العام أو مكتب المشاريع أو من لديه صلاحية التعديل)
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office", "corporate_comm"];
      if (!allowedRoles.includes(ctx.user.role)) {
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasEditPerm = 
          userPermissions.includes("settings.edit") ||
          userPermissions.includes("settings_org.edit_basic") ||
          userPermissions.includes("settings_org.edit_signers") ||
          userPermissions.includes("settings_org.edit_banks") ||
          userPermissions.includes("settings_org.edit_contracts") ||
          userPermissions.includes("settings_branding.edit");
        if (!hasEditPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تعديل إعدادات الجمعية" });
        }
      }

      // التحقق من وجود إعدادات سابقة
      const existingSettings = await db.select().from(organizationSettings).limit(1);

      // الحفاظ على الشعارات الموجودة إذا لم تُمرر قيمة جديدة
      const existing = existingSettings[0];
      const settingsData = {
        organizationName: input.organizationName,
        organizationNameShort: input.organizationNameShort || null,
        officialReportsName: input.officialReportsName || null,
        licenseNumber: input.licenseNumber || null,
        administrativeSupervisor: input.administrativeSupervisor || null,
        technicalSupervisor: input.technicalSupervisor || null,
        boardChairmanName: input.boardChairmanName || null,
        executiveDirectorName: input.executiveDirectorName || null,
        accountantName: input.accountantName || null,
        pmoManagerName: input.pmoManagerName || null,
        csrManagerName: input.csrManagerName || null,
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
        technicalSupervisorLogoUrl: input.technicalSupervisorLogoUrl !== undefined ? (input.technicalSupervisorLogoUrl || null) : (existing?.technicalSupervisorLogoUrl || null),
        administrativeSupervisorLogoUrl: input.administrativeSupervisorLogoUrl !== undefined ? (input.administrativeSupervisorLogoUrl || null) : (existing?.administrativeSupervisorLogoUrl || null),
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
        metaTitle: input.metaTitle !== undefined ? (input.metaTitle || null) : (existing?.metaTitle || null),
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
      }

      // مزامنة اسم المنصب واسم المفوض مع حساب المدير التنفيذي/المفوض وجدول المفوضين signatories
      if (input.authorizedSignatory !== undefined || input.signatoryTitle !== undefined || input.executiveDirectorName !== undefined) {
        try {
          const authSigName = input.authorizedSignatory || input.executiveDirectorName;
          const authSigTitle = input.signatoryTitle;

          // البحث عن حساب المدير التنفيذي
          const [execUser] = await db
            .select()
            .from(users)
            .where(
              and(
                isNull(users.deletedAt),
                eq(users.status, "active" as any),
                inArray(users.role, ["executive_director" as any, "general_manager" as any])
              )
            )
            .limit(1);

          if (execUser) {
            const userUpdate: any = {};
            if (authSigName) {
              userUpdate.signatureName = authSigName;
            }
            if (authSigTitle) {
              userUpdate.signatureDepartment = authSigTitle;
            }
            if (Object.keys(userUpdate).length > 0) {
              await db.update(users).set(userUpdate).where(eq(users.id, execUser.id));
            }

            // تحديث جدول المفوضين signatories المربوط
            const sigUpdate: any = {};
            if (authSigName) sigUpdate.name = authSigName;
            if (authSigTitle) sigUpdate.title = authSigTitle;
            if (Object.keys(sigUpdate).length > 0) {
              await db.update(signatories).set(sigUpdate).where(
                or(
                  eq(signatories.userId, execUser.id),
                  and(
                    sql`length(${signatories.email}) > 0`,
                    eq(signatories.email, execUser.email)
                  )!
                )!
              );
            }
          }
        } catch (e) {
          console.error('[updateSettings] Failed to sync executive director user profile:', e);
        }
      }

      return { success: true, message: "تم حفظ إعدادات الجمعية بنجاح" };
    }),

  // رفع الشعار
  uploadLogo: protectedProcedure
    .input(z.object({
      type: z.enum(["logo", "stamp", "secondaryLogo", "technical_supervision", "admin_supervision"]),
      fileData: z.string(), // Base64 encoded file
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من صلاحية المستخدم
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office", "corporate_comm"];
      if (!allowedRoles.includes(ctx.user.role)) {
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasEditPerm = 
          userPermissions.includes("settings.edit") ||
          userPermissions.includes("settings_org.edit_basic") ||
          userPermissions.includes("settings_org.edit_signers") ||
          userPermissions.includes("settings_org.edit_banks") ||
          userPermissions.includes("settings_org.edit_contracts") ||
          userPermissions.includes("settings_branding.edit");
        if (!hasEditPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية رفع الشعارات" });
        }
      }

      // استيراد دالة التخزين
      const { storagePut } = await import("../storage");

      // التحقق من نوع الملف المرفوع ليكون صورة صالحة فقط
      const allowedImageMimes = [
        "image/jpeg", "image/png", "image/webp", "image/jpg", "image/pjpeg", "image/x-png",
        "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence", "image/x-heic",
        "application/heic", "application/octet-stream", ""
      ];
      const allowedImageExtensions = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
      const extension = input.fileName.split(".").pop()?.toLowerCase() || "";

      if (!allowedImageMimes.includes(input.mimeType) && !allowedImageExtensions.includes(extension)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الملف المرفوع ليس صورة صالحة. يسمح فقط بـ (JPG, JPEG, PNG, WEBP, HEIC, HEIF)."
        });
      }

      // تحويل Base64 إلى Buffer
      const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // إنشاء اسم فريد للملف
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
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
        technical_supervision: "technicalSupervisorLogoUrl",
        admin_supervision: "administrativeSupervisorLogoUrl",
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

  // ==================== مفوضو التوقيع ====================

  // جلب مستخدمي النظام مع حالة صلاحية توقيع العقود واستثناء طالبي الخدمة
  getSystemUsers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

    const systemUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        signatureUrl: users.signatureUrl,
      })
      .from(users)
      .where(
        and(
          ne(users.status, "suspended"),
          ne(users.role, "service_requester")
        )
      );

    const userIds = systemUsers.map((u) => u.id);
    let customRolesMap: Record<number, string[]> = {};

    if (userIds.length > 0) {
      try {
        const userRolesData = await db
          .select({
            userId: userRoleAssignments.userId,
            roleName: roles.nameAr,
          })
          .from(userRoleAssignments)
          .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
          .where(
            sql`${userRoleAssignments.userId} IN (${sql.join(userIds.map((id) => sql`${id}`), sql`, `)})`
          );

        for (const item of userRolesData) {
          if (item.userId && item.roleName) {
            if (!customRolesMap[item.userId]) {
              customRolesMap[item.userId] = [];
            }
            customRolesMap[item.userId].push(item.roleName);
          }
        }
      } catch (e) {
        // إذا كان هناك خطأ في جدول الأدوار المخصصة لا يتوقف جلب المستخدمين
      }
    }

    const result = await Promise.all(
      systemUsers.map(async (u) => {
        const userPerms = await calculateUserPermissions(u.id);
        const hasContractSignPermission = userPerms.includes("contracts.sign");
        const customRoles = customRolesMap[u.id] || [];
        return {
          ...u,
          customRoles,
          hasContractSignPermission,
        };
      })
    );

    return result;
  }),

  // تبديل/منح/سحب صلاحية توقيع العقود لمستخدم معين
  toggleUserContractSignPermission: protectedProcedure
    .input(z.object({
      userId: z.number(),
      granted: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office", "corporate_comm"];
      if (!allowedRoles.includes(ctx.user.role)) {
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasSignersPerm = 
          userPermissions.includes("settings.edit") ||
          userPermissions.includes("settings_org.edit_signers");
        if (!hasSignersPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تعديل صلاحيات التوقيع" });
        }
      }

      // حذف أي سجل مباشر سابق لهذه الصلاحية لهذا المستخدم
      await db.delete(userPermissions).where(
        and(
          eq(userPermissions.userId, input.userId),
          eq(userPermissions.permissionId, "contracts.sign")
        )
      );

      if (input.granted) {
        // التأكد من وجود الصلاحية في جدول permissions
        const [existingPerm] = await db.select().from(permissions).where(eq(permissions.id, "contracts.sign")).limit(1);
        if (!existingPerm) {
          await db.insert(permissions).values({
            id: "contracts.sign",
            moduleId: "contracts",
            action: "sign",
            nameAr: "توقيع العقود",
            nameEn: "Sign Contracts",
          });
        }

        await db.insert(userPermissions).values({
          userId: input.userId,
          permissionId: "contracts.sign",
          granted: true,
          grantedBy: ctx.user.id,
        });
      }

      return {
        success: true,
        message: input.granted
          ? "تم منح صلاحية توقيع العقود للمستخدم بنجاح"
          : "تم سحب صلاحية توقيع العقود من المستخدم بنجاح",
      };
    }),

  // جلب جميع المفوضين مع التحقق من صلاحية توقيع العقود
  getSignatories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

    await ensureSignatoriesUserIdColumn(db);

    let signatoryList: any[] = [];
    try {
      signatoryList = await db
        .select({
          id: signatories.id,
          name: signatories.name,
          title: signatories.title,
          nationalId: signatories.nationalId,
          phone: signatories.phone,
          email: signatories.email,
          address: signatories.address,
          signatureUrl: signatories.signatureUrl,
          isDefault: signatories.isDefault,
          isActive: signatories.isActive,
          userId: signatories.userId,
        })
        .from(signatories)
        .where(eq(signatories.isActive, true))
        .orderBy(signatories.sortOrder);
    } catch (err) {
      signatoryList = await db
        .select({
          id: signatories.id,
          name: signatories.name,
          title: signatories.title,
          nationalId: signatories.nationalId,
          phone: signatories.phone,
          email: signatories.email,
          address: signatories.address,
          signatureUrl: signatories.signatureUrl,
          isDefault: signatories.isDefault,
          isActive: signatories.isActive,
        })
        .from(signatories)
        .where(eq(signatories.isActive, true))
        .orderBy(signatories.sortOrder);
    }

    const result = await Promise.all(
      signatoryList.map(async (sig: any) => {
        let hasContractSignPermission = false;
        let targetUserId = sig.userId || null;
        let effectiveSignatureUrl = sig.signatureUrl;

        let showSignatureInDocuments = true;

        if (!targetUserId && sig.email) {
          const [matchedUser] = await db
            .select({ id: users.id, signatureUrl: users.signatureUrl, showSignatureInDocuments: users.showSignatureInDocuments })
            .from(users)
            .where(eq(users.email, sig.email))
            .limit(1);
          if (matchedUser) {
            targetUserId = matchedUser.id;
            if (matchedUser.showSignatureInDocuments === false || (matchedUser.showSignatureInDocuments as any) === 0) {
              showSignatureInDocuments = false;
            }
            if (!effectiveSignatureUrl && matchedUser.signatureUrl) {
              effectiveSignatureUrl = matchedUser.signatureUrl;
            }
          }
        } else if (targetUserId) {
          const [matchedUser] = await db
            .select({ signatureUrl: users.signatureUrl, showSignatureInDocuments: users.showSignatureInDocuments })
            .from(users)
            .where(eq(users.id, targetUserId))
            .limit(1);
          if (matchedUser) {
            if (matchedUser.showSignatureInDocuments === false || (matchedUser.showSignatureInDocuments as any) === 0) {
              showSignatureInDocuments = false;
            }
            if (!effectiveSignatureUrl && matchedUser.signatureUrl) {
              effectiveSignatureUrl = matchedUser.signatureUrl;
            }
          }
        }

        if (!showSignatureInDocuments) {
          effectiveSignatureUrl = null;
        }

        if (targetUserId) {
          const userPerms = await calculateUserPermissions(targetUserId);
          hasContractSignPermission = userPerms.includes("contracts.sign");
        }

        return {
          ...sig,
          signatureUrl: effectiveSignatureUrl,
          userId: targetUserId,
          hasContractSignPermission,
          showSignatureInDocuments,
        };
      })
    );

    return result;
  }),

  // رفع صورة التوقيع الرقمي للمفوض إلى تخزين OneDrive
  uploadSignatorySignature: protectedProcedure
    .input(z.object({
      fileData: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const allowedMimes = [
        "image/jpeg", "image/png", "image/webp", "image/jpg", "image/pjpeg", "image/x-png", "image/svg+xml",
        "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence", "image/x-heic",
        "application/heic", "application/octet-stream", ""
      ];
      const allowedExts = ["jpg", "jpeg", "png", "webp", "svg", "heic", "heif"];
      const extension = input.fileName.split(".").pop()?.toLowerCase() || "png";

      if (!allowedMimes.includes(input.mimeType) && !allowedExts.includes(extension)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الملف المرفوع ليس صورة توقيع صالحة. يُسمح فقط بصور (PNG, JPG, WEBP, SVG, HEIC, HEIF)."
        });
      }

      const { storagePut } = await import("../storage");

      const base64Data = input.fileData.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `signatures/signatory-${ctx.user.id}-${timestamp}-${randomSuffix}.${extension}`;

      let url: string;
      try {
        const result = await storagePut(fileKey, buffer, input.mimeType);
        url = result.url;
      } catch (error: any) {
        console.error('[uploadSignatorySignature] Storage error:', error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `فشل رفع التوقيع: ${error?.message || 'خطأ في التخزين'}` });
      }

      return { url };
    }),

  // إضافة مفوض جديد
  addSignatory: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "اسم المفوض مطلوب"),
      title: z.string().min(1, "المنصب مطلوب"),
      nationalId: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      signatureUrl: z.string().optional().nullable(),
      isDefault: z.boolean().optional(),
      userId: z.number().optional().nullable(),
      grantContractSignPermission: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await ensureSignatoriesUserIdColumn(db);

      // التحقق من الصلاحية
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office", "corporate_comm"];
      if (!allowedRoles.includes(ctx.user.role)) {
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasSignersPerm = 
          userPermissions.includes("settings.edit") ||
          userPermissions.includes("settings_org.edit_signers");
        if (!hasSignersPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية إضافة مفوضين" });
        }
      }

      // إذا كان المفوض الجديد افتراضي، ألغِ الافتراضي من الآخرين
      if (input.isDefault) {
        await db.update(signatories).set({ isDefault: false }).where(eq(signatories.isDefault, true));
      }

      // حساب الترتيب
      const existingSignatories = await db.select().from(signatories);
      const nextOrder = existingSignatories.length;

      const insertValues: any = {
        name: input.name,
        title: input.title,
        nationalId: input.nationalId || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        signatureUrl: input.signatureUrl || null,
        isDefault: input.isDefault || false,
        sortOrder: nextOrder,
        createdBy: ctx.user.id,
        userId: null,
      };

      await db.insert(signatories).values(insertValues);

      if (input.isDefault) {
        const existingSettings = await db.select().from(organizationSettings).limit(1);
        if (existingSettings && existingSettings.length > 0) {
          await db.update(organizationSettings).set({
            authorizedSignatory: input.name,
            executiveDirectorName: input.name,
            signatoryTitle: input.title,
          }).where(eq(organizationSettings.id, existingSettings[0].id));
        }
      }

      return { success: true, message: "تم إضافة المفوض بنجاح" };
    }),

  // تحديث مفوض
  updateSignatory: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1, "اسم المفوض مطلوب"),
      title: z.string().min(1, "المنصب مطلوب"),
      nationalId: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      signatureUrl: z.string().optional().nullable(),
      isDefault: z.boolean().optional(),
      userId: z.number().optional().nullable(),
      grantContractSignPermission: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await ensureSignatoriesUserIdColumn(db);

      // التحقق من الصلاحية
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office", "corporate_comm"];
      if (!allowedRoles.includes(ctx.user.role)) {
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasSignersPerm = 
          userPermissions.includes("settings.edit") ||
          userPermissions.includes("settings_org.edit_signers");
        if (!hasSignersPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تعديل المفوضين" });
        }
      }

      // إذا كان المفوض افتراضي، ألغِ الافتراضي من الآخرين
      if (input.isDefault) {
        await db.update(signatories).set({ isDefault: false }).where(eq(signatories.isDefault, true));
      }

      const updateValues: any = {
        name: input.name,
        title: input.title,
        nationalId: input.nationalId || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        signatureUrl: input.signatureUrl || null,
        isDefault: input.isDefault || false,
        userId: null,
      };

      await db.update(signatories)
        .set(updateValues)
        .where(eq(signatories.id, input.id));

      if (input.isDefault) {
        const existingSettings = await db.select().from(organizationSettings).limit(1);
        if (existingSettings && existingSettings.length > 0) {
          await db.update(organizationSettings).set({
            authorizedSignatory: input.name,
            executiveDirectorName: input.name,
            signatoryTitle: input.title,
          }).where(eq(organizationSettings.id, existingSettings[0].id));
        }
      }

      return { success: true, message: "تم تحديث بيانات المفوض بنجاح" };
    }),

  // حذف مفوض (تعطيل)
  deleteSignatory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من الصلاحية
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office", "corporate_comm"];
      if (!allowedRoles.includes(ctx.user.role)) {
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasSignersPerm = 
          userPermissions.includes("settings.edit") ||
          userPermissions.includes("settings_org.edit_signers");
        if (!hasSignersPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية حذف المفوضين" });
        }
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
      const allowedRoles = ["admin", "super_admin", "system_admin", "general_manager", "projects_office", "corporate_comm"];
      if (!allowedRoles.includes(ctx.user.role)) {
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasSignersPerm = 
          userPermissions.includes("settings.edit") ||
          userPermissions.includes("settings_org.edit_signers");
        if (!hasSignersPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تعيين المفوض الافتراضي" });
        }
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
