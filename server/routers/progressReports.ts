import { z } from "zod";
import { eq, desc, and, sql, or, like, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { checkPermission } from "../permissions";
import { getDb } from "../db";
import { progressReports, projects, users } from "../../drizzle/schema";
import { notifyProgressReportCreation, notifyProgressReportApproval, createNotification } from "./notifications";

const pmUsers = alias(users, "pmUsers");
const appUsers = alias(users, "appUsers");
const mgrUsers = alias(users, "mgrUsers");
const excUsers = alias(users, "excUsers");

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
  // عدد تقارير الإنجاز المعلقة التي تتطلب اعتماد من المستخدم الحالي (مدير المشروع أو المدير التنفيذي)
  getPendingActionCounts: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { pendingReportsCount: 0, hasPendingReports: false };

      const user = ctx.user;
      const userRole = user.role;
      const userEmail = user.email || "";

      const isExecDirector =
        ["general_manager", "executive_director"].includes(userRole) ||
        userEmail === "ceo@manarah.org.sa" ||
        userEmail === "test10@gmail.com" ||
        (user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
        (user as any)?.customRole?.nameEn?.toLowerCase() === "executive director" ||
        (user as any)?.customRole?.nameAr === "الرئيس التنفيذي";

      let pendingReportsCount = 0;

      // 1. المرحلة الأولى: تقارير بانتظار اعتماد مدير المشروع (المستخدم الحالي هو مدير المشروع المحدد في المشروع)
      const [pmPendingReports] = await db
        .select({ value: sql<number>`count(*)` })
        .from(progressReports)
        .innerJoin(projects, eq(progressReports.projectId, projects.id))
        .where(
          and(
            inArray(progressReports.status, ["pending", "submitted", "draft"]),
            eq(projects.managerId, user.id)
          )
        );
      pendingReportsCount += Number(pmPendingReports?.value || 0);

      // 2. المرحلة الثانية: تقارير بانتظار اعتماد المدير التنفيذي
      if (isExecDirector) {
        const [execPendingReports] = await db
          .select({ value: sql<number>`count(*)` })
          .from(progressReports)
          .where(eq(progressReports.status, "pending_executive"));
        pendingReportsCount += Number(execPendingReports?.value || 0);
      }

      return {
        pendingReportsCount,
        hasPendingReports: pendingReportsCount > 0,
      };
    }),

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
      const hasView = await checkPermission(ctx.user.id, "progress_reports.view") || await checkPermission(ctx.user.id, "project_reports.view") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!hasView && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض قائمة تقارير المشاريع" });
      }

      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      
      if (input?.projectId) {
        conditions.push(eq(progressReports.projectId, input.projectId));
      }
      if (input?.status && input.status !== "all") {
        if (input.status === "pending") {
          conditions.push(or(eq(progressReports.status, "pending"), eq(progressReports.status, "submitted")));
        } else {
          conditions.push(eq(progressReports.status, input.status as any));
        }
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

          // بيانات مدير المشروع والاعتمادات
          projectManagerId: projects.managerId,
          projectManagerName: pmUsers.name,
          projectManagerSignatureName: pmUsers.signatureName,
          projectManagerSignatureDepartment: pmUsers.signatureDepartment,
          projectManagerSignatureUrl: pmUsers.signatureUrl,

          managerApprovedBy: progressReports.managerApprovedBy,
          managerApprovedAt: progressReports.managerApprovedAt,

          approvedBy: progressReports.approvedBy,
          approvedAt: progressReports.approvedAt,
          approvalNotes: progressReports.approvalNotes,
          approvedByName: appUsers.name,
          approvedBySignatureName: appUsers.signatureName,
          approvedBySignatureDepartment: appUsers.signatureDepartment,
          approvedBySignatureUrl: appUsers.signatureUrl,

          rejectedBy: progressReports.rejectedBy,
          rejectedAt: progressReports.rejectedAt,
          rejectionReason: progressReports.rejectionReason,

          isException: progressReports.isException,
          exceptionApprovedBy: progressReports.exceptionApprovedBy,

          creatorSignatureName: progressReports.creatorSignatureName,
          creatorSignatureDepartment: progressReports.creatorSignatureDepartment,
          creatorSignatureUrl: progressReports.creatorSignatureUrl,
          showCreatorSignature: progressReports.showCreatorSignature,
          showExecutiveDirectorSignature: progressReports.showExecutiveDirectorSignature,
        })
        .from(progressReports)
        .leftJoin(projects, eq(progressReports.projectId, projects.id))
        .leftJoin(users, eq(progressReports.createdBy, users.id))
        .leftJoin(pmUsers, eq(projects.managerId, pmUsers.id))
        .leftJoin(appUsers, eq(progressReports.approvedBy, appUsers.id))
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
      const hasView = await checkPermission(ctx.user.id, "progress_reports.view") || await checkPermission(ctx.user.id, "project_reports.view") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!isAdmin && !hasView && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض تفاصيل تقرير المشاريع" });
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
          createdBy: progressReports.createdBy,
          createdByName: users.name,
          creatorUserSignatureName: users.signatureName,
          creatorUserSignatureDepartment: users.signatureDepartment,
          creatorUserSignatureUrl: users.signatureUrl,

          // بيانات مدير المشروع والاعتمادات
          projectManagerId: projects.managerId,
          projectManagerName: pmUsers.name,
          projectManagerSignatureName: pmUsers.signatureName,
          projectManagerSignatureDepartment: pmUsers.signatureDepartment,
          projectManagerSignatureUrl: pmUsers.signatureUrl,

          managerApprovedBy: progressReports.managerApprovedBy,
          managerApprovedAt: progressReports.managerApprovedAt,
          managerApprovedByName: mgrUsers.name,
          managerApprovedBySignatureName: mgrUsers.signatureName,
          managerApprovedBySignatureDepartment: mgrUsers.signatureDepartment,
          managerApprovedBySignatureUrl: mgrUsers.signatureUrl,

          approvedBy: progressReports.approvedBy,
          approvedAt: progressReports.approvedAt,
          approvalNotes: progressReports.approvalNotes,
          approvedByName: appUsers.name,
          approvedBySignatureName: appUsers.signatureName,
          approvedBySignatureDepartment: appUsers.signatureDepartment,
          approvedBySignatureUrl: appUsers.signatureUrl,

          rejectedBy: progressReports.rejectedBy,
          rejectedAt: progressReports.rejectedAt,
          rejectionReason: progressReports.rejectionReason,

          isException: progressReports.isException,
          exceptionApprovedBy: progressReports.exceptionApprovedBy,
          exceptionApprovedByName: excUsers.name,
          exceptionApprovedBySignatureName: excUsers.signatureName,
          exceptionApprovedBySignatureDepartment: excUsers.signatureDepartment,
          exceptionApprovedBySignatureUrl: excUsers.signatureUrl,

          creatorSignatureName: progressReports.creatorSignatureName,
          creatorSignatureDepartment: progressReports.creatorSignatureDepartment,
          creatorSignatureUrl: progressReports.creatorSignatureUrl,
          showCreatorSignature: progressReports.showCreatorSignature,
          showExecutiveDirectorSignature: progressReports.showExecutiveDirectorSignature,
        })
        .from(progressReports)
        .leftJoin(projects, eq(progressReports.projectId, projects.id))
        .leftJoin(users, eq(progressReports.createdBy, users.id))
        .leftJoin(pmUsers, eq(projects.managerId, pmUsers.id))
        .leftJoin(appUsers, eq(progressReports.approvedBy, appUsers.id))
        .leftJoin(mgrUsers, eq(progressReports.managerApprovedBy, mgrUsers.id))
        .leftJoin(excUsers, eq(progressReports.exceptionApprovedBy, excUsers.id))
        .where(eq(progressReports.id, input.id));

      if (!report) return null;

      const [defaultExecUser] = await db
        .select({
          id: users.id,
          name: users.name,
          signatureName: users.signatureName,
          signatureDepartment: users.signatureDepartment,
          signatureUrl: users.signatureUrl,
        })
        .from(users)
        .where(
          and(
            inArray(users.role, ["general_manager", "executive_director"]),
            isNull(users.deletedAt)
          )
        )
        .limit(1);

      return {
        ...report,
        defaultExecutiveDirectorUser: defaultExecUser || null,
      };
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
      const hasAdd = await checkPermission(ctx.user.id, "progress_reports.add") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.create");

      if (!hasAdd && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإنشاء تقرير مشاريع" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
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
        const variance = input.actualProgress - input.plannedProgress;

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
          status: "pending",
          createdBy: ctx.user.id,
        });

        await notifyProgressReportCreation(result.insertId, reportNumber, input.title || "", input.projectId);

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
      const hasEdit = await checkPermission(ctx.user.id, "progress_reports.edit") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.create");

      if (!hasEdit && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتعديل تقرير مشاريع" });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [existingReport] = await db
        .select({ status: progressReports.status })
        .from(progressReports)
        .where(eq(progressReports.id, input.id));

      if (existingReport?.status === "pending_executive" || existingReport?.status === "approved" || existingReport?.status === "revoked") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن تعديل تقرير الإنجاز بعد اعتماده أو أثناء انتظار اعتماد المدير التنفيذي",
        });
      }

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
      const hasAdd = await checkPermission(ctx.user.id, "progress_reports.add") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasEdit = await checkPermission(ctx.user.id, "progress_reports.edit");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.create");

      if (!hasAdd && !hasEdit && !hasGeneric) {
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

  // اعتماد التقرير (نظام سلسلة الاعتمادات لمرحلتين)
  approve: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [report] = await db
        .select({
          id: progressReports.id,
          reportNumber: progressReports.reportNumber,
          title: progressReports.title,
          status: progressReports.status,
          projectId: progressReports.projectId,
          approvalNotes: progressReports.approvalNotes,
          createdBy: progressReports.createdBy,
          projectManagerId: projects.managerId,
          projectName: projects.name,
        })
        .from(progressReports)
        .leftJoin(projects, eq(progressReports.projectId, projects.id))
        .where(eq(progressReports.id, input.id));

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "تقرير الإنجاز غير موجود" });
      }

      const isExecDirector =
        ["general_manager", "executive_director"].includes(ctx.user.role) ||
        (ctx.user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
        (ctx.user as any)?.customRole?.nameEn?.toLowerCase() === "executive director";

      const hasApprovePerm = await checkPermission(ctx.user.id, "progress_reports.approve");

      // المرحلة الأولى: اعتماد مدير المشروع (pending / submitted / draft -> pending_executive)
      if (report.status === "pending" || report.status === "submitted" || report.status === "draft") {
        const isProjectManager = report.projectManagerId === ctx.user.id;

        if (!isProjectManager) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "فقط مدير المشروع يمتلك صلاحية اعتماد المرحلة الأولى لتقرير الإنجاز",
          });
        }

        // جلب بيانات توقيع مدير المشروع المنفذ
        const [approverData] = await db
          .select({
            name: users.name,
            signatureName: users.signatureName,
            signatureDepartment: users.signatureDepartment,
            signatureUrl: users.signatureUrl,
          })
          .from(users)
          .where(eq(users.id, ctx.user.id));

        const approverName = approverData?.signatureName || approverData?.name || ctx.user.name || "مدير المشروع";
        const approverDept = approverData?.signatureDepartment || "مدير المشروع";
        const approverSigUrl = approverData?.signatureUrl || null;

        await db
          .update(progressReports)
          .set({
            status: "pending_executive",
            managerApprovedBy: ctx.user.id,
            managerApprovedAt: new Date(),
            creatorSignatureName: approverName,
            creatorSignatureDepartment: approverDept,
            creatorSignatureUrl: approverSigUrl,
            approvalNotes: input.notes || report.approvalNotes,
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
              isNull(users.deletedAt)
            )
          );

        for (const execUser of executiveUsers) {
          await createNotification({
            userId: execUser.id,
            title: "تقرير إنجاز بانتظار الاعتماد النهائي",
            message: `تم اعتماد تقرير الإنجاز رقم ${report.reportNumber} من قِبَل مدير المشروع، وهو الآن بانتظار اعتماد المدير التنفيذي`,
            type: "warning",
            relatedType: "progress_report",
            relatedId: input.id,
          });
        }

        return {
          success: true,
          status: "pending_executive",
          message: "تمت المرحلة الأولى من الاعتماد بنجاح، والتقرير الآن بانتظار اعتماد المدير التنفيذي",
        };
      }

      // المرحلة الثانية: اعتماد المدير التنفيذي فقط (pending_executive -> approved)
      if (report.status === "pending_executive") {
        if (!isExecDirector) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "فقط المدير التنفيذي يمتلك صلاحية اعتماد المرحلة الثانية لتقرير الإنجاز",
          });
        }

        // جلب بيانات توقيع المدير التنفيذي المنفذ للاعتماد
        const [execData] = await db
          .select({
            name: users.name,
            signatureName: users.signatureName,
            signatureDepartment: users.signatureDepartment,
            signatureUrl: users.signatureUrl,
          })
          .from(users)
          .where(eq(users.id, ctx.user.id));

        const execSigName = execData?.signatureName || execData?.name || ctx.user.name || "المدير التنفيذي";
        const execSigDept = execData?.signatureDepartment || "المدير التنفيذي";
        const execSigUrl = execData?.signatureUrl || null;

        await db
          .update(progressReports)
          .set({
            status: "approved",
            approvedBy: ctx.user.id,
            approvedAt: new Date(),
            approvedBySignatureName: execSigName,
            approvedBySignatureDepartment: execSigDept,
            approvedBySignatureUrl: execSigUrl,
            approvalNotes: input.notes || report.approvalNotes,
            updatedAt: new Date(),
          })
          .where(eq(progressReports.id, input.id));

        await notifyProgressReportApproval(input.id, report.reportNumber, report.title || "", report.projectId);

        return {
          success: true,
          status: "approved",
          message: "تم الاعتماد النهائي لتقرير الإنجاز بنجاح من قِبَل المدير التنفيذي",
        };
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "لا يمكن اعتماد التقرير في حالته الحالية",
      });
    }),

  // استثناء اعتماد مدير المشروع (Super Admin ONLY)
  exceptionApprove: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        notes: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const hasExceptionPerm = await checkPermission(ctx.user.id, "progress_reports.exception_approve");

      if (!hasExceptionPerm) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "ليس لديك صلاحية استثناء اعتماد مدير المشروع",
        });
      }

      if (!input.notes || !input.notes.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يرجى توضيح سبب أو مبرر استثناء الاعتماد",
        });
      }

      const [report] = await db
        .select({
          id: progressReports.id,
          reportNumber: progressReports.reportNumber,
          status: progressReports.status,
          projectId: progressReports.projectId,
          projectManagerId: projects.managerId,
        })
        .from(progressReports)
        .leftJoin(projects, eq(progressReports.projectId, projects.id))
        .where(eq(progressReports.id, input.id));

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "تقرير الإنجاز غير موجود" });
      }

      if (report.projectManagerId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن استخدام استثناء الاعتماد إذا كنت أنت مدير المشروع المحدد، يمكنك استخدام زر الاعتماد العادي",
        });
      }

      if (report.status !== "pending" && report.status !== "submitted" && report.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن عمل استثناء اعتماد إلا للتقارير التي في مرحلة اعتماد مدير المشروع",
        });
      }

      const [approverData] = await db
        .select({
          name: users.name,
          signatureName: users.signatureName,
          signatureDepartment: users.signatureDepartment,
          signatureUrl: users.signatureUrl,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id));

      const approverName = approverData?.signatureName || approverData?.name || ctx.user.name || "معتمد الاستثناء";
      const approverDept = approverData?.signatureDepartment || "إدارة النظام";
      const approverSigUrl = approverData?.signatureUrl || null;

      await db
        .update(progressReports)
        .set({
          status: "pending_executive",
          creatorSignatureName: approverName,
          creatorSignatureDepartment: approverDept,
          creatorSignatureUrl: approverSigUrl,
          isException: true,
          exceptionApprovedBy: ctx.user.id,
          approvalNotes: `[مبرر استثناء اعتماد مدير المشروع]: ${input.notes.trim()}`,
          updatedAt: new Date(),
        })
        .where(eq(progressReports.id, input.id));

      const executiveUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            inArray(users.role, ["general_manager", "executive_director"]),
            isNull(users.deletedAt)
          )
        );

      for (const execUser of executiveUsers) {
        await createNotification({
          userId: execUser.id,
          title: "تقرير إنجاز - استثناء اعتماد مدير المشروع",
          message: `تم استخدام استثناء الاعتماد لتقرير الإنجاز رقم ${report.reportNumber} بواسطة (${approverName}) بمبرر: ${input.notes.trim()}`,
          type: "warning",
          relatedType: "progress_report",
          relatedId: input.id,
        });
      }

      return {
        success: true,
        status: "pending_executive",
        message: "تم تنفيذ استثناء الاعتماد بنجاح وتوثيق مبرر الاعتماد واسم وتوقيع المعتمِد",
      };
    }),

  // إلغاء/رفض التقرير
  reject: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "يرجى كتابة سبب الإلغاء/الرفض"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [report] = await db
        .select()
        .from(progressReports)
        .where(eq(progressReports.id, input.id));

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "تقرير الإنجاز غير موجود" });
      }

      await db
        .update(progressReports)
        .set({
          status: "rejected",
          rejectedBy: ctx.user.id,
          rejectedAt: new Date(),
          rejectionReason: input.reason.trim(),
          updatedAt: new Date(),
        })
        .where(eq(progressReports.id, input.id));

      return { success: true, message: "تم إلغاء / رفض التقرير بنجاح" };
    }),

  // إلغاء الاعتماد (تغيير الحالة إلى "revoked" / ملغى اعتماده)
  revokeApproval: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [report] = await db
        .select()
        .from(progressReports)
        .where(eq(progressReports.id, input.id));

      if (!report) {
        throw new TRPCError({ code: "NOT_FOUND", message: "تقرير الإنجاز غير موجود" });
      }

      const isSuperAdmin = ctx.user.role === "super_admin";
      const isExecutiveDirector = ["general_manager", "executive_director"].includes(ctx.user.role);

      const [project] = await db
        .select({ managerId: projects.managerId })
        .from(projects)
        .where(eq(projects.id, report.projectId));

      const isProjectManager = Boolean(
        ctx.user.role === "project_manager" ||
        (project?.managerId && project.managerId === ctx.user.id) ||
        (report.managerApprovedBy && report.managerApprovedBy === ctx.user.id) ||
        (report.createdBy && report.createdBy === ctx.user.id)
      );

      if (report.status !== "pending_executive" && report.status !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن إلغاء اعتماد تقرير غير معتمد.",
        });
      }

      if (!isProjectManager && !isExecutiveDirector && !isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "ليس لديك صلاحية لإلغاء اعتماد هذا التقرير.",
        });
      }

      await db
        .update(progressReports)
        .set({
          status: "revoked",
          rejectionReason: input.reason ? `تم إلغاء الاعتماد: ${input.reason.trim()}` : "تم إلغاء اعتماد التقرير",
          rejectedBy: ctx.user.id,
          rejectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(progressReports.id, input.id));

      return {
        success: true,
        message: "تم إلغاء اعتماد التقرير بنجاح وتغيير حالته إلى (ملغى اعتماده)",
      };
    }),

  // التحكم بإظهار التواقيع في التقرير المطبوع
  updateSignatureVisibility: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        showCreatorSignature: z.boolean().optional(),
        showExecutiveDirectorSignature: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const updateData: any = {};
      if (input.showCreatorSignature !== undefined) updateData.showCreatorSignature = input.showCreatorSignature;
      if (input.showExecutiveDirectorSignature !== undefined) updateData.showExecutiveDirectorSignature = input.showExecutiveDirectorSignature;

      await db
        .update(progressReports)
        .set(updateData)
        .where(eq(progressReports.id, input.id));

      return { success: true };
    }),

  // مراجعة التقرير (للتوافق القائم)
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
      const hasApprove = await checkPermission(ctx.user.id, "progress_reports.approve") || await checkPermission(ctx.user.id, "project_reports.create");
      const hasGeneric = await checkPermission(ctx.user.id, "reports.view");

      if (!isAdmin && !hasApprove && !hasGeneric) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لمراجعة أو اعتماد تقرير مشاريع" });
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
        throw new TRPCError({ code: "NOT_FOUND", message: "تقرير المشاريع غير موجود" });
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
        status: z.string(),
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
        .set({ status: input.status as any })
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
      if (!db) return { total: 0, draft: 0, submitted: 0, reviewed: 0, approved: 0, avgProgress: 0 };

      const conditions = [];
      if (input?.projectId) {
        conditions.push(eq(progressReports.projectId, input.projectId));
      }

      const [stats] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          draft: sql<number>`SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)`,
          submitted: sql<number>`SUM(CASE WHEN status = 'submitted' OR status = 'pending' OR status = 'pending_executive' THEN 1 ELSE 0 END)`,
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

      await db.delete(progressReports);

      const activeProjects = await db.select().from(projects).limit(10);
      if (activeProjects.length === 0) {
        return { message: "No projects in database to seed reports for." };
      }

      const targetProj = activeProjects.find(p => p.name.toLowerCase().includes("erdt")) || activeProjects[0];

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
        status: "pending",
      });

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
        status: "pending",
      });

      return { message: "Database cleaned and seeded successfully", projectId: targetProj.id, projectName: targetProj.name };
    }),
});
