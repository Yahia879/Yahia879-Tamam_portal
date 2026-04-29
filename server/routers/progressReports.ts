import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { progressReports, projects, users } from "../../drizzle/schema";

export const progressReportsRouter = router({
  // قائمة تقارير الإنجاز
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        status: z.enum(["draft", "submitted", "reviewed", "approved"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      
      if (input?.projectId) {
        conditions.push(eq(progressReports.projectId, input.projectId));
      }
      if (input?.status) {
        conditions.push(eq(progressReports.status, input.status));
      }

      const reports = await db
        .select({
          id: progressReports.id,
          reportNumber: progressReports.reportNumber,
          projectId: progressReports.projectId,
          title: progressReports.title,
          reportDate: progressReports.reportDate,
          overallProgress: progressReports.overallProgress,
          plannedProgress: progressReports.plannedProgress,
          actualProgress: progressReports.actualProgress,
          variance: progressReports.variance,
          status: progressReports.status,
          createdAt: progressReports.createdAt,
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
    .query(async ({ input }) => {
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
        title: z.string(),
        reportDate: z.string(),
        reportPeriodStart: z.string().optional(),
        reportPeriodEnd: z.string().optional(),
        overallProgress: z.number().min(0).max(100).default(0),
        plannedProgress: z.number().min(0).max(100).default(0),
        actualProgress: z.number().min(0).max(100).default(0),
        workSummary: z.string().optional(),
        challenges: z.string().optional(),
        nextSteps: z.string().optional(),
        recommendations: z.string().optional(),
        budgetSpent: z.string().optional(),
        budgetRemaining: z.string().optional(),
        photos: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

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
        title: input.title,
        reportDate: new Date(input.reportDate),
        reportPeriodStart: input.reportPeriodStart ? new Date(input.reportPeriodStart) : null,
        reportPeriodEnd: input.reportPeriodEnd ? new Date(input.reportPeriodEnd) : null,
        overallProgress: input.overallProgress,
        plannedProgress: input.plannedProgress,
        actualProgress: input.actualProgress,
        variance,
        workSummary: input.workSummary,
        challenges: input.challenges,
        nextSteps: input.nextSteps,
        recommendations: input.recommendations,
        budgetSpent: input.budgetSpent || "0",
        budgetRemaining: input.budgetRemaining || "0",
        photos: input.photos ? JSON.stringify(input.photos) : null,
        status: "draft",
        createdBy: ctx.user.id,
      });

      return { id: result.insertId, reportNumber };
    }),

  // تحديث تقرير
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        overallProgress: z.number().min(0).max(100).optional(),
        plannedProgress: z.number().min(0).max(100).optional(),
        actualProgress: z.number().min(0).max(100).optional(),
        workSummary: z.string().optional(),
        challenges: z.string().optional(),
        nextSteps: z.string().optional(),
        recommendations: z.string().optional(),
        budgetSpent: z.string().optional(),
        budgetRemaining: z.string().optional(),
        photos: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {};
      
      if (input.title !== undefined) updateData.title = input.title;
      if (input.overallProgress !== undefined) updateData.overallProgress = input.overallProgress;
      if (input.plannedProgress !== undefined) updateData.plannedProgress = input.plannedProgress;
      if (input.actualProgress !== undefined) updateData.actualProgress = input.actualProgress;
      if (input.workSummary !== undefined) updateData.workSummary = input.workSummary;
      if (input.challenges !== undefined) updateData.challenges = input.challenges;
      if (input.nextSteps !== undefined) updateData.nextSteps = input.nextSteps;
      if (input.recommendations !== undefined) updateData.recommendations = input.recommendations;
      if (input.budgetSpent !== undefined) updateData.budgetSpent = input.budgetSpent;
      if (input.budgetRemaining !== undefined) updateData.budgetRemaining = input.budgetRemaining;
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
    }),

  // تقديم التقرير للمراجعة
  submit: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
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
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(progressReports)
        .set({
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes,
        })
        .where(eq(progressReports.id, input.id));

      return { success: true };
    }),

  // إحصائيات التقارير
  getStats: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }).optional())
    .query(async ({ input }) => {
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
});
