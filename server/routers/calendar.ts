import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { 
  customCalendarEvents, 
  fieldVisits, 
  mosqueRequests, 
  mosques, 
  users 
} from "../../drizzle/schema";
import { eq, and, gte, lte, ne, sql, desc, or, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createNotification } from "./notifications";

export const calendarRouter = router({
  // 1. جلب المواعيد الموحدة (الزيارات الميدانية + الاستجابة السريعة + التقرير الختامي + الأحداث المخصصة)
  getUnifiedEvents: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(), // YYYY-MM-DD
        endDate: z.string().optional(),   // YYYY-MM-DD
        eventType: z.enum(["all", "field_visit", "quick_response", "final_report", "custom"]).default("all"),
        assignedTo: z.number().optional().nullable(),
        programType: z.string().optional().nullable(),
        search: z.string().optional().nullable(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const unifiedEvents: any[] = [];
      const search = input.search?.trim().toLowerCase() || "";

      // -------------------------------------------------------------
      // 1. الزيارات الميدانية (Field Visits)
      // -------------------------------------------------------------
      if (input.eventType === "all" || input.eventType === "field_visit") {
        const visitConditions: any[] = [
          sql`${fieldVisits.scheduledDate} IS NOT NULL`,
          sql`COALESCE(${fieldVisits.status}, 'scheduled') != 'cancelled'`,
        ];

        if (input.startDate) {
          visitConditions.push(sql`DATE(${fieldVisits.scheduledDate}) >= DATE(${input.startDate})`);
        }
        if (input.endDate) {
          visitConditions.push(sql`DATE(${fieldVisits.scheduledDate}) <= DATE(${input.endDate})`);
        }
        if (input.assignedTo) {
          visitConditions.push(eq(fieldVisits.assignedTo, input.assignedTo));
        }

        const rawVisits = await db
          .select({
            id: fieldVisits.id,
            scheduledDate: sql<string>`DATE_FORMAT(${fieldVisits.scheduledDate}, '%Y-%m-%d')`,
            scheduledTime: fieldVisits.scheduledTime,
            scheduleNotes: fieldVisits.scheduleNotes,
            status: fieldVisits.status,
            assignedToId: fieldVisits.assignedTo,
            assignedToName: users.name,
            assignedToRole: users.role,
            requestId: mosqueRequests.id,
            requestNumber: mosqueRequests.requestNumber,
            programType: mosqueRequests.programType,
            currentStage: mosqueRequests.currentStage,
            requesterName: mosqueRequests.requesterName,
            requesterPhone: mosqueRequests.requesterPhone,
            mosqueName: mosques.name,
            mosqueCity: mosques.city,
            mosqueRegion: mosques.region,
          })
          .from(fieldVisits)
          .innerJoin(mosqueRequests, eq(fieldVisits.requestId, mosqueRequests.id))
          .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
          .leftJoin(users, eq(fieldVisits.assignedTo, users.id))
          .where(and(...visitConditions));

        const existingVisitRequestIds = new Set<number>();

        for (const v of rawVisits) {
          if (v.requestId) existingVisitRequestIds.add(v.requestId);
          if (input.programType && v.programType !== input.programType) continue;
          if (search) {
            const matchesSearch = 
              v.requestNumber?.toLowerCase().includes(search) ||
              v.mosqueName?.toLowerCase().includes(search) ||
              v.mosqueCity?.toLowerCase().includes(search) ||
              v.assignedToName?.toLowerCase().includes(search) ||
              v.requesterName?.toLowerCase().includes(search);
            if (!matchesSearch) continue;
          }

          unifiedEvents.push({
            id: `visit-${v.id}`,
            rawId: v.id,
            type: "field_visit",
            typeLabel: "زيارة ميدانية",
            title: `معاينة ميدانية: ${v.mosqueName || v.requestNumber}`,
            description: v.scheduleNotes || "زيارة ومعاينة ميدانية للطلب",
            date: v.scheduledDate,
            startTime: v.scheduledTime || "09:00",
            endTime: undefined,
            assignedToId: v.assignedToId,
            assignedToName: v.assignedToName || "غير محدد",
            assignedToRole: v.assignedToRole,
            requestId: v.requestId,
            requestNumber: v.requestNumber,
            programType: v.programType,
            currentStage: v.currentStage,
            mosqueName: v.mosqueName,
            mosqueCity: v.mosqueCity,
            location: v.mosqueName ? `${v.mosqueName} - ${v.mosqueCity || ''}` : undefined,
            contactName: v.requesterName,
            contactPhone: v.requesterPhone,
            priority: "medium",
            status: v.status || "scheduled",
            colorTheme: {
              badgeBg: "bg-purple-100 dark:bg-purple-950/60",
              badgeText: "text-purple-800 dark:text-purple-300",
              border: "border-purple-300 dark:border-purple-800",
              dot: "bg-purple-600 dark:bg-purple-400",
              gradient: "from-purple-500 to-indigo-600",
            },
            linkUrl: `/requests/${v.requestId}`,
          });
        }

        // جلب الزيارات المجدولة المباشرة في جدول mosque_requests للطلبات التي لا تملك سجلاً في field_visits
        const reqVisitConditions: any[] = [
          sql`${mosqueRequests.fieldVisitScheduledDate} IS NOT NULL`,
        ];

        if (input.startDate) {
          reqVisitConditions.push(sql`DATE(${mosqueRequests.fieldVisitScheduledDate}) >= DATE(${input.startDate})`);
        }
        if (input.endDate) {
          reqVisitConditions.push(sql`DATE(${mosqueRequests.fieldVisitScheduledDate}) <= DATE(${input.endDate})`);
        }
        if (input.assignedTo) {
          reqVisitConditions.push(eq(mosqueRequests.fieldVisitAssignedTo, input.assignedTo));
        }

        const rawReqVisits = await db
          .select({
            id: mosqueRequests.id,
            scheduledDate: sql<string>`DATE_FORMAT(${mosqueRequests.fieldVisitScheduledDate}, '%Y-%m-%d')`,
            scheduledTime: mosqueRequests.fieldVisitScheduledTime,
            requestNumber: mosqueRequests.requestNumber,
            programType: mosqueRequests.programType,
            currentStage: mosqueRequests.currentStage,
            requesterName: mosqueRequests.requesterName,
            requesterPhone: mosqueRequests.requesterPhone,
            assignedToId: mosqueRequests.fieldVisitAssignedTo,
            assignedToName: users.name,
            assignedToRole: users.role,
            mosqueName: mosques.name,
            mosqueCity: mosques.city,
            mosqueRegion: mosques.region,
          })
          .from(mosqueRequests)
          .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
          .leftJoin(users, eq(mosqueRequests.fieldVisitAssignedTo, users.id))
          .where(and(...reqVisitConditions));

        for (const rv of rawReqVisits) {
          if (existingVisitRequestIds.has(rv.id)) continue;
          if (input.programType && rv.programType !== input.programType) continue;
          if (search) {
            const matchesSearch = 
              rv.requestNumber?.toLowerCase().includes(search) ||
              rv.mosqueName?.toLowerCase().includes(search) ||
              rv.mosqueCity?.toLowerCase().includes(search) ||
              rv.assignedToName?.toLowerCase().includes(search) ||
              rv.requesterName?.toLowerCase().includes(search);
            if (!matchesSearch) continue;
          }

          unifiedEvents.push({
            id: `req-visit-${rv.id}`,
            rawId: rv.id,
            type: "field_visit",
            typeLabel: "زيارة ميدانية",
            title: `معاينة ميدانية: ${rv.mosqueName || rv.requestNumber}`,
            description: "زيارة ومعاينة ميدانية مجدولة للطلب",
            date: rv.scheduledDate,
            startTime: rv.scheduledTime || "09:00",
            endTime: undefined,
            assignedToId: rv.assignedToId,
            assignedToName: rv.assignedToName || "غير محدد",
            assignedToRole: rv.assignedToRole,
            requestId: rv.id,
            requestNumber: rv.requestNumber,
            programType: rv.programType,
            currentStage: rv.currentStage,
            mosqueName: rv.mosqueName,
            mosqueCity: rv.mosqueCity,
            location: rv.mosqueName ? `${rv.mosqueName} - ${rv.mosqueCity || ''}` : undefined,
            contactName: rv.requesterName,
            contactPhone: rv.requesterPhone,
            priority: "medium",
            status: "scheduled",
            colorTheme: {
              badgeBg: "bg-purple-100 dark:bg-purple-950/60",
              badgeText: "text-purple-800 dark:text-purple-300",
              border: "border-purple-300 dark:border-purple-800",
              dot: "bg-purple-600 dark:bg-purple-400",
              gradient: "from-purple-500 to-indigo-600",
            },
            linkUrl: `/requests/${rv.id}`,
          });
        }
      }

      // -------------------------------------------------------------
      // 2. الاستجابة السريعة (Quick Response)
      // -------------------------------------------------------------
      if (input.eventType === "all" || input.eventType === "quick_response") {
        const quickConditions: any[] = [
          eq(mosqueRequests.requestTrack, "quick_response"),
          sql`${mosqueRequests.quickResponseScheduledDate} IS NOT NULL`,
        ];

        if (input.startDate) {
          quickConditions.push(sql`DATE(${mosqueRequests.quickResponseScheduledDate}) >= DATE(${input.startDate})`);
        }
        if (input.endDate) {
          quickConditions.push(sql`DATE(${mosqueRequests.quickResponseScheduledDate}) <= DATE(${input.endDate})`);
        }
        if (input.assignedTo) {
          quickConditions.push(eq(mosqueRequests.assignedTo, input.assignedTo));
        }

        const rawQuick = await db
          .select({
            id: mosqueRequests.id,
            scheduledDate: sql<string>`DATE_FORMAT(${mosqueRequests.quickResponseScheduledDate}, '%Y-%m-%d')`,
            scheduledTime: mosqueRequests.quickResponseScheduledTime,
            requestNumber: mosqueRequests.requestNumber,
            programType: mosqueRequests.programType,
            currentStage: mosqueRequests.currentStage,
            status: mosqueRequests.status,
            assignedToId: mosqueRequests.assignedTo,
            assignedToName: users.name,
            assignedToRole: users.role,
            requesterName: mosqueRequests.requesterName,
            requesterPhone: mosqueRequests.requesterPhone,
            technicalEvalJustification: mosqueRequests.technicalEvalJustification,
            mosqueName: mosques.name,
            mosqueCity: mosques.city,
          })
          .from(mosqueRequests)
          .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
          .leftJoin(users, eq(mosqueRequests.assignedTo, users.id))
          .where(and(...quickConditions));

        for (const q of rawQuick) {
          if (input.programType && q.programType !== input.programType) continue;
          if (search) {
            const matchesSearch = 
              q.requestNumber?.toLowerCase().includes(search) ||
              q.mosqueName?.toLowerCase().includes(search) ||
              q.mosqueCity?.toLowerCase().includes(search) ||
              q.assignedToName?.toLowerCase().includes(search) ||
              q.requesterName?.toLowerCase().includes(search);
            if (!matchesSearch) continue;
          }

          unifiedEvents.push({
            id: `quick-${q.id}`,
            rawId: q.id,
            type: "quick_response",
            typeLabel: "استجابة سريعة",
            title: `استجابة سريعة: ${q.mosqueName || q.requestNumber}`,
            description: q.technicalEvalJustification || "تنفيذ زيارة وخدمة استجابة سريعة فورية",
            date: q.scheduledDate,
            startTime: q.scheduledTime || "10:00",
            endTime: undefined,
            assignedToId: q.assignedToId,
            assignedToName: q.assignedToName || "غير محدد",
            assignedToRole: q.assignedToRole,
            requestId: q.id,
            requestNumber: q.requestNumber,
            programType: q.programType,
            currentStage: q.currentStage,
            mosqueName: q.mosqueName,
            mosqueCity: q.mosqueCity,
            location: q.mosqueName ? `${q.mosqueName} - ${q.mosqueCity || ''}` : undefined,
            contactName: q.requesterName,
            contactPhone: q.requesterPhone,
            priority: "high",
            status: q.status || "in_progress",
            colorTheme: {
              badgeBg: "bg-amber-100 dark:bg-amber-950/60",
              badgeText: "text-amber-800 dark:text-amber-300",
              border: "border-amber-300 dark:border-amber-800",
              dot: "bg-amber-500 dark:bg-amber-400",
              gradient: "from-amber-500 to-orange-600",
            },
            linkUrl: `/requests/${q.id}`,
          });
        }
      }

      // -------------------------------------------------------------
      // 3. التقرير الختامي (Final Report)
      // -------------------------------------------------------------
      if (input.eventType === "all" || input.eventType === "final_report") {
        const finalConditions: any[] = [
          sql`${mosqueRequests.finalReportScheduledDate} IS NOT NULL`,
        ];

        if (input.startDate) {
          finalConditions.push(sql`DATE(${mosqueRequests.finalReportScheduledDate}) >= DATE(${input.startDate})`);
        }
        if (input.endDate) {
          finalConditions.push(sql`DATE(${mosqueRequests.finalReportScheduledDate}) <= DATE(${input.endDate})`);
        }
        if (input.assignedTo) {
          finalConditions.push(eq(mosqueRequests.finalReportAssignedTo, input.assignedTo));
        }

        const rawFinal = await db
          .select({
            id: mosqueRequests.id,
            scheduledDate: sql<string>`DATE_FORMAT(${mosqueRequests.finalReportScheduledDate}, '%Y-%m-%d')`,
            scheduledTime: mosqueRequests.finalReportScheduledTime,
            requestNumber: mosqueRequests.requestNumber,
            programType: mosqueRequests.programType,
            currentStage: mosqueRequests.currentStage,
            status: mosqueRequests.status,
            assignedToId: mosqueRequests.finalReportAssignedTo,
            assignedToName: users.name,
            assignedToRole: users.role,
            requesterName: mosqueRequests.requesterName,
            requesterPhone: mosqueRequests.requesterPhone,
            mosqueName: mosques.name,
            mosqueCity: mosques.city,
          })
          .from(mosqueRequests)
          .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
          .leftJoin(users, eq(mosqueRequests.finalReportAssignedTo, users.id))
          .where(and(...finalConditions));

        for (const f of rawFinal) {
          if (input.programType && f.programType !== input.programType) continue;
          if (search) {
            const matchesSearch = 
              f.requestNumber?.toLowerCase().includes(search) ||
              f.mosqueName?.toLowerCase().includes(search) ||
              f.mosqueCity?.toLowerCase().includes(search) ||
              f.assignedToName?.toLowerCase().includes(search) ||
              f.requesterName?.toLowerCase().includes(search);
            if (!matchesSearch) continue;
          }

          unifiedEvents.push({
            id: `final-${f.id}`,
            rawId: f.id,
            type: "final_report",
            typeLabel: "تقرير ختامي",
            title: `إعداد التقرير الختامي: ${f.mosqueName || f.requestNumber}`,
            description: "إعداد ورفع التقرير الختامي وتوثيق المشروع للإغلاق النهائي",
            date: f.scheduledDate,
            startTime: f.scheduledTime || "11:00",
            endTime: undefined,
            assignedToId: f.assignedToId,
            assignedToName: f.assignedToName || "غير محدد",
            assignedToRole: f.assignedToRole,
            requestId: f.id,
            requestNumber: f.requestNumber,
            programType: f.programType,
            currentStage: f.currentStage,
            mosqueName: f.mosqueName,
            mosqueCity: f.mosqueCity,
            location: f.mosqueName ? `${f.mosqueName} - ${f.mosqueCity || ''}` : undefined,
            contactName: f.requesterName,
            contactPhone: f.requesterPhone,
            priority: "medium",
            status: f.status || "in_progress",
            colorTheme: {
              badgeBg: "bg-emerald-100 dark:bg-emerald-950/60",
              badgeText: "text-emerald-800 dark:text-emerald-300",
              border: "border-emerald-300 dark:border-emerald-800",
              dot: "bg-emerald-600 dark:bg-emerald-400",
              gradient: "from-emerald-500 to-teal-600",
            },
            linkUrl: `/requests/${f.id}`,
          });
        }
      }

      // -------------------------------------------------------------
      // 4. الأحداث والمهام المخصصة (Custom Events)
      // -------------------------------------------------------------
      if (input.eventType === "all" || input.eventType === "custom") {
        const customConditions: any[] = [];

        if (input.startDate) {
          customConditions.push(sql`DATE(${customCalendarEvents.eventDate}) >= DATE(${input.startDate})`);
        }
        if (input.endDate) {
          customConditions.push(sql`DATE(${customCalendarEvents.eventDate}) <= DATE(${input.endDate})`);
        }
        if (input.assignedTo) {
          customConditions.push(eq(customCalendarEvents.assignedTo, input.assignedTo));
        }

        const rawCustom = await db
          .select({
            id: customCalendarEvents.id,
            title: customCalendarEvents.title,
            description: customCalendarEvents.description,
            eventType: customCalendarEvents.eventType,
            eventDate: sql<string>`DATE_FORMAT(${customCalendarEvents.eventDate}, '%Y-%m-%d')`,
            startTime: customCalendarEvents.startTime,
            endTime: customCalendarEvents.endTime,
            location: customCalendarEvents.location,
            priority: customCalendarEvents.priority,
            status: customCalendarEvents.status,
            assignedToId: customCalendarEvents.assignedTo,
            assignedToName: users.name,
            assignedToRole: users.role,
            requestId: customCalendarEvents.requestId,
            requestNumber: mosqueRequests.requestNumber,
            programType: mosqueRequests.programType,
            mosqueName: mosques.name,
          })
          .from(customCalendarEvents)
          .leftJoin(users, eq(customCalendarEvents.assignedTo, users.id))
          .leftJoin(mosqueRequests, eq(customCalendarEvents.requestId, mosqueRequests.id))
          .leftJoin(mosques, eq(customCalendarEvents.mosqueId, mosques.id))
          .where(customConditions.length > 0 ? and(...customConditions) : sql`1=1`);

        const eventTypeMap: Record<string, string> = {
          meeting: "اجتماع عمل",
          inspection: "معاينة خاصة",
          follow_up: "متابعة دورية",
          task: "مهمة ميدانية",
          custom: "حدث مخصص",
          other: "أخرى",
        };

        for (const c of rawCustom) {
          if (input.programType && c.programType && c.programType !== input.programType) continue;
          if (search) {
            const matchesSearch = 
              c.title?.toLowerCase().includes(search) ||
              c.description?.toLowerCase().includes(search) ||
              c.location?.toLowerCase().includes(search) ||
              c.assignedToName?.toLowerCase().includes(search) ||
              c.requestNumber?.toLowerCase().includes(search);
            if (!matchesSearch) continue;
          }

          unifiedEvents.push({
            id: `custom-${c.id}`,
            rawId: c.id,
            type: "custom",
            typeLabel: eventTypeMap[c.eventType] || "حدث مخصص",
            customCategory: c.eventType,
            title: c.title,
            description: c.description || undefined,
            date: c.eventDate,
            startTime: c.startTime || "09:00",
            endTime: c.endTime || undefined,
            assignedToId: c.assignedToId,
            assignedToName: c.assignedToName || "غير محدد",
            assignedToRole: c.assignedToRole,
            requestId: c.requestId || undefined,
            requestNumber: c.requestNumber || undefined,
            programType: c.programType || undefined,
            mosqueName: c.mosqueName || undefined,
            location: c.location || c.mosqueName || undefined,
            priority: c.priority || "medium",
            status: c.status || "scheduled",
            colorTheme: {
              badgeBg: "bg-blue-100 dark:bg-blue-950/60",
              badgeText: "text-blue-800 dark:text-blue-300",
              border: "border-blue-300 dark:border-blue-800",
              dot: "bg-blue-600 dark:bg-blue-400",
              gradient: "from-blue-500 to-cyan-600",
            },
            linkUrl: c.requestId ? `/requests/${c.requestId}` : undefined,
          });
        }
      }

      // Sort by date ASC, then time ASC
      unifiedEvents.sort((a, b) => {
        const dateCompare = (a.date || "").localeCompare(b.date || "");
        if (dateCompare !== 0) return dateCompare;
        return (a.startTime || "00:00").localeCompare(b.startTime || "00:00");
      });

      return unifiedEvents;
    }),

  // 2. إنشاء حدث مخصص جديد
  createCustomEvent: protectedProcedure
    .input(
      z.object({
        title: z.string().min(2, "عنوان الحدث مطلوب"),
        description: z.string().optional(),
        eventType: z.string().default("custom"),
        eventDate: z.string(), // YYYY-MM-DD
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        assignedTo: z.number().optional().nullable(),
        requestId: z.number().optional().nullable(),
        mosqueId: z.number().optional().nullable(),
        location: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [result] = await db.insert(customCalendarEvents).values({
        title: input.title,
        description: input.description || null,
        eventType: input.eventType || "custom",
        eventDate: new Date(input.eventDate),
        startTime: input.startTime || null,
        endTime: input.endTime || null,
        assignedTo: input.assignedTo || null,
        requestId: input.requestId || null,
        mosqueId: input.mosqueId || null,
        location: input.location || null,
        priority: input.priority || "medium",
        status: "scheduled",
        createdBy: ctx.user.id,
      });

      // إرسال إشعار للموظف المسند إليه إذا وجد
      if (input.assignedTo && input.assignedTo !== ctx.user.id) {
        await createNotification({
          userId: input.assignedTo,
          title: "حدث/مهمة جديدة في التقويم",
          message: `تم إسناد مهمة جديدة إليك: ${input.title} بتاريخ ${input.eventDate}`,
          type: "system",
          relatedType: "calendar_event",
          relatedId: (result as any)?.insertId || 0,
        });
      }

      return { success: true, id: (result as any)?.insertId, message: "تم إضافة الحدث بنجاح" };
    }),

  // 3. تعديل حدث مخصص
  updateCustomEvent: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(2, "عنوان الحدث مطلوب"),
        description: z.string().optional(),
        eventType: z.string().optional(),
        eventDate: z.string(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        assignedTo: z.number().optional().nullable(),
        requestId: z.number().optional().nullable(),
        mosqueId: z.number().optional().nullable(),
        location: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.update(customCalendarEvents).set({
        title: input.title,
        description: input.description || null,
        eventType: input.eventType || "custom",
        eventDate: new Date(input.eventDate),
        startTime: input.startTime || null,
        endTime: input.endTime || null,
        assignedTo: input.assignedTo || null,
        requestId: input.requestId || null,
        mosqueId: input.mosqueId || null,
        location: input.location || null,
        priority: input.priority || "medium",
        status: input.status || "scheduled",
      }).where(eq(customCalendarEvents.id, input.id));

      return { success: true, message: "تم تعديل الحدث بنجاح" };
    }),

  // 4. حذف حدث مخصص
  deleteCustomEvent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.delete(customCalendarEvents).where(eq(customCalendarEvents.id, input.id));
      return { success: true, message: "تم حذف الحدث بنجاح" };
    }),

  // 5. إحصائيات سريعة للتقويم
  getCalendarSummaryStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const todayStr = new Date().toISOString().split("T")[0];

      // عدد الزيارات الميدانية (دمج الجدولين بدون تكرار)
      const [fieldVisitsCount] = await db
        .select({ count: sql<number>`count(DISTINCT fv.requestId)` })
        .from(fieldVisits)
        .where(
          and(
            sql`${fieldVisits.scheduledDate} IS NOT NULL`,
            sql`COALESCE(${fieldVisits.status}, 'scheduled') != 'cancelled'`,
            sql`DATE(${fieldVisits.scheduledDate}) >= DATE(${input.startDate})`,
            sql`DATE(${fieldVisits.scheduledDate}) <= DATE(${input.endDate})`
          )
        );

      const [reqVisitsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(mosqueRequests)
        .where(
          and(
            sql`${mosqueRequests.fieldVisitScheduledDate} IS NOT NULL`,
            sql`DATE(${mosqueRequests.fieldVisitScheduledDate}) >= DATE(${input.startDate})`,
            sql`DATE(${mosqueRequests.fieldVisitScheduledDate}) <= DATE(${input.endDate})`,
            sql`${mosqueRequests.id} NOT IN (SELECT requestId FROM field_visits WHERE scheduledDate IS NOT NULL AND COALESCE(status, 'scheduled') != 'cancelled')`
          )
        );

      // عدد مهام الاستجابة السريعة
      const [quickResponseCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(mosqueRequests)
        .where(
          and(
            eq(mosqueRequests.requestTrack, "quick_response"),
            sql`${mosqueRequests.quickResponseScheduledDate} IS NOT NULL`,
            sql`DATE(${mosqueRequests.quickResponseScheduledDate}) >= DATE(${input.startDate})`,
            sql`DATE(${mosqueRequests.quickResponseScheduledDate}) <= DATE(${input.endDate})`
          )
        );

      // عدد التقارير الختامية
      const [finalReportsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(mosqueRequests)
        .where(
          and(
            sql`${mosqueRequests.finalReportScheduledDate} IS NOT NULL`,
            sql`DATE(${mosqueRequests.finalReportScheduledDate}) >= DATE(${input.startDate})`,
            sql`DATE(${mosqueRequests.finalReportScheduledDate}) <= DATE(${input.endDate})`
          )
        );

      // عدد الأحداث المخصصة
      const [customEventsCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(customCalendarEvents)
        .where(
          and(
            sql`DATE(${customCalendarEvents.eventDate}) >= DATE(${input.startDate})`,
            sql`DATE(${customCalendarEvents.eventDate}) <= DATE(${input.endDate})`
          )
        );

      // مواعيد اليوم
      const [todayField] = await db.select({ count: sql<number>`count(*)` }).from(fieldVisits).where(and(sql`DATE(${fieldVisits.scheduledDate}) = DATE(${todayStr})`, sql`COALESCE(${fieldVisits.status}, 'scheduled') != 'cancelled'`));
      const [todayQuick] = await db.select({ count: sql<number>`count(*)` }).from(mosqueRequests).where(and(eq(mosqueRequests.requestTrack, "quick_response"), sql`DATE(${mosqueRequests.quickResponseScheduledDate}) = DATE(${todayStr})`));
      const [todayFinal] = await db.select({ count: sql<number>`count(*)` }).from(mosqueRequests).where(sql`DATE(${mosqueRequests.finalReportScheduledDate}) = DATE(${todayStr})`);
      const [todayCustom] = await db.select({ count: sql<number>`count(*)` }).from(customCalendarEvents).where(sql`DATE(${customCalendarEvents.eventDate}) = DATE(${todayStr})`);

      const vCount = Number(fieldVisitsCount?.count || 0) + Number(reqVisitsCount?.count || 0);
      const qCount = Number(quickResponseCount?.count || 0);
      const fCount = Number(finalReportsCount?.count || 0);
      const cCount = Number(customEventsCount?.count || 0);
      const tCount = Number(todayField?.count || 0) + Number(todayQuick?.count || 0) + Number(todayFinal?.count || 0) + Number(todayCustom?.count || 0);

      return {
        fieldVisits: vCount,
        quickResponse: qCount,
        finalReports: fCount,
        customEvents: cCount,
        total: vCount + qCount + fCount + cCount,
        todayCount: tCount,
      };
    }),
});
