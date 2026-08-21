import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { mosques, mosqueImages, auditLogs, mosqueRequests, InsertMosque, users } from "../../drizzle/schema";
import { eq, and, like, desc, sql, or } from "drizzle-orm";
import { notifyNewMosque, notifyMosqueApproval } from "./notifications";
import { checkPermission } from "../permissions";

// مخطط إنشاء مسجد جديد
const createMosqueSchema = z.object({
  name: z.string().min(2, "اسم المسجد مطلوب"),
  mosqueType: z.string().optional(),
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
      const hasCreatePerm = await checkPermission(ctx.user.id, "mosques.create");
      if (!["super_admin", "system_admin", "projects_office", "service_requester"].includes(ctx.user.role) && !hasCreatePerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإضافة المساجد" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const mosqueData = {
        name: input.name,
        mosqueType: input.mosqueType || null,
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

      // إرسال إشعارات
      await notifyNewMosque(mosqueId, input.name, ctx.user.id);

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
      const hasEditPerm = await checkPermission(ctx.user.id, "mosques.edit");
      const isAdmin = ["super_admin", "system_admin", "projects_office"].includes(ctx.user.role) || hasEditPerm;
      
      if (!isOwner && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل هذا المسجد" });
      }

      const { id, ...updateData } = input;
      const updateValues: Record<string, unknown> = {};

      if (updateData.name) updateValues.name = updateData.name;
      if (updateData.mosqueType !== undefined) updateValues.mosqueType = updateData.mosqueType;
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
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const result = await db
        .select({
          mosque: mosques,
          registeredByUserName: users.name,
          registeredByUserPhone: users.phone,
          registeredByUserEmail: users.email,
          registeredByUserRole: users.role,
          registeredByUserRequesterType: users.requesterType,
        })
        .from(mosques)
        .leftJoin(users, eq(mosques.registeredBy, users.id))
        .where(eq(mosques.id, input.id))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المسجد غير موجود" });
      }

      const row = result[0];
      const mosque = {
        ...row.mosque,
        registeredByUser: row.registeredByUserName ? {
          name: row.registeredByUserName,
          phone: row.registeredByUserPhone,
          email: row.registeredByUserEmail,
          role: row.registeredByUserRole,
          requesterType: row.registeredByUserRequesterType,
        } : null
      };

      // تحقق من العزل لطلاب الخدمة
      if (ctx.user.role === "service_requester" && mosque.registeredBy !== ctx.user.id) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "ليس لديك صلاحية للوصول إلى بيانات هذا المسجد" 
        });
      }

      // الحصول على صور المسجد
      const images = await db.select().from(mosqueImages).where(eq(mosqueImages.mosqueId, input.id));

      return { ...mosque, images };
    }),

  // البحث والفلترة في المساجد
  search: protectedProcedure
    .input(searchMosquesSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { mosques: [], total: 0 };

      const conditions = [];

      // طالب الخدمة يرى فقط المساجد التي سجلها (عزل تام)
      if (ctx.user.role === "service_requester") {
        conditions.push(eq(mosques.registeredBy, ctx.user.id));
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

  // الحصول على المساجد المسجلة بواسطة المستخدم الحالي (مع الفلترة والبحث والصفحات)
  getMyMosques: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      city: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(9),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return {
          mosques: [],
          total: 0,
          page: 1,
          limit: 9,
          totalPages: 0,
          stats: { total: 0, approved: 0, pending: 0, rejected: 0 }
        };
      }

      const page = Math.max(1, input?.page || 1);
      const limit = Math.max(1, input?.limit || 9);
      const offset = (page - 1) * limit;

      const conditions: any[] = [eq(mosques.registeredBy, ctx.user.id)];

      if (input?.search && input.search.trim()) {
        const term = input.search.trim();
        conditions.push(
          or(
            sql`${mosques.name} LIKE ${`%${term}%`}`,
            sql`${mosques.city} LIKE ${`%${term}%`}`,
            sql`${mosques.district} LIKE ${`%${term}%`}`,
            sql`${mosques.governorate} LIKE ${`%${term}%`}`,
            sql`${mosques.address} LIKE ${`%${term}%`}`
          )!
        );
      }

      if (input?.status && input.status !== "all") {
        conditions.push(eq(mosques.approvalStatus, input.status as any));
      }

      if (input?.city && input.city !== "all") {
        conditions.push(eq(mosques.city, input.city));
      }

      // 1. حساب إحصائيات المستخدم الإجمالية
      const statsRows = await db.select({
        approvalStatus: mosques.approvalStatus,
        count: sql<number>`count(*)`,
      }).from(mosques)
        .where(eq(mosques.registeredBy, ctx.user.id))
        .groupBy(mosques.approvalStatus);

      const stats = {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
      };

      for (const row of statsRows) {
        const count = Number(row.count) || 0;
        stats.total += count;
        if (row.approvalStatus === "approved") {
          stats.approved += count;
        } else if (row.approvalStatus === "pending") {
          stats.pending += count;
        } else if (row.approvalStatus === "rejected") {
          stats.rejected += count;
        }
      }

      // 2. حساب إجمالي عدد النتائج المفلترة
      const countResult = await db.select({
        count: sql<number>`count(*)`,
      }).from(mosques)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count) || 0;
      const totalPages = Math.ceil(total / limit);

      // 3. جلب المساجد بالصفحات
      const results = await db.select().from(mosques)
        .where(and(...conditions))
        .orderBy(desc(mosques.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        mosques: results,
        total,
        page,
        limit,
        totalPages,
        stats,
      };
    }),

  // اعتماد مسجد
  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const hasApprovePerm = await checkPermission(ctx.user.id, "mosques.approve");
      if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role) && !hasApprovePerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لاعتماد المساجد" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // الحصول على بيانات المسجد قبل التحديث لإرسال الإشعار
      const mosque = await db.select().from(mosques).where(eq(mosques.id, input.id)).limit(1);
      if (mosque.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المسجد غير موجود" });
      }

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

      // إرسال إشعار لمقدم الطلب
      if (mosque[0].registeredBy) {
        await notifyMosqueApproval(input.id, mosque[0].name, mosque[0].registeredBy);
      }

      return { success: true, message: "تم اعتماد المسجد بنجاح" };
    }),

  // رفض مسجد
  reject: protectedProcedure
    .input(z.object({ id: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const hasApprovePerm = await checkPermission(ctx.user.id, "mosques.approve");
      if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role) && !hasApprovePerm) {
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

  // حذف مسجد
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const hasDeletePerm = await checkPermission(ctx.user.id, "mosques.delete");
      if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role) && !hasDeletePerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لحذف المساجد" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود طلبات مرتبطة بالمسجد
      const relatedRequests = await db.select().from(mosqueRequests).where(eq(mosqueRequests.mosqueId, input.id)).limit(1);
      
      if (relatedRequests.length > 0) {
        throw new TRPCError({ 
          code: "PRECONDITION_FAILED", 
          message: "لا يمكن حذف المسجد لوجود طلبات مرتبطة به" 
        });
      }

      // الحصول على بيانات المسجد قبل الحذف
      const mosqueToDelete = await db.select().from(mosques).where(eq(mosques.id, input.id)).limit(1);
      if (mosqueToDelete.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المسجد غير موجود" });
      }

      // حذف الصور المرتبطة
      await db.delete(mosqueImages).where(eq(mosqueImages.mosqueId, input.id));
      
      // حذف المسجد
      await db.delete(mosques).where(eq(mosques.id, input.id));

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "mosque_deleted",
        entityType: "mosque",
        entityId: input.id,
        oldValues: mosqueToDelete[0],
      });

      return { success: true, message: "تم حذف المسجد بنجاح" };
    }),

  updateImam: protectedProcedure
    .input(z.object({
      id: z.number(),
      imamName: z.string().min(3),
      imamPhone: z.string().min(10),
      imamEmail: z.string().email().optional().or(z.literal('')),
    }))
    .mutation(async ({ input, ctx }) => {
      const hasEditPerm = await checkPermission(ctx.user.id, "mosques.edit");
      if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role) && !hasEditPerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل بيانات الإمام" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [originalMosque] = await db.select().from(mosques).where(eq(mosques.id, input.id));

      if (!originalMosque) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المسجد غير موجود" });
      }

      await db.update(mosques).set({
        imamName: input.imamName,
        imamPhone: input.imamPhone,
        imamEmail: input.imamEmail || null,
      }).where(eq(mosques.id, input.id));

      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "mosque_imam_updated",
        entityType: "mosque",
        entityId: input.id,
        oldValues: {
          imamName: originalMosque.imamName,
          imamPhone: originalMosque.imamPhone,
          imamEmail: originalMosque.imamEmail,
        },
        newValues: {
          imamName: input.imamName,
          imamPhone: input.imamPhone,
          imamEmail: input.imamEmail,
        }
      });
      
      return { success: true, message: "تم تحديث بيانات الإمام بنجاح" };
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
    const hasApprovePerm = await checkPermission(ctx.user.id, "mosques.approve");
    if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role) && !hasApprovePerm) {
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

    const conditions = [];
    if (ctx.user.role === "service_requester") {
      conditions.push(eq(mosques.registeredBy, ctx.user.id));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const total = await db.select({ count: sql<number>`count(*)` })
      .from(mosques)
      .where(whereClause);

    const byCity = await db.select({
      city: mosques.city,
      count: sql<number>`count(*)`,
    })
      .from(mosques)
      .where(whereClause)
      .groupBy(mosques.city)
      .limit(10);

    const byGovernorate = await db.select({
      governorate: mosques.governorate,
      count: sql<number>`count(*)`,
    })
      .from(mosques)
      .where(whereClause)
      .groupBy(mosques.governorate)
      .limit(10);

    // إحصائيات حسب حالة الاعتماد
    const byApprovalStatus = await db.select({
      status: mosques.approvalStatus,
      count: sql<number>`count(*)`,
    })
      .from(mosques)
      .where(whereClause)
      .groupBy(mosques.approvalStatus);

    return {
      total: total[0]?.count || 0,
      byCity: Object.fromEntries(byCity.map(c => [c.city, c.count])),
      byGovernorate: Object.fromEntries(byGovernorate.filter(g => g.governorate).map(g => [g.governorate, g.count])),
      byApprovalStatus: Object.fromEntries(byApprovalStatus.map(s => [s.status, s.count])),
    };
  }),
});
