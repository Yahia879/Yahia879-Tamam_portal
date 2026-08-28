import { router, protectedProcedure } from "../_core/trpc";
import { permissionProcedure } from "../permissions";
import { z } from "zod";
import { getDb } from "../db";
import { fieldVisits, requestComments, users, requestHistory, auditLogs, mosqueRequests } from "../../drizzle/schema";
import { eq, and, gte, lte, ne, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { notifyFieldVisitScheduled } from "./notifications";

export const fieldVisitsRouter = router({
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
      const { calculateUserPermissions } = await import("../permissions");
      const userPerms = await calculateUserPermissions(ctx.user.id);
      const isAllowed = userPerms.includes("field_visits.view") || 
                        userPerms.includes("appointments_calendar") || 
                        userPerms.includes("requests.view_details") ||
                        userPerms.includes("requests.manage_as_field_team") ||
                        ["super_admin", "system_admin", "projects_office"].includes(ctx.user.role);
      
      if (!isAllowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لجدولة الزيارة الميدانية" });
      }

      if (ctx.user.role === "field_team" && !userPerms.includes("requests.view_details")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لجدولة الزيارة الميدانية" });
      }

      const { requestId, visitDate, visitTime, assignedUserId, teamMembers, notes } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل الاتصال بقاعدة البيانات" });

      // التحقق الصارم من تعارض المواعيد للموظف المختار (في نفس اليوم ونفس الوقت بدقة)
      if (assignedUserId && visitTime && visitDate) {
        // فحص جدول field_visits
        const conflictsInVisits = await db
          .select({ id: fieldVisits.id, requestId: fieldVisits.requestId })
          .from(fieldVisits)
          .where(
            and(
              eq(fieldVisits.assignedTo, assignedUserId),
              sql`DATE(${fieldVisits.scheduledDate}) = DATE(${visitDate})`,
              eq(fieldVisits.scheduledTime, visitTime),
              sql`COALESCE(${fieldVisits.status}, 'scheduled') != 'cancelled'`,
              ne(fieldVisits.requestId, requestId)
            )
          )
          .limit(1);

        // فحص جدول mosque_requests
        const conflictsInRequests = await db
          .select({ id: mosqueRequests.id })
          .from(mosqueRequests)
          .where(
            and(
              eq(mosqueRequests.fieldVisitAssignedTo, assignedUserId),
              sql`DATE(${mosqueRequests.fieldVisitScheduledDate}) = DATE(${visitDate})`,
              eq(mosqueRequests.fieldVisitScheduledTime, visitTime),
              ne(mosqueRequests.id, requestId)
            )
          )
          .limit(1);

        if (conflictsInVisits.length > 0 || conflictsInRequests.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `هذا الموظف لديه زيارة ميدانية محجوزة بالفعل في تاريخ (${visitDate}) الساعة (${visitTime}). لا يمكن إسناد زيارة أخرى له في نفس الوقت.`,
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

  getVisit: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { calculateUserPermissions } = await import("../permissions");
      const userPerms = await calculateUserPermissions(ctx.user.id);
      const hasViewPerm = userPerms.includes("field_visits.view") || userPerms.includes("requests.manage_as_field_team");
      if (!hasViewPerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض الزيارة الميدانية" });
      }

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
        userId: z.number().optional().nullable(),
        date: z.string(),
        excludeRequestId: z.number().optional().nullable(),
      })
    )
    .query(async ({ input }) => {
      const { userId, date, excludeRequestId } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل الاتصال بقاعدة البيانات" });

      if (!date) return [];

      // 1. جلب المواعيد المحجوزة من جدول field_visits
      const visits = await db
        .select({
          scheduledTime: fieldVisits.scheduledTime,
          assignedTo: fieldVisits.assignedTo,
          requestId: fieldVisits.requestId,
        })
        .from(fieldVisits)
        .where(
          and(
            sql`DATE(${fieldVisits.scheduledDate}) = DATE(${date})`,
            sql`${fieldVisits.scheduledTime} IS NOT NULL`,
            sql`COALESCE(${fieldVisits.status}, 'scheduled') != 'cancelled'`,
            userId ? eq(fieldVisits.assignedTo, userId) : sql`1=1`,
            excludeRequestId ? ne(fieldVisits.requestId, excludeRequestId) : sql`1=1`
          )
        );

      const busyFromVisits = visits.map((v) => v.scheduledTime).filter(Boolean) as string[];

      // 2. جلب المواعيد المحجوزة من جدول mosque_requests (الزيارات الميدانية)
      const reqVisits = await db
        .select({
          scheduledTime: mosqueRequests.fieldVisitScheduledTime,
          assignedTo: mosqueRequests.fieldVisitAssignedTo,
          id: mosqueRequests.id,
        })
        .from(mosqueRequests)
        .where(
          and(
            sql`DATE(${mosqueRequests.fieldVisitScheduledDate}) = DATE(${date})`,
            sql`${mosqueRequests.fieldVisitScheduledTime} IS NOT NULL`,
            userId ? eq(mosqueRequests.fieldVisitAssignedTo, userId) : sql`1=1`,
            excludeRequestId ? ne(mosqueRequests.id, excludeRequestId) : sql`1=1`
          )
        );

      const busyFromReqs = reqVisits.map((r) => r.scheduledTime).filter(Boolean) as string[];

      // 3. جلب المواعيد المحجوزة للتقرير الختامي
      const reqFinalReports = await db
        .select({
          scheduledTime: mosqueRequests.finalReportScheduledTime,
          assignedTo: mosqueRequests.finalReportAssignedTo,
          id: mosqueRequests.id,
        })
        .from(mosqueRequests)
        .where(
          and(
            sql`DATE(${mosqueRequests.finalReportScheduledDate}) = DATE(${date})`,
            sql`${mosqueRequests.finalReportScheduledTime} IS NOT NULL`,
            userId ? eq(mosqueRequests.finalReportAssignedTo, userId) : sql`1=1`,
            excludeRequestId ? ne(mosqueRequests.id, excludeRequestId) : sql`1=1`
          )
        );

      const busyFromFinal = reqFinalReports.map((r) => r.scheduledTime).filter(Boolean) as string[];

      // 4. جلب المواعيد المحجوزة للاستجابة السريعة
      const reqQuick = await db
        .select({
          scheduledTime: mosqueRequests.quickResponseScheduledTime,
          assignedTo: mosqueRequests.assignedTo,
          id: mosqueRequests.id,
        })
        .from(mosqueRequests)
        .where(
          and(
            eq(mosqueRequests.requestTrack, 'quick_response'),
            sql`DATE(${mosqueRequests.quickResponseScheduledDate}) = DATE(${date})`,
            sql`${mosqueRequests.quickResponseScheduledTime} IS NOT NULL`,
            userId ? eq(mosqueRequests.assignedTo, userId) : sql`1=1`,
            excludeRequestId ? ne(mosqueRequests.id, excludeRequestId) : sql`1=1`
          )
        );

      const busyFromQuick = reqQuick.map((r) => r.scheduledTime).filter(Boolean) as string[];

      return Array.from(new Set([...busyFromVisits, ...busyFromReqs, ...busyFromFinal, ...busyFromQuick]));
    }),
});
