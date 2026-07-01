import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { programs } from "../../drizzle/schema";
import { eq, asc } from "drizzle-orm";

export const programsRouter = router({
  // الحصول على جميع البرامج
  getAll: publicProcedure.query(async () => {
    const db = (await getDb())!;
    return await db.select().from(programs).orderBy(asc(programs.sortOrder), asc(programs.createdAt));
  }),

  // الحصول على البرامج الفعالة فقط
  getActive: publicProcedure.query(async () => {
    const db = (await getDb())!;
    return await db.select().from(programs).where(eq(programs.isActive, true)).orderBy(asc(programs.sortOrder), asc(programs.createdAt));
  }),

  // تحديث ترتيب البرامج
  updateOrder: protectedProcedure
    .input(
      z.object({
        orders: z.array(
          z.object({
            id: z.string(),
            sortOrder: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      for (const item of input.orders) {
        await db.update(programs).set({ sortOrder: item.sortOrder }).where(eq(programs.id, item.id));
      }
      return { success: true };
    }),

  // إضافة برنامج جديد
  create: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        requiresMosque: z.boolean().default(true),
        conditions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.insert(programs).values({
        ...input,
        isActive: true,
      });
      return { success: true };
    }),

  // تحديث برنامج
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        requiresMosque: z.boolean().optional(),
        isActive: z.boolean().optional(),
        conditions: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const db = (await getDb())!;
      await db.update(programs).set(data).where(eq(programs.id, id));
      return { success: true };
    }),

  // حذف برنامج
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.delete(programs).where(eq(programs.id, input.id));
      return { success: true };
    }),
});
