import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { projects, projectMosques, projectPhases, contracts, contractsEnhanced, payments, quantitySchedules, quotations, suppliers, mosqueRequests, users, mosques, projectNumberSequence, contractPayments, disbursementRequests, disbursementOrders, requestEvaluations, projectFinancialDetails, receiptVouchers, userPermissions, requestNumberSequence, requestHistory, auditLogs } from "../../drizzle/schema";
import { eq, desc, asc, and, sql, inArray, or, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { checkPermission } from "../permissions";
import { notifyProjectManagerAssigned, notifyQuotationCreation, notifyQuotationApproval } from "./notifications";

// توليد رقم مشروع بمنهجية سنوية
async function generateProjectNumber(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const currentYear = new Date().getFullYear();
  const [existing] = await db.select().from(projectNumberSequence).where(eq(projectNumberSequence.year, currentYear));
  let sequence: number;
  if (existing) {
    sequence = existing.lastSequence + 1;
    await db.update(projectNumberSequence).set({ lastSequence: sequence }).where(eq(projectNumberSequence.year, currentYear));
  } else {
    sequence = 1;
    await db.insert(projectNumberSequence).values({ year: currentYear, lastSequence: sequence });
  }
  return `PRJ-${currentYear}-${String(sequence).padStart(4, "0")}`;
}

// دالة إنشاء رقم طلب فريد للمشروع المباشر
async function generateRequestNumberForProject(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  programType: string = "bunyan"
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = programType.substring(0, 3).toUpperCase();

  const [existing] = await db
    .select()
    .from(requestNumberSequence)
    .where(eq(requestNumberSequence.year, currentYear));

  let sequence: number;
  if (existing) {
    sequence = existing.lastSequence + 1;
    await db
      .update(requestNumberSequence)
      .set({ lastSequence: sequence })
      .where(eq(requestNumberSequence.year, currentYear));
  } else {
    sequence = 1;
    await db.insert(requestNumberSequence).values({
      year: currentYear,
      lastSequence: sequence,
    });
  }
  return `REQ-${currentYear}-${prefix}-${String(sequence).padStart(4, "0")}`;
}

// إعادة تسلسل أرقام سندات القبض لجميع السندات بالترتيب REC-51, REC-52, ... حسب تاريخ/ترتيب الإنشاء (الترقيم يبدأ من 51)
async function resequenceVoucherNumbers(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const START_NUMBER = 51;
  const vouchers = await db
    .select({ id: receiptVouchers.id, voucherNumber: receiptVouchers.voucherNumber })
    .from(receiptVouchers)
    .orderBy(asc(receiptVouchers.id));

  const needsResequence = vouchers.some((v, index) => v.voucherNumber !== `REC-${index + START_NUMBER}`);

  if (needsResequence && vouchers.length > 0) {
    const timestamp = Date.now();
    for (let i = 0; i < vouchers.length; i++) {
      await db
        .update(receiptVouchers)
        .set({ voucherNumber: `TEMP-SEQ-${vouchers[i].id}-${timestamp}` })
        .where(eq(receiptVouchers.id, vouchers[i].id));
    }
    for (let i = 0; i < vouchers.length; i++) {
      await db
        .update(receiptVouchers)
        .set({ voucherNumber: `REC-${i + START_NUMBER}` })
        .where(eq(receiptVouchers.id, vouchers[i].id));
    }
  }

  return `REC-${vouchers.length + START_NUMBER}`;
}

// توليد رقم عقد فريد
function generateContractNumber(): string {
  const prefix = "CON";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// توليد رقم دفعة فريد
function generatePaymentNumber(): string {
  const prefix = "PAY";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// توليد رقم عرض سعر فريد
function generateQuotationNumber(): string {
  const prefix = "QUO";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export const projectsRouter = router({
  // الحصول على جميع المشاريع (للتوافق مع الكود القديم)
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
      limit: z.number().min(1).max(1000).default(100),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { calculateUserPermissions } = await import("../permissions");
      const userPermissions = await calculateUserPermissions(ctx.user.id);

      const isAdmin = ["super_admin", "system_admin", "projects_office", "financial", "financial_manager"].includes(ctx.user.role);
      if (
        !isAdmin &&
        !userPermissions.includes("projects") &&
        !userPermissions.includes("projects.view") &&
        !userPermissions.includes("projects.view_details") &&
        !userPermissions.includes("projects.financials") &&
        !userPermissions.includes("progress_reports.view") &&
        !userPermissions.includes("disbursements.view") &&
        !userPermissions.includes("receipt_vouchers") &&
        !userPermissions.includes("financial_report") &&
        !userPermissions.includes("financial_approval") &&
        !userPermissions.includes("disbursement_requests") &&
        !userPermissions.includes("contracts")
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض سجل المشاريع" });
      }

      const filters = [];
      if (input?.status) {
        filters.push(eq(projects.status, input.status));
      }

      if (ctx.user?.role === "project_manager") {
        filters.push(eq(projects.managerId, ctx.user.id));
      }

      const projectsList = await db
        .select({
          id: projects.id,
          projectNumber: projects.projectNumber,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          budget: sql<string>`COALESCE(${projects.budget}, (SELECT SUM(CAST(totalPrice AS DECIMAL(15,2))) FROM quantity_schedules WHERE projectId = ${projects.id}))`.as('budget'),
          actualCost: projects.actualCost,
          startDate: projects.startDate,
          expectedEndDate: projects.expectedEndDate,
          completionPercentage: projects.completionPercentage,
          plannedProgress: projects.plannedProgress,
          milestones: projects.milestones,
          createdAt: projects.createdAt,
          requestId: projects.requestId,
          managerId: projects.managerId,
          managerName: users.name,
          requestStage: mosqueRequests.currentStage,
          technicalEvalDecision: mosqueRequests.technicalEvalDecision,
          programType: mosqueRequests.programType,
        })
        .from(projects)
        .leftJoin(users, eq(projects.managerId, users.id))
        .leftJoin(mosqueRequests, eq(projects.requestId, mosqueRequests.id))
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(projects.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      // جلب المرحلة النشطة لكل مشروع (أول مرحلة غير مكتملة)
      const projectIds = projectsList.map(p => p.id);
      let phasesMap: Record<number, string> = {};
      if (projectIds.length > 0) {
        const allPhases = await db
          .select({
            projectId: projectPhases.projectId,
            phaseName: projectPhases.phaseName,
            status: projectPhases.status,
            phaseOrder: projectPhases.phaseOrder,
          })
          .from(projectPhases)
          .where(inArray(projectPhases.projectId, projectIds))
          .orderBy(projectPhases.phaseOrder);

        // لكل مشروع، نجد أول مرحلة غير مكتملة
        for (const phase of allPhases) {
          if (!phasesMap[phase.projectId] && phase.status !== 'completed') {
            // إزالة مقدمة "المرحلة X : " للحصول على المسمى فقط
            phasesMap[phase.projectId] = phase.phaseName.replace(/^المرحلة .* : /, "");
          }
        }
      }

      return projectsList.map(p => ({
        ...p,
        currentPhaseName: phasesMap[p.id] || null,
      }));
    }),

  // البحث والفلترة في المشاريع مع Pagination
  search: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      type: z.string().optional(), // 'all' | 'multi' | 'single'
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { calculateUserPermissions } = await import("../permissions");
      const userPermissions = await calculateUserPermissions(ctx.user.id);
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      if (
        !isAdmin &&
        !userPermissions.includes("projects.view") &&
        !userPermissions.includes("projects.view_details") &&
        !userPermissions.includes("projects.financials") &&
        !userPermissions.includes("progress_reports.view") &&
        !userPermissions.includes("disbursements.view")
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض سجل المشاريع" });
      }

      const conditions = [];
      if (ctx.user?.role === "project_manager") {
        conditions.push(eq(projects.managerId, ctx.user.id));
      }
      if (input.type && input.type !== "all") {
        if (input.type === "multi") {
          conditions.push(eq(projects.isMultiMosque, true));
        } else if (input.type === "single") {
          conditions.push(or(eq(projects.isMultiMosque, false), sql`${projects.isMultiMosque} IS NULL`)!);
        }
      }
      if (input.status && input.status !== "all") {
        if (["planning", "in_progress", "on_hold", "completed", "cancelled"].includes(input.status)) {
          conditions.push(eq(projects.status, input.status as any));
        } else {
          // فلترة حسب المرحلة الحالية للمشروع
          const phaseName = input.status;
          conditions.push(sql`EXISTS (
            SELECT 1 FROM project_phases 
            WHERE projectId = ${projects.id} 
            AND status != 'completed' 
            AND phaseName LIKE ${`%${phaseName}%`}
            AND phaseOrder = (
              SELECT MIN(phaseOrder) FROM project_phases 
              WHERE projectId = ${projects.id} AND status != 'completed'
            )
          )`);
        }
      }
      if (input.search) {
        conditions.push(
          or(
            sql`${projects.name} LIKE ${`%${input.search}%`}`,
            sql`${projects.projectNumber} LIKE ${`%${input.search}%`}`
          )!
        );
      }

      const offset = (input.page - 1) * input.limit;

      const projectsList = await db
        .select({
          id: projects.id,
          projectNumber: projects.projectNumber,
          name: projects.name,
          description: projects.description,
          isMultiMosque: projects.isMultiMosque,
          status: projects.status,
          budget: sql<string>`COALESCE(${projects.budget}, (SELECT SUM(CAST(totalPrice AS DECIMAL(15,2))) FROM quantity_schedules WHERE projectId = ${projects.id}))`.as('budget'),
          actualCost: projects.actualCost,
          startDate: projects.startDate,
          expectedEndDate: projects.expectedEndDate,
          actualEndDate: projects.actualEndDate,
          completionPercentage: projects.completionPercentage,
          createdAt: projects.createdAt,
          requestId: projects.requestId,
          managerId: projects.managerId,
          managerName: users.name,
          requestCurrentStage: mosqueRequests.currentStage,
        })
        .from(projects)
        .leftJoin(users, eq(projects.managerId, users.id))
        .leftJoin(mosqueRequests, eq(projects.requestId, mosqueRequests.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(projects.createdAt))
        .limit(input.limit)
        .offset(offset);

      // الحصول على العدد الإجمالي والإحصائيات المفلترة
      // إجمالي الميزانية يحسب فقط للمشاريع التي وصل طلبها لمرحلة التقييم المالي واعتماد العرض أو بعدها
      let statsQuery = db.select({ 
        total: sql<number>`count(*)`,
        inProgress: sql<number>`SUM(CASE WHEN ${projects.status} != 'completed' THEN 1 ELSE 0 END)`,
        completed: sql<number>`SUM(CASE WHEN ${projects.status} = 'completed' THEN 1 ELSE 0 END)`,
        totalBudget: sql<string>`SUM(CASE WHEN ${mosqueRequests.currentStage} IN ('financial_eval_and_approval', 'contracting', 'execution', 'handover', 'closed') THEN COALESCE(CAST(${projects.budget} AS DECIMAL(15,2)), (SELECT SUM(CAST(totalPrice AS DECIMAL(15,2))) FROM quantity_schedules WHERE projectId = ${projects.id})) ELSE 0 END)`
      }).from(projects)
       .leftJoin(mosqueRequests, eq(projects.requestId, mosqueRequests.id));

      if (conditions.length > 0) {
        statsQuery = statsQuery.where(and(...conditions)) as typeof statsQuery;
      }
      const [statsResult] = await statsQuery;
      const total = statsResult?.total || 0;
      const filteredStats = {
        total: statsResult?.total || 0,
        inProgress: statsResult?.inProgress || 0,
        completed: statsResult?.completed || 0,
        totalBudget: statsResult?.totalBudget || "0",
      };

      // جلب المرحلة النشطة لكل مشروع
      const projectIds = projectsList.map(p => p.id);
      let phasesMap: Record<number, string> = {};
      if (projectIds.length > 0) {
        const allPhases = await db
          .select({
            projectId: projectPhases.projectId,
            phaseName: projectPhases.phaseName,
            status: projectPhases.status,
          })
          .from(projectPhases)
          .where(inArray(projectPhases.projectId, projectIds))
          .orderBy(projectPhases.phaseOrder);

        for (const phase of allPhases) {
          if (!phasesMap[phase.projectId] && phase.status !== 'completed') {
            phasesMap[phase.projectId] = phase.phaseName.replace(/^المرحلة .* : /, "");
          }
        }
      }

      return {
        projects: projectsList.map(p => ({
          ...p,
          currentPhaseName: phasesMap[p.id] || null,
        })),
        total,
        stats: filteredStats,
      };
    }),

  // الحصول على مشروع بالتفاصيل
  getById: protectedProcedure
    .input(z.object({ id: z.number(), lightweight: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { calculateUserPermissions } = await import("../permissions");
      const userPermissions = await calculateUserPermissions(ctx.user.id);
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      if (
        !isAdmin &&
        !userPermissions.includes("projects.view") &&
        !userPermissions.includes("projects.view_details") &&
        !userPermissions.includes("projects.financials") &&
        !userPermissions.includes("progress_reports.view") &&
        !userPermissions.includes("disbursements.view")
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض تفاصيل هذا المشروع" });
      }

      let [project] = await db
        .select({
          id: projects.id,
          projectNumber: projects.projectNumber,
          name: projects.name,
          description: projects.description,
          donorName: projects.donorName,
          isMultiMosque: projects.isMultiMosque,
          status: projects.status,
          budget: projects.budget,
          actualCost: projects.actualCost,
          startDate: projects.startDate,
          expectedEndDate: projects.expectedEndDate,
          completionPercentage: projects.completionPercentage,
          plannedProgress: projects.plannedProgress,
          milestones: projects.milestones,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          requestId: projects.requestId,
          managerId: projects.managerId,
          managerName: users.name,
        })
        .from(projects)
        .leftJoin(users, eq(projects.managerId, users.id))
        .where(eq(projects.id, input.id));

      // إذا لم يُعثر على المشروع بالمعرّف المباشر، نحاول البحث عنه عبر رقم الطلب requestId
      if (!project) {
        [project] = await db
          .select({
            id: projects.id,
            projectNumber: projects.projectNumber,
            name: projects.name,
            description: projects.description,
            donorName: projects.donorName,
            isMultiMosque: projects.isMultiMosque,
            status: projects.status,
            budget: projects.budget,
            actualCost: projects.actualCost,
            startDate: projects.startDate,
            expectedEndDate: projects.expectedEndDate,
            completionPercentage: projects.completionPercentage,
            plannedProgress: projects.plannedProgress,
            milestones: projects.milestones,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
            requestId: projects.requestId,
            managerId: projects.managerId,
            managerName: users.name,
          })
          .from(projects)
          .leftJoin(users, eq(projects.managerId, users.id))
          .where(eq(projects.requestId, input.id));
      }

      if (!project) {
        // التحقق مما إذا كان الرقم يتبع لطلب موجود ولكن لم يتحول لمشروع بعد
        const [existingRequest] = await db
          .select({ id: mosqueRequests.id, requestNumber: mosqueRequests.requestNumber, currentStage: mosqueRequests.currentStage })
          .from(mosqueRequests)
          .where(eq(mosqueRequests.id, input.id));

        if (existingRequest) {
          throw new TRPCError({ 
            code: "NOT_FOUND", 
            message: `الطلب رقم (${existingRequest.requestNumber}) لا يزال في مرحلة (${existingRequest.currentStage}) ولم يتم تحويله إلى مشروع بعد.` 
          });
        }

        throw new TRPCError({ code: "NOT_FOUND", message: "المشروع غير موجود" });
      }

      const targetProjectId = project.id;

      // جلب الطلب المرتبط
      const [request] = (input.lightweight || !project.requestId) ? [null] : await db
        .select({
          id: mosqueRequests.id,
          requestNumber: mosqueRequests.requestNumber,
          programType: mosqueRequests.programType,
          currentStage: mosqueRequests.currentStage,
          mosqueName: mosques.name,
          mosqueCity: mosques.city,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(eq(mosqueRequests.id, project.requestId!));

      // جلب مراحل المشروع
      const phases = input.lightweight ? [] : await db
        .select()
        .from(projectPhases)
        .where(eq(projectPhases.projectId, targetProjectId))
        .orderBy(projectPhases.phaseOrder);

      // جلب ملاحظات التقييم الفني من الطلب المرتبط
      const evaluations = (input.lightweight || !project.requestId) ? [] : await db
        .select({
          id: requestEvaluations.id,
          decision: requestEvaluations.decision,
          justification: requestEvaluations.justification,
          notes: requestEvaluations.notes,
          createdAt: requestEvaluations.createdAt,
          userName: users.name,
        })
        .from(requestEvaluations)
        .leftJoin(users, eq(requestEvaluations.userId, users.id))
        .where(eq(requestEvaluations.requestId, project.requestId!))
        .orderBy(desc(requestEvaluations.createdAt));

      // جلب العقود (من جدول contracts_enhanced)
      const projectContracts = await db
        .select({
          id: contractsEnhanced.id,
          contractNumber: contractsEnhanced.contractNumber,
          contractType: contractsEnhanced.contractType,
          amount: contractsEnhanced.contractAmount,
          status: contractsEnhanced.status,
          startDate: contractsEnhanced.startDate,
          endDate: contractsEnhanced.endDate,
          supplierName: contractsEnhanced.secondPartyName,
        })
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.projectId, targetProjectId));

      const contractIds = projectContracts.map(c => c.id);

      // جلب دفعات العقود
      const allContractPayments = contractIds.length > 0 
        ? await db.select().from(contractPayments).where(inArray(contractPayments.contractId, contractIds))
        : [];

      // جلب طلبات الصرف
      const projectDisbursements = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.projectId, targetProjectId))
        .orderBy(desc(disbursementRequests.createdAt));

      // جلب أوامر الصرف المرتبطة بطلبات الصرف لهذا المشروع
      const disbIds = projectDisbursements.map(d => d.id);
      const projectOrders = disbIds.length > 0
        ? await db.select().from(disbursementOrders).where(inArray(disbursementOrders.disbursementRequestId, disbIds))
        : [];

      // جلب الدفعات اليدوية
      const manualPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.projectId, targetProjectId))
        .orderBy(desc(payments.createdAt));

      const toLocalDateString = (d: any): string => {
        if (!d) return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        if (typeof d === 'string') {
          const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (match) return `${match[1]}-${match[2]}-${match[3]}`;
        }
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // توحيد الدفعات
      const unifiedPayments: any[] = [];

      // 1. إضافة دفعات العقود المجدولة
      allContractPayments.forEach(cp => {
        const linkedDisb = projectDisbursements.find(d => d.contractPaymentId === cp.id);
        const linkedOrder = linkedDisb ? projectOrders.find(o => o.disbursementRequestId === linkedDisb.id) : null;
        const rawDate = linkedOrder?.executedAt || linkedDisb?.dateMiladi || cp.dueDate || cp.createdAt;

        // حالة الدفعة تصبح "مسدد" (paid) فقط عندما يكون أمر الصرف المرتبط بحالة "منفذ" (executed)
        let paymentStatus = "pending";
        let paidAtDate = null;

        if ((linkedOrder as any)?.status === "executed") {
          paymentStatus = "paid";
          paidAtDate = linkedOrder?.executedAt || cp.paidAt;
        } else if (cp.status === "paid" && (!linkedDisb || (linkedDisb as any).status === "paid") && (!linkedOrder || (linkedOrder as any).status === "executed")) {
          paymentStatus = "paid";
          paidAtDate = cp.paidAt;
        } else if ((linkedOrder as any)?.status === "approved" || (linkedDisb as any)?.status === "approved" || (linkedDisb as any)?.status === "pending" || (linkedDisb as any)?.status === "pending_executive" || (cp as any).status === "due") {
          paymentStatus = "due";
        } else {
          paymentStatus = cp.status === "paid" ? "paid" : "pending";
        }

        unifiedPayments.push({
          id: `cp-${cp.id}`,
          paymentNumber: `PLAN-${cp.id}`,
          paymentType: cp.phaseOrder === 1 ? "advance" : "progress",
          amount: cp.amount,
          status: paymentStatus,
          description: cp.phaseName,
          date: toLocalDateString(rawDate),
          paidAt: paidAtDate ? toLocalDateString(paidAtDate) : null,
          source: "contract",
          workDescription: cp.notes,
          completionPercentage: cp.completionPercentage || 0,
          contractId: cp.contractId,
        });
      });

      // 2. إضافة الدفعات اليدوية
      manualPayments.forEach(p => {
        const linkedDisb = projectDisbursements.find(d => d.paymentId === p.id);
        const linkedOrder = linkedDisb ? projectOrders.find(o => o.disbursementRequestId === linkedDisb.id) : null;
        const rawDate = linkedOrder?.executedAt || linkedDisb?.dateMiladi || p.createdAt;

        let paymentStatus = "pending";
        let paidAtDate = null;

        if ((linkedOrder as any)?.status === "executed") {
          paymentStatus = "paid";
          paidAtDate = linkedOrder?.executedAt || p.paidAt;
        } else if (p.status === "paid" && (!linkedDisb || (linkedDisb as any).status === "paid") && (!linkedOrder || (linkedOrder as any).status === "executed")) {
          paymentStatus = "paid";
          paidAtDate = p.paidAt;
        } else if ((linkedOrder as any)?.status === "approved" || (linkedDisb as any)?.status === "approved" || (linkedDisb as any)?.status === "pending" || (linkedDisb as any)?.status === "pending_executive" || (p as any).status === "due") {
          paymentStatus = "due";
        } else {
          paymentStatus = p.status === "paid" ? "paid" : "pending";
        }

        unifiedPayments.push({
          id: `manual-${p.id}`,
          paymentNumber: p.paymentNumber,
          paymentType: p.paymentType,
          amount: p.amount,
          status: paymentStatus,
          description: p.description,
          date: toLocalDateString(rawDate),
          paidAt: paidAtDate ? toLocalDateString(paidAtDate) : null,
          source: "manual",
          workDescription: p.description,
          completionPercentage: p.completionPercentage || 0,
        });
      });

      // جلب جداول الكميات
      const boq = await db
        .select()
        .from(quantitySchedules)
        .where(eq(quantitySchedules.projectId, targetProjectId));

      // جلب عروض الأسعار
      const projectQuotations = await db
        .select({
          id: quotations.id,
          quotationNumber: quotations.quotationNumber,
          totalAmount: quotations.totalAmount,
          status: quotations.status,
          validUntil: quotations.validUntil,
          supplierName: suppliers.name,
          createdAt: quotations.createdAt,
        })
        .from(quotations)
        .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .where(eq(quotations.projectId, targetProjectId));

      // جلب المساجد المشمولة في حالة المشاريع المباشرة لعدة مساجد
      const linkedMosques = await db
        .select({
          id: projectMosques.id,
          mosqueId: projectMosques.mosqueId,
          allocatedBudget: projectMosques.allocatedBudget,
          notes: projectMosques.notes,
          mosqueName: mosques.name,
          mosqueCity: mosques.city,
          mosqueDistrict: mosques.district,
          imamName: mosques.imamName,
          imamPhone: mosques.imamPhone,
        })
        .from(projectMosques)
        .leftJoin(mosques, eq(projectMosques.mosqueId, mosques.id))
        .where(eq(projectMosques.projectId, targetProjectId));

      return {
        ...project,
        request,
        phases,
        evaluations,
        contracts: input.lightweight ? [] : projectContracts,
        payments: unifiedPayments,
        boq,
        quotations: projectQuotations,
        linkedMosques,
      };
    }),

  // إنشاء مشروع من طلب معتمد
  createFromRequest: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      budget: z.number().optional(),
      managerId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود الطلب
      const [request] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId));

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      // التحقق من عدم وجود مشروع مرتبط بالطلب
      const [existingProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.requestId, input.requestId));

      if (existingProject) {
        throw new TRPCError({ code: "CONFLICT", message: "يوجد مشروع مرتبط بهذا الطلب بالفعل" });
      }

      const projectNumber = await generateProjectNumber(db);

      const [newProject] = await db.insert(projects).values({
        projectNumber,
        requestId: input.requestId,
        name: input.name,
        description: input.description,
        budget: input.budget?.toString(),
        managerId: input.managerId,
        status: "planning",
        completionPercentage: 17, // 1/6 تقريبا
      });

      // إنشاء المراحل الافتراضية
      const defaultPhases = [
        { phaseName: "المرحلة الأولى : الإنشاء والتخطيط", phaseOrder: 1 },
        { phaseName: "المرحلة الثانية : إعداد جدول الكميات", phaseOrder: 2 },
        { phaseName: "المرحلة الثالثة : اعتماد عرض السعر المناسب", phaseOrder: 3 },
        { phaseName: "المرحلة الرابعة : التعاقد", phaseOrder: 4 },
        { phaseName: "المرحلة الخامسة : صرف المدفوعات", phaseOrder: 5 },
        { phaseName: "المرحلة السادسة : المراجعة والإغلاق", phaseOrder: 6 },
      ];

      for (const phase of defaultPhases) {
        await db.insert(projectPhases).values({
          projectId: newProject.insertId,
          phaseName: phase.phaseName,
          phaseOrder: phase.phaseOrder,
          completionPercentage: phase.phaseOrder === 1 ? 100 : 0,
          status: phase.phaseOrder === 1 ? "completed" : (phase.phaseOrder === 2 ? "in_progress" : "pending"),
        });
      }

      // تحديث حالة الطلب
      await db
        .update(mosqueRequests)
        .set({ status: "in_progress", currentStage: "execution" })
        .where(eq(mosqueRequests.id, input.requestId));

      // إرسال إشعار لمدير المشروع إذا تم تعيينه عند الإنشاء
      if (input.managerId) {
        try {
          await notifyProjectManagerAssigned(
            newProject.insertId,
            projectNumber,
            input.name,
            input.managerId
          );
        } catch (error) {
          console.error("Failed to send project manager assignment notification on create:", error);
        }
      }

      return {
        projectId: newProject.insertId,
        projectNumber,
      };
    }),

  // تحديث مشروع
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["planning", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
      budget: z.number().optional(),
      actualCost: z.number().optional(),
      completionPercentage: z.number().min(0).max(100).optional(),
      managerId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, ...updateData } = input;

      // جلب مدير المشروع الحالي واسم المشروع وتفاصيله قبل التحديث
      const [oldProject] = await db
        .select({
          managerId: projects.managerId,
          name: projects.name,
          projectNumber: projects.projectNumber,
        })
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);
      
      const updateValues: any = {};
      if (updateData.name) updateValues.name = updateData.name;
      if (updateData.description) updateValues.description = updateData.description;
      if (updateData.status) updateValues.status = updateData.status;
      if (updateData.budget !== undefined) updateValues.budget = updateData.budget.toString();
      if (updateData.actualCost !== undefined) updateValues.actualCost = updateData.actualCost.toString();
      if (updateData.completionPercentage !== undefined) updateValues.completionPercentage = updateData.completionPercentage;
      if (updateData.managerId) updateValues.managerId = updateData.managerId;
      if (updateData.startDate) updateValues.startDate = updateData.startDate;
      if (updateData.endDate) updateValues.endDate = updateData.endDate;

      await db
        .update(projects)
        .set(updateValues)
        .where(eq(projects.id, id));

      // إرسال إشعار لمدير المشروع إذا تم تعيين مدير جديد ومختلف عن السابق
      if (updateData.managerId && oldProject && oldProject.managerId !== updateData.managerId) {
        try {
          await notifyProjectManagerAssigned(
            id,
            oldProject.projectNumber,
            oldProject.name,
            updateData.managerId
          );
        } catch (error) {
          console.error("Failed to send project manager assignment notification:", error);
        }
      }

      return { success: true };
    }),

  // ==================== جداول الكميات (BOQ) ====================

  // إضافة بنود متعددة في جدول الكميات دفعة واحدة
  bulkAddBOQItems: protectedProcedure
    .input(z.object({
      requestId: z.number().optional(),
      projectId: z.number().optional(),
      mosqueId: z.number().optional(),
      items: z.array(z.object({
        itemName: z.string().min(1),
        itemDescription: z.string().optional(),
        unit: z.string().min(1),
        quantity: z.number().positive(),
        unitPrice: z.number().optional(),
        category: z.string().optional(),
        mosqueId: z.number().optional(),
      }))
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // البحث عن مشروع مرتبط بالطلب (إن وُجد)
      let projectId: number | null = input.projectId || null;
      if (!projectId && input.requestId) {
        const [existingProject] = await db
          .select()
          .from(projects)
          .where(eq(projects.requestId, input.requestId))
          .limit(1);
        
        if (existingProject) {
          projectId = existingProject.id;
        }
      }

      if (input.items.length === 0) return { success: true, count: 0 };

      // تحضير القيم للإدخال
      const valuesToInsert = input.items.map(item => {
        const totalPrice = item.unitPrice ? item.quantity * item.unitPrice : null;
        return {
          projectId: projectId,
          requestId: input.requestId || null,
          mosqueId: item.mosqueId || input.mosqueId || null,
          itemName: item.itemName,
          itemDescription: item.itemDescription,
          unit: item.unit,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice?.toString(),
          totalPrice: totalPrice?.toString(),
          category: item.category || "other",
        };
      });

      for (const itemValue of valuesToInsert) {
        const pid = itemValue.projectId ?? null;
        const mid = itemValue.mosqueId ?? null;
        const uPrice = itemValue.unitPrice ?? null;
        const tPrice = itemValue.totalPrice ?? null;
        const desc = itemValue.itemDescription || null;
        const rId = itemValue.requestId ?? null;
        await db.execute(sql`
          INSERT INTO quantity_schedules 
          (requestId, projectId, mosqueId, itemName, itemDescription, unit, quantity, unitPrice, totalPrice, category) 
          VALUES 
          (${rId}, ${pid}, ${mid}, ${itemValue.itemName}, ${desc}, ${itemValue.unit}, ${itemValue.quantity}, ${uPrice}, ${tPrice}, ${itemValue.category})
        `);
      }

      return { success: true, count: valuesToInsert.length, projectId };
    }),

  // إضافة بند في جدول الكميات
  addBOQItem: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      requestId: z.number().optional(),
      mosqueId: z.number().optional(),
      boqCode: z.string().optional(),
      boqName: z.string().optional(),
      itemName: z.string().min(1),
      itemDescription: z.string().optional(),
      unit: z.string().min(1),
      quantity: z.number().positive(),
      unitPrice: z.number().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // البحث عن مشروع مرتبط بالطلب (إن وُجد)
      let projectId = input.projectId || null;
      
      if (!projectId && input.requestId) {
        const [existingProject] = await db
          .select()
          .from(projects)
          .where(eq(projects.requestId, input.requestId))
          .limit(1);
        
        if (existingProject) {
          projectId = existingProject.id;
        }
      }

      const totalPrice = input.unitPrice ? input.quantity * input.unitPrice : null;

      const [item] = await db.insert(quantitySchedules).values({
        projectId: projectId,
        requestId: input.requestId || null,
        mosqueId: input.mosqueId || null,
        boqCode: input.boqCode,
        boqName: input.boqName,
        itemName: input.itemName,
        itemDescription: input.itemDescription,
        unit: input.unit,
        quantity: input.quantity.toString(),
        unitPrice: input.unitPrice?.toString(),
        totalPrice: totalPrice?.toString(),
        category: input.category,
      });

      return { id: item.insertId, projectId };
    }),

  // تحديث بند في جدول الكميات
  updateBOQItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      mosqueId: z.number().optional().nullable(),
      itemName: z.string().optional(),
      itemDescription: z.string().optional(),
      unit: z.string().optional(),
      quantity: z.number().positive().optional(),
      unitPrice: z.number().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, ...updateData } = input;

      // جلب البند الحالي لحساب السعر الإجمالي
      const [currentItem] = await db
        .select()
        .from(quantitySchedules)
        .where(eq(quantitySchedules.id, id));

      if (!currentItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "البند غير موجود" });
      }

      const quantity = updateData.quantity ?? parseFloat(currentItem.quantity);
      const unitPrice = updateData.unitPrice ?? (currentItem.unitPrice ? parseFloat(currentItem.unitPrice) : null);
      const totalPrice = unitPrice ? quantity * unitPrice : null;

      const updateValues: any = {};
      if (updateData.mosqueId !== undefined) updateValues.mosqueId = updateData.mosqueId;
      if (updateData.itemName) updateValues.itemName = updateData.itemName;
      if (updateData.itemDescription) updateValues.itemDescription = updateData.itemDescription;
      if (updateData.unit) updateValues.unit = updateData.unit;
      if (updateData.quantity) updateValues.quantity = updateData.quantity.toString();
      if (updateData.unitPrice !== undefined) updateValues.unitPrice = updateData.unitPrice?.toString();
      if (totalPrice !== null) updateValues.totalPrice = totalPrice.toString();
      if (updateData.category) updateValues.category = updateData.category;

      await db
        .update(quantitySchedules)
        .set(updateValues)
        .where(eq(quantitySchedules.id, id));

      return { success: true };
    }),

  // حذف بند من جدول الكميات
  deleteBOQItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.delete(quantitySchedules).where(eq(quantitySchedules.id, input.id));
      return { success: true };
    }),

  // جلب جدول الكميات لمشروع أو طلب
  getBOQ: protectedProcedure
    .input(z.object({ 
      projectId: z.number().optional(),
      requestId: z.number().optional(),
      mosqueId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // البحث باستخدام requestId أو projectId
      const conditions: any[] = [];
      if (input.requestId) {
        conditions.push(eq(quantitySchedules.requestId, input.requestId));
      } else if (input.projectId) {
        conditions.push(eq(quantitySchedules.projectId, input.projectId));
      }

      if (input.mosqueId) {
        conditions.push(eq(quantitySchedules.mosqueId, input.mosqueId));
      }

      if (conditions.length === 0) {
        return { items: [], total: 0, byMosque: {} };
      }

      const rawItems = await db
        .select({
          id: quantitySchedules.id,
          requestId: quantitySchedules.requestId,
          projectId: quantitySchedules.projectId,
          mosqueId: quantitySchedules.mosqueId,
          boqCode: quantitySchedules.boqCode,
          boqName: quantitySchedules.boqName,
          itemName: quantitySchedules.itemName,
          itemDescription: quantitySchedules.itemDescription,
          unit: quantitySchedules.unit,
          quantity: quantitySchedules.quantity,
          unitPrice: quantitySchedules.unitPrice,
          totalPrice: quantitySchedules.totalPrice,
          category: quantitySchedules.category,
          createdAt: quantitySchedules.createdAt,
          updatedAt: quantitySchedules.updatedAt,
          mosqueName: mosques.name,
          mosqueCity: mosques.city,
        })
        .from(quantitySchedules)
        .leftJoin(mosques, eq(quantitySchedules.mosqueId, mosques.id))
        .where(and(...conditions))
        .orderBy(quantitySchedules.category, quantitySchedules.itemName);

      // حساب الإجمالي الكلي
      const total = rawItems.reduce((sum, item) => {
        return sum + (item.totalPrice ? parseFloat(item.totalPrice) : 0);
      }, 0);

      // تجميع حسب المسجد
      const byMosque: Record<number | string, { mosqueId: number | null; mosqueName: string | null; items: typeof rawItems; total: number }> = {};
      for (const item of rawItems) {
        const mKey = item.mosqueId ?? 'unassigned';
        if (!byMosque[mKey]) {
          byMosque[mKey] = {
            mosqueId: item.mosqueId,
            mosqueName: item.mosqueName || null,
            items: [],
            total: 0,
          };
        }
        byMosque[mKey].items.push(item);
        byMosque[mKey].total += item.totalPrice ? parseFloat(item.totalPrice) : 0;
      }

      return { items: rawItems, total, byMosque };
    }),

  // ==================== العقود ====================

  // إنشاء عقد
  createContract: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      supplierId: z.number(),
      contractType: z.string(),
      amount: z.number().positive(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      terms: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const contractNumber = generateContractNumber();

      const [contract] = await db.insert(contracts).values({
        contractNumber,
        projectId: input.projectId,
        supplierId: input.supplierId,
        contractType: input.contractType,
        amount: input.amount.toString(),
        startDate: input.startDate,
        endDate: input.endDate,
        terms: input.terms,
        status: "draft",
      });

      return { id: contract.insertId, contractNumber };
    }),

  // تحديث عقد
  updateContract: protectedProcedure
    .input(z.object({
      id: z.number(),
      contractType: z.string().optional(),
      amount: z.number().positive().optional(),
      status: z.enum(["draft", "active", "completed", "terminated"]).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      terms: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, ...updateData } = input;

      const updateValues: any = {};
      if (updateData.contractType) updateValues.contractType = updateData.contractType;
      if (updateData.amount) updateValues.amount = updateData.amount.toString();
      if (updateData.status) updateValues.status = updateData.status;
      if (updateData.startDate) updateValues.startDate = updateData.startDate;
      if (updateData.endDate) updateValues.endDate = updateData.endDate;
      if (updateData.terms) updateValues.terms = updateData.terms;

      await db
        .update(contracts)
        .set(updateValues)
        .where(eq(contracts.id, id));

      return { success: true };
    }),

  // ==================== الدفعات ====================

  // إنشاء دفعة
  createPayment: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      contractId: z.number().optional(),
      contractPaymentId: z.number().optional(),
      amount: z.number().positive(),
      paymentType: z.enum(["advance", "progress", "final", "retention"]),
      description: z.string().optional(),
      completionPercentage: z.number().optional(),
      dateMiladi: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const paymentNumber = generatePaymentNumber();

      const [payment] = await db.insert(payments).values({
        paymentNumber,
        projectId: input.projectId,
        contractId: input.contractId,
        amount: input.amount.toString(),
        paymentType: input.paymentType,
        description: input.description,
        completionPercentage: input.completionPercentage,
        status: "pending",
      });

      // إذا كانت الدفعة مرتبطة بدفعة عقد محددة، نحدث تاريخ استحقاقها ونسبة إنجازها
      if (input.contractPaymentId && input.dateMiladi) {
        const updateVals: any = {
          dueDate: input.dateMiladi.includes('T') ? new Date(input.dateMiladi) : new Date(`${input.dateMiladi}T12:00:00`),
        };
        if (input.completionPercentage !== undefined) {
          updateVals.completionPercentage = input.completionPercentage;
        }
        await db.update(contractPayments).set(updateVals).where(eq(contractPayments.id, input.contractPaymentId));
      }

      // إضافة طلب صرف مرتبط بالتاريخ المحدد لتوثيق التاريخ الميلادي للدفعة
      if (input.dateMiladi) {
        await db.insert(disbursementRequests).values({
          requestNumber: `DISB-${paymentNumber}`,
          projectId: input.projectId,
          contractId: input.contractId,
          contractPaymentId: input.contractPaymentId,
          paymentId: payment.insertId,
          title: input.description || "طلب دفعة",
          description: input.description,
          amount: input.amount.toString(),
          paymentType: input.paymentType,
          dateMiladi: input.dateMiladi.includes('T') ? new Date(input.dateMiladi) : new Date(`${input.dateMiladi}T12:00:00`),
          completionPercentage: input.completionPercentage,
          status: "pending",
        });
      }

      return { id: payment.insertId, paymentNumber };
    }),

  // تحديث حالة الدفعة
  updatePaymentStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "approved", "paid", "rejected"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const updateValues: any = { status: input.status };
      
      if (input.status === "approved") {
        updateValues.approvedBy = ctx.user.id;
      }
      if (input.status === "paid") {
        updateValues.paidAt = new Date();
        
        // جلب بيانات الدفعة لمعرفة المشروع والمبلغ
        const [payment] = await db
          .select()
          .from(payments)
          .where(eq(payments.id, input.id));

        if (payment && payment.projectId) {
          await db
            .update(projects)
            .set({
              actualCost: sql`CAST(COALESCE(${projects.actualCost}, 0) + ${payment.amount} AS DECIMAL(15,2))`,
              updatedAt: new Date(),
            })
            .where(eq(projects.id, payment.projectId));
        }
      }

      await db
        .update(payments)
        .set(updateValues)
        .where(eq(payments.id, input.id));

      return { success: true };
    }),

  getUnifiedPayment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const toLocalDateString = (d: any): string => {
        if (!d) return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        if (typeof d === 'string') {
          const match = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (match) return `${match[1]}-${match[2]}-${match[3]}`;
        }
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      if (input.id.startsWith("disb-")) {
        const actualId = parseInt(input.id.replace("disb-", ""));
        const [disb] = await db.select().from(disbursementRequests).where(eq(disbursementRequests.id, actualId));
        if (!disb) throw new TRPCError({ code: "NOT_FOUND", message: "الدفعة غير موجودة" });
        return {
          id: input.id,
          projectId: disb.projectId,
          contractId: disb.contractId || undefined,
          contractPaymentId: disb.contractPaymentId || undefined,
          title: disb.title || disb.description || "",
          description: disb.description || "",
          amount: parseFloat(disb.amount as string || "0"),
          dateMiladi: toLocalDateString(disb.dateMiladi),
          completionPercentage: disb.completionPercentage || 0,
        };
      } else if (input.id.startsWith("manual-")) {
         const actualId = parseInt(input.id.replace("manual-", ""));
         const [payment] = await db.select().from(payments).where(eq(payments.id, actualId));
         if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "الدفعة غير موجودة" });
         
         // البحث عما إذا كان هناك طلب صرف مرتبط بالدفعة اليدوية للحصول على dateMiladi
         const [disb] = await db.select().from(disbursementRequests).where(eq(disbursementRequests.paymentId, actualId));

         return {
           id: input.id,
           projectId: payment.projectId || 0,
           contractId: payment.contractId || undefined,
           title: payment.description || "",
           description: payment.description || "",
           amount: parseFloat(payment.amount as string || "0"),
           dateMiladi: disb?.dateMiladi ? toLocalDateString(disb.dateMiladi) : toLocalDateString(payment.createdAt),
           completionPercentage: payment.completionPercentage || 0,
         };
      } else if (input.id.startsWith("cp-")) {
        const actualId = parseInt(input.id.replace("cp-", ""));
        const [cp] = await db.select().from(contractPayments).where(eq(contractPayments.id, actualId));
        if (!cp) throw new TRPCError({ code: "NOT_FOUND", message: "الدفعة غير موجودة" });

        let projectId = 0;
        let contractId = cp.contractId;
        if (contractId) {
          const [contract] = await db.select().from(contractsEnhanced).where(eq(contractsEnhanced.id, contractId));
          if (contract) {
            projectId = contract.projectId || 0;
          }
        }

        return {
          id: input.id,
          projectId,
          contractId,
          contractPaymentId: cp.id,
          title: cp.phaseName || "",
          description: cp.notes || "",
          amount: parseFloat(cp.amount as string || "0"),
          dateMiladi: toLocalDateString(cp.dueDate || cp.createdAt),
          completionPercentage: cp.completionPercentage || 0,
        };
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "معرف الدفعة غير صالح" });
      }
    }),

  updateUnifiedPayment: protectedProcedure
    .input(z.object({
      id: z.string(),
      amount: z.number().positive(),
      title: z.string().optional(),
      description: z.string().optional(),
      dateMiladi: z.string().optional(),
      completionPercentage: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const dateVal = input.dateMiladi 
        ? (input.dateMiladi.includes('T') ? new Date(input.dateMiladi) : new Date(`${input.dateMiladi}T12:00:00`))
        : undefined;

      if (input.id.startsWith("disb-")) {
        const actualId = parseInt(input.id.replace("disb-", ""));
        const updateValues: any = { amount: input.amount.toString() };
        if (input.title !== undefined) updateValues.title = input.title;
        if (input.description !== undefined) updateValues.description = input.description;
        if (dateVal !== undefined) updateValues.dateMiladi = dateVal;
        if (input.completionPercentage !== undefined) updateValues.completionPercentage = input.completionPercentage;
        
        await db.update(disbursementRequests).set(updateValues).where(eq(disbursementRequests.id, actualId));

        if (dateVal !== undefined) {
          const [disb] = await db.select().from(disbursementRequests).where(eq(disbursementRequests.id, actualId));
          if (disb?.contractPaymentId) {
            await db.update(contractPayments).set({ dueDate: dateVal }).where(eq(contractPayments.id, disb.contractPaymentId));
          }
        }
      } else if (input.id.startsWith("manual-")) {
        const actualId = parseInt(input.id.replace("manual-", ""));
        const updateValues: any = { amount: input.amount.toString() };
        if (input.title !== undefined) updateValues.description = input.title;
        if (input.completionPercentage !== undefined) updateValues.completionPercentage = input.completionPercentage;
        await db.update(payments).set(updateValues).where(eq(payments.id, actualId));

        if (dateVal !== undefined) {
          const [existingDisb] = await db.select().from(disbursementRequests).where(eq(disbursementRequests.paymentId, actualId));
          if (existingDisb) {
            await db.update(disbursementRequests).set({ dateMiladi: dateVal }).where(eq(disbursementRequests.id, existingDisb.id));
          } else {
            const [p] = await db.select().from(payments).where(eq(payments.id, actualId));
            if (p) {
              await db.insert(disbursementRequests).values({
                requestNumber: `DISB-${p.paymentNumber}`,
                projectId: p.projectId,
                contractId: p.contractId,
                paymentId: p.id,
                title: input.title || p.description || "طلب دفعة",
                description: input.description || p.description,
                amount: input.amount.toString(),
                paymentType: p.paymentType || "progress",
                dateMiladi: dateVal,
                completionPercentage: input.completionPercentage || p.completionPercentage,
                status: "pending",
              });
            }
          }
        }
      } else if (input.id.startsWith("cp-")) {
        const actualId = parseInt(input.id.replace("cp-", ""));
        const updateValues: any = { amount: input.amount.toString() };
        if (input.title !== undefined) updateValues.phaseName = input.title;
        if (dateVal !== undefined) {
          updateValues.dueDate = dateVal;
        }
        if (input.description !== undefined) {
          updateValues.notes = input.description;
        }
        if (input.completionPercentage !== undefined) {
          updateValues.completionPercentage = input.completionPercentage;
        }
        await db.update(contractPayments).set(updateValues).where(eq(contractPayments.id, actualId));

        if (dateVal !== undefined) {
          await db.update(disbursementRequests).set({ dateMiladi: dateVal }).where(eq(disbursementRequests.contractPaymentId, actualId));
        }
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "معرف الدفعة غير صالح" });
      }

      return { success: true };
    }),



  // ==================== عروض الأسعار ====================

  // إنشاء عرض سعر
  createQuotation: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      requestId: z.number().optional(),
      supplierId: z.number(),
      totalAmount: z.number().min(0),
      finalAmount: z.number().min(0).optional(),
      validUntil: z.date().optional(),
      items: z.array(z.object({
        boqItemId: z.number().optional(),
        itemName: z.string(),
        quantity: z.number(),
        unit: z.string().optional(),
        unitPrice: z.number(),
        totalPrice: z.number(),
      })).optional(),
      notes: z.string().optional(),
      // حقول الضريبة
      includesTax: z.boolean().optional(),
      taxRate: z.number().min(0).max(100).nullable().optional(),
      taxAmount: z.number().nullable().optional(),
      // حقول الخصم
      discountType: z.enum(["percentage", "fixed"]).nullable().optional(),
      discountValue: z.number().nullable().optional(),
      discountAmount: z.number().nullable().optional(),
      documentUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const quotationNumber = generateQuotationNumber();

      const result = await db.insert(quotations).values({
        quotationNumber,
        projectId: input.projectId,
        requestId: input.requestId,
        supplierId: input.supplierId,
        totalAmount: input.totalAmount.toString(),
        finalAmount: input.finalAmount?.toString() || input.totalAmount.toString(),
        validUntil: input.validUntil,
        notes: input.notes,
        status: "pending" as const,
        includesTax: input.includesTax || false,
        taxRate: input.taxRate?.toString() || null,
        taxAmount: input.taxAmount?.toString() || null,
        discountType: input.discountType || null,
        discountValue: input.discountValue?.toString() || null,
        discountAmount: input.discountAmount?.toString() || null,
        documentUrl: input.documentUrl || null,
      } as any);

      const quotationId = result[0].insertId;
      await notifyQuotationCreation(
        quotationId,
        quotationNumber,
        input.requestId || null,
        input.projectId || null,
        input.supplierId
      );

      return { id: quotationId, quotationNumber };
    }),

  // جلب عروض الأسعار للطلب
  getQuotationsByRequest: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const quotationsList = await db
        .select({
          id: quotations.id,
          quotationNumber: quotations.quotationNumber,
          totalAmount: quotations.totalAmount,
          finalAmount: quotations.finalAmount,
          includesTax: quotations.includesTax,
          taxRate: quotations.taxRate,
          taxAmount: quotations.taxAmount,
          discountType: quotations.discountType,
          discountValue: quotations.discountValue,
          discountAmount: quotations.discountAmount,
          negotiatedAmount: quotations.negotiatedAmount,
          approvedAmount: quotations.approvedAmount,
          status: quotations.status,
          validUntil: quotations.validUntil,
          notes: quotations.notes,
          supplierId: quotations.supplierId,
          supplierName: suppliers.name,
          documentUrl: quotations.documentUrl,
          createdAt: quotations.createdAt,
        })
        .from(quotations)
        .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .where(eq(quotations.requestId, input.requestId))
        .orderBy(desc(quotations.createdAt));

      return { quotations: quotationsList };
    }),

  // تحديث حالة عرض السعر
  updateQuotationStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "negotiating", "accepted", "rejected", "expired"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [quotation] = await db
        .select()
        .from(quotations)
        .where(eq(quotations.id, input.id))
        .limit(1);

      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "عرض السعر غير موجود" });
      }

      await db
        .update(quotations)
        .set({ status: input.status })
        .where(eq(quotations.id, input.id));

      if (input.status === "accepted") {
        await notifyQuotationApproval(
          quotation.id,
          quotation.quotationNumber,
          quotation.requestId,
          quotation.projectId,
          quotation.supplierId,
          quotation.approvedAmount || quotation.finalAmount || quotation.totalAmount
        );
      }

      return { success: true };
    }),

  // بدء التفاوض على عرض السعر
  startNegotiation: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db
        .update(quotations)
        .set({ 
          status: "negotiating",
          negotiatedBy: ctx.user.id,
          negotiatedAt: new Date()
        })
        .where(eq(quotations.id, input.id));

      return { success: true };
    }),

  // حفظ نتيجة التفاوض
  saveNegotiationResult: protectedProcedure
    .input(z.object({
      id: z.number(),
      negotiatedAmount: z.number(),
      negotiationNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db
        .update(quotations)
        .set({ 
          negotiatedAmount: input.negotiatedAmount.toString(),
          negotiationNotes: input.negotiationNotes || null,
          negotiatedBy: ctx.user.id,
          negotiatedAt: new Date()
        })
        .where(eq(quotations.id, input.id));

      return { success: true };
    }),

  // اعتماد عرض السعر بعد التفاوض
  approveQuotationAfterNegotiation: protectedProcedure
    .input(z.object({
      id: z.number(),
      useNegotiatedAmount: z.boolean().default(true), // استخدام المبلغ بعد التفاوض
      approvedAmount: z.string().optional(), // المبلغ المعتمد مباشرة
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // جلب بيانات العرض
      const [quotation] = await db
        .select()
        .from(quotations)
        .where(eq(quotations.id, input.id));

      if (!quotation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "عرض السعر غير موجود" });
      }

      // تحديد المبلغ المعتمد
      let approvedAmount: string;
      if (input.approvedAmount) {
        approvedAmount = input.approvedAmount;
      } else if (input.useNegotiatedAmount && quotation.negotiatedAmount) {
        approvedAmount = quotation.negotiatedAmount;
      } else {
        approvedAmount = quotation.finalAmount || quotation.totalAmount;
      }

      await db
        .update(quotations)
        .set({ 
          status: "accepted",
          approvedAmount: approvedAmount,
          notes: input.notes || null
        })
        .where(eq(quotations.id, input.id));

      await notifyQuotationApproval(
        quotation.id,
        quotation.quotationNumber,
        quotation.requestId,
        quotation.projectId,
        quotation.supplierId,
        approvedAmount
      );

      return { 
        success: true,
        approvedAmount: parseFloat(approvedAmount)
      };
    }),

  // ==================== الموردين ====================

  // جلب جميع الموردين
  getSuppliers: protectedProcedure
    .input(z.object({
      type: z.enum(["contractor", "supplier", "service_provider"]).optional(),
      status: z.enum(["active", "inactive", "blacklisted"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const filters = [];
      if (input?.type) {
        filters.push(eq(suppliers.type, input.type));
      }
      if (input?.status) {
        filters.push(eq(suppliers.status, input.status));
      }

      const suppliersList = await db
        .select()
        .from(suppliers)
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(suppliers.name);

      return suppliersList;
    }),

  // إنشاء مورد
  createSupplier: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(["contractor", "supplier", "service_provider"]),
      contactPerson: z.string().min(1),
      phone: z.string().min(1),
      email: z.string().email(),
      commercialRegister: z.string().min(1),
      address: z.string().optional(),
      taxNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [supplier] = await db.insert(suppliers).values({
        name: input.name,
        type: input.type,
        contactPerson: input.contactPerson,
        phone: input.phone,
        email: input.email,
        commercialRegister: input.commercialRegister,
        address: input.address,
        taxNumber: input.taxNumber,
        notes: input.notes,
        status: "active",
      });

      return { id: supplier.insertId };
    }),

  // تحديث مورد
  updateSupplier: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: z.enum(["contractor", "supplier", "service_provider"]).optional(),
      contactPerson: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
      commercialRegister: z.string().optional(),
      taxNumber: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
      status: z.enum(["active", "inactive", "blacklisted"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, ...updateData } = input;

      await db
        .update(suppliers)
        .set(updateData)
        .where(eq(suppliers.id, id));

      return { success: true };
    }),

  // ==================== مراحل المشروع ====================

  // تحديث مرحلة
  updatePhase: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "in_progress", "completed"]).optional(),
      completionPercentage: z.number().min(0).max(100).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { id, ...updateData } = input;

      await db
        .update(projectPhases)
        .set(updateData)
        .where(eq(projectPhases.id, id));

      // جلب معرف المشروع المرتبط بالمرحلة
      const [phase] = await db.select({ 
        projectId: projectPhases.projectId,
        phaseOrder: projectPhases.phaseOrder,
        phaseName: projectPhases.phaseName
      }).from(projectPhases).where(eq(projectPhases.id, id));
      
      if (phase && phase.projectId) {
        // إذا تم إكمال المرحلة الرابعة (التعاقد)، نقوم باعتماد العقد تلقائياً
        if (phase.phaseOrder === 4 && updateData.status === "completed") {
          console.log(`[updatePhase] Phase 4 completed for project ${phase.projectId}. Approving contract...`);
          await db.update(contractsEnhanced)
            .set({
              status: "approved",
              approvedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(contractsEnhanced.projectId, phase.projectId),
                or(
                  eq(contractsEnhanced.status, "draft"),
                  eq(contractsEnhanced.status, "pending_approval")
                )
              )
            );
        }

        // جلب جميع مراحل المشروع لحساب الإجمالي
        const phases = await db.select().from(projectPhases).where(eq(projectPhases.projectId, phase.projectId));
        
        if (phases.length > 0) {
          const totalCompletion = phases.reduce((sum, p) => sum + (p.completionPercentage || 0), 0);
          const projectPercentage = Math.round(totalCompletion / phases.length);
          
          await db.update(projects)
            .set({ completionPercentage: projectPercentage })
            .where(eq(projects.id, phase.projectId));
        }
      }

      return { success: true };
    }),

  // ==================== الإحصائيات ====================

  // إحصائيات المشاريع
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

    const [stats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        planning: sql<number>`SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END)`,
        inProgress: sql<number>`SUM(CASE WHEN status != 'completed' THEN 1 ELSE 0 END)`,
        completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
        onHold: sql<number>`SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END)`,
        totalBudget: sql<string>`SUM(CAST(budget AS DECIMAL(15,2)))`,
        totalActualCost: sql<string>`SUM(CAST(actualCost AS DECIMAL(15,2)))`,
      })
      .from(projects);

    return stats;
  }),

  // جلب المشروع المرتبط بطلب
  getByRequestId: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.requestId, input.requestId))
        .limit(1);

      if (project.length === 0) return null;
      const proj = project[0];

      // جلب العقود (من جدول contracts_enhanced)
      const projectContracts = await db
        .select({
          id: contractsEnhanced.id,
          contractNumber: contractsEnhanced.contractNumber,
          contractType: contractsEnhanced.contractType,
          amount: contractsEnhanced.contractAmount,
          status: contractsEnhanced.status,
          startDate: contractsEnhanced.startDate,
          endDate: contractsEnhanced.endDate,
          supplierName: contractsEnhanced.secondPartyName,
          managementPercentage: contractsEnhanced.managementPercentage,
        })
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.projectId, proj.id));

      const contractIds = projectContracts.map(c => c.id);

      // جلب دفعات العقود
      const allContractPayments = contractIds.length > 0 
        ? await db.select().from(contractPayments).where(inArray(contractPayments.contractId, contractIds))
        : [];

      // جلب طلبات الصرف
      const projectDisbursements = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.projectId, proj.id))
        .orderBy(desc(disbursementRequests.createdAt));

      // جلب أوامر الصرف المرتبطة بطلبات الصرف لهذا المشروع
      const disbIds = projectDisbursements.map(d => d.id);
      const projectOrders = disbIds.length > 0
        ? await db.select().from(disbursementOrders).where(inArray(disbursementOrders.disbursementRequestId, disbIds))
        : [];

      // جلب الدفعات اليدوية
      const manualPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.projectId, proj.id))
        .orderBy(desc(payments.createdAt));

      // توحيد الدفعات
      const unifiedPayments: any[] = [];

      // 1. إضافة دفعات العقود المجدولة
      allContractPayments.forEach(cp => {
        const linkedDisb = projectDisbursements.find(d => d.contractPaymentId === cp.id);
        const linkedOrder = linkedDisb ? projectOrders.find(o => o.disbursementRequestId === linkedDisb.id) : null;
        const rawDate = linkedOrder?.executedAt || linkedDisb?.dateMiladi || cp.dueDate || cp.createdAt;

        let paymentStatus = "pending";
        let paidAtDate = null;

        if ((linkedOrder as any)?.status === "executed") {
          paymentStatus = "paid";
          paidAtDate = linkedOrder?.executedAt || cp.paidAt;
        } else if (cp.status === "paid" && (!linkedDisb || (linkedDisb as any).status === "paid") && (!linkedOrder || (linkedOrder as any).status === "executed")) {
          paymentStatus = "paid";
          paidAtDate = cp.paidAt;
        } else if ((linkedOrder as any)?.status === "approved" || (linkedDisb as any)?.status === "approved" || (linkedDisb as any)?.status === "pending" || (linkedDisb as any)?.status === "pending_executive" || (cp as any).status === "due") {
          paymentStatus = "due";
        } else {
          paymentStatus = cp.status === "paid" ? "paid" : "pending";
        }

        unifiedPayments.push({
          id: `cp-${cp.id}`,
          paymentNumber: `PLAN-${cp.id}`,
          paymentType: cp.phaseOrder === 1 ? "advance" : "progress",
          amount: cp.amount,
          status: paymentStatus,
          description: cp.phaseName,
          date: rawDate,
          paidAt: paidAtDate,
          source: "contract",
          workDescription: cp.notes,
          completionPercentage: cp.completionPercentage || 0,
        });
      });

      // 2. إضافة الدفعات اليدوية
      manualPayments.forEach(p => {
        const linkedDisb = projectDisbursements.find(d => d.paymentId === p.id);
        const linkedOrder = linkedDisb ? projectOrders.find(o => o.disbursementRequestId === linkedDisb.id) : null;
        const rawDate = linkedOrder?.executedAt || linkedDisb?.dateMiladi || p.createdAt;

        let paymentStatus = "pending";
        let paidAtDate = null;

        if ((linkedOrder as any)?.status === "executed") {
          paymentStatus = "paid";
          paidAtDate = linkedOrder?.executedAt || p.paidAt;
        } else if (p.status === "paid" && (!linkedDisb || (linkedDisb as any).status === "paid") && (!linkedOrder || (linkedOrder as any).status === "executed")) {
          paymentStatus = "paid";
          paidAtDate = p.paidAt;
        } else if ((linkedOrder as any)?.status === "approved" || (linkedDisb as any)?.status === "approved" || (linkedDisb as any)?.status === "pending" || (linkedDisb as any)?.status === "pending_executive" || (p as any).status === "due") {
          paymentStatus = "due";
        } else {
          paymentStatus = p.status === "paid" ? "paid" : "pending";
        }

        unifiedPayments.push({
          id: `manual-${p.id}`,
          paymentNumber: p.paymentNumber,
          paymentType: p.paymentType,
          amount: p.amount,
          status: paymentStatus,
          description: p.description,
          date: rawDate,
          paidAt: paidAtDate,
          source: "manual",
          workDescription: p.description,
          completionPercentage: p.completionPercentage || 0,
        });
      });

      return {
        ...proj,
        contracts: projectContracts,
        payments: unifiedPayments,
      };
    }),

  // تحديث نسبة الإنجاز المخطط والمعالم الرئيسية للمشروع
  updateProgressAndMilestones: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        plannedProgress: z.number().min(0).max(100).optional(),
        completionPercentage: z.number().min(0).max(100).optional(),
        actualStartDate: z.string().optional(),
        milestones: z.array(
          z.object({
            title: z.string(),
            dueDate: z.string().optional(),
            actualStartDate: z.string().optional(),
            status: z.string().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const updateData: any = {};
      if (input.plannedProgress !== undefined) {
        updateData.plannedProgress = input.plannedProgress;
      }
      if (input.completionPercentage !== undefined) {
        updateData.completionPercentage = input.completionPercentage;
      }
      if (input.actualStartDate !== undefined && input.actualStartDate.trim() !== "") {
        updateData.startDate = new Date(input.actualStartDate);
      }
      if (input.milestones !== undefined) {
        updateData.milestones = JSON.stringify(input.milestones);
      }

      await db.update(projects).set(updateData).where(eq(projects.id, input.id));
      return { success: true };
    }),

  // ==================== تفاصيل البيانات المالية والدعم للمشروع ====================
  getFinancialData: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [financialDetail] = await db
        .select()
        .from(projectFinancialDetails)
        .where(eq(projectFinancialDetails.projectId, input.projectId));

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "المشروع غير موجود" });

      // جلب جميع عروض الأسعار المتاحة للمشروع
      const allQuotations = await db
        .select({
          id: quotations.id,
          quotationNumber: quotations.quotationNumber,
          totalAmount: quotations.totalAmount,
          finalAmount: quotations.finalAmount,
          negotiatedAmount: quotations.negotiatedAmount,
          approvedAmount: quotations.approvedAmount,
          status: quotations.status,
          createdAt: quotations.createdAt,
          supplierId: quotations.supplierId,
          supplierName: suppliers.name,
          supplierCommercialRegister: suppliers.commercialRegister,
          supplierPhone: suppliers.phone,
          supplierEmail: suppliers.email,
        })
        .from(quotations)
        .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .where(or(eq(quotations.projectId, input.projectId), project.requestId ? eq(quotations.requestId, project.requestId) : sql`1=0`));

      // تحديد عرض السعر المعتمد (إما المحدد بـ approvedQuotationId أو الذي حالته approved)
      let approvedQuotation = null;
      if (financialDetail?.approvedQuotationId) {
        approvedQuotation = allQuotations.find(q => q.id === financialDetail.approvedQuotationId) || null;
      }
      if (!approvedQuotation) {
        approvedQuotation = allQuotations.find(q => q.status === "approved") || allQuotations[0] || null;
      }

      // جلب سندات القبض
      await resequenceVoucherNumbers(db);
      const vouchers = await db
        .select({
          id: receiptVouchers.id,
          voucherNumber: receiptVouchers.voucherNumber,
          projectId: receiptVouchers.projectId,
          amount: receiptVouchers.amount,
          receiptDate: receiptVouchers.receiptDate,
          payerName: receiptVouchers.payerName,
          paymentMethod: receiptVouchers.paymentMethod,
          referenceNumber: receiptVouchers.referenceNumber,
          bankName: receiptVouchers.bankName,
          attachmentUrl: receiptVouchers.attachmentUrl,
          notes: receiptVouchers.notes,
          status: receiptVouchers.status,
          rejectionReason: receiptVouchers.rejectionReason,
          createdAt: receiptVouchers.createdAt,
          createdById: receiptVouchers.createdById,
          creatorName: users.name,
        })
        .from(receiptVouchers)
        .leftJoin(users, eq(receiptVouchers.createdById, users.id))
        .where(eq(receiptVouchers.projectId, input.projectId))
        .orderBy(desc(receiptVouchers.receiptDate));

      // جلب طلبات الصرف غير المرفوضة للمشروع لحساب مبالغ التمويل من الحساب العام للجمعية (دين على الداعم)
      const projectDisbursements = await db
        .select()
        .from(disbursementRequests)
        .where(and(
          eq(disbursementRequests.projectId, input.projectId),
          ne(disbursementRequests.status, "rejected")
        ));

      let autoAssociationFunding = 0;
      const associationFundedRequests: Array<{
        id: number;
        requestNumber: string;
        title: string | null;
        amount: number;
        coveredAmount: number;
        dateMiladi: string | null;
        status: string | null;
      }> = [];

      for (const req of projectDisbursements) {
        const desc = req.description || "";
        const attachments = req.attachmentsJson || "";
        let isGenAccount = desc.includes("الحساب العام للجمعية") || desc.includes("تم التوجيه بالصرف من الحساب العام");
        let coveredAmount = 0;

        if (attachments.includes("general_account_coverage")) {
          isGenAccount = true;
          try {
            const parsed = JSON.parse(attachments);
            const genItem = Array.isArray(parsed) ? parsed.find((item: any) => item.name === "general_account_coverage") : null;
            if (genItem && genItem.url) {
              const info = JSON.parse(genItem.url);
              coveredAmount = parseFloat(info.funderDeficit || "0");
            }
          } catch (e) {
            // fallback
          }
        }

        if (!coveredAmount && isGenAccount) {
          const match = desc.match(/العجز البالغ\s*\(?([0-9.,]+)/);
          if (match) {
            coveredAmount = parseFloat(match[1].replace(/,/g, "")) || 0;
          } else {
            coveredAmount = parseFloat(req.amount || "0");
          }
        }

        if (isGenAccount && coveredAmount > 0) {
          autoAssociationFunding += coveredAmount;
          associationFundedRequests.push({
            id: req.id,
            requestNumber: req.requestNumber,
            title: req.title,
            amount: parseFloat(req.amount || "0"),
            coveredAmount,
            dateMiladi: req.dateMiladi ? req.dateMiladi.toString() : null,
            status: req.status,
          });
        }
      }

      const manualAssociationFunding = parseFloat(financialDetail?.associationFundingAmount || "0");
      const totalAssociationFunding = manualAssociationFunding > 0 ? manualAssociationFunding : autoAssociationFunding;

      // جلب العقد المرتبط بالمشروع إن وجد لاستخراج قيمة العقد والأجور الإدارية للجمعية
      const [contract] = await db
        .select({
          id: contractsEnhanced.id,
          contractNumber: contractsEnhanced.contractNumber,
          contractTitle: contractsEnhanced.contractTitle,
          contractAmount: contractsEnhanced.contractAmount,
          managementPercentage: contractsEnhanced.managementPercentage,
          status: contractsEnhanced.status,
          supportingEntity: contractsEnhanced.supportingEntity,
          supportType: contractsEnhanced.supportType,
          supportedAmount: contractsEnhanced.supportedAmount,
          supplierId: contractsEnhanced.supplierId,
          secondPartyName: contractsEnhanced.secondPartyName,
          startDate: contractsEnhanced.startDate,
          endDate: contractsEnhanced.endDate,
          createdAt: contractsEnhanced.createdAt,
        })
        .from(contractsEnhanced)
        .where(or(
          eq(contractsEnhanced.projectId, input.projectId),
          project.requestId ? eq(contractsEnhanced.requestId, project.requestId) : sql`1=0`
        ))
        .orderBy(desc(contractsEnhanced.createdAt))
        .limit(1);

      return {
        financialDetail: financialDetail || null,
        contract: contract || null,
        approvedQuotation: approvedQuotation || null,
        allQuotations,
        receiptVouchers: vouchers,
        associationFunding: {
          totalAmount: totalAssociationFunding,
          autoCalculatedAmount: autoAssociationFunding,
          manualAmount: manualAssociationFunding,
          notes: financialDetail?.associationFundingNotes || "",
          debtStatus: "دين / مستحق على الداعم يجب تسديده للجمعية فور تحصيل باقي الدعم",
          requests: associationFundedRequests,
        },
      };
    }),

  upsertFinancialDetails: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      approvedQuotationId: z.number().nullable().optional(),
      supportEntity: z.string().optional(),
      customSupportEntity: z.string().optional(),
      supportAmount: z.number().optional(),
      adminFeeType: z.enum(["percentage", "fixed"]).optional(),
      adminFeeValue: z.number().optional(),
      adminFeeAmount: z.number().optional(),
      associationFundingAmount: z.number().optional(),
      associationFundingNotes: z.string().optional(),
      supportSources: z.array(z.object({
        entity: z.string(),
        customEntity: z.string().optional(),
        amount: z.number(),
        notes: z.string().optional(),
      })).optional(),
      supportSourcesJson: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [existing] = await db
        .select()
        .from(projectFinancialDetails)
        .where(eq(projectFinancialDetails.projectId, input.projectId));

      const supportSourcesJson = input.supportSources 
        ? JSON.stringify(input.supportSources) 
        : input.supportSourcesJson ?? null;

      const calculatedTotalSupport = input.supportSources && input.supportSources.length > 0
        ? input.supportSources.reduce((sum, item) => sum + (item.amount || 0), 0)
        : input.supportAmount;

      const primarySupportEntity = input.supportSources && input.supportSources.length > 0
        ? (input.supportSources.length === 1 ? input.supportSources[0].entity : "عدة داعمين")
        : (input.supportEntity ?? "");

      const primaryCustomSupportEntity = input.supportSources && input.supportSources.length === 1
        ? (input.supportSources[0].customEntity ?? "")
        : (input.customSupportEntity ?? "");

      const values: any = {
        projectId: input.projectId,
        approvedQuotationId: input.approvedQuotationId ?? null,
        supportEntity: primarySupportEntity,
        customSupportEntity: primaryCustomSupportEntity,
        supportAmount: calculatedTotalSupport?.toString() ?? "0.00",
        adminFeeType: input.adminFeeType ?? "percentage",
        adminFeeValue: input.adminFeeValue?.toString() ?? "0.00",
        adminFeeAmount: input.adminFeeAmount?.toString() ?? "0.00",
        associationFundingAmount: input.associationFundingAmount?.toString() ?? "0.00",
        associationFundingNotes: input.associationFundingNotes ?? "",
        supportSourcesJson: supportSourcesJson,
        notes: input.notes ?? "",
      };

      if (existing) {
        await db.update(projectFinancialDetails)
          .set(values)
          .where(eq(projectFinancialDetails.id, existing.id));
      } else {
        await db.insert(projectFinancialDetails).values(values);
      }

      return { success: true };
    }),

  getAllReceiptVouchers: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await resequenceVoucherNumbers(db);

      const filters: any[] = [];
      if (input?.projectId) {
        filters.push(eq(receiptVouchers.projectId, input.projectId));
      }
      if (input?.status && input.status !== "all") {
        filters.push(eq(receiptVouchers.status, input.status));
      }

      const rows = await db
        .select({
          id: receiptVouchers.id,
          voucherNumber: receiptVouchers.voucherNumber,
          projectId: receiptVouchers.projectId,
          amount: receiptVouchers.amount,
          receiptDate: receiptVouchers.receiptDate,
          payerName: receiptVouchers.payerName,
          paymentMethod: receiptVouchers.paymentMethod,
          referenceNumber: receiptVouchers.referenceNumber,
          bankName: receiptVouchers.bankName,
          attachmentUrl: receiptVouchers.attachmentUrl,
          notes: receiptVouchers.notes,
          status: receiptVouchers.status,
          rejectionReason: receiptVouchers.rejectionReason,
          isException: receiptVouchers.isException,
          exceptionApprovedBy: receiptVouchers.exceptionApprovedBy,
          exceptionApprovedAt: receiptVouchers.exceptionApprovedAt,
          exceptionReason: receiptVouchers.exceptionReason,
          approvedBy: receiptVouchers.approvedBy,
          approvedAt: receiptVouchers.approvedAt,
          createdAt: receiptVouchers.createdAt,
          projectName: projects.name,
          projectNumber: projects.projectNumber,
        })
        .from(receiptVouchers)
        .leftJoin(projects, eq(receiptVouchers.projectId, projects.id))
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(receiptVouchers.createdAt));

      if (input?.search && input.search.trim() !== "") {
        const searchLower = input.search.trim().toLowerCase();
        return rows.filter(r => 
          (r.voucherNumber && r.voucherNumber.toLowerCase().includes(searchLower)) ||
          (r.payerName && r.payerName.toLowerCase().includes(searchLower)) ||
          (r.projectName && r.projectName.toLowerCase().includes(searchLower)) ||
          (r.projectNumber && r.projectNumber.toLowerCase().includes(searchLower)) ||
          (r.referenceNumber && r.referenceNumber.toLowerCase().includes(searchLower)) ||
          (r.notes && r.notes.toLowerCase().includes(searchLower))
        );
      }

      return rows;
    }),

  createReceiptVoucher: protectedProcedure
    .input(z.object({
      projectId: z.number().optional().nullable(),
      amount: z.number().positive("يرجى إدخال مبلغ صحيح أكبر من 0"),
      receiptDate: z.string().min(1, "يرجى تحديد تاريخ القبض"),
      payerName: z.string().optional(),
      paymentMethod: z.string().optional(),
      referenceNumber: z.string().optional(),
      bankName: z.string().optional(),
      attachmentUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const voucherNumber = await resequenceVoucherNumbers(db);

      await db.insert(receiptVouchers).values({
        voucherNumber,
        projectId: input.projectId && input.projectId > 0 ? input.projectId : null,
        amount: input.amount.toString(),
        receiptDate: new Date(input.receiptDate),
        payerName: input.payerName || "",
        paymentMethod: input.paymentMethod || "bank_transfer",
        referenceNumber: input.referenceNumber || "",
        bankName: input.bankName || "",
        attachmentUrl: input.attachmentUrl || "",
        notes: input.notes || "",
        status: "pending_approval",
        createdById: ctx.user.id,
      });

      return { success: true, voucherNumber };
    }),

  transferProjectSurplusToReceiptVoucher: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      targetType: z.enum(["restricted", "unrestricted"]),
      donationPurpose: z.string().optional(),
      amount: z.number().positive("يرجى إدخال مبلغ تحويل صحيح أكبر من 0"),
      receiptDate: z.string().min(1, "يرجى تحديد تاريخ السند"),
      payerName: z.string().min(1, "يرجى تحديد اسم الداعم"),
      paymentMethod: z.string().optional(),
      referenceNumber: z.string().optional(),
      bankName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "المشروع غير موجود" });

      // جلب وترتيب سندات القبض المعتمدة للمشروع للخصم من سندات الداعم محدد الفائض أولاً
      const projectVouchers = await db
        .select()
        .from(receiptVouchers)
        .where(and(
          eq(receiptVouchers.projectId, input.projectId),
          eq(receiptVouchers.status, "approved")
        ))
        .orderBy(desc(receiptVouchers.receiptDate), desc(receiptVouchers.id));

      if (projectVouchers.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا توجد سندات قبض معتمدة لهذا المشروع لتحويل الفائض منها"
        });
      }

      // فرز السندات لإعطاء الأولوية لسندات الداعم المسدد للفائض
      const cleanInputPayer = (input.payerName || "").replace(/^(السيد|السيدة|السادة)\s*(\/|-)?\s*/, "").trim().toLowerCase();
      const sortedVouchers = [...projectVouchers].sort((a, b) => {
        const aClean = (a.payerName || "").replace(/^(السيد|السيدة|السادة)\s*(\/|-)?\s*/, "").trim().toLowerCase();
        const bClean = (b.payerName || "").replace(/^(السيد|السيدة|السادة)\s*(\/|-)?\s*/, "").trim().toLowerCase();
        const aMatch = cleanInputPayer && (aClean.includes(cleanInputPayer) || cleanInputPayer.includes(aClean));
        const bMatch = cleanInputPayer && (bClean.includes(cleanInputPayer) || cleanInputPayer.includes(bClean));
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });

      let remainingToDeduct = input.amount;

      // خصم مبلغ التحويل من سندات الداعم المعتمدة للمشروع
      for (const v of sortedVouchers) {
        if (remainingToDeduct <= 0) break;
        const vAmt = parseFloat(v.amount.toString() || "0");
        if (vAmt <= 0) continue;

        if (vAmt >= remainingToDeduct) {
          const newAmt = vAmt - remainingToDeduct;
          await db.update(receiptVouchers)
            .set({
              amount: newAmt.toString(),
              notes: `${v.notes ? `${v.notes} | ` : ""}تم استقطاع (${remainingToDeduct.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال) كفائض محول لسند قبض مستقل للداعم`,
              updatedAt: new Date(),
            })
            .where(eq(receiptVouchers.id, v.id));
          remainingToDeduct = 0;
        } else {
          await db.update(receiptVouchers)
            .set({
              amount: "0",
              notes: `${v.notes ? `${v.notes} | ` : ""}تم تحويل كامل مبلغ السند (${vAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })} ريال) كفائض محول لسند مستقل للداعم`,
              updatedAt: new Date(),
            })
            .where(eq(receiptVouchers.id, v.id));
          remainingToDeduct -= vAmt;
        }
      }

      // تجهيز بيان السند الجديد المنشأ
      let finalNotes = "";
      if (input.targetType === "restricted") {
        const purpose = input.donationPurpose?.trim() || "عام";
        finalNotes = `مصرف التبرع: ${purpose} | ${input.notes?.trim() || `تم تحويله من فائض مقبوضات المشروع ${project.projectNumber} (${project.name})`}`;
      } else {
        finalNotes = input.notes?.trim() || `سند قبض غير مقيد - تم تحويله من فائض مقبوضات المشروع ${project.projectNumber} (${project.name})`;
      }

      // إنشاء سند القبض الجديد المستقل (معتمد ورقم تسلسلي رسمي)
      const voucherNumber = await resequenceVoucherNumbers(db);

      await db.insert(receiptVouchers).values({
        voucherNumber,
        projectId: null,
        amount: input.amount.toString(),
        receiptDate: new Date(input.receiptDate),
        payerName: input.payerName,
        paymentMethod: input.paymentMethod || "bank_transfer",
        referenceNumber: input.referenceNumber || "",
        bankName: input.bankName || "مصرف الراجحي",
        attachmentUrl: "",
        notes: finalNotes,
        status: "approved",
        createdById: ctx.user.id,
        approvedBy: ctx.user.id,
        approvedAt: new Date(),
      });

      await resequenceVoucherNumbers(db);

      return { success: true, voucherNumber };
    }),

  updateReceiptVoucher: protectedProcedure
    .input(z.object({
      id: z.number(),
      amount: z.number().positive("يرجى إدخال مبلغ صحيح أكبر من 0"),
      receiptDate: z.string().min(1, "يرجى تحديد تاريخ القبض"),
      payerName: z.string().optional(),
      paymentMethod: z.string().optional(),
      referenceNumber: z.string().optional(),
      bankName: z.string().optional(),
      attachmentUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [existingVoucher] = await db.select().from(receiptVouchers).where(eq(receiptVouchers.id, input.id));
      if (!existingVoucher) {
        throw new TRPCError({ code: "NOT_FOUND", message: "سند القبض غير موجود" });
      }

      if (existingVoucher.status === "approved") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لا يمكن تعديل سند القبض المعتمد، يرجى إلغاء الاعتماد أولاً مع تدوين المبررات"
        });
      }

      await db.update(receiptVouchers)
        .set({
          amount: input.amount.toString(),
          receiptDate: new Date(input.receiptDate),
          payerName: input.payerName || "",
          paymentMethod: input.paymentMethod || "bank_transfer",
          referenceNumber: input.referenceNumber || "",
          bankName: input.bankName || "",
          attachmentUrl: input.attachmentUrl || "",
          notes: input.notes || "",
          status: existingVoucher.status === "approval_revoked" ? "pending_approval" : existingVoucher.status,
          updatedAt: new Date(),
        })
        .where(eq(receiptVouchers.id, input.id));

      return { success: true };
    }),

  deleteReceiptVoucher: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [existingVoucher] = await db.select().from(receiptVouchers).where(eq(receiptVouchers.id, input.id));
      if (existingVoucher && existingVoucher.status === "approved") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لا يمكن حذف سند القبض المعتمد، يرجى إلغاء الاعتماد أولاً مع كتابة المبررات"
        });
      }

      await db.delete(receiptVouchers).where(eq(receiptVouchers.id, input.id));
      return { success: true };
    }),

  approveReceiptVoucher: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      if (ctx.user.email !== "solayani@manarah.org.sa") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "عذراً، اعتماد سند القبض مخصص حصرياً للمسؤول المالي (solayani@manarah.org.sa)"
        });
      }

      const [voucher] = await db.select().from(receiptVouchers).where(eq(receiptVouchers.id, input.id));
      if (!voucher) throw new TRPCError({ code: "NOT_FOUND", message: "سند القبض غير موجود" });

      if (voucher.status === "approval_revoked") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "عذراً، لا يمكن إعادة اعتماد سند قبض تم إلغاء اعتماده بمبررات"
        });
      }

      await db.update(receiptVouchers)
        .set({
          status: "approved",
          rejectionReason: null,
          updatedAt: new Date(),
        })
        .where(eq(receiptVouchers.id, input.id));

      await resequenceVoucherNumbers(db);

      return { success: true };
    }),

  revokeReceiptVoucherApproval: protectedProcedure
    .input(z.object({
      id: z.number(),
      revocationReason: z.string().min(1, "يرجى إدخال مبررات إلغاء الاعتماد"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const hasExceptionPerm = await checkPermission(ctx.user.id, "receipt_vouchers.exception_approve");
      const isFaaa8User = ctx.user.email === "solayani@manarah.org.sa";

      if (!isFaaa8User && !hasExceptionPerm) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "عذراً، إلغاء اعتماد سند القبض يتطلب صلاحية استثناء اعتماد السند أو المسؤول المالي"
        });
      }

      const [voucher] = await db.select().from(receiptVouchers).where(eq(receiptVouchers.id, input.id));
      if (!voucher) throw new TRPCError({ code: "NOT_FOUND", message: "سند القبض غير موجود" });

      await db.update(receiptVouchers)
        .set({
          status: "approval_revoked",
          rejectionReason: input.revocationReason.trim(),
          updatedAt: new Date(),
        })
        .where(eq(receiptVouchers.id, input.id));

      return { success: true };
    }),

  rejectReceiptVoucher: protectedProcedure
    .input(z.object({
      id: z.number(),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const hasExceptionPerm = await checkPermission(ctx.user.id, "receipt_vouchers.exception_approve");
      const isFaaa8User = ctx.user.email === "solayani@manarah.org.sa";

      if (!isFaaa8User && !hasExceptionPerm) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "عذراً، رفض سند القبض يتطلب صلاحية استثناء اعتماد السند أو المسؤول المالي"
        });
      }

      const [voucher] = await db.select().from(receiptVouchers).where(eq(receiptVouchers.id, input.id));
      if (!voucher) throw new TRPCError({ code: "NOT_FOUND", message: "سند القبض غير موجود" });

      if (voucher.status === "approval_revoked") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "عذراً، لا يمكن رفض سند قبض تم إلغاء اعتماده بمبررات"
        });
      }

      await db.update(receiptVouchers)
        .set({
          status: "rejected",
          rejectionReason: input.rejectionReason?.trim() || "مرفوض",
          updatedAt: new Date(),
        })
        .where(eq(receiptVouchers.id, input.id));

      return { success: true };
    }),

  exceptionApproveReceiptVoucher: protectedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().min(1, "يرجى إدخال سبب أو مبررات استثناء اعتماد السند"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const hasExceptionPerm = await checkPermission(ctx.user.id, "receipt_vouchers.exception_approve");

      if (!hasExceptionPerm) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "ليس لديك صلاحية استثناء اعتماد سند القبض"
        });
      }

      const [voucher] = await db.select().from(receiptVouchers).where(eq(receiptVouchers.id, input.id));
      if (!voucher) throw new TRPCError({ code: "NOT_FOUND", message: "سند القبض غير موجود" });

      if (voucher.status === "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "سند القبض معتمد بالفعل"
        });
      }

      await db.update(receiptVouchers)
        .set({
          status: "approved",
          isException: 1,
          exceptionApprovedBy: ctx.user.id,
          exceptionApprovedAt: new Date(),
          exceptionReason: input.reason.trim(),
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          rejectionReason: null,
          updatedAt: new Date(),
        })
        .where(eq(receiptVouchers.id, input.id));

      await resequenceVoucherNumbers(db);

      return { success: true, message: "تم اعتماد سند القبض بالاستثناء بنجاح" };
    }),

  getReceiptVoucherById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await resequenceVoucherNumbers(db);

      const [voucher] = await db
        .select({
          id: receiptVouchers.id,
          voucherNumber: receiptVouchers.voucherNumber,
          projectId: receiptVouchers.projectId,
          amount: receiptVouchers.amount,
          receiptDate: receiptVouchers.receiptDate,
          payerName: receiptVouchers.payerName,
          paymentMethod: receiptVouchers.paymentMethod,
          referenceNumber: receiptVouchers.referenceNumber,
          bankName: receiptVouchers.bankName,
          attachmentUrl: receiptVouchers.attachmentUrl,
          notes: receiptVouchers.notes,
          status: receiptVouchers.status,
          rejectionReason: receiptVouchers.rejectionReason,
          isException: receiptVouchers.isException,
          exceptionApprovedBy: receiptVouchers.exceptionApprovedBy,
          exceptionApprovedAt: receiptVouchers.exceptionApprovedAt,
          exceptionReason: receiptVouchers.exceptionReason,
          approvedBy: receiptVouchers.approvedBy,
          approvedAt: receiptVouchers.approvedAt,
          createdAt: receiptVouchers.createdAt,
          createdById: receiptVouchers.createdById,
        })
        .from(receiptVouchers)
        .where(eq(receiptVouchers.id, input.id));

      if (!voucher) {
        throw new TRPCError({ code: "NOT_FOUND", message: "سند القبض غير موجود" });
      }

      let project: { id: number; name: string; projectNumber: string | null } | undefined = undefined;
      if (voucher.projectId) {
        const [foundProject] = await db
          .select({
            id: projects.id,
            name: projects.name,
            projectNumber: projects.projectNumber,
          })
          .from(projects)
          .where(eq(projects.id, voucher.projectId));
        project = foundProject;
      }

      // التوقيع يظهر بالتقرير فقط وحصرياً إذا كان السند معتمداً (status === 'approved')
      let signerUser = null;
      if (voucher.status === "approved") {
        if (voucher.isException && voucher.exceptionApprovedBy) {
          const approverList = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              signatureUrl: users.signatureUrl,
              signatureName: users.signatureName,
              signatureDepartment: users.signatureDepartment,
              showSignatureInDocuments: users.showSignatureInDocuments,
            })
            .from(users)
            .where(eq(users.id, voucher.exceptionApprovedBy))
            .limit(1);

          signerUser = approverList.length > 0 ? approverList[0] : null;
        }

        if (!signerUser) {
          const signerUserList = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              signatureUrl: users.signatureUrl,
              signatureName: users.signatureName,
              signatureDepartment: users.signatureDepartment,
              showSignatureInDocuments: users.showSignatureInDocuments,
            })
            .from(users)
            .where(eq(users.email, "solayani@manarah.org.sa"))
            .limit(1);

          signerUser = signerUserList.length > 0 ? signerUserList[0] : null;
        }
      }

      return {
        ...voucher,
        project,
        signerUser,
      };
    }),

  // إنشاء مشروع مباشر لعدة مساجد
  createMultiMosqueProject: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "اسم المشروع مطلوب"),
        description: z.string().optional(),
        donorName: z.string().optional().nullable(),
        managerId: z.number().min(1, "يرجى اختيار مدير المشروع"),
        budget: z.number().optional().nullable(),
        durationDays: z.number().optional().nullable(),
        startDate: z.string().optional(),
        expectedEndDate: z.string().optional(),
        mosques: z.array(
          z.object({
            mosqueId: z.number(),
            allocatedBudget: z.number().optional(),
            notes: z.string().optional(),
          })
        ).min(1, "يجب اختيار مسجد واحد على الأقل للمشروع المباشر"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const allowedRoles = ["super_admin", "system_admin", "projects_office", "financial", "financial_manager"];
      const { calculateUserPermissions } = await import("../permissions");
      const userPerms = await calculateUserPermissions(ctx.user.id);

      if (!allowedRoles.includes(ctx.user.role) && !userPerms.includes("projects.create") && !userPerms.includes("projects")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية إنشاء مشروع جديد" });
      }

      const projectNumber = await generateProjectNumber(db);

      let calculatedStartDate = input.startDate ? new Date(input.startDate) : new Date();
      let calculatedEndDate = input.expectedEndDate ? new Date(input.expectedEndDate) : null;
      if (!calculatedEndDate && input.durationDays && input.durationDays > 0) {
        calculatedEndDate = new Date(calculatedStartDate.getTime() + input.durationDays * 24 * 60 * 60 * 1000);
      }

      // 1. إنشاء طلب تلقائي في جدول الطلبات باسم المشروع وبمرحلة إعداد جداول الكميات
      const requestNumber = await generateRequestNumberForProject(db, "bunyan");
      const [reqResult] = await db.insert(mosqueRequests).values({
        requestNumber,
        mosqueId: input.mosques[0]?.mosqueId || null,
        userId: ctx.user.id,
        programType: "bunyan",
        currentStage: "boq_preparation",
        status: "in_progress",
        priority: "normal",
        assignedTo: input.managerId,
        currentResponsible: input.managerId,
        currentResponsibleDepartment: "إدارة المشاريع",
        reviewCompleted: true,
        technicalEvalDecision: "convert_to_project",
        technicalEvalJustification: "تم اعتماد وإنشاء المشروع المباشر بمرحلة إعداد جداول الكميات",
        descriptiveName: null,
        requestTrack: "standard",
        estimatedCost: input.budget !== undefined && input.budget !== null ? input.budget.toString() : null,
        approvedBudget: input.budget !== undefined && input.budget !== null ? input.budget.toString() : null,
        programData: {
          isMultiMosque: true,
          projectName: input.name,
          description: input.description || null,
          durationDays: input.durationDays || null,
          mosqueCount: input.mosques.length,
          mosques: input.mosques,
        },
      });

      const requestId = Number(reqResult.insertId);

      // إضافة سجل تاريخ الطلب
      await db.insert(requestHistory).values({
        requestId,
        userId: ctx.user.id,
        toStage: "boq_preparation",
        toStatus: "in_progress",
        action: "project_created_direct",
        notes: `تم إنشاء المشروع المباشر (${input.name}) ونقله تلقائياً لمرحلة إعداد جداول الكميات`,
      });

      // إضافة سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "project_created_direct",
        entityType: "request",
        entityId: requestId,
        newValues: { requestNumber, projectName: input.name, managerId: input.managerId },
      });

      // 2. إنشاء المشروع المباشر لعدة مساجد وربطه بالطلب المنشأ
      const [projResult] = await db.insert(projects).values({
        projectNumber,
        requestId,
        name: input.name,
        description: input.description || null,
        donorName: input.donorName || null,
        isMultiMosque: true,
        managerId: input.managerId || null,
        status: "planning", // يمثل مرحلة "إعداد جدول الكميات" boq_preparation
        budget: input.budget !== undefined && input.budget !== null ? input.budget.toString() : null,
        startDate: calculatedStartDate,
        expectedEndDate: calculatedEndDate,
        completionPercentage: 0,
      });

      const projectId = Number(projResult.insertId);

      // 3. ربط المساجد بالمشروع في جدول project_mosques
      for (const m of input.mosques) {
        await db.insert(projectMosques).values({
          projectId,
          mosqueId: m.mosqueId,
          allocatedBudget: m.allocatedBudget ? m.allocatedBudget.toString() : null,
          notes: m.notes || null,
        });
      }

      // 4. إنشاء مراحل المشروع الخمس فورياً تبدأ مباشرة من "إعداد جدول الكميات" وتتخطى الطلبات الأولية
      const defaultPhases = [
        { phaseName: "المرحلة الأولى : إعداد جدول الكميات", phaseOrder: 1, status: "in_progress", completionPercentage: 0 },
        { phaseName: "المرحلة الثانية : التقييم المالي واعتماد العرض المناسب", phaseOrder: 2, status: "pending", completionPercentage: 0 },
        { phaseName: "المرحلة الثالثة : التعاقد لتنفيذ أعمال المسجد", phaseOrder: 3, status: "pending", completionPercentage: 0 },
        { phaseName: "المرحلة الرابعة : التنفيذ وصرف مدفوعات العقد", phaseOrder: 4, status: "pending", completionPercentage: 0 },
        { phaseName: "المرحلة الخامسة : المراجعة والاستلام النهائي والإغلاق", phaseOrder: 5, status: "pending", completionPercentage: 0 },
      ];

      for (const phase of defaultPhases) {
        await db.insert(projectPhases).values({
          projectId,
          phaseName: phase.phaseName,
          phaseOrder: phase.phaseOrder,
          status: phase.status as any,
          completionPercentage: phase.completionPercentage,
          description: phase.phaseOrder === 1 ? "إعداد جدول الكميات والشروط للمساجد المشمولة" : undefined,
        });
      }

      if (input.managerId) {
        try {
          await notifyProjectManagerAssigned(projectId, projectNumber, input.name, input.managerId);
        } catch (error) {
          console.error("Failed to send project manager assignment notification on multi-project create:", error);
        }
      }

      return {
        success: true,
        projectId,
        projectNumber,
        requestId,
        requestNumber,
        message: "تم إنشاء مشروع لعدة مساجد والطلب التلقائي بنجاح",
      };
    }),
});


