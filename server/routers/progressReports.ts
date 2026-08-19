import { z } from "zod";
import { eq, desc, and, sql, or, like, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { permissionProcedure, checkPermission } from "../permissions";
import { getDb } from "../db";
import { progressReports, projects, users } from "../../drizzle/schema";
import { notifyProgressReportCreation, notifyProgressReportApproval, createNotification } from "./notifications";

const parseDateInput = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }
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
        status: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasView = await checkPermission(ctx.user.id, "progress_reports.view") || await checkPermission(ctx.user.id, "project_reports.view") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!isAdmin && !hasView && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض قائمة تقارير المشاريع" });
      }

      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      
      if (input?.projectId) {
        conditions.push(eq(progressReports.projectId, input.projectId));
      }
      if (input?.status && input.status !== "all") {
        conditions.push(eq(progressReports.status, input.status as any));
      }
      if (input?.search) {
        const searchPattern = `%${input.search.toLowerCase()}%`;
        conditions.push(
          or(
            like(sql`LOWER(${progressReports.reportNumber})`, searchPattern),
            like(sql`LOWER(${progressReports.title})`, searchPattern),
            like(sql`LOWER(${projects.name})`, searchPattern)
          )
        );
      }

      const reviewerUser = alias(users, "reviewerUser");

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
          createdBy: progressReports.createdBy,
          createdByName: users.name,
          reviewedBy: progressReports.reviewedBy,
          reviewedByName: reviewerUser.name,
          reviewedAt: progressReports.reviewedAt,
          reviewNotes: progressReports.reviewNotes,
        })
        .from(progressReports)
        .leftJoin(projects, eq(progressReports.projectId, projects.id))
        .leftJoin(users, eq(progressReports.createdBy, users.id))
        .leftJoin(reviewerUser, eq(progressReports.reviewedBy, reviewerUser.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(
          sql`CASE 
            WHEN ${progressReports.status} = 'pending_executive' THEN 0
            WHEN ${progressReports.status} = 'pending' THEN 1
            WHEN ${progressReports.status} = 'submitted' THEN 1
            WHEN ${progressReports.status} = 'draft' THEN 2
            ELSE 3
          END ASC`,
          desc(progressReports.createdAt)
        )
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return reports;
    }),

  // تفاصيل تقرير
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasView = await checkPermission(ctx.user.id, "progress_reports.view") || await checkPermission(ctx.user.id, "project_reports.view") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!isAdmin && !hasView && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض تفاصيل تقرير المشاريع" });
      }

      const db = await getDb();
      if (!db) return null;

      const reviewerUser = alias(users, "reviewerUser");

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
          createdBy: progressReports.createdBy,
          createdByName: users.name,
          reviewedBy: progressReports.reviewedBy,
          reviewedByName: reviewerUser.name,
          reviewedAt: progressReports.reviewedAt,
          reviewNotes: progressReports.reviewNotes,
          createdAt: progressReports.createdAt,
          projectName: projects.name,
        })
        .from(progressReports)
        .leftJoin(projects, eq(progressReports.projectId, projects.id))
        .leftJoin(users, eq(progressReports.createdBy, users.id))
        .leftJoin(reviewerUser, eq(progressReports.reviewedBy, reviewerUser.id))
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
        status: z.enum(["draft", "pending", "pending_executive", "submitted", "reviewed", "approved", "rejected"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasAdd = await checkPermission(ctx.user.id, "progress_reports.add") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.create");

      if (!isAdmin && !hasAdd && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإنشاء تقرير مشاريع" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // توليد رقم التقرير بشكل فريد ودقيق
        const year = new Date().getFullYear();
        const prefix = `RPT-${year}-`;
        const [lastReport] = await db
          .select({ reportNumber: progressReports.reportNumber })
          .from(progressReports)
          .where(like(progressReports.reportNumber, `${prefix}%`))
          .orderBy(desc(progressReports.reportNumber))
          .limit(1);

        let sequence = 1;
        if (lastReport && lastReport.reportNumber) {
          const parts = lastReport.reportNumber.split("-");
          const lastSeq = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
          }
        }
        const reportNumber = `${prefix}${String(sequence).padStart(4, "0")}`;

        // حساب الانحراف
        const variance = input.actualProgress - input.plannedProgress;

        const initialStatus = input.status || "pending";

        const [result] = await db.insert(progressReports).values({
          reportNumber,
          projectId: input.projectId,
          title: input.title || `تقرير متابعة - ${reportNumber}`,
          reportDate: parseDateInput(input.reportDate) || new Date(),
          reportPeriodStart: parseDateInput(input.reportPeriodStart) || null,
          reportPeriodEnd: parseDateInput(input.reportPeriodEnd) || null,
          overallProgress: input.overallProgress ?? 0,
          plannedProgress: input.plannedProgress ?? 0,
          actualProgress: input.actualProgress ?? 0,
          variance,
          workSummary: input.workSummary || null,
          challenges: input.challenges || null,
          nextSteps: input.nextSteps || null,
          recommendations: input.recommendations || null,
          budgetSpent: (input.budgetSpent && input.budgetSpent.trim() !== "") ? input.budgetSpent : "0",
          budgetRemaining: (input.budgetRemaining && input.budgetRemaining.trim() !== "") ? input.budgetRemaining : "0",
          milestones: input.milestones || null,
          attachments: input.attachments || null,
          photos: input.photos ? JSON.stringify(input.photos) : null,
          status: initialStatus,
          createdBy: ctx.user.id,
        });

        await notifyProgressReportCreation(result.insertId, reportNumber, input.title || "", input.projectId);

        return { id: result.insertId, reportNumber, status: initialStatus };
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
      const hasEdit = await checkPermission(ctx.user.id, "progress_reports.edit") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.create");

      if (!isAdmin && !hasEdit && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل تقرير مشاريع" });
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
          updateData.reportPeriodStart = parseDateInput(input.reportPeriodStart) || null;
        }
        if (input.reportPeriodEnd !== undefined) {
          updateData.reportPeriodEnd = parseDateInput(input.reportPeriodEnd) || null;
        }
        if (input.overallProgress !== undefined) updateData.overallProgress = input.overallProgress;
        if (input.plannedProgress !== undefined) updateData.plannedProgress = input.plannedProgress;
        if (input.actualProgress !== undefined) updateData.actualProgress = input.actualProgress;
        if (input.workSummary !== undefined) updateData.workSummary = input.workSummary || null;
        if (input.challenges !== undefined) updateData.challenges = input.challenges || null;
        if (input.nextSteps !== undefined) updateData.nextSteps = input.nextSteps || null;
        if (input.recommendations !== undefined) updateData.recommendations = input.recommendations || null;
        if (input.budgetSpent !== undefined) updateData.budgetSpent = input.budgetSpent || "0";
        if (input.budgetRemaining !== undefined) updateData.budgetRemaining = input.budgetRemaining || "0";
        if (input.milestones !== undefined) updateData.milestones = input.milestones || null;
        if (input.attachments !== undefined) updateData.attachments = input.attachments || null;
        if (input.photos !== undefined) updateData.photos = input.photos ? JSON.stringify(input.photos) : null;

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
      const hasAdd = await checkPermission(ctx.user.id, "progress_reports.add") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasEdit = await checkPermission(ctx.user.id, "progress_reports.edit");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.create");

      if (!isAdmin && !hasAdd && !hasEdit && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتقديم تقرير مشاريع" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(progressReports)
        .set({ status: "pending" })
        .where(eq(progressReports.id, input.id));

      return { success: true };
    }),

  // اعتماد تقرير الإنجاز (سلسلة الاعتماد: المرحلة 1 منشئ التقرير والمرحلة 2 المدير التنفيذي)
  approve: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [report] = await db
        .select({
          id: progressReports.id,
          reportNumber: progressReports.reportNumber,
          title: progressReports.title,
          projectId: progressReports.projectId,
          status: progressReports.status,
          createdBy: progressReports.createdBy,
          reviewNotes: progressReports.reviewNotes,
        })
        .from(progressReports)
        .where(eq(progressReports.id, input.id))
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "تقرير الإنجاز غير موجود" });
      }

      const isSuperAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const isExecDirector = 
        ["general_manager", "executive_director"].includes(ctx.user.role) ||
        (ctx.user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
        (ctx.user as any)?.customRole?.nameEn?.toLowerCase() === "executive director";
      
      const hasApprovePerm = 
        await checkPermission(ctx.user.id, "progress_reports.approve") ||
        await checkPermission(ctx.user.id, "project_reports.create");

      // المرحلة الأولى: اعتماد مُعد التقرير (draft / pending / submitted -> pending_executive)
      if (report.status === "pending" || report.status === "draft" || report.status === "submitted") {
        const isPreparer = report.createdBy === ctx.user.id;
        if (!isPreparer && !isSuperAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "فقط مُعدّ التقرير يمتلك صلاحية اعتماد المرحلة الأولى لتقارير الإنجاز",
          });
        }

        await db
          .update(progressReports)
          .set({
            status: "pending_executive",
            reviewNotes: input.notes || report.reviewNotes,
            updatedAt: new Date(),
          })
          .where(eq(progressReports.id, input.id));

        // إرسال إشعار للمدير التنفيذي
        const executiveUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              inArray(users.role, ["general_manager", "executive_director"]),
              sql`${users.deletedAt} IS NULL`
            )
          );

        for (const execUser of executiveUsers) {
          await createNotification({
            userId: execUser.id,
            title: "تقرير إنجاز بانتظار الاعتماد",
            message: `تم اعتماد تقرير الإنجاز رقم ${report.reportNumber} من قِبَل مُعد التقرير، وهو الآن بانتظار اعتماد المدير التنفيذي`,
            type: "warning",
            relatedType: "progress_report",
            relatedId: input.id,
          });
        }

        return {
          success: true,
          status: "pending_executive",
          message: "تم اعتماد المرحلة الأولى بنجاح من قِبل مُعد التقرير، والتقرير الآن بانتظار اعتماد المدير التنفيذي",
        };
      }

      // المرحلة الثانية: اعتماد المدير التنفيذي (pending_executive / reviewed -> approved)
      if (report.status === "pending_executive" || report.status === "reviewed") {
        if (!isExecDirector && !isSuperAdmin && !hasApprovePerm) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "فقط المدير التنفيذي يمتلك صلاحية اعتماد المرحلة الثانية لتقارير الإنجاز",
          });
        }

        await db
          .update(progressReports)
          .set({
            status: "approved",
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
            reviewNotes: input.notes || report.reviewNotes,
            updatedAt: new Date(),
          })
          .where(eq(progressReports.id, input.id));

        await notifyProgressReportApproval(input.id, report.reportNumber, report.title, report.projectId);

        if (report.createdBy) {
          await createNotification({
            userId: report.createdBy,
            title: "اعتماد تقرير الإنجاز",
            message: `تم اعتماد تقرير الإنجاز رقم ${report.reportNumber} من قِبَل المدير التنفيذي بنجاح`,
            type: "success",
            relatedType: "progress_report",
            relatedId: input.id,
          });
        }

        return {
          success: true,
          status: "approved",
          message: "تم اعتماد تقرير الإنجاز بنجاح من قِبل المدير التنفيذي",
        };
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "حالة تقرير الإنجاز الحالية لا تقبل الاعتماد",
      });
    }),

  // مراجعة التقرير (متوافقة مع الإجراء السابق)
  review: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["draft", "pending", "pending_executive", "submitted", "reviewed", "approved", "rejected"]).optional(),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [report] = await db
        .select({
          id: progressReports.id,
          reportNumber: progressReports.reportNumber,
          title: progressReports.title,
          projectId: progressReports.projectId,
          status: progressReports.status,
          createdBy: progressReports.createdBy,
          reviewNotes: progressReports.reviewNotes,
        })
        .from(progressReports)
        .where(eq(progressReports.id, input.id))
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "تقرير المشاريع غير موجود" });
      }

      const targetStatus = input.status || (
        (report.status === "pending" || report.status === "draft" || report.status === "submitted")
          ? "pending_executive"
          : "approved"
      );

      const isSuperAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const isExecDirector = 
        ["general_manager", "executive_director"].includes(ctx.user.role) ||
        (ctx.user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
        (ctx.user as any)?.customRole?.nameEn?.toLowerCase() === "executive director";
      const hasApprovePerm = await checkPermission(ctx.user.id, "progress_reports.approve") || await checkPermission(ctx.user.id, "project_reports.create");

      if (targetStatus === "pending_executive") {
        const isPreparer = report.createdBy === ctx.user.id;
        if (!isPreparer && !isSuperAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "فقط مُعدّ التقرير يمتلك صلاحية اعتماد المرحلة الأولى لتقارير الإنجاز",
          });
        }
      } else if (targetStatus === "approved") {
        if (!isExecDirector && !isSuperAdmin && !hasApprovePerm) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "فقط المدير التنفيذي يمتلك صلاحية اعتماد المرحلة الثانية لتقارير الإنجاز",
          });
        }
      }

      await db
        .update(progressReports)
        .set({
          status: targetStatus,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes || report.reviewNotes,
          updatedAt: new Date(),
        })
        .where(eq(progressReports.id, input.id));

      if (targetStatus === "approved") {
        await notifyProgressReportApproval(input.id, report.reportNumber, report.title, report.projectId);
      }

      return { success: true, status: targetStatus };
    }),

  // رفض تقرير الإنجاز
  reject: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "يرجى كتابة سبب الرفض"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [report] = await db
        .select()
        .from(progressReports)
        .where(eq(progressReports.id, input.id))
        .limit(1);

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "تقرير الإنجاز غير موجود" });
      }

      const isSuperAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const isPreparer = report.createdBy === ctx.user.id;
      const isExecDirector = 
        ["general_manager", "executive_director"].includes(ctx.user.role) ||
        (ctx.user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
        (ctx.user as any)?.customRole?.nameEn?.toLowerCase() === "executive director";
      const hasApprovePerm = await checkPermission(ctx.user.id, "progress_reports.approve");

      if (!isSuperAdmin && !isPreparer && !isExecDirector && !hasApprovePerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لرفض تقرير الإنجاز" });
      }

      await db
        .update(progressReports)
        .set({
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(progressReports.id, input.id));

      if (report.createdBy && report.createdBy !== ctx.user.id) {
        await createNotification({
          userId: report.createdBy,
          title: "رفض تقرير الإنجاز",
          message: `تم رفض تقرير الإنجاز رقم ${report.reportNumber} لسبب: ${input.reason}`,
          type: "error",
          relatedType: "progress_report",
          relatedId: input.id,
        });
      }

      return { success: true, message: "تم رفض تقرير الإنجاز بنجاح" };
    }),

  // تحديث حالة التقرير
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["draft", "pending", "pending_executive", "submitted", "reviewed", "approved", "rejected"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!isAdmin && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتحديث حالة التقرير" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(progressReports)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(progressReports.id, input.id));

      return { success: true };
    }),

  // إحصائيات التقارير
  getStats: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasView = await checkPermission(ctx.user.id, "progress_reports.view") || await checkPermission(ctx.user.id, "project_reports.view") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!isAdmin && !hasView && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض إحصائيات تقارير المشاريع" });
      }

      const db = await getDb();
      if (!db) return { total: 0, draft: 0, pending: 0, pending_executive: 0, approved: 0, rejected: 0, avgProgress: 0 };

      const conditions = [];
      if (input?.projectId) {
        conditions.push(eq(progressReports.projectId, input.projectId));
      }

      const [stats] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          draft: sql<number>`SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)`,
          pending: sql<number>`SUM(CASE WHEN status IN ('pending', 'submitted') THEN 1 ELSE 0 END)`,
          pending_executive: sql<number>`SUM(CASE WHEN status IN ('pending_executive', 'reviewed') THEN 1 ELSE 0 END)`,
          approved: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
          rejected: sql<number>`SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)`,
          avgProgress: sql<number>`AVG(overallProgress)`,
        })
        .from(progressReports)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        total: stats?.total || 0,
        draft: stats?.draft || 0,
        pending: stats?.pending || 0,
        pending_executive: stats?.pending_executive || 0,
        approved: stats?.approved || 0,
        rejected: stats?.rejected || 0,
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
