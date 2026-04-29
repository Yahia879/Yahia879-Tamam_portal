import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { mosques, mosqueImages, auditLogs, InsertMosque } from "../../drizzle/schema";
import { eq, and, like, desc, sql } from "drizzle-orm";

// مخطط إنشاء مسجد جديد
const createMosqueSchema = z.object({
  name: z.string().min(2, "اسم المسجد مطلوب"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  city: z.string().min(2, "المدينة مطلوبة"),
  district: z.string().optional(),
  governorate: z.string().optional(), // المحافظة
  center: z.string().optional(), // المركز
  area: z.number().optional(), // مساحة المسجد
  capacity: z.number().optional(), // عدد المصلين
  hasPrayerHall: z.boolean().optional(), // هل يوجد مصلى
  mosqueAge: z.number().optional(), // عمر المسجد بالسنوات
  imamName: z.string().optional(),
  imamPhone: z.string().optional(),
  imamEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

// مخطط تحديث مسجد
const updateMosqueSchema = createMosqueSchema.partial().extend({
  id: z.number(),
});

// مخطط البحث والفلترة
const searchMosquesSchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  governorate: z.string().optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
});

export const mosquesRouter = router({
  // إنشاء مسجد جديد
  create: protectedProcedure
    .input(createMosqueSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const mosqueData = {
        name: input.name,
        latitude: input.latitude ? input.latitude.toString() : null,
        longitude: input.longitude ? input.longitude.toString() : null,
        address: input.address || null,
        city: input.city,
        district: input.district || null,
        governorate: input.governorate || null,
        center: input.center || null,
        area: input.area ? input.area.toString() : null,
        capacity: input.capacity || null,
        hasPrayerHall: input.hasPrayerHall ?? false,
        mosqueAge: input.mosqueAge || null,
        imamName: input.imamName || null,
        imamPhone: input.imamPhone || null,
        imamEmail: input.imamEmail || null,
        registeredBy: ctx.user.id,
        approvalStatus: ctx.user.role === "service_requester" ? "pending" as const : "approved" as const,
        approvalDate: ctx.user.role !== "service_requester" ? new Date() : null,
        approvedBy: ctx.user.role !== "service_requester" ? ctx.user.id : null,
        notes: input.notes || null,
      };

      const result = await db.insert(mosques).values(mosqueData);
      const mosqueId = Number(result[0].insertId);

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "mosque_created",
        entityType: "mosque",
        entityId: mosqueId,
        newValues: { name: input.name, city: input.city },
      });

      return { success: true, mosqueId, message: "تم إضافة المسجد بنجاح" };
    }),

  // تحديث بيانات مسجد
  update: protectedProcedure
    .input(updateMosqueSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود المسجد
      const existingMosque = await db.select().from(mosques).where(eq(mosques.id, input.id)).limit(1);
      if (existingMosque.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المسجد غير موجود" });
      }

      // التحقق من الصلاحية
      const isOwner = existingMosque[0].registeredBy === ctx.user.id;
      const isAdmin = ["super_admin", "system_admin", "projects_office"].includes(ctx.user.role);
      
      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل هذا المسجد" });
      }

      const { id, ...updateData } = input;
      const updateValues: Record<string, unknown> = {};

      if (updateData.name) updateValues.name = updateData.name;
      if (updateData.latitude !== undefined) updateValues.latitude = updateData.latitude?.toString();
      if (updateData.longitude !== undefined) updateValues.longitude = updateData.longitude?.toString();
      if (updateData.address !== undefined) updateValues.address = updateData.address;
      if (updateData.city) updateValues.city = updateData.city;
      if (updateData.district !== undefined) updateValues.district = updateData.district;
      if (updateData.governorate !== undefined) updateValues.governorate = updateData.governorate;
      if (updateData.center !== undefined) updateValues.center = updateData.center;
      if (updateData.area !== undefined) updateValues.area = updateData.area?.toString();
      if (updateData.capacity !== undefined) updateValues.capacity = updateData.capacity;
      if (updateData.hasPrayerHall !== undefined) updateValues.hasPrayerHall = updateData.hasPrayerHall;
      if (updateData.mosqueAge !== undefined) updateValues.mosqueAge = updateData.mosqueAge;
      if (updateData.imamName !== undefined) updateValues.imamName = updateData.imamName;
      if (updateData.imamPhone !== undefined) updateValues.imamPhone = updateData.imamPhone;
      if (updateData.imamEmail !== undefined) updateValues.imamEmail = updateData.imamEmail;
      if (updateData.notes !== undefined) updateValues.notes = updateData.notes;

      await db.update(mosques).set(updateValues).where(eq(mosques.id, id));

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "mosque_updated",
        entityType: "mosque",
        entityId: id,
        oldValues: existingMosque[0],
        newValues: updateValues,
      });

      return { success: true, message: "تم تحديث بيانات المسجد بنجاح" };
    }),

  // الحصول على مسجد بالمعرف
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const result = await db.select().from(mosques).where(eq(mosques.id, input.id)).limit(1);
      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المسجد غير موجود" });
      }

      // الحصول على صور المسجد
      const images = await db.select().from(mosqueImages).where(eq(mosqueImages.mosqueId, input.id));

      return { ...result[0], images };
    }),

  // البحث والفلترة في المساجد
  search: protectedProcedure
    .input(searchMosquesSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { mosques: [], total: 0 };

      const conditions = [];

      // طالب الخدمة يرى فقط المساجد المعتمدة أو التي سجلها
      if (ctx.user.role === "service_requester") {
        conditions.push(
          sql`(${mosques.approvalStatus} = 'approved' OR ${mosques.registeredBy} = ${ctx.user.id})`
        );
      }

      if (input.search) {
        conditions.push(
          sql`(${mosques.name} LIKE ${`%${input.search}%`} OR ${mosques.address} LIKE ${`%${input.search}%`})`
        );
      }
      if (input.city) {
        conditions.push(eq(mosques.city, input.city));
      }
      if (input.governorate) {
        conditions.push(eq(mosques.governorate, input.governorate));
      }
      if (input.approvalStatus) {
        conditions.push(eq(mosques.approvalStatus, input.approvalStatus));
      }

      const offset = (input.page - 1) * input.limit;

      let query = db.select().from(mosques);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const results = await query.orderBy(desc(mosques.createdAt)).limit(input.limit).offset(offset);

      // الحصول على العدد الإجمالي
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(mosques);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as typeof countQuery;
      }
      const countResult = await countQuery;
      const total = countResult[0]?.count || 0;

      return { mosques: results, total };
    }),

  // الحصول على المساجد المسجلة بواسطة المستخدم الحالي
  getMyMosques: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return await db.select().from(mosques).where(eq(mosques.registeredBy, ctx.user.id)).orderBy(desc(mosques.createdAt));
  }),

  // اعتماد مسجد
  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لاعتماد المساجد" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.update(mosques).set({
        approvalStatus: "approved",
        approvedBy: ctx.user.id,
        approvalDate: new Date(),
      }).where(eq(mosques.id, input.id));

      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "mosque_approved",
        entityType: "mosque",
        entityId: input.id,
      });

      return { success: true, message: "تم اعتماد المسجد بنجاح" };
    }),

  // رفض مسجد
  reject: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لرفض المساجد" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.update(mosques).set({
        approvalStatus: "rejected",
        notes: input.reason || null,
      }).where(eq(mosques.id, input.id));

      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "mosque_rejected",
        entityType: "mosque",
        entityId: input.id,
        newValues: { reason: input.reason },
      });

      return { success: true, message: "تم رفض المسجد" };
    }),

  // إضافة صورة للمسجد
  addImage: protectedProcedure
    .input(z.object({
      mosqueId: z.number(),
      imageUrl: z.string().url(),
      imageType: z.string().optional(),
      caption: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.insert(mosqueImages).values({
        mosqueId: input.mosqueId,
        imageUrl: input.imageUrl,
        imageType: input.imageType || "general",
        caption: input.caption || null,
      });

      return { success: true, message: "تم إضافة الصورة بنجاح" };
    }),

  // حذف صورة
  deleteImage: protectedProcedure
    .input(z.object({ imageId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.delete(mosqueImages).where(eq(mosqueImages.id, input.imageId));

      return { success: true, message: "تم حذف الصورة" };
    }),

  // الحصول على المساجد قيد الاعتماد
  getPendingMosques: protectedProcedure.query(async ({ ctx }) => {
    if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض المساجد قيد الاعتماد" });
    }

    const db = await getDb();
    if (!db) return [];

    return await db.select().from(mosques).where(eq(mosques.approvalStatus, "pending")).orderBy(desc(mosques.createdAt));
  }),

  // الحصول على قائمة المدن
  getCities: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const result = await db.selectDistinct({ city: mosques.city }).from(mosques).where(sql`${mosques.city} IS NOT NULL`);
    return result.map(r => r.city).filter(Boolean);
  }),

  // إحصائيات المساجد
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, byCity: {}, byGovernorate: {}, byApprovalStatus: {} };

    const total = await db.select({ count: sql<number>`count(*)` }).from(mosques);

    const byCity = await db.select({
      city: mosques.city,
      count: sql<number>`count(*)`,
    }).from(mosques).groupBy(mosques.city).limit(10);

    const byGovernorate = await db.select({
      governorate: mosques.governorate,
      count: sql<number>`count(*)`,
    }).from(mosques).groupBy(mosques.governorate).limit(10);

    // إحصائيات حسب حالة الاعتماد
    const byApprovalStatus = await db.select({
      status: mosques.approvalStatus,
      count: sql<number>`count(*)`,
    }).from(mosques).groupBy(mosques.approvalStatus);

    return {
      total: total[0]?.count || 0,
      byCity: Object.fromEntries(byCity.map(c => [c.city, c.count])),
      byGovernorate: Object.fromEntries(byGovernorate.filter(g => g.governorate).map(g => [g.governorate, g.count])),
      byApprovalStatus: Object.fromEntries(byApprovalStatus.map(s => [s.status, s.count])),
    };
  }),
});
