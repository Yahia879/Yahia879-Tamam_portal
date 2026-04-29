import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  suppliers,
  users,
  entityTypes,
  supplierApprovalStatuses,
  workFields,
} from "../../drizzle/schema";
import { eq, desc, and, sql, like, or } from "drizzle-orm";

// مخطط تسجيل المورد - الخطوة 1: معلومات الكيان
const entityInfoSchema = z.object({
  name: z.string().min(1, "اسم الكيان مطلوب"),
  entityType: z.enum(entityTypes),
  commercialRegister: z.string().min(1, "رقم السجل التجاري مطلوب"),
  commercialActivity: z.string().min(1, "النشاط حسب السجل التجاري مطلوب"),
  yearsOfExperience: z.number().min(0, "عدد سنوات الخبرة مطلوب"),
  workFields: z.array(z.enum(workFields)).min(1, "يجب اختيار مجال عمل واحد على الأقل"),
});

// مخطط تسجيل المورد - الخطوة 2: معلومات التواصل
const contactInfoSchema = z.object({
  address: z.string().min(1, "عنوان الكيان مطلوب"),
  city: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  googleMapsLat: z.number().optional(),
  googleMapsLng: z.number().optional(),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().min(1, "رقم التواصل مطلوب"),
  phoneSecondary: z.string().optional(),
  contactPerson: z.string().min(1, "اسم مسؤول التواصل مطلوب"),
  contactPersonTitle: z.string().min(1, "وظيفة مسؤول التواصل مطلوبة"),
});

// مخطط تسجيل المورد - الخطوة 3: معلومات الحساب البنكي
const bankInfoSchema = z.object({
  bankAccountName: z.string().min(1, "اسم الحساب مطلوب"),
  bankName: z.string().min(1, "اسم البنك مطلوب"),
  iban: z.string().min(1, "رقم الآيبان مطلوب").regex(/^SA\d{22}$/, "رقم الآيبان غير صحيح"),
  taxNumber: z.string().min(1, "الرقم الضريبي مطلوب"),
});

// مخطط تسجيل المورد - الخطوة 4: المرفقات
const attachmentsSchema = z.object({
  commercialRegisterDoc: z.string().min(1, "إرفاق السجل التجاري مطلوب"),
  vatCertificateDoc: z.string().min(1, "إرفاق شهادة ضريبة القيمة المضافة مطلوب"),
  nationalAddressDoc: z.string().min(1, "إرفاق العنوان الوطني مطلوب"),
});

// المخطط الكامل لتسجيل المورد
const fullSupplierSchema = entityInfoSchema
  .merge(contactInfoSchema)
  .merge(bankInfoSchema)
  .merge(attachmentsSchema);

