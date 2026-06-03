import { router, protectedProcedure } from "../_core/trpc";
import { permissionProcedure } from "../permissions";
import { z } from "zod";
import { getDb } from "../db";
import { fieldVisits, requestComments, users, requestHistory, auditLogs, mosqueRequests } from "../../drizzle/schema";
import { eq, and, gte, lte, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { notifyFieldVisitScheduled } from "./notifications";

export const fieldVisitsRouter = router({
  // جدولة الزيارة الميدانية
  scheduleVisit: permissionProcedure("field_visits.view")
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
      if (ctx.user.role === "field_team") {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لجدولة الزيارة الميدانية" });
      }

      const { requestId, visitDate, visitTime, assignedUserId, teamMembers, notes } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل الاتصال بقاعدة البيانات" });

      // التحقق من تعارض المواعيد للموظف المختار (في نفس اليوم ونفس الوقت)
      if (assignedUserId) {
        const startOfDay = new Date(`${visitDate}T00:00:00`);
        const endOfDay = new Date(`${visitDate}T23:59:59`);

        const conflict = await db
          .select()
          .from(fieldVisits)
          .where(
            and(
              eq(fieldVisits.assignedTo, assignedUserId),
              gte(fieldVisits.scheduledDate, startOfDay),
              lte(fieldVisits.scheduledDate, endOfDay),
              eq(fieldVisits.scheduledTime, visitTime),
              ne(fieldVisits.requestId, requestId) // باستثناء الطلب الحالي (في حال إعادة الجدولة)
            )
          )
          .limit(1);

        if (conflict.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "هذا الموظف لديه زيارة ميدانية مجدولة بالفعل في نفس اليوم والوقت المختارين",
          });
        }
      }

      // التحقق من وجود زيارة سابقة
      const existingVisits = await db.select().from(fieldVisits).where(eq(fieldVisits.requestId, requestId)).limit(1);

      let visitId: number;
      if (existingVisits.length > 0) {
        // تحديث الزيارة الموجودة
        visitId = existingVisits[0].id;
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
          .where(eq(fieldVisits.id, visitId));
      } else {
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
        visitId = Number(result[0].insertId);
      }

      // تحديث حالة الطلب إلى 'scheduled' (إذا لزم الأمر) أو مجرد توثيق في السجل
      await db.insert(requestHistory).values({
        requestId,
        userId: ctx.user.id,
        action: "field_visit_scheduled",
        notes: `تم جدولة زيارة ميدانية بتاريخ ${visitDate} الساعة ${visitTime}`,
      });

      // مزامنة حقول الزيارة الميدانية في جدول mosque_requests
      await db
        .update(mosqueRequests)
        .set({
          fieldVisitScheduledDate: new Date(visitDate),
          fieldVisitScheduledTime: visitTime,
          fieldVisitAssignedTo: assignedUserId || null,
          fieldVisitNotes: notes || null,
        })
        .where(eq(mosqueRequests.id, requestId));

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "field_visit_scheduled",
        entityType: "field_visit",
        entityId: visitId,
        newValues: { requestId, visitDate, visitTime, assignedUserId },
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

      // إرسال إشعار للموظف المعين للزيارة الميدانية
      if (assignedUserId) {
        const [request] = await db
          .select({ requestNumber: mosqueRequests.requestNumber })
          .from(mosqueRequests)
          .where(eq(mosqueRequests.id, requestId))
          .limit(1);

        if (request) {
          try {
            await notifyFieldVisitScheduled(
              requestId,
              request.requestNumber,
              new Date(visitDate),
              assignedUserId
            );
          } catch (error) {
            console.error("Failed to send field visit notification:", error);
          }
        }
      }

      return { success: true, visitId };
    }),

  // تأكيد تنفيذ الزيارة
  executeVisit: permissionProcedure("field_visits.view")
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
  submitReport: permissionProcedure("field_visits.view")
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
  getVisit: permissionProcedure("field_visits.view")
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

  // جلب الفترات المحجوزة لموظف معين في تاريخ محدد
  getBusySlots: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        date: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { userId, date } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل الاتصال بقاعدة البيانات" });

      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);

      const visits = await db
        .select({ scheduledTime: fieldVisits.scheduledTime })
        .from(fieldVisits)
        .where(
          and(
            eq(fieldVisits.assignedTo, userId),
            gte(fieldVisits.scheduledDate, startOfDay),
            lte(fieldVisits.scheduledDate, endOfDay)
          )
        );

      // إرجاع مصفوفة من الساعات المحجوزة
      return visits.map(v => v.scheduledTime).filter(Boolean) as string[];
    }),
});
