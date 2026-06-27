import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, inArray } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { finalReports, mosqueRequests, projects, mosques, users, contractsEnhanced, contractPayments, payments } from "../../drizzle/schema";
import { calculateUserPermissions } from "../permissions";

export const finalReportsRouter = router({
  // إنشاء تقرير ختامي جديد
  create: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        projectId: z.number().optional(),
        summary: z.string().min(1, "الملخص مطلوب"),
        achievements: z.string().optional(),
        challenges: z.string().optional(),
        totalCost: z.string().optional(),
        completionDate: z.string().optional(),
        satisfactionRating: z.number().min(1).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود الطلب
      const requestResult = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (requestResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      // التحقق من الصلاحية - الأدوار الأساسية أو صلاحية رفع التقرير الختامي (الاتصال المؤسسي)
      const allowedRoles = ["super_admin", "system_admin", "projects_office", "project_manager"];
      const userPerms = await calculateUserPermissions(ctx.user.id);
      const hasUploadFinalReportPerm = userPerms.includes("requests.upload_final_report");
      const hasIntervenePerm = userPerms.includes("pending_reports.intervene");
      if (!allowedRoles.includes(ctx.user.role) && !hasUploadFinalReportPerm && !hasIntervenePerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لرفع التقرير الختامي" });
      }

      // التحقق من أن الطلب في مرحلة التنفيذ حالياً
      const currentRequest = requestResult[0];
      if (currentRequest.currentStage !== "execution" && currentRequest.currentStage !== "handover") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `لا يمكن رفع تقرير ختامي في المرحلة الحالية (${currentRequest.currentStage}). يجب أن يكون الطلب في مرحلة التنفيذ أو الاستلام.` 
        });
      }

      // البحث عن المشروع المرتبط إن لم يُحدد
      let projectId = input.projectId;
      if (!projectId) {
        const projectResult = await db.select({ id: projects.id }).from(projects)
          .where(eq(projects.requestId, input.requestId)).limit(1);
        if (projectResult.length > 0) {
          projectId = projectResult[0].id;
        }
      }

      // إذا كان الطلب في مرحلة التنفيذ، يجب التحقق من شروط الدفعات قبل الانتقال لمرحلة الاستلام
      if (currentRequest.currentStage === "execution") {
        if (!projectId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لم يتم العثور على مشروع مرتبط بالطلب للتحقق من شروط الدفعات.",
          });
        }

        // 1. جلب العقود
        const projectContracts = await db
          .select({
            id: contractsEnhanced.id,
            amount: contractsEnhanced.contractAmount,
          })
          .from(contractsEnhanced)
          .where(eq(contractsEnhanced.projectId, projectId));

        // 2. جلب الدفعات المجدولة
        const contractIds = projectContracts.map(c => c.id);
        const allContractPayments = contractIds.length > 0
          ? await db.select().from(contractPayments).where(inArray(contractPayments.contractId, contractIds))
          : [];

        // 3. جلب الدفعات اليدوية
        const manualPayments = await db
          .select()
          .from(payments)
          .where(eq(payments.projectId, projectId));

        // 4. توحيد الدفعات وحساب الإجماليات
        const unifiedPayments: { amount: string; status: string }[] = [];
        allContractPayments.forEach(cp => {
          unifiedPayments.push({
            amount: cp.amount,
            status: cp.status === "paid" ? "paid" : "pending"
          });
        });
        manualPayments.forEach(p => {
          unifiedPayments.push({
            amount: p.amount,
            status: p.status || "pending"
          });
        });

        const totalPaymentsSum = unifiedPayments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
        const totalContractsSum = projectContracts.reduce((sum, c) => sum + parseFloat(c.amount || "0"), 0);

        // التحقق من وجود دفعات أولاً
        if (unifiedPayments.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن الانتقال لمرحلة الاستلام: لا توجد دفعات مسجلة للمشروع.",
          });
        }

        // التحقق من أن جميع الدفعات مسددة
        const allPaid = unifiedPayments.every(p => p.status === "paid");
        if (!allPaid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن الانتقال لمرحلة الاستلام: يجب أن تكون جميع الدفعات حالتها 'مسدد'.",
          });
        }

        // التحقق من تساوي إجمالي قيم المدفوعات مع إجمالي قيمة العقد
        if (Math.abs(totalPaymentsSum - totalContractsSum) >= 0.01) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `لا يمكن الانتقال لمرحلة الاستلام: إجمالي قيم المدفوعات (${totalPaymentsSum}) لا يساوي إجمالي قيمة العقد (${totalContractsSum}).`,
          });
        }
      }

      // التحقق من وجود تقرير سابق لهذا الطلب (Upsert Logic)
      const existingReports = await db.select().from(finalReports).where(eq(finalReports.requestId, input.requestId)).limit(1);
      
      if (existingReports.length > 0) {
        const existingReport = existingReports[0];
        // تحديث التقرير الموجود
        await db.update(finalReports).set({
          preparedBy: ctx.user.id,
          summary: input.summary,
          achievements: input.achievements || null,
          challenges: input.challenges || null,
          totalCost: input.totalCost || null,
          completionDate: input.completionDate ? new Date(input.completionDate) : null,
          satisfactionRating: input.satisfactionRating || null,
          updatedAt: new Date(),
        }).where(eq(finalReports.id, existingReport.id));

        return { success: true, reportId: existingReport.id, updated: true, message: "تم تحديث التقرير الختامي بنجاح" };
      }

      // إنشاء تقرير جديد
      const [result] = await db.insert(finalReports).values({
        requestId: input.requestId,
        projectId: projectId || null,
        preparedBy: ctx.user.id,
        summary: input.summary,
        achievements: input.achievements || null,
        challenges: input.challenges || null,
        totalCost: input.totalCost || null,
        completionDate: input.completionDate ? new Date(input.completionDate) : null,
        satisfactionRating: input.satisfactionRating || null,
      });

      // الانتقال للمرحلة handover تلقائياً (فقط إذا كان في مرحلة execution)
      if (currentRequest.currentStage === "execution") {
        await db.update(mosqueRequests).set({
          currentStage: "handover",
          currentResponsibleDepartment: "مكتب المشاريع",
        }).where(eq(mosqueRequests.id, input.requestId));
      }

      return { success: true, reportId: result.insertId, updated: false, message: "تم رفع التقرير الختامي بنجاح" };
    }),

  // جلب التقارير الختامية لطلب معين
  getByRequestId: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(finalReports)
        .where(eq(finalReports.requestId, input.requestId))
        .orderBy(desc(finalReports.createdAt));
    }),

  // جلب تقرير ختامي بالمعرف مع تفاصيل كاملة
  getWithDetails: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const reportResult = await db.select().from(finalReports)
        .where(eq(finalReports.id, input.reportId)).limit(1);
      if (reportResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "التقرير غير موجود" });
      }
      const report = reportResult[0];

      // جلب بيانات الطلب
      const requestResult = await db.select().from(mosqueRequests)
        .where(eq(mosqueRequests.id, report.requestId)).limit(1);
      const request = requestResult[0] || null;

      // جلب بيانات المسجد
      let mosque = null;
      if (request?.mosqueId) {
        const mosqueResult = await db.select().from(mosques)
          .where(eq(mosques.id, request.mosqueId)).limit(1);
        mosque = mosqueResult[0] || null;
      }

      // جلب بيانات المشروع
      let project = null;
      if (report.projectId) {
        const projectResult = await db.select().from(projects)
          .where(eq(projects.id, report.projectId)).limit(1);
        project = projectResult[0] || null;
      }

      // جلب بيانات المُعِد
      const preparedByResult = report.preparedBy
        ? await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
          }).from(users).where(eq(users.id, report.preparedBy)).limit(1)
        : [];
      const preparedBy = preparedByResult[0] || null;

      return { report, request, mosque, project, preparedBy };
    }),

  // جلب جميع التقارير الختامية
  list: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(finalReports)
        .orderBy(desc(finalReports.createdAt))
        .limit(100);
    }),
});
