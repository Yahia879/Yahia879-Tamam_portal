import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { projects, projectPhases, contracts, contractsEnhanced, payments, quantitySchedules, quotations, suppliers, mosqueRequests, users, mosques, projectNumberSequence, contractPayments, disbursementRequests, requestEvaluations } from "../../drizzle/schema";
import { eq, desc, and, sql, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
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
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
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
        !userPermissions.includes("progress_reports.view") &&
        !userPermissions.includes("disbursements.view")
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
          createdAt: projects.createdAt,
          requestId: projects.requestId,
          managerId: projects.managerId,
          managerName: users.name,
          requestStage: mosqueRequests.currentStage,
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
        !userPermissions.includes("progress_reports.view") &&
        !userPermissions.includes("disbursements.view")
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض سجل المشاريع" });
      }

      const conditions = [];
      if (ctx.user?.role === "project_manager") {
        conditions.push(eq(projects.managerId, ctx.user.id));
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
          status: projects.status,
          budget: sql<string>`COALESCE(${projects.budget}, (SELECT SUM(CAST(totalPrice AS DECIMAL(15,2))) FROM quantity_schedules WHERE projectId = ${projects.id}))`.as('budget'),
          actualCost: projects.actualCost,
          startDate: projects.startDate,
          expectedEndDate: projects.expectedEndDate,
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
        !userPermissions.includes("projects.view_details") &&
        !userPermissions.includes("progress_reports.view") &&
        !userPermissions.includes("disbursements.view")
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض تفاصيل هذا المشروع" });
      }

      const [project] = await db
        .select({
          id: projects.id,
          projectNumber: projects.projectNumber,
          name: projects.name,
          description: projects.description,
          status: projects.status,
          budget: projects.budget,
          actualCost: projects.actualCost,
          startDate: projects.startDate,
          expectedEndDate: projects.expectedEndDate,
          completionPercentage: projects.completionPercentage,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          requestId: projects.requestId,
          managerId: projects.managerId,
          managerName: users.name,
        })
        .from(projects)
        .leftJoin(users, eq(projects.managerId, users.id))
        .where(eq(projects.id, input.id));

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المشروع غير موجود" });
      }

      // جلب الطلب المرتبط
      const [request] = input.lightweight ? [null] : await db
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
        .where(eq(mosqueRequests.id, project.requestId));

      // جلب مراحل المشروع
      const phases = input.lightweight ? [] : await db
        .select()
        .from(projectPhases)
        .where(eq(projectPhases.projectId, input.id))
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
        .where(eq(requestEvaluations.requestId, project.requestId))
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
        .where(eq(contractsEnhanced.projectId, input.id));

      const contractIds = projectContracts.map(c => c.id);

      // جلب دفعات العقود
      const allContractPayments = contractIds.length > 0 
        ? await db.select().from(contractPayments).where(inArray(contractPayments.contractId, contractIds))
        : [];

      // جلب طلبات الصرف
      const projectDisbursements = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.projectId, input.id))
        .orderBy(desc(disbursementRequests.createdAt));

      // جلب الدفعات اليدوية
      const manualPayments = await db
        .select()
        .from(payments)
        .where(eq(payments.projectId, input.id))
        .orderBy(desc(payments.createdAt));

      // توحيد الدفعات
      const unifiedPayments: any[] = [];

      // 1. إضافة دفعات العقود المجدولة
      allContractPayments.forEach(cp => {
        unifiedPayments.push({
          id: `cp-${cp.id}`,
          paymentNumber: `PLAN-${cp.id}`,
          paymentType: cp.phaseOrder === 1 ? "advance" : "progress",
          amount: cp.amount,
          status: cp.status === "paid" ? "paid" : "pending",
          description: cp.phaseName,
          date: cp.dueDate || cp.createdAt,
          paidAt: cp.paidAt,
          source: "contract",
          workDescription: cp.notes,
          completionPercentage: cp.completionPercentage || 0,
        });
      });

      // 2. إضافة الدفعات اليدوية
      manualPayments.forEach(p => {
        // إذا كانت الدفعة اليدوية مرتبطة بعقد، قد تكون مكررة مع طلبات الصرف
        // لكن حالياً لا يوجد ربط صريح بين payments و disbursementRequests في الشيمّا
        // سنضيفها فقط إذا لم تكن هناك دفعات أخرى بنفس الرقم (إن وجد)
        unifiedPayments.push({
          id: `manual-${p.id}`,
          paymentNumber: p.paymentNumber,
          paymentType: p.paymentType,
          amount: p.amount,
          status: p.status,
          description: p.description,
          date: p.createdAt,
          paidAt: p.paidAt,
          source: "manual",
          workDescription: p.description,
          completionPercentage: p.completionPercentage || 0,
        });
      });

      // جلب جداول الكميات
      const boq = await db
        .select()
        .from(quantitySchedules)
        .where(eq(quantitySchedules.projectId, input.id));

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
        .where(eq(quotations.projectId, input.id));

      return {
        ...project,
        request,
        phases,
        evaluations,
        contracts: input.lightweight ? [] : projectContracts,
        payments: unifiedPayments,
        boq,
        quotations: projectQuotations,
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

  // إضافة بند في جدول الكميات
  addBOQItem: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      requestId: z.number(),
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
      let projectId = input.projectId;
      
      if (!projectId) {
        const [existingProject] = await db
          .select()
          .from(projects)
          .where(eq(projects.requestId, input.requestId))
          .limit(1);
        
        if (existingProject) {
          projectId = existingProject.id;
        }
        // لا نُنشئ مشروعاً تلقائياً - يجب أن يتم التحويل صراحة
      }

      const totalPrice = input.unitPrice ? input.quantity * input.unitPrice : null;

      const [item] = await db.insert(quantitySchedules).values({
        projectId: projectId,
        requestId: input.requestId,
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

  // جلب جدول الكميات لمشروع
  getBOQ: protectedProcedure
    .input(z.object({ 
      projectId: z.number().optional(),
      requestId: z.number().optional()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // البحث باستخدام requestId أو projectId
      const whereCondition = input.requestId 
        ? eq(quantitySchedules.requestId, input.requestId)
        : input.projectId 
          ? eq(quantitySchedules.projectId, input.projectId)
          : undefined;

      if (!whereCondition) {
        return { items: [], total: 0 };
      }

      const items = await db
        .select()
        .from(quantitySchedules)
        .where(whereCondition)
        .orderBy(quantitySchedules.category, quantitySchedules.itemName);

      // حساب الإجمالي
      const total = items.reduce((sum: number, item: typeof items[0]) => {
        return sum + (item.totalPrice ? parseFloat(item.totalPrice) : 0);
      }, 0);

      return { items, total };
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
      amount: z.number().positive(),
      paymentType: z.enum(["advance", "progress", "final", "retention"]),
      description: z.string().optional(),
      completionPercentage: z.number().optional(),
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
          dateMiladi: disb.dateMiladi ? new Date(disb.dateMiladi).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          completionPercentage: disb.completionPercentage || 0,
        };
      } else if (input.id.startsWith("manual-")) {
         const actualId = parseInt(input.id.replace("manual-", ""));
         const [payment] = await db.select().from(payments).where(eq(payments.id, actualId));
         if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "الدفعة غير موجودة" });
         return {
           id: input.id,
           projectId: payment.projectId || 0,
           contractId: payment.contractId || undefined,
           title: payment.description || "",
           description: payment.description || "",
           amount: parseFloat(payment.amount as string || "0"),
           dateMiladi: new Date(payment.createdAt).toISOString().split('T')[0],
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
          dateMiladi: cp.dueDate ? new Date(cp.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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

      if (input.id.startsWith("disb-")) {
        const actualId = parseInt(input.id.replace("disb-", ""));
        const updateValues: any = { amount: input.amount.toString() };
        if (input.title !== undefined) updateValues.title = input.title;
        if (input.description !== undefined) updateValues.description = input.description;
        if (input.dateMiladi !== undefined) updateValues.dateMiladi = input.dateMiladi;
        if (input.completionPercentage !== undefined) updateValues.completionPercentage = input.completionPercentage;
        
        await db.update(disbursementRequests).set(updateValues).where(eq(disbursementRequests.id, actualId));
      } else if (input.id.startsWith("manual-")) {
        const actualId = parseInt(input.id.replace("manual-", ""));
        const updateValues: any = { amount: input.amount.toString() };
        if (input.title !== undefined) updateValues.description = input.title;
        if (input.completionPercentage !== undefined) updateValues.completionPercentage = input.completionPercentage;
        await db.update(payments).set(updateValues).where(eq(payments.id, actualId));
      } else if (input.id.startsWith("cp-")) {
        const actualId = parseInt(input.id.replace("cp-", ""));
        const updateValues: any = { amount: input.amount.toString() };
        if (input.title !== undefined) updateValues.phaseName = input.title;
        if (input.dateMiladi !== undefined) {
          updateValues.dueDate = new Date(input.dateMiladi);
        }
        if (input.description !== undefined) {
          updateValues.notes = input.description;
        }
        if (input.completionPercentage !== undefined) {
          updateValues.completionPercentage = input.completionPercentage;
        }
        await db.update(contractPayments).set(updateValues).where(eq(contractPayments.id, actualId));
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
      totalAmount: z.number().positive(),
      finalAmount: z.number().positive().optional(),
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
        })
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.projectId, proj.id));

      const contractIds = projectContracts.map(c => c.id);

      // جلب دفعات العقود
      const allContractPayments = contractIds.length > 0 
        ? await db.select().from(contractPayments).where(inArray(contractPayments.contractId, contractIds))
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
        unifiedPayments.push({
          id: `cp-${cp.id}`,
          paymentNumber: `PLAN-${cp.id}`,
          paymentType: cp.phaseOrder === 1 ? "advance" : "progress",
          amount: cp.amount,
          status: cp.status === "paid" ? "paid" : "pending",
          description: cp.phaseName,
          date: cp.dueDate || cp.createdAt,
          paidAt: cp.paidAt,
          source: "contract",
          workDescription: cp.notes,
          completionPercentage: cp.completionPercentage || 0,
        });
      });

      // 2. إضافة الدفعات اليدوية
      manualPayments.forEach(p => {
        unifiedPayments.push({
          id: `manual-${p.id}`,
          paymentNumber: p.paymentNumber,
          paymentType: p.paymentType,
          amount: p.amount,
          status: p.status,
          description: p.description,
          date: p.createdAt,
          paidAt: p.paidAt,
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
});
