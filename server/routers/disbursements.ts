import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { permissionProcedure, checkPermission } from "../permissions";
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
  donationOpportunities,
  mosqueRequests,
  mosques,
} from "../../drizzle/schema";
import { eq, desc, and, sql, isNull, isNotNull, or, like, inArray, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createNotification, notifyDisbursementRequestCreation, notifyDisbursementOrderCreation, notifyDisbursementOrderApproval, notifyDisbursementOrderRejection } from "./notifications";

// توليد رقم طلب صرف
async function generateDisbursementRequestNumber(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `DR-${currentYear}-`;
  
  const [lastRequest] = await db
    .select({ requestNumber: disbursementRequests.requestNumber })
    .from(disbursementRequests)
    .where(like(disbursementRequests.requestNumber, `${prefix}%`))
    .orderBy(desc(disbursementRequests.requestNumber))
    .limit(1);
    
  let sequence = 1;
  if (lastRequest && lastRequest.requestNumber) {
    const parts = lastRequest.requestNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }
  
  return `${prefix}${sequence.toString().padStart(4, "0")}`;
}

// توليد رقم أمر صرف
async function generateDisbursementOrderNumber(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `DO-${currentYear}-`;
  
  const [lastOrder] = await db
    .select({ orderNumber: disbursementOrders.orderNumber })
    .from(disbursementOrders)
    .where(like(disbursementOrders.orderNumber, `${prefix}%`))
    .orderBy(desc(disbursementOrders.orderNumber))
    .limit(1);
    
  let sequence = 1;
  if (lastOrder && lastOrder.orderNumber) {
    const parts = lastOrder.orderNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }
  
  return `${prefix}${sequence.toString().padStart(4, "0")}`;
}