export const suppliersRouter = router({
  // ==================== تسجيل الموردين ====================

  // تسجيل مورد جديد (النموذج الكامل)
  register: protectedProcedure
    .input(fullSupplierSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من عدم وجود مورد بنفس السجل التجاري
      const existing = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.commercialRegister, input.commercialRegister))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "يوجد مورد مسجل بنفس رقم السجل التجاري",
        });
      }

      const [result] = await db.insert(suppliers).values({
        name: input.name,
        entityType: input.entityType,
        commercialRegister: input.commercialRegister,
        commercialActivity: input.commercialActivity,
        yearsOfExperience: input.yearsOfExperience,
        workFields: input.workFields,
        address: input.address,
        city: input.city,
        googleMapsUrl: input.googleMapsUrl,
        googleMapsLat: input.googleMapsLat ? String(input.googleMapsLat) : null,
        googleMapsLng: input.googleMapsLng ? String(input.googleMapsLng) : null,
        email: input.email,
        phone: input.phone,
        phoneSecondary: input.phoneSecondary,
        contactPerson: input.contactPerson,
        contactPersonTitle: input.contactPersonTitle,
        bankAccountName: input.bankAccountName,
        bankName: input.bankName,
        iban: input.iban,
        taxNumber: input.taxNumber,
        commercialRegisterDoc: input.commercialRegisterDoc,
        vatCertificateDoc: input.vatCertificateDoc,
        nationalAddressDoc: input.nationalAddressDoc,
        approvalStatus: "pending",
        createdBy: ctx.user.id,
      });

      return { success: true, id: result.insertId };
    }),

  // ==================== إدارة الموردين ====================

  // جلب قائمة الموردين
  list: protectedProcedure
    .input(
      z.object({
        approvalStatus: z.enum(supplierApprovalStatuses).optional(),
        workField: z.enum(workFields).optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { approvalStatus, workField, search, page = 1, limit = 10 } = input || {};

      const conditions = [];
      
      if (approvalStatus) {
        conditions.push(eq(suppliers.approvalStatus, approvalStatus));
      }
      
      if (search) {
        conditions.push(
          or(
            like(suppliers.name, `%${search}%`),
            like(suppliers.commercialRegister, `%${search}%`),
            like(suppliers.contactPerson, `%${search}%`)
          )
        );
      }

      const suppliersList = await db
        .select()
        .from(suppliers)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(suppliers.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      // تصفية حسب مجال العمل (JSON field)
      let filteredSuppliers = suppliersList;
      if (workField) {
        filteredSuppliers = suppliersList.filter(
          (s) => s.workFields && (s.workFields as string[]).includes(workField)
        );
      }

      // جلب العدد الإجمالي
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(suppliers)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        suppliers: filteredSuppliers,
        total: countResult?.count || 0,
        page,
        limit,
      };
    }),

  // جلب مورد بالتفصيل
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [supplier] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, input.id));

      if (!supplier) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المورد غير موجود" });
      }

      // جلب معلومات المعتمد إذا كان معتمداً
      let approver = null;
      if (supplier.approvedBy) {
        const [user] = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.id, supplier.approvedBy));
        approver = user;
      }

      return { ...supplier, approver };
    }),

  // جلب الموردين المعتمدين فقط (للاستخدام في العقود)
  getApproved: protectedProcedure
    .input(
      z.object({
        workField: z.enum(workFields).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const conditions = [eq(suppliers.approvalStatus, "approved")];
      
      if (input?.search) {
        conditions.push(
          or(
            like(suppliers.name, `%${input.search}%`),
            like(suppliers.commercialRegister, `%${input.search}%`)
          ) as any
        );
      }

      const suppliersList = await db
        .select()
        .from(suppliers)
        .where(and(...conditions))
        .orderBy(suppliers.name);

      // تصفية حسب مجال العمل
      if (input?.workField) {
        return suppliersList.filter(
          (s) => s.workFields && (s.workFields as string[]).includes(input.workField!)
        );
      }

      return suppliersList;
    }),

  // جلب جميع الموردين النشطين (لعروض الأسعار)
  getActiveSuppliers: protectedProcedure
    .input(
      z.object({
        workField: z.enum(workFields).optional(),
        search: z.string().optional(),
        includeUnapproved: z.boolean().optional(), // إظهار غير المعتمدين أيضاً
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const conditions: any[] = [eq(suppliers.status, "active")];
      
      // إذا لم يتم طلب غير المعتمدين، فلتر المعتمدين فقط
      if (!input?.includeUnapproved) {
        conditions.push(eq(suppliers.approvalStatus, "approved"));
      }
      
      if (input?.search) {
        conditions.push(
          or(
            like(suppliers.name, `%${input.search}%`),
            like(suppliers.commercialRegister, `%${input.search}%`)
          ) as any
        );
      }

      const suppliersList = await db
        .select({
          id: suppliers.id,
          name: suppliers.name,
          type: suppliers.type,
          commercialRegister: suppliers.commercialRegister,
          city: suppliers.city,
          phone: suppliers.phone,
          email: suppliers.email,
          workFields: suppliers.workFields,
          approvalStatus: suppliers.approvalStatus,
          status: suppliers.status,
        })
        .from(suppliers)
        .where(and(...conditions))
        .orderBy(suppliers.name);

      // تصفية حسب مجال العمل
      if (input?.workField) {
        return suppliersList.filter(
          (s) => s.workFields && (s.workFields as string[]).includes(input.workField!)
        );
      }

      return suppliersList;
    }),

  // ==================== اعتماد الموردين ====================

  // اعتماد مورد
  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من صلاحية المستخدم (يجب أن يكون admin)
      if (ctx.user.role !== "super_admin" && ctx.user.role !== "system_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لاعتماد الموردين" });
      }

      const [supplier] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, input.id));

      if (!supplier) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المورد غير موجود" });
      }

      if (supplier.approvalStatus === "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "المورد معتمد بالفعل" });
      }

      await db
        .update(suppliers)
        .set({
          approvalStatus: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          rejectionReason: null,
        })
        .where(eq(suppliers.id, input.id));

      return { success: true };
    }),

  // رفض مورد
  reject: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "سبب الرفض مطلوب"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من صلاحية المستخدم
      if (ctx.user.role !== "super_admin" && ctx.user.role !== "system_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لرفض الموردين" });
      }

      const [supplier] = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, input.id));

      if (!supplier) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المورد غير موجود" });
      }

      await db
        .update(suppliers)
        .set({
          approvalStatus: "rejected",
          rejectionReason: input.reason,
        })
        .where(eq(suppliers.id, input.id));

      return { success: true };
    }),

  // إيقاف مورد
  suspend: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "سبب الإيقاف مطلوب"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      if (ctx.user.role !== "super_admin" && ctx.user.role !== "system_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإيقاف الموردين" });
      }

      await db
        .update(suppliers)
        .set({
          approvalStatus: "suspended",
          rejectionReason: input.reason,
        })
        .where(eq(suppliers.id, input.id));

      return { success: true };
    }),

  // ==================== تحديث بيانات المورد ====================

  // تحديث بيانات المورد
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        commercialActivity: z.string().optional(),
        yearsOfExperience: z.number().optional(),
        workFields: z.array(z.enum(workFields)).optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        googleMapsUrl: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        phoneSecondary: z.string().optional(),
        contactPerson: z.string().optional(),
        contactPersonTitle: z.string().optional(),
        bankAccountName: z.string().optional(),
        bankName: z.string().optional(),
        iban: z.string().optional(),
        taxNumber: z.string().optional(),
        commercialRegisterDoc: z.string().optional(),
        vatCertificateDoc: z.string().optional(),
        nationalAddressDoc: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, ...updateData } = input;

      await db
        .update(suppliers)
        .set(updateData)
        .where(eq(suppliers.id, id));

      return { success: true };
    }),

  // ==================== الثوابت ====================

  // جلب مجالات العمل
  getWorkFields: publicProcedure.query(() => {
    const workFieldsMap: Record<string, string> = {
      construction: "بناء وتشييد",
      engineering_consulting: "استشارات هندسية",
      electrical: "أعمال كهربائية",
      plumbing: "أعمال سباكة",
      hvac: "تكييف وتبريد",
      finishing: "تشطيبات",
      carpentry: "نجارة",
      aluminum: "ألمنيوم",
      painting: "دهانات",
      flooring: "أرضيات",
      landscaping: "تنسيق حدائق",
      cleaning: "نظافة",
      maintenance: "صيانة",
      security_systems: "أنظمة أمنية",
      sound_systems: "أنظمة صوتية",
      solar_energy: "طاقة شمسية",
      water_systems: "أنظمة مياه",
      furniture: "أثاث",
      carpets: "سجاد",
      supplies: "توريدات",
      other: "أخرى",
    };

    return workFields.map((key) => ({
      key,
      label: workFieldsMap[key] || key,
    }));
  }),

  // جلب أنواع الكيانات
  getEntityTypes: publicProcedure.query(() => {
    return [
      { key: "company", label: "شركة" },
      { key: "establishment", label: "مؤسسة" },
    ];
  }),
});
