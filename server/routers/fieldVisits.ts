import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { fieldVisits, requestComments, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const fieldVisitsRouter = router({
  // جدولة الزيارة الميدانية
  scheduleVisit: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        visitDate: z.string(),
        visitTime: z.string(),
        assignedUserId: z.number().optional(),
        teamMembers: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { requestId, visitDate, visitTime, assignedUserId, teamMembers, notes } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل الاتصال بقاعدة البيانات" });

      // التحقق من وجود زيارة سابقة
      const existingVisits = await db.select().from(fieldVisits).where(eq(fieldVisits.requestId, requestId)).limit(1);

      if (existingVisits.length > 0) {
        // تحديث الزيارة الموجودة
        await db
          .update(fieldVisits)
          .set({
            scheduledDate: new Date(visitDate),
            scheduledTime: visitTime,
            assignedTo: assignedUserId || null,
            teamMembers: teamMembers || null,
            scheduleNotes: notes || null,
            scheduledBy: ctx.user.id,
            scheduledAt: new Date(),
            status: "scheduled",
            updatedAt: new Date(),
          })
          .where(eq(fieldVisits.id, existingVisits[0].id));

        // إضافة التعليق إلى request_comments إذا كان موجوداً
        if (notes && notes.trim()) {
          await db.insert(requestComments).values({
            requestId,
            userId: ctx.user.id,
            comment: `📅 تعليق من جدولة الزيارة الميدانية:\n${notes}`,
            isRead: false,
          });
        }

        return { success: true, visitId: existingVisits[0].id };
      }

      // إنشاء زيارة جديدة
      const result = await db.insert(fieldVisits).values({
        requestId,
        scheduledDate: new Date(visitDate),
        scheduledTime: visitTime,
        assignedTo: assignedUserId || null,
        teamMembers: teamMembers || null,
        scheduleNotes: notes || null,
        scheduledBy: ctx.user.id,
        scheduledAt: new Date(),
        status: "scheduled",
      });

      // إضافة التعليق إلى request_comments إذا كان موجوداً
      if (notes && notes.trim()) {
        await db.insert(requestComments).values({
          requestId,
          userId: ctx.user.id,
          comment: `📅 تعليق من جدولة الزيارة الميدانية:\n${notes}`,
          isRead: false,
        });
      }

      return { success: true, visitId: result[0].insertId };
    }),

  // تأكيد تنفيذ الزيارة
  executeVisit: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        executionDate: z.string(),
        executionTime: z.string(),
        attendees: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { requestId, executionDate, executionTime, attendees, notes } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل الاتصال بقاعدة البيانات" });

      // البحث عن الزيارة
      const visits = await db.select().from(fieldVisits).where(eq(fieldVisits.requestId, requestId)).limit(1);

      if (visits.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "لم يتم العثور على موعد الزيارة",
        });
      }

      // تحديث بيانات التنفيذ
      await db
        .update(fieldVisits)
        .set({
          executionDate: new Date(executionDate),
          executionTime: executionTime,
          attendees: attendees || null,
          executionNotes: notes || null,
          executedBy: ctx.user.id,
          executedAt: new Date(),
          status: "executed",
          updatedAt: new Date(),
        })
        .where(eq(fieldVisits.id, visits[0].id));

      return { success: true, visitId: visits[0].id };
    }),

  // تأكيد رفع التقرير
  submitReport: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { requestId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل الاتصال بقاعدة البيانات" });

      // البحث عن الزيارة
      const visits = await db.select().from(fieldVisits).where(eq(fieldVisits.requestId, requestId)).limit(1);

      if (visits.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "لم يتم العثور على الزيارة الميدانية",
        });
      }

      // تحديث حالة التقرير
      await db
        .update(fieldVisits)
        .set({
          reportSubmitted: true,
          reportSubmittedBy: ctx.user.id,
          reportSubmittedAt: new Date(),
          status: "reported",
          updatedAt: new Date(),
        })
        .where(eq(fieldVisits.id, visits[0].id));

      return { success: true, visitId: visits[0].id };
    }),

  // جلب بيانات الزيارة
  getVisit: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const { requestId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل الاتصال بقاعدة البيانات" });

      const visits = await db.select().from(fieldVisits).where(eq(fieldVisits.requestId, requestId)).limit(1);
      if (visits.length === 0) return null;
      const visit = visits[0];
      // جلب اسم المسؤول المعين للزيارة
      let assignedUserName: string | null = null;
      if (visit.assignedTo) {
        const [assignedUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, visit.assignedTo));
        assignedUserName = assignedUser?.name || null;
      }
      return { ...visit, assignedUserName };
    }),
});