export const disbursementsRouter = router({
  // ==================== طلبات الصرف ====================

  // جلب قائمة طلبات الصرف
  listRequests: permissionProcedure("disbursements.view")
    .input(
      z.object({
        projectId: z.number().optional(),
        status: z.string().optional(),
        requestType: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { projectId, status, requestType, search, page = 1, limit = 10 } = input || {};

      const conditions = [];
      if (projectId) conditions.push(eq(disbursementRequests.projectId, projectId));
      if (status && status !== "all") conditions.push(eq(disbursementRequests.status, status as any));
      
      if (requestType === "custom") {
        conditions.push(isNull(disbursementRequests.projectId));
      } else if (requestType === "linked") {
        conditions.push(isNotNull(disbursementRequests.projectId));
      }

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
          title: disbursementRequests.title,
          description: disbursementRequests.description,
          amount: disbursementRequests.amount,
          paymentType: disbursementRequests.paymentType,
          completionPercentage: disbursementRequests.completionPercentage,
          attachmentsJson: disbursementRequests.attachmentsJson,
          status: disbursementRequests.status,
          requestedAt: disbursementRequests.requestedAt,
          dateMiladi: disbursementRequests.dateMiladi,
          projectId: disbursementRequests.projectId,
          contractId: disbursementRequests.contractId,
          projectName: projects.name,
          projectNumber: projects.projectNumber,
          requestedByName: users.name,
          contractPaymentId: disbursementRequests.contractPaymentId,
          paymentId: disbursementRequests.paymentId,
          rejectionReason: disbursementRequests.rejectionReason,
          orderId: disbursementOrders.id,
          orderNumber: disbursementOrders.orderNumber,
          orderStatus: disbursementOrders.status,
          supplierName: contractsEnhanced.secondPartyName,
          supplierBank: contractsEnhanced.secondPartyBankName,
          supplierIban: contractsEnhanced.secondPartyIban,
          supplierAccountName: contractsEnhanced.secondPartyAccountName,
        })
        .from(disbursementRequests)
        .leftJoin(projects, eq(disbursementRequests.projectId, projects.id))
        .leftJoin(users, eq(disbursementRequests.requestedBy, users.id))
        .leftJoin(disbursementOrders, eq(disbursementRequests.id, disbursementOrders.disbursementRequestId))
        .leftJoin(contractsEnhanced, eq(disbursementRequests.contractId, contractsEnhanced.id))
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
          paymentId: disbursementRequests.paymentId,
          requestedBy: disbursementRequests.requestedBy,
          requestedByName: users.name,
          requestedBySignatureName: users.signatureName,
          requestedBySignatureDepartment: users.signatureDepartment,
          creatorSignatureName: disbursementRequests.creatorSignatureName,
          creatorSignatureDepartment: disbursementRequests.creatorSignatureDepartment,
          dateMiladi: disbursementRequests.dateMiladi,
          supplierName: contractsEnhanced.secondPartyName,
          supplierBank: contractsEnhanced.secondPartyBankName,
          supplierIban: contractsEnhanced.secondPartyIban,
          supplierAccountName: contractsEnhanced.secondPartyAccountName,
        })
        .from(disbursementRequests)
        .leftJoin(users, eq(disbursementRequests.requestedBy, users.id))
        .leftJoin(contractsEnhanced, eq(disbursementRequests.contractId, contractsEnhanced.id))
        .where(eq(disbursementRequests.id, input.id));

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب الصرف غير موجود" });
      }

      // جلب بيانات المشروع
      let project = null;
      const projId = request.projectId;
      if (projId) {
        const [projectData] = await db
          .select({
            id: projects.id,
            name: projects.name,
            projectNumber: projects.projectNumber,
            budget: projects.budget,
            managerName: users.name,
            city: mosques.city,
            address: mosques.address,
            district: mosques.district,
          })
          .from(projects)
          .leftJoin(users, eq(projects.managerId, users.id))
          .leftJoin(mosqueRequests, eq(projects.requestId, mosqueRequests.id))
          .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
          .where(eq(projects.id, projId));
        project = projectData || null;
      }

      // جلب فرصة التبرع المرتبطة بالمشروع إن وجدت
      let opportunity = null;
      if (projId) {
        const [opportunityData] = await db
          .select({
            id: donationOpportunities.id,
            title: donationOpportunities.title,
            collectedAmount: donationOpportunities.collectedAmount,
            targetAmount: donationOpportunities.targetAmount,
            status: donationOpportunities.status,
          })
          .from(donationOpportunities)
          .where(eq(donationOpportunities.projectId, projId))
          .limit(1);
        opportunity = opportunityData || null;
      }

      // جلب بيانات العقد إن وجد
      let contract = null;
      let targetContractId = request.contractId;

      if (!targetContractId && request.contractPaymentId) {
        const [paymentData] = await db
          .select({ contractId: contractPayments.contractId })
          .from(contractPayments)
          .where(eq(contractPayments.id, request.contractPaymentId));
        if (paymentData) {
          targetContractId = paymentData.contractId;
        }
      }

      if (targetContractId) {
        const [contractData] = await db
          .select({
            id: contractsEnhanced.id,
            contractNumber: contractsEnhanced.contractNumber,
            contractTitle: contractsEnhanced.contractTitle,
            secondPartyName: contractsEnhanced.secondPartyName,
            secondPartyBankName: contractsEnhanced.secondPartyBankName,
            secondPartyIban: contractsEnhanced.secondPartyIban,
            secondPartyAccountName: contractsEnhanced.secondPartyAccountName,
            supportingEntity: contractsEnhanced.supportingEntity,
            supportType: contractsEnhanced.supportType,
            supportedAmount: contractsEnhanced.supportedAmount,
            managementPercentage: contractsEnhanced.managementPercentage,
            contractAmount: contractsEnhanced.contractAmount,
            mosqueCity: contractsEnhanced.mosqueCity,
          })
          .from(contractsEnhanced)
          .where(eq(contractsEnhanced.id, targetContractId));
        contract = contractData;
      }

      // جلب أمر الصرف المرتبط إن وجد
      const [order] = await db
        .select()
        .from(disbursementOrders)
        .where(eq(disbursementOrders.disbursementRequestId, input.id));

      // تحديد معلومات التوقيع: الأولوية للـ Snapshot المخزن بالطلب، وإلا الرجوع للملف الشخصي وصلاحية المستخدم الحالية (متوافق مع الطلبات القديمة)
      let resolvedSignatureName = request.creatorSignatureName;
      let resolvedSignatureDepartment = request.creatorSignatureDepartment;

      if (!resolvedSignatureName && !resolvedSignatureDepartment && request.requestedBy) {
        const creatorHasSignPermission = await checkPermission(request.requestedBy, "disbursements.sign");
        if (creatorHasSignPermission) {
          resolvedSignatureName = request.requestedBySignatureName;
          resolvedSignatureDepartment = request.requestedBySignatureDepartment;
        }
      }

      const hasSignInfo = !!(resolvedSignatureName && resolvedSignatureDepartment);

      return {
        ...request,
        requestedBySignatureName: resolvedSignatureName,
        requestedBySignatureDepartment: resolvedSignatureDepartment,
        creatorHasSignPermission: hasSignInfo,
        project,
        contract,
        opportunity: opportunity || null,
        disbursementOrder: order || null,
      };
    }),

  // جلب فرصة التبرع المرتبطة بمشروع معين
  getDonationOpportunity: permissionProcedure("disbursements.view")
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [opportunity] = await db
        .select()
        .from(donationOpportunities)
        .where(eq(donationOpportunities.projectId, input.projectId))
        .limit(1);

      return opportunity || null;
    }),

  // جلب فرص التبرع النشطة
  getActiveDonations: permissionProcedure("disbursements.view")
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const list = await db
        .select({
          id: donationOpportunities.id,
          title: donationOpportunities.title,
          targetAmount: donationOpportunities.targetAmount,
          collectedAmount: donationOpportunities.collectedAmount,
          status: donationOpportunities.status,
          requestId: donationOpportunities.requestId,
          requestNumber: mosqueRequests.requestNumber,
        })
        .from(donationOpportunities)
        .leftJoin(mosqueRequests, eq(donationOpportunities.requestId, mosqueRequests.id))
        .where(eq(donationOpportunities.status, 'active'));

      return list;
    }),

  // إنشاء طلب صرف جديد
  createRequest: permissionProcedure("disbursements.create")
    .input(
      z.object({
        projectId: z.number().optional().nullable(),
        contractId: z.number().optional(),
        contractPaymentId: z.number().optional(),
        paymentId: z.number().optional(),
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
      const allowedRoles = ["super_admin", "system_admin", "projects_office", "project_manager", "financial", "financial_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        const hasPerm = await checkPermission(ctx.user.id, "disbursements.create");
        if (!hasPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية إنشاء طلب صرف" });
        }
      }

      let projectId = input.projectId;
      let project: any = null;

      if (projectId) {
        // التحقق من وجود المشروع
        const [projectData] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId));

        if (!projectData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "المشروع غير موجود" });
        }
        project = projectData;
      }

      let validatedContractPaymentId = input.contractPaymentId;
      if (validatedContractPaymentId) {
        const [paymentExists] = await db
          .select({ id: contractPayments.id })
          .from(contractPayments)
          .where(eq(contractPayments.id, validatedContractPaymentId));
        if (!paymentExists) {
          validatedContractPaymentId = undefined;
        } else {
          // التحقق من عدم وجود طلب صرف نشط (غير مرفوض) لنفس الدفعة/التقرير
          const [existingRequest] = await db
            .select({ id: disbursementRequests.id, requestNumber: disbursementRequests.requestNumber })
            .from(disbursementRequests)
            .where(
              and(
                eq(disbursementRequests.contractPaymentId, validatedContractPaymentId),
                sql`${disbursementRequests.status} != 'rejected'`
              )
            )
            .limit(1);

          if (existingRequest) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `تقرير الإنجاز هذا مرتبط بالفعل بطلب صرف نشط رقم ${existingRequest.requestNumber}`
            });
          }
        }
      }

      let validatedPaymentId = input.paymentId;
      if (validatedPaymentId) {
        const [paymentExists] = await db
          .select({ id: payments.id })
          .from(payments)
          .where(eq(payments.id, validatedPaymentId));
        if (!paymentExists) {
          validatedPaymentId = undefined;
        } else {
          // التحقق من عدم وجود طلب صرف نشط (غير مرفوض) لنفس الدفعة اليدوية
          const [existingRequest] = await db
            .select({ id: disbursementRequests.id, requestNumber: disbursementRequests.requestNumber })
            .from(disbursementRequests)
            .where(
              and(
                eq(disbursementRequests.paymentId, validatedPaymentId),
                sql`${disbursementRequests.status} != 'rejected'`
              )
            )
            .limit(1);

          if (existingRequest) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `هذه الدفعة مرتبطة بالفعل بطلب صرف نشط رقم ${existingRequest.requestNumber}`
            });
          }
        }
      }

      const userHasSignPermission = await checkPermission(ctx.user.id, "disbursements.sign");
      let creatorSignatureName: string | null = null;
      let creatorSignatureDepartment: string | null = null;
      if (userHasSignPermission) {
        const [userSignData] = await db
          .select({
            signatureName: users.signatureName,
            signatureDepartment: users.signatureDepartment,
          })
          .from(users)
          .where(eq(users.id, ctx.user.id));
        if (userSignData) {
          creatorSignatureName = userSignData.signatureName;
          creatorSignatureDepartment = userSignData.signatureDepartment;
        }
      }

      const requestNumber = await generateDisbursementRequestNumber(db);

      const [result] = await db.insert(disbursementRequests).values({
        requestNumber,
        projectId: projectId || null,
        contractId: input.contractId,
        contractPaymentId: validatedContractPaymentId,
        paymentId: validatedPaymentId,
        title: input.title,
        description: input.description,
        amount: input.amount.toString(),
        paymentType: input.paymentType,
        dateMiladi: input.dateMiladi ? new Date(input.dateMiladi) : null,
        completionPercentage: input.completionPercentage,
        attachmentsJson: input.attachments ? JSON.stringify(input.attachments) : null,
        status: "pending",
        requestedBy: ctx.user.id,
        creatorSignatureName,
        creatorSignatureDepartment,
      });

      await notifyDisbursementRequestCreation(
        result.insertId,
        requestNumber,
        input.title,
        input.amount.toString(),
        projectId || null
      );

      // إرسال إشعار للإدارة المالية
      const financialUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "financial"), isNull(users.deletedAt)));

      for (const user of financialUsers) {
        await createNotification({
          userId: user.id,
          title: "طلب صرف جديد",
          message: `تم تقديم طلب صرف جديد رقم ${requestNumber} ${
            project ? `للمشروع ${project.name}` : "لطلب صرف مخصص (غير مربوط بمشروع)"
          }`,
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

  updateRequest: permissionProcedure("disbursements.create")
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1, "عنوان الطلب مطلوب"),
        description: z.string().optional(),
        amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
        paymentType: z.enum(["advance", "progress", "final", "retention"]).default("progress"),
        completionPercentage: z.number().min(0).max(100).optional(),
        dateMiladi: z.string().optional(),
        contractPaymentId: z.number().optional(),
        paymentId: z.number().optional(),
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
      const allowedRoles = ["super_admin", "system_admin", "projects_office", "project_manager", "financial", "financial_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        const hasPerm = await checkPermission(ctx.user.id, "disbursements.create");
        if (!hasPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تعديل طلب صرف" });
        }
      }

      const [request] = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.id, input.id));

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب الصرف غير موجود" });
      }

      // لا يمكن تعديل الطلب إذا تم دفعه أو تم ربطه بأمر صرف
      if (request.status === "paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تعديل طلب صرف تم دفعه بالفعل" });
      }

      // تحقق إن كان هناك أمر صرف مرتبط بالطلب (وليس مرفوضاً)
      const [order] = await db
        .select()
        .from(disbursementOrders)
        .where(
          and(
            eq(disbursementOrders.disbursementRequestId, input.id),
            sql`${disbursementOrders.status} != 'rejected'`
          )
        );

      if (order) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تعديل طلب صرف تم تحويله إلى أمر صرف" });
      }

      let validatedContractPaymentId = input.contractPaymentId;
      if (validatedContractPaymentId) {
        const [paymentExists] = await db
          .select({ id: contractPayments.id })
          .from(contractPayments)
          .where(eq(contractPayments.id, validatedContractPaymentId));
        if (!paymentExists) {
          validatedContractPaymentId = undefined;
        } else {
          // التحقق من عدم وجود طلب صرف نشط (غير مرفوض) لنفس الدفعة/التقرير من قبل طلب آخر غير هذا الطلب
          const [existingRequest] = await db
            .select({ id: disbursementRequests.id, requestNumber: disbursementRequests.requestNumber })
            .from(disbursementRequests)
            .where(
              and(
                eq(disbursementRequests.contractPaymentId, validatedContractPaymentId),
                sql`${disbursementRequests.id} != ${input.id}`,
                sql`${disbursementRequests.status} != 'rejected'`
              )
            )
            .limit(1);

          if (existingRequest) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `تقرير الإنجاز هذا مرتبط بالفعل بطلب صرف نشط رقم ${existingRequest.requestNumber}`
            });
          }
        }
      }

      let validatedPaymentId = input.paymentId;
      if (validatedPaymentId) {
        const [paymentExists] = await db
          .select({ id: payments.id })
          .from(payments)
          .where(eq(payments.id, validatedPaymentId));
        if (!paymentExists) {
          validatedPaymentId = undefined;
        } else {
          // التحقق من عدم وجود طلب صرف نشط (غير مرفوض) لنفس الدفعة من قبل طلب آخر غير هذا الطلب
          const [existingRequest] = await db
            .select({ id: disbursementRequests.id, requestNumber: disbursementRequests.requestNumber })
            .from(disbursementRequests)
            .where(
              and(
                eq(disbursementRequests.paymentId, validatedPaymentId),
                sql`${disbursementRequests.id} != ${input.id}`,
                sql`${disbursementRequests.status} != 'rejected'`
              )
            )
            .limit(1);

          if (existingRequest) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `هذه الدفعة مرتبطة بالفعل بطلب صرف نشط رقم ${existingRequest.requestNumber}`
            });
          }
        }
      }

      await db
        .update(disbursementRequests)
        .set({
          title: input.title,
          description: input.description,
          amount: input.amount.toString(),
          paymentType: input.paymentType,
          completionPercentage: input.completionPercentage,
          dateMiladi: input.dateMiladi ? new Date(input.dateMiladi) : null,
          contractPaymentId: validatedContractPaymentId,
          paymentId: validatedPaymentId,
          attachmentsJson: input.attachments ? JSON.stringify(input.attachments) : undefined,
          updatedAt: new Date(),
          // Clear rejection reason when a rejected request is edited
          rejectionReason: request.status === "rejected" ? null : request.rejectionReason,
        })
        .where(eq(disbursementRequests.id, input.id));

      return {
        success: true,
        message: "تم تحديث طلب الصرف بنجاح",
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
        const hasPerm = await checkPermission(ctx.user.id, "disbursements.approve");
        if (!hasPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية اعتماد طلب الصرف" });
        }
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

      // تحديث قيمة الدفعة المجدولة في العقد أو الدفعة اليدوية إذا كان مبلغ طلب الصرف المعتمد أقل من مبلغ الدفعة الأصلي
      const req = request as any;
      if (req.contractPaymentId) {
        const [contractPayment] = await db
          .select()
          .from(contractPayments)
          .where(eq(contractPayments.id, req.contractPaymentId));

        if (contractPayment) {
          const cpAmount = Number(contractPayment.amount);
          const requestAmount = Number(req.amount);
          if (requestAmount < cpAmount) {
            // تحديث قيمة الدفعة في العقد لتكون مساوية للمبلغ المعتمد لطلب الصرف
            await db
              .update(contractPayments)
              .set({
                amount: req.amount,
                updatedAt: new Date(),
              })
              .where(eq(contractPayments.id, req.contractPaymentId));
          }
        }
      }

      if (req.paymentId) {
        const [manualPayment] = await db
          .select()
          .from(payments)
          .where(eq(payments.id, req.paymentId));

        if (manualPayment) {
          const mpAmount = Number(manualPayment.amount);
          const requestAmount = Number(req.amount);
          if (requestAmount < mpAmount) {
            // تحديث قيمة الدفعة اليدوية لتكون مساوية لمبلغ طلب الصرف المعتمد
            await db
              .update(payments)
              .set({
                amount: req.amount,
                updatedAt: new Date(),
              })
              .where(eq(payments.id, req.paymentId));
          }
        }
      }

      // إرسال إشعار لمقدم الطلب
      if (request.requestedBy) {
        await createNotification({
          userId: request.requestedBy,
          title: "تم اعتماد طلب الصرف",
          message: `تم اعتماد طلب الصرف رقم ${request.requestNumber}`,
          type: "success",
          relatedType: "disbursement_request",
          relatedId: input.id,
        });
      }

      // إرسال إشعار للإدارة المالية لإنشاء أمر الصرف
      const financialUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "financial"), isNull(users.deletedAt)));

      // جلب بيانات المشروع
      const project = request.projectId
        ? (await db
            .select({ name: projects.name })
            .from(projects)
            .where(eq(projects.id, request.projectId)))[0]
        : null;

      for (const user of financialUsers) {
        await createNotification({
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
        const hasPerm = await checkPermission(ctx.user.id, "disbursements.approve");
        if (!hasPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية رفض طلب الصرف" });
        }
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
      if (request.requestedBy) {
        await createNotification({
          userId: request.requestedBy,
          title: "تم رفض طلب الصرف",
          message: `تم رفض طلب الصرف رقم ${request.requestNumber}: ${input.reason}`,
          type: "error",
          relatedType: "disbursement_request",
          relatedId: input.id,
        });
      }

      return { success: true, message: "تم رفض طلب الصرف" };
    }),

  // ==================== أوامر الصرف ====================

  // جلب قائمة أوامر الصرف
  listOrders: protectedProcedure
    .input(
      z.object({
        status: z.enum(disbursementOrderStatuses).optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasViewRequests = await checkPermission(ctx.user.id, "disbursements.view");
      const hasViewOrders = await checkPermission(ctx.user.id, "disbursement_orders.view");

      if (!isAdmin && !hasViewRequests && !hasViewOrders) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض سجل أوامر الصرف" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { status, search, page = 1, limit = 10 } = input || {};

      const conditions = [];
      if (status) conditions.push(eq(disbursementOrders.status, status));

      if (search) {
        const searchPattern = `%${search.toLowerCase()}%`;
        conditions.push(
          or(
            like(sql`LOWER(${disbursementOrders.orderNumber})`, searchPattern),
            like(sql`LOWER(${disbursementOrders.beneficiaryName})`, searchPattern),
            like(sql`LOWER(${projects.name})`, searchPattern)
          )
        );
      }

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
        .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
        .leftJoin(projects, eq(disbursementRequests.projectId, projects.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // حساب الإحصائيات العامة للمبالغ وأوامر الصرف
      const [pendingCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(disbursementOrders)
        .where(or(
          eq(disbursementOrders.status, "pending"),
          eq(disbursementOrders.status, "edited")
        ));

      const [approvedCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(disbursementOrders)
        .where(eq(disbursementOrders.status, "approved"));

      const [executedCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(disbursementOrders)
        .where(eq(disbursementOrders.status, "executed"));

      const [rejectedCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(disbursementOrders)
        .where(eq(disbursementOrders.status, "rejected"));

      const [totalAmountResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(disbursementOrders);

      return {
        orders: ordersWithDetails,
        total: countResult?.count || 0,
        page,
        limit,
        stats: {
          pendingCount: pendingCountResult?.count || 0,
          approvedCount: approvedCountResult?.count || 0,
          executedCount: executedCountResult?.count || 0,
          rejectedCount: rejectedCountResult?.count || 0,
          totalAmount: Number(totalAmountResult?.total || 0),
        }
      };
    }),

  // جلب أمر صرف بالتفصيل
  getOrderById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasViewRequests = await checkPermission(ctx.user.id, "disbursements.view");
      const hasViewOrders = await checkPermission(ctx.user.id, "disbursement_orders.view");

      if (!isAdmin && !hasViewRequests && !hasViewOrders) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض تفاصيل أمر الصرف" });
      }

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

      // جلب المشروع وتفاصيل العقد والمدفوعات لتقرير أمر الصرف
      let project = null;
      const projId = request?.projectId;
      if (request && projId) {
        const [projectData] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projId));
        
        if (projectData) {
          // جلب بيانات العقد
          const [contract] = await db
            .select()
            .from(contractsEnhanced)
            .where(eq(contractsEnhanced.projectId, projectData.id));

           let contractAmount = 0;
          let fundingAmount = 0;
          let fundingSource = "لا يوجد";
          if (contract) {
            contractAmount = Number(contract.contractAmount || 0);
            fundingAmount = Number(contract.supportedAmount || 0);
            
            if (contract.supportingEntity) {
              try {
                const parsedEntities = JSON.parse(contract.supportingEntity);
                if (Array.isArray(parsedEntities)) {
                  const names = parsedEntities
                    .map(e => e.entity === "other" ? e.customEntity : e.entity)
                    .filter(Boolean);
                  if (names.length > 0) {
                    fundingSource = names.join("، ");
                  }
                }
              } catch (e) {
                console.error("Error parsing supportingEntity in getOrderById:", e);
              }
            }
          }

          // حساب إجمالي المدفوع من واقع أوامر الصرف المعتمدة أو المنفذة للمشروع
          const [paidResult] = await db
            .select({ total: sql<number>`COALESCE(SUM(${disbursementOrders.amount}), 0)` })
            .from(disbursementOrders)
            .innerJoin(
              disbursementRequests,
              eq(disbursementOrders.disbursementRequestId, disbursementRequests.id)
            )
            .where(
              and(
                eq(disbursementRequests.projectId, projectData.id),
                inArray(disbursementOrders.status, ["approved", "executed"]),
                ne(disbursementOrders.id, order.id)
              )
            );

          let totalPaid = Number(paidResult?.total || 0);
          if (order.status !== "rejected") {
            totalPaid += Number(order.amount);
          }

          const remainingAmount = contractAmount - totalPaid;

          project = {
            ...projectData,
            contractAmount,
            fundingAmount,
            fundingSource,
            totalPaid,
            remainingAmount,
          };
        }
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
        const hasPerm = await checkPermission(ctx.user.id, "disbursements.create");
        if (!hasPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية إنشاء أمر صرف" });
        }
      }

      // التحقق من طلب الصرف
      const [request] = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.id, input.disbursementRequestId));

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب الصرف غير موجود" });
      }

      if (request.status !== "approved" && !(request.status === "rejected" && request.rejectionReason === null)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "طلب الصرف غير معتمد" });
      }

      // التحقق من وجود أمر صرف سابق
      const [existingOrder] = await db
        .select()
        .from(disbursementOrders)
        .where(eq(disbursementOrders.disbursementRequestId, input.disbursementRequestId));

      if (existingOrder) {
        if (existingOrder.status === "rejected") {
          // تحديث أمر الصرف الحالي وتغيير حالته إلى "edited"
          await db
            .update(disbursementOrders)
            .set({
              amount: request.amount,
              beneficiaryName: input.beneficiaryName,
              beneficiaryBank: input.beneficiaryBank,
              beneficiaryIban: input.beneficiaryIban,
              beneficiaryAccountName: input.beneficiaryAccountName || null,
              paymentMethod: input.paymentMethod,
              status: "edited" as any,
              updatedAt: new Date(),
            })
            .where(eq(disbursementOrders.id, existingOrder.id));

          // تحديث حالة طلب الصرف التابع له إلى "approved" وتصفير سبب الرفض
          await db
            .update(disbursementRequests)
            .set({
              status: "approved",
              rejectionReason: null,
              updatedAt: new Date(),
            })
            .where(eq(disbursementRequests.id, input.disbursementRequestId));

          return { success: true, message: "تم تحديث أمر الصرف بنجاح" };
        } else {
          throw new TRPCError({ code: "CONFLICT", message: "يوجد أمر صرف مرتبط بهذا الطلب بالفعل" });
        }
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

      await notifyDisbursementOrderCreation(
        Number(result.insertId),
        orderNumber,
        request.requestNumber,
        request.amount,
        request.projectId
      );

      // إرسال إشعار للمدير العام لاعتماد أمر الصرف
      const managers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          sql`${users.role} IN ('super_admin', 'system_admin', 'general_manager')`,
          isNull(users.deletedAt)
        ));

      // جلب بيانات المشروع
      const project = request.projectId
        ? (await db
            .select({ name: projects.name })
            .from(projects)
            .where(eq(projects.id, request.projectId)))[0]
        : null;

      for (const manager of managers) {
        await createNotification({
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

  // إنشاء أمر صرف مباشر بدون طلب مسبق
  createDirectOrder: permissionProcedure("disbursements.create")
    .input(
      z.object({
        projectId: z.number().optional().nullable(),
        contractId: z.number().optional().nullable(),
        contractPaymentId: z.number().optional().nullable(),
        paymentId: z.number().optional().nullable(),
        title: z.string().min(1, "عنوان الطلب مطلوب"),
        description: z.string().optional(),
        amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
        dateMiladi: z.string().optional(),
        attachments: z.array(z.object({
          name: z.string(),
          url: z.string(),
          type: z.string().optional(),
        })).optional(),
        beneficiaryName: z.string().min(1, "اسم المستفيد مطلوب"),
        beneficiaryBank: z.string().optional(),
        beneficiaryIban: z.string().optional(),
        beneficiaryAccountName: z.string().optional(),
        paymentMethod: z.string().optional(),
        sadadNumber: z.string().optional(),
        billerCode: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      let creatorSignatureName = "";
      let creatorSignatureDepartment = "";
      const [userSignData] = await db
        .select({ signatureName: users.signatureName, signatureDepartment: users.signatureDepartment })
        .from(users)
        .where(eq(users.id, ctx.user.id));
      if (userSignData) {
        creatorSignatureName = userSignData.signatureName || "";
        creatorSignatureDepartment = userSignData.signatureDepartment || "";
      }

      const requestNumber = await generateDisbursementRequestNumber(db);

      const [reqResult] = await db.insert(disbursementRequests).values({
        requestNumber,
        projectId: input.projectId || null,
        contractId: input.contractId || null,
        contractPaymentId: input.contractPaymentId || null,
        paymentId: input.paymentId || null,
        title: input.title,
        description: input.description || null,
        amount: input.amount.toString(),
        paymentType: "progress",
        dateMiladi: input.dateMiladi ? new Date(input.dateMiladi) : null,
        attachmentsJson: input.attachments ? JSON.stringify(input.attachments) : null,
        status: "approved", // معتمد مباشرة
        requestedBy: ctx.user.id,
        creatorSignatureName,
        creatorSignatureDepartment,
      });

      const disbursementRequestId = Number(reqResult.insertId);

      const orderNumber = await generateDisbursementOrderNumber(db);

      const [orderResult] = await db.insert(disbursementOrders).values({
        orderNumber,
        disbursementRequestId,
        amount: input.amount.toString(),
        beneficiaryName: input.beneficiaryName,
        beneficiaryBank: input.beneficiaryBank || null,
        beneficiaryIban: input.beneficiaryIban || null,
        beneficiaryAccountName: input.beneficiaryAccountName || null,
        paymentMethod: input.paymentMethod || "bank_transfer",
        sadadNumber: input.sadadNumber || null,
        billerCode: input.billerCode || null,
        status: "pending",
        createdBy: ctx.user.id,
      });

      const orderId = Number(orderResult.insertId);

      try {
        await notifyDisbursementOrderCreation(
          orderId,
          orderNumber,
          requestNumber,
          input.amount.toString(),
          input.projectId || null
        );

        // إرسال إشعار للمدير العام لاعتماد أمر الصرف
        const managers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(
            sql`${users.role} IN ('super_admin', 'system_admin', 'general_manager')`,
            isNull(users.deletedAt)
          ));

        // جلب بيانات المشروع
        const project = input.projectId
          ? (await db
              .select({ name: projects.name })
              .from(projects)
              .where(eq(projects.id, input.projectId)))[0]
          : null;

        for (const manager of managers) {
          await createNotification({
            userId: manager.id,
            title: "أمر صرف جديد يحتاج اعتماد",
            message: `تم إنشاء أمر صرف مباشر جديد رقم ${orderNumber} للمشروع ${project?.name || "غير محدد"} بمبلغ ${Number(input.amount).toLocaleString("ar-SA")} ريال. يرجى الاعتماد.`,
            type: "warning",
            relatedType: "disbursement_order",
            relatedId: orderId,
          });
        }
      } catch (err) {
        console.error("Error sending notifications for direct order creation:", err);
      }

      return {
        success: true,
        id: orderId,
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
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        if (!userPermissions.includes("financial.approve") && !userPermissions.includes("disbursement_orders.approve")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية اعتماد أمر الصرف" });
        }
      }

      const [order] = await db
        .select()
        .from(disbursementOrders)
        .where(eq(disbursementOrders.id, input.id));

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "أمر الصرف غير موجود" });
      }

      if (order.status !== "pending" && order.status !== "edited") {
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

      // تحديث قيمة الدفعة المجدولة في العقد وطلب الصرف إذا كان المبلغ الموافق عليه في أمر الصرف أقل من مبلغ الدفعة الأصلي
      const [orderWithRequest] = await db
        .select({
          orderAmount: disbursementOrders.amount,
          contractPaymentId: disbursementRequests.contractPaymentId,
          paymentId: disbursementRequests.paymentId,
          requestId: disbursementRequests.id,
          requestNumber: disbursementRequests.requestNumber,
          projectId: disbursementRequests.projectId,
        })
        .from(disbursementOrders)
        .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
        .where(eq(disbursementOrders.id, input.id));

      if (orderWithRequest && orderWithRequest.contractPaymentId) {
        const [contractPayment] = await db
          .select()
          .from(contractPayments)
          .where(eq(contractPayments.id, orderWithRequest.contractPaymentId));

        if (contractPayment) {
          const cpAmount = Number(contractPayment.amount);
          const approvedAmount = Number(orderWithRequest.orderAmount);
          if (approvedAmount < cpAmount) {
            // تحديث قيمة الدفعة في العقد لتكون مساوية للمبلغ المعتمد الفعلي
            await db
              .update(contractPayments)
              .set({
                amount: orderWithRequest.orderAmount,
                updatedAt: new Date(),
              })
              .where(eq(contractPayments.id, orderWithRequest.contractPaymentId));

            // تحديث قيمة طلب الصرف كذلك
            await db
              .update(disbursementRequests)
              .set({
                amount: orderWithRequest.orderAmount,
                updatedAt: new Date(),
              })
              .where(eq(disbursementRequests.id, orderWithRequest.requestId as number));
          }

          // تحديث حالة دفعة العقد إلى مسددة عند اعتماد أمر الصرف
          await db
            .update(contractPayments)
            .set({
              status: "paid",
              paidAt: new Date(),
              paidBy: ctx.user.id,
            })
            .where(eq(contractPayments.id, orderWithRequest.contractPaymentId));
        }
      }

      if (orderWithRequest && orderWithRequest.paymentId) {
        const [manualPayment] = await db
          .select()
          .from(payments)
          .where(eq(payments.id, orderWithRequest.paymentId));

        if (manualPayment) {
          const mpAmount = Number(manualPayment.amount);
          const approvedAmount = Number(orderWithRequest.orderAmount);
          if (approvedAmount < mpAmount) {
            // تحديث قيمة الدفعة اليدوية لتكون مساوية للمبلغ المعتمد الفعلي
            await db
              .update(payments)
              .set({
                amount: orderWithRequest.orderAmount,
                updatedAt: new Date(),
              })
              .where(eq(payments.id, orderWithRequest.paymentId));

            // تحديث قيمة طلب الصرف كذلك
            await db
              .update(disbursementRequests)
              .set({
                amount: orderWithRequest.orderAmount,
                updatedAt: new Date(),
              })
              .where(eq(disbursementRequests.id, orderWithRequest.requestId as number));
          }

          // تحديث حالة الدفعة اليدوية إلى مسددة عند اعتماد أمر الصرف
          await db
            .update(payments)
            .set({
              status: "paid",
              paidAt: new Date(),
            })
            .where(eq(payments.id, orderWithRequest.paymentId));
        }
      }

      if (orderWithRequest) {
        await notifyDisbursementOrderApproval(
          input.id,
          order.orderNumber,
          orderWithRequest.requestNumber || "",
          orderWithRequest.orderAmount,
          orderWithRequest.projectId
        );
      }

      // إرسال إشعار للإدارة المالية لتنفيذ أمر الصرف
      const financialUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "financial"));

      for (const user of financialUsers) {
        await createNotification({
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
        const hasPerm = await checkPermission(ctx.user.id, "disbursements.create");
        if (!hasPerm) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية تنفيذ أمر الصرف" });
        }
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

      if (request?.paymentId) {
        await db
          .update(payments)
          .set({
            status: "paid",
            paidAt: new Date(),
          })
          .where(eq(payments.id, request.paymentId));
      }

      // تحديث التكلفة الفعلية للمشروع
      const pId = request?.projectId;
      if (pId) {
        await db
          .update(projects)
          .set({
            actualCost: sql`CAST(COALESCE(${projects.actualCost}, 0) + ${request.amount} AS DECIMAL(15,2))`,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, pId));
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
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        if (!userPermissions.includes("financial.approve") && !userPermissions.includes("disbursement_orders.reject")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية رفض أمر الصرف" });
        }
      }

      const [order] = await db
        .select({
          orderNumber: disbursementOrders.orderNumber,
          amount: disbursementOrders.amount,
          disbursementRequestId: disbursementOrders.disbursementRequestId,
          requestNumber: disbursementRequests.requestNumber,
          projectId: disbursementRequests.projectId,
        })
        .from(disbursementOrders)
        .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
        .where(eq(disbursementOrders.id, input.id));

      await db
        .update(disbursementOrders)
        .set({
          status: "rejected",
          rejectedBy: ctx.user.id,
          rejectedAt: new Date(),
          rejectionReason: input.reason,
        })
        .where(eq(disbursementOrders.id, input.id));

      if (order && order.disbursementRequestId) {
        await db
          .update(disbursementRequests)
          .set({
            status: "rejected",
            rejectedBy: ctx.user.id,
            rejectedAt: new Date(),
            rejectionReason: input.reason,
          })
          .where(eq(disbursementRequests.id, order.disbursementRequestId));
      }

      if (order) {
        await notifyDisbursementOrderRejection(
          input.id,
          order.orderNumber,
          order.requestNumber || "",
          order.amount,
          order.projectId,
          input.reason
        );
      }

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
          contractPaymentId: disbursementRequests.contractPaymentId,
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
  getFinancialReport: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        projectId: z.number().optional(),
        groupBy: z.enum(["project", "month", "fundingSource"]).default("project"),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);
      const hasView = await checkPermission(ctx.user.id, "financial_reports.view");

      if (!isAdmin && !hasView) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض التقرير المالي" });
      }

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
          totalRequested: sql<number>`
            COALESCE((
              SELECT SUM(CAST(amount AS DECIMAL(15,2)))
              FROM (${allProjectFinancials}) as f
              WHERE f.projectId = projects.id
            ), 0)
          `,
          approvedCount: sql<number>`
            COALESCE((
              SELECT SUM(CASE WHEN status IN ('approved', 'paid') THEN 1 ELSE 0 END)
              FROM (${allProjectFinancials}) as f
              WHERE f.projectId = projects.id
            ), 0)
          `,
          paidCount: sql<number>`
            COALESCE((
              SELECT SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)
              FROM (${allProjectFinancials}) as f
              WHERE f.projectId = projects.id
            ), 0)
          `,
          totalPaid: sql<number>`
            COALESCE((
              SELECT SUM(CASE WHEN status = 'paid' THEN CAST(amount AS DECIMAL(15,2)) ELSE 0 END)
              FROM (${allProjectFinancials}) as f
              WHERE f.projectId = projects.id
            ), 0)
          `,
          contractAmount: sql<number>`
            COALESCE((
              SELECT CAST(contractAmount AS DECIMAL(15,2))
              FROM contracts_enhanced
              WHERE projectId = projects.id AND status != 'cancelled'
              ORDER BY contracts_enhanced.id DESC
              LIMIT 1
            ), 0)
          `,
          managementPercentage: sql<number>`
            COALESCE((
              SELECT CAST(managementPercentage AS DECIMAL(5,2))
              FROM contracts_enhanced
              WHERE projectId = projects.id AND status != 'cancelled'
              ORDER BY contracts_enhanced.id DESC
              LIMIT 1
            ), 0)
          `,
          associationValue: sql<number>`
            COALESCE((
              SELECT CAST(contractAmount AS DECIMAL(15,2)) * CAST(managementPercentage AS DECIMAL(5,2)) / 100
              FROM contracts_enhanced
              WHERE projectId = projects.id AND status != 'cancelled'
              ORDER BY contracts_enhanced.id DESC
              LIMIT 1
            ), 0)
          `,
        })
        .from(projects)
        .orderBy(desc(projects.id));

      // إجمالي المصروفات حسب الشهر
      const monthRequests = db
        .select({
          month: sql<string>`DATE_FORMAT(${disbursementRequests.createdAt}, '%Y-%m')`.as('month'),
          amount: disbursementRequests.amount,
          status: disbursementRequests.status,
        })
        .from(disbursementRequests);

      const monthManual = db
        .select({
          month: sql<string>`DATE_FORMAT(${payments.createdAt}, '%Y-%m')`.as('month'),
          amount: payments.amount,
          status: payments.status,
        })
        .from(payments);

      const allMonthlyFinancials = sql`(${monthRequests} UNION ALL ${monthManual})`;

            const byMonth = await (db
        .select({
          month: sql<string>`f.month`,
          totalRequested: sql<number>`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)`,
          requestCount: sql<number>`COUNT(*)`,
          totalPaid: sql<number>`COALESCE(SUM(CASE WHEN f.status = 'paid' THEN CAST(f.amount AS DECIMAL(15,2)) ELSE 0 END), 0)`,
        })
        .from(sql`${allMonthlyFinancials} as f`)
        .groupBy(sql`f.month`) as any)
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

            const byFundingSource = await (db
        .select({
          fundingSource: sql<string>`f.paymentType`,
          totalRequested: sql<number>`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)`,
          requestCount: sql<number>`COUNT(*)`,
          totalPaid: sql<number>`COALESCE(SUM(CASE WHEN f.status = 'paid' THEN CAST(f.amount AS DECIMAL(15,2)) ELSE 0 END), 0)`,
        })
        .from(sql`${allTypeFinancials} as f`)
        .groupBy(sql`f.paymentType`) as any)
        .orderBy(desc(sql`COALESCE(SUM(CAST(f.amount AS DECIMAL(15,2))), 0)`));

      // إجمالي أوامر الصرف حسب الحالة (معتمد، قيد الاعتماد، مرفوض، تم التعديل)
      const ordersByStatus = await db
        .select({
          status: disbursementOrders.status,
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`COALESCE(SUM(${disbursementOrders.amount}), 0)`,
        })
        .from(disbursementOrders)
        .where(inArray(disbursementOrders.status, ['approved', 'pending', 'rejected', 'edited']))
        .groupBy(disbursementOrders.status);

      // إجماليات عامة (مصفاة حسب الحالات النشطة: قيد الاعتماد، معتمد، مرفوض)
      const [totals] = await db
        .select({
          totalRequests: sql<number>`COUNT(*)`,
          totalRequestedAmount: sql<number>`COALESCE(SUM(${disbursementRequests.amount}), 0)`,
          totalPaidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${disbursementRequests.status} = 'paid' THEN ${disbursementRequests.amount} ELSE 0 END), 0)`,
          pendingAmount: sql<number>`COALESCE(SUM(CASE WHEN ${disbursementRequests.status} IN ('pending', 'approved') THEN ${disbursementRequests.amount} ELSE 0 END), 0)`,
        })
        .from(disbursementRequests)
        .where(inArray(disbursementRequests.status, ['pending', 'approved', 'rejected']));

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
        .from(disbursementOrders)
        .where(inArray(disbursementOrders.status, ['approved', 'pending', 'rejected', 'edited']));

      // إجماليات العقود (مع استبعاد حالة "نشط")
      const [contractTotals] = await db
        .select({
          totalContracts: sql<number>`COUNT(*)`,
          totalContractAmount: sql<number>`COALESCE(SUM(CAST(${contractsEnhanced.contractAmount} AS DECIMAL(15,2))), 0)`,
          activeContracts: sql<number>`SUM(CASE WHEN ${contractsEnhanced.status} = 'approved' THEN 1 ELSE 0 END)`,
        })
        .from(contractsEnhanced)
        .where(ne(contractsEnhanced.status, 'active'));
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
        .where(ne(contractsEnhanced.status, 'active'))
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

      // إحصائيات العقود للرسم البياني (مع استبعاد حالة "نشط")
      const contractsTimeline = await db
        .select({
          date: sql<string>`DATE_FORMAT(${contractsEnhanced.createdAt}, '%Y-%m-%d')`,
          count: sql<number>`COUNT(*)`
        })
        .from(contractsEnhanced)
        .where(ne(contractsEnhanced.status, 'active'))
        .groupBy(sql`DATE(${contractsEnhanced.createdAt})`)
        .orderBy(sql`DATE(${contractsEnhanced.createdAt})`)
        .limit(30);

      const contractsByStatus = await db
        .select({
          status: contractsEnhanced.status,
          count: sql<number>`COUNT(*)`
        })
        .from(contractsEnhanced)
        .where(ne(contractsEnhanced.status, 'active'))
        .groupBy(contractsEnhanced.status);

      // إحصائيات طلبات الصرف للرسم البياني (فقط الحالات: قيد الاعتماد، معتمد، مرفوض)
      const requestsTimeline = await db
        .select({
          date: sql<string>`DATE_FORMAT(${disbursementRequests.createdAt}, '%Y-%m-%d')`,
          count: sql<number>`COUNT(*)`
        })
        .from(disbursementRequests)
        .where(inArray(disbursementRequests.status, ['pending', 'approved', 'rejected']))
        .groupBy(sql`DATE(${disbursementRequests.createdAt})`)
        .orderBy(sql`DATE(${disbursementRequests.createdAt})`)
        .limit(30);

      const requestsByStatus = await db
        .select({
          status: disbursementRequests.status,
          count: sql<number>`COUNT(*)`
        })
        .from(disbursementRequests)
        .where(inArray(disbursementRequests.status, ['pending', 'approved', 'rejected']))
        .groupBy(disbursementRequests.status);

      // إحصائيات أوامر الصرف للرسم البياني (فقط الحالات: معتمد، قيد الاعتماد، مرفوض، تم التعديل)
      const ordersTimeline = await db
        .select({
          date: sql<string>`DATE_FORMAT(${disbursementOrders.createdAt}, '%Y-%m-%d')`,
          count: sql<number>`COUNT(*)`
        })
        .from(disbursementOrders)
        .where(inArray(disbursementOrders.status, ['approved', 'pending', 'rejected', 'edited']))
        .groupBy(sql`DATE(${disbursementOrders.createdAt})`)
        .orderBy(sql`DATE(${disbursementOrders.createdAt})`)
        .limit(30);

      return {
        byProject,
        byMonth,
        byFundingSource,
        ordersByStatus,
        contractsSummary: contractsWithDisbursements,
        contractsTimeline,
        contractsByStatus,
        requestsTimeline,
        requestsByStatus,
        ordersTimeline,
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
      .where(or(
        eq(disbursementOrders.status, "pending"),
        eq(disbursementOrders.status, "edited")
      ));

    const [totalPaidDisb] = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(disbursementRequests)
      .where(or(
        eq(disbursementRequests.status, "paid"),
        eq(disbursementRequests.status, "approved")
      ));

    const [totalPaidManual] = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(or(
        eq(payments.status, "paid"),
        eq(payments.status, "approved")
      ));

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
