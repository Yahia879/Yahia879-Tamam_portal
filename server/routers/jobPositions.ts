import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { jobPositions } from "../../drizzle/schema";
import { eq, asc } from "drizzle-orm";

export const jobPositionsRouter = router({
  // جلب جميع الأدوار الوظيفية
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    return db
      .select()
      .from(jobPositions)
      .orderBy(asc(jobPositions.sortOrder), asc(jobPositions.nameAr));
  }),

  // جلب الأدوار الوظيفية النشطة فقط (للقوائم المنسدلة)
  getActive: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    return db
      .select()
      .from(jobPositions)
      .where(eq(jobPositions.isActive, true))
      .orderBy(asc(jobPositions.sortOrder), asc(jobPositions.nameAr));
  }),

  // إنشاء دور وظيفي جديد
  create: protectedProcedure
    .input(
      z.object({
        nameAr: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
        nameEn: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const [result] = await db.insert(jobPositions).values({
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        description: input.description,
        sortOrder: input.sortOrder ?? 0,
        isActive: true,
      });
      return { id: result.insertId, success: true };
    }),

  // تعديل دور وظيفي
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nameAr: z.string().min(2).optional(),
        nameEn: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const { id, ...data } = input;
      await db
        .update(jobPositions)
        .set(data)
        .where(eq(jobPositions.id, id));
      return { success: true };
    }),

  // حذف دور وظيفي
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      await db.delete(jobPositions).where(eq(jobPositions.id, input.id));
      return { success: true };
    }),

  // إضافة البيانات الافتراضية
  seed: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const defaults = [
      { nameAr: "مدير النظام", nameEn: "System Manager", sortOrder: 1 },
      { nameAr: "مدير تقني", nameEn: "Technical Manager", sortOrder: 2 },
      { nameAr: "مكتب المشاريع", nameEn: "Projects Office", sortOrder: 3 },
      { nameAr: "فريق ميداني", nameEn: "Field Team", sortOrder: 4 },
      { nameAr: "استجابة سريعة", nameEn: "Quick Response", sortOrder: 5 },
      { nameAr: "مالية", nameEn: "Finance", sortOrder: 6 },
      { nameAr: "مدير مشروع", nameEn: "Project Manager", sortOrder: 7 },
      { nameAr: "علاقات مؤسسية", nameEn: "Corporate Relations", sortOrder: 8 },
    ];
    for (const pos of defaults) {
      await db.insert(jobPositions).values({ ...pos, isActive: true });
    }
    return { success: true, count: defaults.length };
  }),
});
