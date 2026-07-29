import { z } from "zod";
import { eq, desc, and, sql, or, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { permissionProcedure, checkPermission } from "../permissions";
import { getDb } from "../db";
import { progressReports, projects, users } from "../../drizzle/schema";
import { notifyProgressReportCreation, notifyProgressReportApproval } from "./notifications";

const parseDateInput = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

export const progressReportsRouter = router({
  // قائمة تقارير الإنجاز
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        status: z.enum(["draft", "submitted", "reviewed", "approved"]).optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasView = await checkPermission(ctx.user.id, "progress_reports.view");
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!isAdmin && !hasView && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض قائمة تقارير الإنجاز" });
      }

      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      
      if (input?.projectId) {
        conditions.push(eq(progressReports.projectId, input.projectId));
      }
      if (input?.status) {
        conditions.push(eq(progressReports.status, input.status));
      }
      if (input?.search) {
        const searchPattern = `%${input.search}%`;
        conditions.push(
          or(
            like(progressReports.reportNumber, searchPattern),
            like(progressReports.title, searchPattern),
            like(projects.name, searchPattern)
          )
        );
      }

      const reports = await db
        .select({
          id: progressReports.id,
          reportNumber: progressReports.reportNumber,
          projectId: progressReports.projectId,
          title: progressReports.title,
          reportDate: progressReports.reportDate,
          reportPeriodStart: progressReports.reportPeriodStart,
          reportPeriodEnd: progressReports.reportPeriodEnd,
          overallProgress: progressReports.overallProgress,
          plannedProgress: progressReports.plannedProgress,
          actualProgress: progressReports.actualProgress,
          variance: progressReports.variance,
          status: progressReports.status,
          createdAt: progressReports.createdAt,
          budgetSpent: progressReports.budgetSpent,
          workSummary: progressReports.workSummary,
          challenges: progressReports.challenges,
          nextSteps: progressReports.nextSteps,
          recommendations: progressReports.recommendations,
          milestones: progressReports.milestones,
          attachments: sql<any>`(CASE WHEN ${progressReports.attachments} IS NOT NULL THEN JSON_EXTRACT(${progressReports.attachments}, '$') ELSE NULL END)`,
          photos: sql<any>`(CASE WHEN ${progressReports.photos} IS NOT NULL THEN JSON_EXTRACT(${progressReports.photos}, '$') ELSE NULL END)`,
          projectName: projects.name,
          createdByName: users.name,
        })
        .from(progressReports)
        .leftJoin(projects, eq(progressReports.projectId, projects.id))
        .leftJoin(users, eq(progressReports.createdBy, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(progressReports.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return reports;
    }),

  // تفاصيل تقرير
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasView = await checkPermission(ctx.user.id, "progress_reports.view");
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!isAdmin && !hasView && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض تفاصيل تقرير الإنجاز" });
      }

      const db = await getDb();
      if (!db) return null;

      const [report] = await db
        .select({
          id: progressReports.id,
          reportNumber: progressReports.reportNumber,
          projectId: progressReports.projectId,
          title: progressReports.title,
          reportDate: progressReports.reportDate,
          reportPeriodStart: progressReports.reportPeriodStart,
          reportPeriodEnd: progressReports.reportPeriodEnd,
          overallProgress: progressReports.overallProgress,
          plannedProgress: progressReports.plannedProgress,
          actualProgress: progressReports.actualProgress,
          variance: progressReports.variance,
          workSummary: progressReports.workSummary,
          challenges: progressReports.challenges,
          nextSteps: progressReports.nextSteps,
          recommendations: progressReports.recommendations,
          budgetSpent: progressReports.budgetSpent,
          budgetRemaining: progressReports.budgetRemaining,
          milestones: progressReports.milestones,
          attachments: progressReports.attachments,
          photos: progressReports.photos,
          status: progressReports.status,
          reviewNotes: progressReports.reviewNotes,
          createdAt: progressReports.createdAt,
          projectName: projects.name,
          createdByName: users.name,
        })
        .from(progressReports)
        .leftJoin(projects, eq(progressReports.projectId, projects.id))
        .leftJoin(users, eq(progressReports.createdBy, users.id))
        .where(eq(progressReports.id, input.id));

      return report;
    }),

  // إنشاء تقرير جديد
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().optional(),
        reportDate: z.union([z.string(), z.date()]),
        reportPeriodStart: z.union([z.string(), z.date(), z.null()]).optional(),
        reportPeriodEnd: z.union([z.string(), z.date(), z.null()]).optional(),
        overallProgress: z.preprocess((v) => Math.min(100, Math.max(0, Number(v) || 0)), z.number()).default(0),
        plannedProgress: z.preprocess((v) => Math.min(100, Math.max(0, Number(v) || 0)), z.number()).default(0),
        actualProgress: z.preprocess((v) => Math.min(100, Math.max(0, Number(v) || 0)), z.number()).default(0),
        workSummary: z.string().optional(),
        challenges: z.string().optional(),
        nextSteps: z.string().optional(),
        recommendations: z.string().optional(),
        budgetSpent: z.string().optional(),
        budgetRemaining: z.string().optional(),
        milestones: z.string().optional(),
        attachments: z.string().optional(),
        photos: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasAdd = await checkPermission(ctx.user.id, "progress_reports.add");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.create");

      if (!isAdmin && !hasAdd && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإنشاء تقرير إنجاز" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // توليد رقم التقرير
        const year = new Date().getFullYear();
        const [countResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(progressReports);
        const sequence = (countResult?.count || 0) + 1;
        const reportNumber = `RPT-${year}-${String(sequence).padStart(4, "0")}`;

        // حساب الانحراف
        const variance = input.actualProgress - input.plannedProgress;

        const [result] = await db.insert(progressReports).values({
          reportNumber,
          projectId: input.projectId,
          title: input.title || "",
          reportDate: parseDateInput(input.reportDate) || new Date(),
          reportPeriodStart: parseDateInput(input.reportPeriodStart),
          reportPeriodEnd: parseDateInput(input.reportPeriodEnd),
          overallProgress: input.overallProgress,
          plannedProgress: input.plannedProgress,
          actualProgress: input.actualProgress,
          variance,
          workSummary: input.workSummary,
          challenges: input.challenges,
          nextSteps: input.nextSteps,
          recommendations: input.recommendations,
          budgetSpent: (input.budgetSpent && input.budgetSpent.trim() !== "") ? input.budgetSpent : "0",
          budgetRemaining: (input.budgetRemaining && input.budgetRemaining.trim() !== "") ? input.budgetRemaining : "0",
          milestones: input.milestones || null,
          attachments: input.attachments || null,
          photos: input.photos ? JSON.stringify(input.photos) : null,
          status: "draft",
          createdBy: ctx.user.id,
        });

        await notifyProgressReportCreation(result.insertId, reportNumber, input.title, input.projectId);

        return { id: result.insertId, reportNumber };
      } catch (error: any) {
        console.error("Error creating progress report:", error);
        if (error.message?.includes("packet for query is too large") || error.code === 'ER_NET_PACKET_TOO_LARGE') {
          throw new Error("حجم المرفقات كبير جداً. تجاوز الحد المسموح لقاعدة البيانات.");
        }
        throw new Error("حدث خطأ أثناء حفظ التقرير: " + (error.message || "خطأ غير معروف"));
      }
    }),

  // تحديث تقرير
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        reportDate: z.union([z.string(), z.date()]).optional(),
        reportPeriodStart: z.union([z.string(), z.date(), z.null()]).optional(),
        reportPeriodEnd: z.union([z.string(), z.date(), z.null()]).optional(),
        overallProgress: z.preprocess((v) => Math.min(100, Math.max(0, Number(v) || 0)), z.number()).optional(),
        plannedProgress: z.preprocess((v) => Math.min(100, Math.max(0, Number(v) || 0)), z.number()).optional(),
        actualProgress: z.preprocess((v) => Math.min(100, Math.max(0, Number(v) || 0)), z.number()).optional(),
        workSummary: z.string().optional(),
        challenges: z.string().optional(),
        nextSteps: z.string().optional(),
        recommendations: z.string().optional(),
        budgetSpent: z.string().optional(),
        budgetRemaining: z.string().optional(),
        milestones: z.string().optional(),
        attachments: z.string().optional(),
        photos: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasEdit = await checkPermission(ctx.user.id, "progress_reports.edit");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.create");

      if (!isAdmin && !hasEdit && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل تقرير إنجاز" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const updateData: any = {};
        
        if (input.title !== undefined) updateData.title = input.title;
        if (input.reportDate !== undefined) {
          const d = parseDateInput(input.reportDate);
          if (d) updateData.reportDate = d;
        }
        if (input.reportPeriodStart !== undefined) {
          updateData.reportPeriodStart = parseDateInput(input.reportPeriodStart);
        }
        if (input.reportPeriodEnd !== undefined) {
          updateData.reportPeriodEnd = parseDateInput(input.reportPeriodEnd);
        }
        if (input.overallProgress !== undefined) updateData.overallProgress = input.overallProgress;
        if (input.plannedProgress !== undefined) updateData.plannedProgress = input.plannedProgress;
        if (input.actualProgress !== undefined) updateData.actualProgress = input.actualProgress;
        if (input.workSummary !== undefined) updateData.workSummary = input.workSummary;
        if (input.challenges !== undefined) updateData.challenges = input.challenges;
        if (input.nextSteps !== undefined) updateData.nextSteps = input.nextSteps;
        if (input.recommendations !== undefined) updateData.recommendations = input.recommendations;
        if (input.budgetSpent !== undefined) updateData.budgetSpent = input.budgetSpent;
        if (input.budgetRemaining !== undefined) updateData.budgetRemaining = input.budgetRemaining;
        if (input.milestones !== undefined) updateData.milestones = input.milestones;
        if (input.attachments !== undefined) updateData.attachments = input.attachments;
        if (input.photos !== undefined) updateData.photos = JSON.stringify(input.photos);

        // حساب الانحراف إذا تم تحديث النسب
        if (input.actualProgress !== undefined && input.plannedProgress !== undefined) {
          updateData.variance = input.actualProgress - input.plannedProgress;
        }

        await db
          .update(progressReports)
          .set(updateData)
          .where(eq(progressReports.id, input.id));

        return { success: true };
      } catch (error: any) {
        console.error("Error updating progress report:", error);
        if (error.message?.includes("packet for query is too large") || error.code === 'ER_NET_PACKET_TOO_LARGE') {
          throw new Error("حجم المرفقات كبير جداً. تجاوز الحد المسموح لقاعدة البيانات.");
        }
        throw new Error("حدث خطأ أثناء تحديث التقرير: " + (error.message || "خطأ غير معروف"));
      }
    }),

  // تقديم التقرير للمراجعة
  submit: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasAdd = await checkPermission(ctx.user.id, "progress_reports.add");
      const hasEdit = await checkPermission(ctx.user.id, "progress_reports.edit");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.create");

      if (!isAdmin && !hasAdd && !hasEdit && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتقديم تقرير الإنجاز" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(progressReports)
        .set({ status: "submitted" })
        .where(eq(progressReports.id, input.id));

      return { success: true };
    }),

  // مراجعة التقرير
  review: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["reviewed", "approved"]),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!isAdmin && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لمراجعة أو اعتماد تقرير الإنجاز" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [report] = await db
        .select({
          reportNumber: progressReports.reportNumber,
          title: progressReports.title,
          projectId: progressReports.projectId,
        })
        .from(progressReports)
        .where(eq(progressReports.id, input.id))
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "تقرير الإنجاز غير موجود" });
      }

      await db
        .update(progressReports)
        .set({
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes,
        })
        .where(eq(progressReports.id, input.id));

      if (input.status === "approved") {
        await notifyProgressReportApproval(input.id, report.reportNumber, report.title, report.projectId);
      }

      return { success: true };
    }),

  // تحديث حالة التقرير
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["draft", "submitted", "reviewed", "approved"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!isAdmin && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتحديث حالة التقرير" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(progressReports)
        .set({ status: input.status })
        .where(eq(progressReports.id, input.id));

      return { success: true };
    }),

  // إحصائيات التقارير
  getStats: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasView = await checkPermission(ctx.user.id, "progress_reports.view");
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!isAdmin && !hasView && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض إحصائيات تقارير الإنجاز" });
      }

      const db = await getDb();
      if (!db) return { total: 0, draft: 0, submitted: 0, reviewed: 0, approved: 0, avgProgress: 0 };

      const conditions = [];
      if (input?.projectId) {
        conditions.push(eq(progressReports.projectId, input.projectId));
      }

      const [stats] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          draft: sql<number>`SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)`,
          submitted: sql<number>`SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END)`,
          reviewed: sql<number>`SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END)`,
          approved: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
          avgProgress: sql<number>`AVG(overallProgress)`,
        })
        .from(progressReports)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        total: stats?.total || 0,
        draft: stats?.draft || 0,
        submitted: stats?.submitted || 0,
        reviewed: stats?.reviewed || 0,
        approved: stats?.approved || 0,
        avgProgress: Math.round(stats?.avgProgress || 0),
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(progressReports).where(eq(progressReports.id, input.id));
      return { success: true };
    }),

  deleteAll: protectedProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(progressReports);
      return { success: true };
    }),

  cleanAndSeed: protectedProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Delete all progress reports
      await db.delete(progressReports);

      // 2. Get active projects
      const activeProjects = await db.select().from(projects).limit(10);
      if (activeProjects.length === 0) {
        return { message: "No projects in database to seed reports for." };
      }

      // Seed 2 semi-monthly reports for the first project (or erdt)
      const targetProj = activeProjects.find(p => p.name.toLowerCase().includes("erdt")) || activeProjects[0];

      // Semi 1: July 1 to July 15
      await db.insert(progressReports).values({
        reportNumber: "RPT-2026-0001",
        projectId: targetProj.id,
        title: `تقرير نصف شهري - ${targetProj.name}`,
        reportDate: new Date("2026-07-15"),
        reportPeriodStart: new Date("2026-07-01"),
        reportPeriodEnd: new Date("2026-07-15"),
        overallProgress: 40,
        plannedProgress: 40,
        actualProgress: 38,
        variance: -2,
        workSummary: "إكمال الأعمال التأسيسية للموقع وصب القواعد الأولى للجدار",
        challenges: "بعض التأخير في توريد الاسمنت الجاهز",
        recommendations: "التنسيق المبكر مع مورد الخرسانة",
        status: "submitted",
      });

      // Semi 2: July 16 to July 31
      await db.insert(progressReports).values({
        reportNumber: "RPT-2026-0002",
        projectId: targetProj.id,
        title: `تقرير نصف شهري - ${targetProj.name}`,
        reportDate: new Date("2026-07-31"),
        reportPeriodStart: new Date("2026-07-16"),
        reportPeriodEnd: new Date("2026-07-31"),
        overallProgress: 60,
        plannedProgress: 60,
        actualProgress: 58,
        variance: -2,
        workSummary: "الانتهاء من أعمال العزل المائي وصب أعمدة الملحق الإضافي",
        challenges: "ارتفاع درجات الحرارة خلال ساعات الظهيرة",
        recommendations: "جدولة ساعات العمل في الفترات الصباحية والمسائية",
        status: "submitted",
      });

      return { message: "Database cleaned and seeded successfully", projectId: targetProj.id, projectName: targetProj.name };
    }),
});
