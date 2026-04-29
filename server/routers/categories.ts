import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { categories, categoryValues } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const categoriesRouter = router({
  // الحصول على جميع التصنيفات الرئيسية
  getAllCategories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return db.select().from(categories).where(eq(categories.isActive, true));
  }),

  // الحصول على تصنيف محدد مع قيمه
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
        .from(categoryValues)
        .where(
          and(
            eq(categoryValues.categoryId, input.categoryId),
            eq(categoryValues.isActive, true)
          )
        );

      return {
        ...category[0],
        values,
      };
    }),

  // الحصول على قيم تصنيف محدد
  getCategoryValues: publicProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return db
        .select()
        .from(categoryValues)
        .where(
          and(
            eq(categoryValues.categoryId, input.categoryId),
            eq(categoryValues.isActive, true)
          )
        );
    }),

  // الحصول على تصنيف حسب النوع
  getCategoryByType: publicProcedure
    .input(z.object({ type: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const category = await db
        .select()
        .from(categories)
        .where(and(eq(categories.type, input.type), eq(categories.isActive, true)))
        .limit(1);

      if (!category.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "التصنيف غير موجود" });
      }

      const values = await db
        .select()
        .from(categoryValues)
        .where(
          and(
            eq(categoryValues.categoryId, category[0].id),
            eq(categoryValues.isActive, true)
          )
        );

      return {
        ...category[0],
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
      if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
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
        throw new TRPCError({ code: "FORBIDDEN" });
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
        throw new TRPCError({ code: "FORBIDDEN" });
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
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // حذف ناعم (تعطيل التصنيف)
      await db
        .update(categories)
        .set({ isActive: false })
        .where(eq(categories.id, input.id));

      return { success: true };
    }),

  // إضافة قيمة إلى تصنيف (محمي)
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
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // التحقق من وجود التصنيف
      const category = await db
        .select()
        .from(categories)
        .where(eq(categories.id, input.categoryId))
        .limit(1);

      if (!category.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "التصنيف غير موجود" });
      }

      await db.insert(categoryValues).values({
        categoryId: input.categoryId,
        value: input.value,
        valueAr: input.valueAr,
        sortOrder: input.sortOrder,
        isActive: true,
      });

      // الحصول على القيمة المُنشأة
      const newValue = await db
        .select()
        .from(categoryValues)
        .where(eq(categoryValues.categoryId, input.categoryId))
        .orderBy(categoryValues.id)
        .limit(1);

      return { id: newValue[0]?.id || 0 };
    }),

  // تحديث قيمة تصنيف (محمي)
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
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { id, ...data } = input;

      await db.update(categoryValues).set(data).where(eq(categoryValues.id, id));

      return { success: true };
    }),

  // حذف قيمة تصنيف (محمي)
  deleteCategoryValue: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // التحقق من الصلاحيات
      if (!["super_admin", "system_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // حذف ناعم (تعطيل القيمة)
      await db
        .update(categoryValues)
        .set({ isActive: false })
        .where(eq(categoryValues.id, input.id));

      return { success: true };
    }),
});
