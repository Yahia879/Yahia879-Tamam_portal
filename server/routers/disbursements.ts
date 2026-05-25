import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { permissionProcedure } from "../permissions";
import { getDb } from "../db";
import {
  disbursementRequests,
  disbursementOrders,
  disbursementRequestStatuses,
  disbursementOrderStatuses,
  projects,
  contractsEnhanced,
  contractPayments,
  payments,
  suppliers,
  users,
  notifications,
} from "../../drizzle/schema";
import { eq, desc, and, sql, isNull, or, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// توليد رقم طلب صرف
async function generateDisbursementRequestNumber(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const currentYear = new Date().getFullYear();
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(disbursementRequests);
  const sequence = (countResult?.count || 0) + 1;
  return `DR-${currentYear}-${sequence.toString().padStart(4, "0")}`;
}

// توليد رقم أمر صرف
async function generateDisbursementOrderNumber(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const currentYear = new Date().getFullYear();
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(disbursementOrders);
  const sequence = (countResult?.count || 0) + 1;
  return `DO-${currentYear}-${sequence.toString().padStart(4, "0")}`;
}

export const disbursementsRouter = router({
  // ==================== طلبات الصرف ====================

  // جلب قائمة طلبات الصرف
  listRequests: permissionProcedure("disbursements.view")
    .input(
      z.object({
        projectId: z.number().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { projectId, status, search, page = 1, limit = 10 } = input || {};

      const conditions = [];
      if (projectId) conditions.push(eq(disbursementRequests.projectId, projectId));
      if (status && status !== "all") conditions.push(eq(disbursementRequests.status, status as any));

      if (search) {
        const searchPattern = `%${search.toLowerCase()}%`;
        conditions.push(
          or(
            like(sql`LOWER(${disbursementRequests.requestNumber})`, searchPattern),
            like(sql`LOWER(${disbursementRequests.description})`, searchPattern),
            like(sql`LOWER(${projects.name})`, searchPattern)
          )
        );
      }

      const requests = await db
        .select({
          id: disbursementRequests.id,
          requestNumber: disbursementRequests.requestNumber,
          title: disbursementRequests.description,
          amount: disbursementRequests.amount,
          status: disbursementRequests.status,
          requestedAt: disbursementRequests.requestedAt,
          dateMiladi: disbursementRequests.dateMiladi,
          projectId: disbursementRequests.projectId,
          projectName: projects.name,
          projectNumber: projects.projectNumber,
          requestedByName: users.name,
          contractPaymentId: disbursementRequests.contractPaymentId,
        })
        .from(disbursementRequests)
        .leftJoin(projects, eq(disbursementRequests.projectId, projects.id))
        .leftJoin(users, eq(disbursementRequests.requestedBy, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(disbursementRequests.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(disbursementRequests)
        .leftJoin(projects, eq(disbursementRequests.projectId, projects.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        requests,
        total: countResult?.count || 0,
        page,
        limit,
      };
    }),

  // جلب طلب صرف بالتفصيل
  getRequestById: permissionProcedure("disbursements.view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [request] = await db
        .select({
          id: disbursementRequests.id,
          requestNumber: disbursementRequests.requestNumber,
          title: disbursementRequests.title,
          description: disbursementRequests.description,
          amount: disbursementRequests.amount,
          paymentType: disbursementRequests.paymentType,
          completionPercentage: disbursementRequests.completionPercentage,
          attachmentsJson: disbursementRequests.attachmentsJson,
          status: disbursementRequests.status,
          requestedAt: disbursementRequests.requestedAt,
          approvedAt: disbursementRequests.approvedAt,
          approvalNotes: disbursementRequests.approvalNotes,
          rejectedAt: disbursementRequests.rejectedAt,
          rejectionReason: disbursementRequests.rejectionReason,
          projectId: disbursementRequests.projectId,
          contractId: disbursementRequests.contractId,
          contractPaymentId: disbursementRequests.contractPaymentId,
        })
        .from(disbursementRequests)
        .where(eq(disbursementRequests.id, input.id));

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب الصرف غير موجود" });
      }

      // جلب بيانات المشروع
      const [project] = await db
        .select({
          id: projects.id,
          name: projects.name,
          projectNumber: projects.projectNumber,
        })
        .from(projects)
        .where(eq(projects.id, request.projectId));

      // جلب بيانات العقد إن وجد
      let contract = null;
      if (request.contractId) {
        const [contractData] = await db
          .select({
            id: contractsEnhanced.id,
            contractNumber: contractsEnhanced.contractNumber,
            contractTitle: contractsEnhanced.contractTitle,
            secondPartyName: contractsEnhanced.secondPartyName,
          })
          .from(contractsEnhanced)
          .where(eq(contractsEnhanced.id, request.contractId));
        contract = contractData;
      }

      // جلب أمر الصرف المرتبط إن وجد
      const [order] = await db
        .select()
        .from(disbursementOrders)
        .where(eq(disbursementOrders.disbursementRequestId, input.id));

      return {
        ...request,
        project,
        contract,
        disbursementOrder: order || null,
      };
    }),

  // إنشاء طلب صرف جديد
  createRequest: permissionProcedure("disbursements.create")
    .input(
      z.object({
        projectId: z.number(),
        contractId: z.number().optional(),
        contractPaymentId: z.number().optional(),
        title: z.string().min(1, "عنوان الطلب مطلوب"),
        description: z.string().optional(),
        amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
        paymentType: z.enum(["advance", "progress", "final", "retention"]).default("progress"),
        completionPercentage: z.number().min(0).max(100).optional(),
        dateMiladi: z.string().optional(),
        // الحقول الجديدة        fundingSourceId: z.number().optional(),
        fundingSourceName: z.string().optional(),
        ownerDepartmentId: z.number().optional(),
        ownerDepartmentName: z.string().optional(),
        workDescription: z.string().optional(),
        actualCost: z.number().optional(),
        adminFees: z.number().optional(),
        attachments: z.array(z.object({
          name: z.string(),
          url: z.string(),
          type: z.string().optional(),
        })).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من الصلاحيات
      const allowedRoles = ["super_admin", "system_admin", "projects_office", "project_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية إنشاء طلب صرف" });
      }

      // التحقق من وجود المشروع
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المشروع غير موجود" });
      }

      const requestNumber = await generateDisbursementRequestNumber(db);

      const [result] = await db.insert(disbursementRequests).values({
        requestNumber,
        projectId: input.projectId,
        contractId: input.contractId,
        contractPaymentId: input.contractPaymentId,
        title: input.title,
        description: input.description,
        amount: input.amount.toString(),
        paymentType: input.paymentType,
        dateMiladi: input.dateMiladi ? new Date(input.dateMiladi) : null,
        completionPercentage: input.completionPercentage,
        attachmentsJson: input.attachments ? JSON.stringify(input.attachments) : null,
        status: "pending",
        requestedBy: ctx.user.id,
      });

      // إرسال إشعار للإدارة المالية
      const financialUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "financial"), isNull(users.deletedAt)));

      for (const user of financialUsers) {
        await db.insert(notifications).values({
          userId: user.id,
          title: "طلب صرف جديد",
          message: `تم تقديم طلب صرف جديد رقم ${requestNumber} للمشروع ${project.name}`,
          type: "info",
          relatedType: "disbursement_request",
          relatedId: Number(result.insertId),
        });
      }

      return {
        success: true,
        id: result.insertId,
        requestNumber,
        message: "تم إنشاء طلب الصرف بنجاح",
      };
    }),

  // اعتماد طلب صرف
  approveRequest: permissionProcedure("financial.approve")
    .input(
      z.object({
        id: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من الصلاحيات
      const allowedRoles = ["super_admin", "system_admin", "general_manager", "financial", "financial_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية اعتماد طلب الصرف" });
      }

      const [request] = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.id, input.id));

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب الصرف غير موجود" });
      }

      if (request.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن اعتماد هذا الطلب في حالته الحالية" });
      }

      await db
        .update(disbursementRequests)
        .set({
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          approvalNotes: input.notes,
        })
        .where(eq(disbursementRequests.id, input.id));

      // إرسال إشعار لمقدم الطلب
      await db.insert(notifications).values({
        userId: request.requestedBy,
        title: "تم اعتماد طلب الصرف",
        message: `تم اعتماد طلب الصرف رقم ${request.requestNumber}`,
        type: "success",
        relatedType: "disbursement_request",
        relatedId: input.id,
      });

      // إرسال إشعار للإدارة المالية لإنشاء أمر الصرف
      const financialUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "financial"), isNull(users.deletedAt)));

      // جلب بيانات المشروع
      const [project] = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, request.projectId));

      for (const user of financialUsers) {
        await db.insert(notifications).values({
          userId: user.id,
          title: "طلب صرف معتمد - يحتاج إنشاء أمر صرف",
          message: `تم اعتماد طلب الصرف رقم ${request.requestNumber} للمشروع ${project?.name || "غير محدد"} بمبلغ ${Number(request.amount).toLocaleString("ar-SA")} ريال. يرجى إنشاء أمر الصرف.`,
          type: "warning",
          relatedType: "disbursement_request",
          relatedId: input.id,
        });
      }

      return { success: true, message: "تم اعتماد طلب الصرف بنجاح" };
    }),

  // رفض طلب صرف
  rejectRequest: permissionProcedure("financial.approve")
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "سبب الرفض مطلوب"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const allowedRoles = ["super_admin", "system_admin", "general_manager", "financial", "financial_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية رفض طلب الصرف" });
      }

      const [request] = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.id, input.id));

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب الصرف غير موجود" });
      }

      await db
        .update(disbursementRequests)
        .set({
          status: "rejected",
          rejectedBy: ctx.user.id,
          rejectedAt: new Date(),
          rejectionReason: input.reason,
        })
        .where(eq(disbursementRequests.id, input.id));

      // إرسال إشعار لمقدم الطلب
      await db.insert(notifications).values({
        userId: request.requestedBy,
        title: "تم رفض طلب الصرف",
        message: `تم رفض طلب الصرف رقم ${request.requestNumber}: ${input.reason}`,
        type: "error",
        relatedType: "disbursement_request",
        relatedId: input.id,
      });

      return { success: true, message: "تم رفض طلب الصرف" };
    }),

  // ==================== أوامر الصرف ====================

  // جلب قائمة أوامر الصرف
  listOrders: permissionProcedure("disbursements.view")
    .input(
      z.object({
        status: z.enum(disbursementOrderStatuses).optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { status, page = 1, limit = 10 } = input || {};

      const conditions = [];
      if (status) conditions.push(eq(disbursementOrders.status, status));

      const orders = await db
        .select({
          id: disbursementOrders.id,
          orderNumber: disbursementOrders.orderNumber,
          amount: disbursementOrders.amount,
          beneficiaryName: disbursementOrders.beneficiaryName,
          beneficiaryBank: disbursementOrders.beneficiaryBank,
          beneficiaryIban: disbursementOrders.beneficiaryIban,

          paymentMethod: disbursementOrders.paymentMethod,
          status: disbursementOrders.status,
          createdAt: disbursementOrders.createdAt,
          approvedAt: disbursementOrders.approvedAt,
          requestNumber: disbursementRequests.requestNumber,
          requestTitle: disbursementRequests.description,
          projectId: projects.id,
          projectName: projects.name,
          projectBudget: projects.budget,
        })
        .from(disbursementOrders)
        .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
        .leftJoin(projects, eq(disbursementRequests.projectId, projects.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(disbursementOrders.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      // إضافة بيانات العقد والمبالغ المدفوعة
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          // جلب بيانات العقد
          let contractAmount = 0;
          let totalPaid = 0;
          let remainingAmount = 0;

          if (order.projectId) {
            // جلب العقد المرتبط بالمشروع
            const [contract] = await db
              .select({ contractAmount: contractsEnhanced.contractAmount })
              .from(contractsEnhanced)
              .where(eq(contractsEnhanced.projectId, order.projectId));
            
            if (contract) {
              contractAmount = Number(contract.contractAmount || 0);
            }

            // حساب إجمالي المدفوع
            const [paidResult] = await db
              .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
              .from(disbursementRequests)
              .where(
                and(
                  eq(disbursementRequests.projectId, order.projectId),
                  eq(disbursementRequests.status, "paid")
                )
              );
            
            totalPaid = Number(paidResult?.total || 0);
            remainingAmount = contractAmount - totalPaid - Number(order.amount);
          }

          // جلب أسماء المستخدمين
          const [creator] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, (order as any).createdBy || 0));

          let approverName = null;
          if ((order as any).approvedBy) {
            const [approver] = await db
              .select({ name: users.name })
              .from(users)
              .where(eq(users.id, (order as any).approvedBy));
            approverName = approver?.name;
          }

          return {
            ...order,
            contractAmount,
            totalPaid,
            remainingAmount,
            createdByName: creator?.name,
            approvedByName: approverName,
          };
        })
      );

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(disbursementOrders)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        orders: ordersWithDetails,
        total: countResult?.count || 0,
        page,
        limit,
      };
    }),

  // جلب أمر صرف بالتفصيل
  getOrderById: permissionProcedure("disbursements.view")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [order] = await db
        .select()
        .from(disbursementOrders)
        .where(eq(disbursementOrders.id, input.id));

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "أمر الصرف غير موجود" });
      }

      // جلب طلب الصرف المرتبط
      const [request] = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.id, order.disbursementRequestId));

      // جلب المشروع
      let project = null;
      if (request) {
        const [projectData] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, request.projectId));
        project = projectData;
      }

      return {
        ...order,
        disbursementRequest: request,
        project,
      };
    }),

  // إنشاء أمر صرف
  createOrder: permissionProcedure("disbursements.create")
    .input(
      z.object({
        disbursementRequestId: z.number(),
        beneficiaryName: z.string().min(1, "اسم المستفيد مطلوب"),
        beneficiaryBank: z.string().optional(),
        beneficiaryIban: z.string().optional(),
        paymentMethod: z.enum(["bank_transfer", "check", "custody"]).default("bank_transfer"),
        beneficiaryAccountName: z.string().optional(),
        sadadNumber: z.string().optional(),
        billerCode: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من الصلاحيات
      const allowedRoles = ["super_admin", "system_admin", "financial", "financial_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية إنشاء أمر صرف" });
      }

      // التحقق من طلب الصرف
      const [request] = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.id, input.disbursementRequestId));

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب الصرف غير موجود" });
      }

      if (request.status !== "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "طلب الصرف غير معتمد" });
      }

      // التحقق من عدم وجود أمر صرف سابق
      const [existingOrder] = await db
        .select()
        .from(disbursementOrders)
        .where(eq(disbursementOrders.disbursementRequestId, input.disbursementRequestId));

      if (existingOrder) {
        throw new TRPCError({ code: "CONFLICT", message: "يوجد أمر صرف مرتبط بهذا الطلب بالفعل" });
      }

      const orderNumber = await generateDisbursementOrderNumber(db);

      const [result] = await db.insert(disbursementOrders).values({
        orderNumber,
        disbursementRequestId: input.disbursementRequestId,
        amount: request.amount,
        beneficiaryName: input.beneficiaryName,
        beneficiaryBank: input.beneficiaryBank,
        beneficiaryIban: input.beneficiaryIban,
        paymentMethod: input.paymentMethod,
        status: "pending",
        createdBy: ctx.user.id,
      });

      // إرسال إشعار للمدير العام لاعتماد أمر الصرف
      const managers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          sql`${users.role} IN ('super_admin', 'system_admin', 'general_manager')`,
          isNull(users.deletedAt)
        ));

      // جلب بيانات المشروع
      const [project] = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, request.projectId));

      for (const manager of managers) {
        await db.insert(notifications).values({
          userId: manager.id,
          title: "أمر صرف جديد يحتاج اعتماد",
          message: `تم إنشاء أمر صرف رقم ${orderNumber} للمشروع ${project?.name || "غير محدد"} بمبلغ ${Number(request.amount).toLocaleString("ar-SA")} ريال. يرجى الاعتماد.`,
          type: "warning",
          relatedType: "disbursement_order",
          relatedId: Number(result.insertId),
        });
      }

      return {
        success: true,
        id: result.insertId,
        orderNumber,
        message: "تم إنشاء أمر الصرف بنجاح",
      };
    }),

  // اعتماد أمر صرف
  approveOrder: permissionProcedure("financial.approve")
    .input(
      z.object({
        id: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const allowedRoles = ["super_admin", "system_admin", "general_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية اعتماد أمر الصرف" });
      }

      const [order] = await db
        .select()
        .from(disbursementOrders)
        .where(eq(disbursementOrders.id, input.id));

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "أمر الصرف غير موجود" });
      }

      if (order.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن اعتماد هذا الأمر في حالته الحالية" });
      }

      await db
        .update(disbursementOrders)
        .set({
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          approvalNotes: input.notes,
        })
        .where(eq(disbursementOrders.id, input.id));

      // إرسال إشعار للإدارة المالية لتنفيذ أمر الصرف
      const financialUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "financial"));

      for (const user of financialUsers) {
        await db.insert(notifications).values({
          userId: user.id,
          title: "أمر صرف معتمد - جاهز للتنفيذ",
          message: `تم اعتماد أمر الصرف رقم ${order.orderNumber} بمبلغ ${Number(order.amount).toLocaleString("ar-SA")} ريال. يرجى تنفيذ الدفع.`,
          type: "success",
          relatedType: "disbursement_order",
          relatedId: input.id,
        });
      }

      return { success: true, message: "تم اعتماد أمر الصرف بنجاح" };
    }),

  // تنفيذ أمر صرف (الدفع الفعلي)
  executeOrder: permissionProcedure("disbursements.create")
    .input(
      z.object({
        id: z.number(),
        transactionReference: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const allowedRoles = ["super_admin", "system_admin", "financial", "financial_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تنفيذ أمر الصرف" });
      }

      const [order] = await db
        .select()
        .from(disbursementOrders)
        .where(eq(disbursementOrders.id, input.id));

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "أمر الصرف غير موجود" });
      }

      if (order.status !== "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "أمر الصرف غير معتمد" });
      }

      await db
        .update(disbursementOrders)
        .set({
          status: "executed",
          executedBy: ctx.user.id,
          executedAt: new Date(),
          transactionReference: input.transactionReference,
        })
        .where(eq(disbursementOrders.id, input.id));

      // تحديث حالة طلب الصرف
      await db
        .update(disbursementRequests)
        .set({ status: "paid" })
        .where(eq(disbursementRequests.id, order.disbursementRequestId));

      // تحديث حالة دفعة العقد إن وجدت
      const [request] = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.id, order.disbursementRequestId));

      if (request?.contractPaymentId) {
        await db
          .update(contractPayments)
          .set({
            status: "paid",
            paidAt: new Date(),
            paidBy: ctx.user.id,
          })
          .where(eq(contractPayments.id, request.contractPaymentId));
      }

      // تحديث التكلفة الفعلية للمشروع
      if (request?.projectId) {
        await db
          .update(projects)
          .set({
            actualCost: sql`CAST(COALESCE(${projects.actualCost}, 0) + ${request.amount} AS DECIMAL(15,2))`,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, request.projectId));
      }
      return { success: true, message: "تم تنفيذ أمر الصرف بنجاح" };
    }),

  // رفض أمر صرف
  rejectOrder: permissionProcedure("financial.approve")
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "سبب الرفض مطلوب"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const allowedRoles = ["super_admin", "system_admin", "general_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية رفض أمر الصرف" });
      }

      await db
        .update(disbursementOrders)
        .set({
          status: "rejected",
          rejectedBy: ctx.user.id,
          rejectedAt: new Date(),
          rejectionReason: input.reason,
        })
        .where(eq(disbursementOrders.id, input.id));

      return { success: true, message: "تم رفض أمر الصرف" };
    }),

  // جلب طلبات الصرف للمشروع
  getRequestsByProject: permissionProcedure("disbursements.view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const requests = await db
        .select({
          id: disbursementRequests.id,
          requestNumber: disbursementRequests.requestNumber,
          title: disbursementRequests.title,
          amount: disbursementRequests.amount,
          paymentType: disbursementRequests.paymentType,
          status: disbursementRequests.status,
          requestedAt: disbursementRequests.requestedAt,
          approvedAt: disbursementRequests.approvedAt,
        })
        .from(disbursementRequests)
        .where(eq(disbursementRequests.projectId, input.projectId))
        .orderBy(desc(disbursementRequests.createdAt));

      return { requests };
    }),

  // جلب المشاريع مع بيانات العقد والمورد لنموذج طلب الصرف
  getProjectsWithContractDetails: permissionProcedure("disbursements.view").query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

    // جلب المشاريع التي لها عقود معتمدة أو نشطة
    const projectsWithContracts = await db
      .select({
        // بيانات المشروع
        projectId: projects.id,
        projectNumber: projects.projectNumber,
        projectName: projects.name,
        projectDescription: projects.description,
        projectBudget: projects.budget,
        projectActualCost: projects.actualCost,
        projectStatus: projects.status,
        // بيانات العقد
        contractId: contractsEnhanced.id,
        contractNumber: contractsEnhanced.contractNumber,
        contractTitle: contractsEnhanced.contractTitle,
        contractAmount: contractsEnhanced.contractAmount,
        contractStatus: contractsEnhanced.status,
        // بيانات المورد
        supplierId: contractsEnhanced.supplierId,
        supplierName: contractsEnhanced.secondPartyName,
        supplierBank: contractsEnhanced.secondPartyBankName,
        supplierIban: contractsEnhanced.secondPartyIban,
        supplierAccountName: contractsEnhanced.secondPartyAccountName,
        supplierPhone: contractsEnhanced.secondPartyPhone,
        supplierEmail: contractsEnhanced.secondPartyEmail,
      })
      .from(projects)
      .innerJoin(contractsEnhanced, eq(projects.id, contractsEnhanced.projectId))
      .where(
        sql`${contractsEnhanced.status} IN ('approved', 'active')`
      )
      .orderBy(desc(projects.createdAt));

    // حساب إجمالي المصروف لكل مشروع
    const projectsWithTotals = await Promise.all(
      projectsWithContracts.map(async (project) => {
        // حساب إجمالي المصروف من طلبات الصرف المدفوعة
        const [paidResult] = await db
          .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
          .from(disbursementRequests)
          .where(
            and(
              eq(disbursementRequests.projectId, project.projectId),
              eq(disbursementRequests.status, "paid")
            )
          );

        const totalPaid = Number(paidResult?.total || 0);
        const contractAmount = Number(project.contractAmount || 0);
        const remainingAmount = contractAmount - totalPaid;

        return {
          ...project,
          totalPaid,
          remainingAmount,
        };
      })
    );

    return { projects: projectsWithTotals };
  }),

  // التقرير المالي الشامل
  getFinancialReport: permissionProcedure("reports.view")
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        projectId: z.number().optional(),
        groupBy: z.enum(["project", "month", "fundingSource"]).default("project"),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // إجمالي المصروفات حسب المشروع (طلبات الصرف + الدفعات اليدوية)
      const projectRequests = db
        .select({
          projectId: disbursementRequests.projectId,
          amount: disbursementRequests.amount,
          status: disbursementRequests.status,
        })
        .from(disbursementRequests);

      const projectManualPayments = db
        .select({
          projectId: payments.projectId,
          amount: payments.amount,
          status: payments.status,
        })
        .from(payments);

      const allProjectFinancials = sql`(${projectRequests} UNION ALL ${projectManualPayments})`;

      const byProject = await db
        .select({
          projectId: projects.id,
          projectName: projects.name,
          projectNumber: projects.projectNumber,
          totalRequested: sql<number>`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)`,
          approvedCount: sql<number>`SUM(CASE WHEN f.status IN ('approved', 'paid') THEN 1 ELSE 0 END)`,
          paidCount: sql<number>`SUM(CASE WHEN f.status = 'paid' THEN 1 ELSE 0 END)`,
          totalPaid: sql<number>`COALESCE(SUM(CASE WHEN f.status = 'paid' THEN CAST(f.amount AS DECIMAL(15,2)) ELSE 0 END), 0)`,
        })
        .from(projects)
        .leftJoin(sql`${allProjectFinancials} as f`, eq(projects.id, sql`f.projectId`))
        .groupBy(projects.id, projects.name, projects.projectNumber)
        .orderBy(desc(sql`totalRequested`));

      // إجمالي المصروفات حسب الشهر
      const monthRequests = db
        .select({
          month: sql<string>`DATE_FORMAT(createdAt, '%Y-%m')`,
          amount: disbursementRequests.amount,
          status: disbursementRequests.status,
        })
        .from(disbursementRequests);

      const monthManual = db
        .select({
          month: sql<string>`DATE_FORMAT(createdAt, '%Y-%m')`,
          amount: payments.amount,
          status: payments.status,
        })
        .from(payments);

      const allMonthlyFinancials = sql`(${monthRequests} UNION ALL ${monthManual})`;

      const byMonth = await db
        .select({
          month: sql`f.month`,
          totalRequested: sql<number>`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)`,
          requestCount: sql<number>`COUNT(*)`,
          totalPaid: sql<number>`COALESCE(SUM(CASE WHEN f.status = 'paid' THEN CAST(f.amount AS DECIMAL(15,2)) ELSE 0 END), 0)`,
        })
        .from(sql`${allMonthlyFinancials} as f`)
        .groupBy(sql`f.month`)
        .orderBy(desc(sql`f.month`));

      // إجمالي المصروفات حسب نوع الدفعة
      const typeRequests = db
        .select({
          paymentType: disbursementRequests.paymentType,
          amount: disbursementRequests.amount,
          status: disbursementRequests.status,
        })
        .from(disbursementRequests);

      const typeManual = db
        .select({
          paymentType: payments.paymentType,
          amount: payments.amount,
          status: payments.status,
        })
        .from(payments);

      const allTypeFinancials = sql`(${typeRequests} UNION ALL ${typeManual})`;

      const byFundingSource = await db
        .select({
          fundingSource: sql`f.paymentType`,
          totalRequested: sql<number>`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)`,
          requestCount: sql<number>`COUNT(*)`,
          totalPaid: sql<number>`COALESCE(SUM(CASE WHEN f.status = 'paid' THEN CAST(f.amount AS DECIMAL(15,2)) ELSE 0 END), 0)`,
        })
        .from(sql`${allTypeFinancials} as f`)
        .groupBy(sql`f.paymentType`)
        .orderBy(desc(sql`totalRequested`));

      // إجمالي أوامر الصرف حسب الحالة
      const ordersByStatus = await db
        .select({
          status: disbursementOrders.status,
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`COALESCE(SUM(${disbursementOrders.amount}), 0)`,
        })
        .from(disbursementOrders)
        .groupBy(disbursementOrders.status);

      // إجماليات عامة
      const [totals] = await db
        .select({
          totalRequests: sql<number>`COUNT(*)`,
          totalRequestedAmount: sql<number>`COALESCE(SUM(${disbursementRequests.amount}), 0)`,
          totalPaidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${disbursementRequests.status} = 'paid' THEN ${disbursementRequests.amount} ELSE 0 END), 0)`,
          pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${disbursementRequests.status} IN ('pending', 'approved') THEN ${disbursementRequests.amount} ELSE 0 END), 0)`,
        })
        .from(disbursementRequests);

      const [manualTotals] = await db
        .select({
          totalPaidAmount: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)`,
        })
        .from(payments);

      const [orderTotals] = await db
        .select({
          totalOrders: sql<number>`COUNT(*)`,
          totalOrderAmount: sql<number>`COALESCE(SUM(${disbursementOrders.amount}), 0)`,
          executedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${disbursementOrders.status} IN ('executed', 'paid') THEN ${disbursementOrders.amount} ELSE 0 END), 0)`,
        })
        .from(disbursementOrders);

      // إجماليات العقود
      const [contractTotals] = await db
        .select({
          totalContracts: sql<number>`COUNT(*)`,
          totalContractAmount: sql<number>`COALESCE(SUM(CAST(${contractsEnhanced.contractAmount} AS DECIMAL(15,2))), 0)`,
          activeContracts: sql<number>`SUM(CASE WHEN ${contractsEnhanced.status} IN ('active', 'approved') THEN 1 ELSE 0 END)`,
        })
        .from(contractsEnhanced);
      // ملخص العقود مع نسبة الصرف
      const contractsSummary = await db
        .select({
          contractId: contractsEnhanced.id,
          contractNumber: contractsEnhanced.contractNumber,
          contractTitle: contractsEnhanced.contractTitle,
          contractAmount: contractsEnhanced.contractAmount,
          contractStatus: contractsEnhanced.status,
          projectId: projects.id,
          projectName: projects.name,
          supplierName: contractsEnhanced.secondPartyName,
        })
        .from(contractsEnhanced)
        .leftJoin(projects, eq(contractsEnhanced.projectId, projects.id))
        .orderBy(desc(contractsEnhanced.createdAt))
        .limit(20);
      // حساب المصروف لكل عقد
      const contractsWithDisbursements = await Promise.all(
        contractsSummary.map(async (contract) => {
          const [paidDisb] = await db
            .select({ total: sql<number>`COALESCE(SUM(CAST(${disbursementRequests.amount} AS DECIMAL(15,2))), 0)` })
            .from(disbursementRequests)
            .where(and(
              eq(disbursementRequests.contractId, contract.contractId),
              eq(disbursementRequests.status, "paid")
            ));

          const [paidManual] = await db
            .select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL(15,2))), 0)` })
            .from(payments)
            .where(and(
              eq(payments.contractId, contract.contractId),
              eq(payments.status, "paid")
            ));

          const contractAmount = Number(contract.contractAmount || 0);
          const totalPaid = Number(paidDisb?.total || 0) + Number(paidManual?.total || 0);
          return {
            ...contract,
            contractAmount,
            totalPaid,
            remainingAmount: contractAmount - totalPaid,
            disbursementPercentage: contractAmount > 0 ? Math.round((totalPaid / contractAmount) * 100) : 0,
          };
        })
      );
      return {
        byProject,
        byMonth,
        byFundingSource,
        ordersByStatus,
        contractsSummary: contractsWithDisbursements,
        summary: {
          totalRequests: totals?.totalRequests || 0,
          totalRequestedAmount: Number(totals?.totalRequestedAmount || 0),
          totalPaidAmount: Number(totals?.totalPaidAmount || 0) + Number(manualTotals?.totalPaidAmount || 0),
          pendingAmount: Number(totals?.pendingAmount || 0),
          totalOrders: orderTotals?.totalOrders || 0,
          totalOrderAmount: Number(orderTotals?.totalOrderAmount || 0),
          executedAmount: Number(orderTotals?.executedAmount || 0),
          totalContracts: contractTotals?.totalContracts || 0,
          totalContractAmount: Number(contractTotals?.totalContractAmount || 0),
          activeContracts: contractTotals?.activeContracts || 0,
        },
      };
    }),

  // إحصائيات طلبات الصرف
  getStats: permissionProcedure("disbursements.view").query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

    const [pendingRequests] = await db
      .select({ count: sql<number>`count(*)` })
      .from(disbursementRequests)
      .where(eq(disbursementRequests.status, "pending"));

    const [approvedRequests] = await db
      .select({ count: sql<number>`count(*)` })
      .from(disbursementRequests)
      .where(eq(disbursementRequests.status, "approved"));

    const [pendingOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(disbursementOrders)
      .where(eq(disbursementOrders.status, "pending"));

    const [totalPaidDisb] = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(disbursementRequests)
      .where(eq(disbursementRequests.status, "paid"));

    const [totalPaidManual] = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(eq(payments.status, "paid"));

    return {
      pendingRequests: pendingRequests?.count || 0,
      approvedRequests: approvedRequests?.count || 0,
      pendingOrders: pendingOrders?.count || 0,
      totalPaid: Number(totalPaidDisb?.total || 0) + Number(totalPaidManual?.total || 0),
    };
  }),

  // الحصول على ملخص الحركة المالية
  getFinancialSummary: permissionProcedure("disbursements.view")
    .input(
      z.object({
        projectId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { projectId } = input || {};

      // إجمالي المبلغ المعتمد (من العقود)
      const contractConditions = projectId ? eq(contractsEnhanced.projectId, projectId) : undefined;
      const [totalApprovedResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${contractsEnhanced.contractAmount}), 0)` })
        .from(contractsEnhanced)
        .where(and(
          eq(contractsEnhanced.status, "active"),
          contractConditions
        ));

      const totalApproved = Number(totalApprovedResult?.total || 0);

      // إجمالي المبلغ المصروف (طلبات الصرف + الدفعات اليدوية)
      const paidConditions = [
        eq(disbursementRequests.status, "paid"),
        projectId ? eq(disbursementRequests.projectId, projectId) : undefined,
      ].filter(Boolean);

      const [totalPaidDisbursements] = await db
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(disbursementRequests)
        .where(paidConditions.length > 0 ? and(...paidConditions) : undefined);

      const manualPaidConditions = [
        eq(payments.status, "paid"),
        projectId ? eq(payments.projectId, projectId) : undefined,
      ].filter(Boolean);

      const [totalPaidManual] = await db
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(payments)
        .where(manualPaidConditions.length > 0 ? and(...manualPaidConditions) : undefined);

      const totalPaid = Number(totalPaidDisbursements?.total || 0) + Number(totalPaidManual?.total || 0);

      // إجمالي المبلغ المتبقي
      const totalRemaining = totalApproved - totalPaid;

      // عدد الطلبات قيد المراجعة
      const pendingConditions = [
        eq(disbursementRequests.status, "pending"),
        projectId ? eq(disbursementRequests.projectId, projectId) : undefined,
      ].filter(Boolean);

      const [pendingResult] = await db
        .select({ 
          count: sql<number>`COUNT(*)`,
          total: sql<number>`COALESCE(SUM(amount), 0)`,
        })
        .from(disbursementRequests)
        .where(pendingConditions.length > 0 ? and(...pendingConditions) : undefined);

      const pendingRequests = Number(pendingResult?.count || 0);
      const pendingAmount = Number(pendingResult?.total || 0);

      // تفاصيل الدفعات حسب النوع
      const paymentTypes = ["advance", "progress", "final", "retention"] as const;
      const paymentBreakdown: Record<string, number> = {};

      for (const type of paymentTypes) {
        // دفعات طلبات الصرف
        const typeConditions = [
          eq(disbursementRequests.status, "paid"),
          eq(disbursementRequests.paymentType, type),
          projectId ? eq(disbursementRequests.projectId, projectId) : undefined,
        ].filter(Boolean);

        const [typeResult] = await db
          .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
          .from(disbursementRequests)
          .where(typeConditions.length > 0 ? and(...typeConditions) : undefined);

        // الدفعات اليدوية
        const manualTypeConditions = [
          eq(payments.status, "paid"),
          eq(payments.paymentType, type),
          projectId ? eq(payments.projectId, projectId) : undefined,
        ].filter(Boolean);

        const [manualTypeResult] = await db
          .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
          .from(payments)
          .where(manualTypeConditions.length > 0 ? and(...manualTypeConditions) : undefined);

        paymentBreakdown[type] = Number(typeResult?.total || 0) + Number(manualTypeResult?.total || 0);
      }

      return {
        totalApproved,
        totalPaid,
        totalRemaining,
        paidPercentage: totalApproved > 0 ? (totalPaid / totalApproved) * 100 : 0,
        pendingRequests,
        pendingAmount,
        advancePayment: paymentBreakdown.advance,
        progressPayments: paymentBreakdown.progress,
        finalPayment: paymentBreakdown.final,
        retentionAmount: paymentBreakdown.retention,
      };
    }),
});
