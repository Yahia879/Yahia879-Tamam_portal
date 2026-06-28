import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { categories } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const categoriesRouter = router({
  // الحصول على جميع التصنيفات الرئيسية
  getAllCategories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder);
  }),

  // الحصول على تصنيف محدد مع قيم التابعة لنفس النوع
  getCategoryWithValues: publicProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const category = await db
        .select()
        .from(categories)
        .where(eq(categories.id, input.categoryId))
        .limit(1);

      if (!category.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "التصنيف غير موجود" });
      }

      const values = await db
        .select()
        .from(categories)
        .where(and(eq(categories.type, category[0].type), eq(categories.isActive, true)))
        .orderBy(categories.sortOrder);

      return {
        ...category[0],
        values: values.map(v => ({
          id: v.id,
          value: v.name,
          valueAr: v.nameAr,
          sortOrder: v.sortOrder,
          isActive: v.isActive,
        })),
      };
    }),

  // الحصول على قيم تصنيف محدد
  getCategoryValues: publicProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const category = await db
        .select()
        .from(categories)
        .where(eq(categories.id, input.categoryId))
        .limit(1);

      if (!category.length) return [];

      const values = await db
        .select()
        .from(categories)
        .where(and(eq(categories.type, category[0].type), eq(categories.isActive, true)))
        .orderBy(categories.sortOrder);

      return values.map(v => ({
        id: v.id,
        value: v.name,
        valueAr: v.nameAr,
        sortOrder: v.sortOrder,
        isActive: v.isActive,
      }));
    }),

  // الحصول على تصنيف حسب النوع
  getCategoryByType: publicProcedure
    .input(z.object({ type: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // دعم الاستعلامات بصيغة الجمع المفرد (مثال: banks -> bank)
      let typeQuery = input.type;
      if (typeQuery === "banks") typeQuery = "bank";
      if (typeQuery === "signatories") typeQuery = "signatories"; 

      const cats = await db
        .select()
        .from(categories)
        .where(and(eq(categories.type, typeQuery), eq(categories.isActive, true)))
        .orderBy(categories.sortOrder);

      const values = cats.map(c => ({
        id: c.id,
        value: c.name,
        valueAr: c.nameAr,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
      }));

      return {
        id: 0,
        name: typeQuery,
        nameAr: typeQuery,
        type: typeQuery,
        values,
      };
    }),

  // الحصول على وحدات BOQ
  getBoqUnits: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return db
      .select()
      .from(categories)
      .where(and(eq(categories.type, "boq_unit"), eq(categories.isActive, true)))
      .orderBy(categories.sortOrder);
  }),

  // إضافة وحدة BOQ جديدة
  addBoqUnit: protectedProcedure
    .input(z.object({ nameAr: z.string().min(1), name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const allowedRoles = ["super_admin", "system_admin", "projects_office"];
      if (!allowedRoles.includes(ctx.user.role)) {
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasAddPerm = userPermissions.includes("settings_categories.add");
        if (!hasAddPerm) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await db.insert(categories).values({
        name: input.name,
        nameAr: input.nameAr,
        type: "boq_unit",
        isActive: true,
      });
      return { success: true };
    }),

  // إنشاء تصنيف جديد (محمي)
  createCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "اسم التصنيف مطلوب"),
        nameAr: z.string().min(1, "الاسم بالعربية مطلوب"),
        type: z.string().min(1, "نوع التصنيف مطلوب"),
        parentId: z.number().optional(),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // التحقق من الصلاحيات
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasAddPerm = userPermissions.includes("settings_categories.add");
        if (!hasAddPerm) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      await db.insert(categories).values({
        name: input.name,
        nameAr: input.nameAr,
        type: input.type,
        parentId: input.parentId,
        sortOrder: input.sortOrder,
        isActive: true,
      });

      // الحصول على التصنيف المُنشأ
      const newCategory = await db
        .select()
        .from(categories)
        .where(eq(categories.type, input.type))
        .orderBy(categories.id)
        .limit(1);

      return { id: newCategory[0]?.id || 0 };
    }),

  // تحديث تصنيف (محمي)
  updateCategory: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        nameAr: z.string().optional(),
        type: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // التحقق من الصلاحيات
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasEditPerm = userPermissions.includes("settings_categories.edit");
        if (!hasEditPerm) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      const { id, ...data } = input;

      await db.update(categories).set(data).where(eq(categories.id, id));

      return { success: true };
    }),

  // حذف تصنيف (محمي)
  deleteCategory: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // التحقق من الصلاحيات
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasDeletePerm = userPermissions.includes("settings_categories.delete");
        if (!hasDeletePerm) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      // حذف ناعم (تعطيل التصنيف)
      await db
        .update(categories)
        .set({ isActive: false })
        .where(eq(categories.id, input.id));

      return { success: true };
    }),

  // إضافة قيمة إلى تصنيف (متوافق مع التصاميم القديمة)
  addCategoryValue: protectedProcedure
    .input(
      z.object({
        categoryId: z.number(),
        value: z.string().min(1, "القيمة مطلوبة"),
        valueAr: z.string().min(1, "القيمة بالعربية مطلوبة"),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // التحقق من الصلاحيات
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasAddPerm = userPermissions.includes("settings_categories.add");
        if (!hasAddPerm) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      const parentCategory = await db
        .select()
        .from(categories)
        .where(eq(categories.id, input.categoryId))
        .limit(1);

      const type = parentCategory.length ? parentCategory[0].type : "unknown";

      await db.insert(categories).values({
        name: input.value,
        nameAr: input.valueAr,
        type: type,
        sortOrder: input.sortOrder,
        isActive: true,
      });

      return { id: 0 };
    }),

  // تحديث قيمة تصنيف (متوافق مع التصاميم القديمة)
  updateCategoryValue: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        value: z.string().optional(),
        valueAr: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // التحقق من الصلاحيات
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasEditPerm = userPermissions.includes("settings_categories.edit");
        if (!hasEditPerm) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      const { id, value, valueAr, ...data } = input;
      const updateData: any = { ...data };
      if (value !== undefined) updateData.name = value;
      if (valueAr !== undefined) updateData.nameAr = valueAr;

      await db.update(categories).set(updateData).where(eq(categories.id, id));

      return { success: true };
    }),

  // حذف قيمة تصنيف (متوافق مع التصاميم القديمة)
  deleteCategoryValue: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // التحقق من الصلاحيات
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasDeletePerm = userPermissions.includes("settings_categories.delete");
        if (!hasDeletePerm) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      await db
        .update(categories)
        .set({ isActive: false })
        .where(eq(categories.id, input.id));

      return { success: true };
    }),

  // تحديث ترتيب التصنيفات دفعة واحدة (محمي)
  updateCategoriesOrder: protectedProcedure
    .input(
      z.array(
        z.object({
          id: z.number(),
          sortOrder: z.number(),
        })
      )
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // التحقق من الصلاحيات
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        const hasEditPerm = userPermissions.includes("settings_categories.edit");
        if (!hasEditPerm) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      // تحديث كل عنصر بترتيبه الجديد
      for (const item of input) {
        await db
          .update(categories)
          .set({ sortOrder: item.sortOrder })
          .where(eq(categories.id, item.id));
      }

      return { success: true };
    }),
});
