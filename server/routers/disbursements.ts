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
  userRoleAssignments,
  roles,
} from "../../drizzle/schema";
import { eq, desc, and, sql, isNull, isNotNull, or, like, inArray, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createNotification, notifyDisbursementRequestCreation, notifyDisbursementOrderCreation, notifyDisbursementOrderApproval, notifyDisbursementOrderRejection } from "./notifications";
import { triggerBeneficiarySatisfactionSurvey } from "./requests";

// توليد رقم طلب صرف
async function generateDisbursementRequestNumber(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  isDirect: boolean = false
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = isDirect ? `DRD-${currentYear}-` : `DR-${currentYear}-`;
  
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
        includeDirect: z.boolean().default(false).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { projectId, status, requestType, search, page = 1, limit = 10, includeDirect = false } = input || {};

      const conditions = [];
      if (projectId) conditions.push(eq(disbursementRequests.projectId, projectId));
      if (status && status !== "all") conditions.push(eq(disbursementRequests.status, status as any));
      
      if (requestType === "custom") {
        conditions.push(isNull(disbursementRequests.projectId));
      } else if (requestType === "linked") {
        conditions.push(isNotNull(disbursementRequests.projectId));
      }

      if (!includeDirect) {
        conditions.push(eq(disbursementRequests.isDirect, false));
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
          requestedBy: disbursementRequests.requestedBy,
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
          isException: disbursementRequests.isException,
          creatorSignatureName: disbursementRequests.creatorSignatureName,
          approvalNotes: disbursementRequests.approvalNotes,
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
        .orderBy(
          sql`CASE 
            WHEN ${disbursementRequests.status} = 'pending_executive' THEN 0
            WHEN ${disbursementRequests.status} = 'pending' THEN 1
            WHEN ${disbursementRequests.status} = 'draft' THEN 2
            ELSE 3
          END ASC`,
          desc(disbursementRequests.createdAt)
        )
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
          adminFees: disbursementRequests.adminFees,
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
          requestedBySignatureUrl: users.signatureUrl,
          requestedByShowSignature: users.showSignatureInDocuments,
          creatorSignatureName: disbursementRequests.creatorSignatureName,
          creatorSignatureDepartment: disbursementRequests.creatorSignatureDepartment,
          creatorSignatureUrl: disbursementRequests.creatorSignatureUrl,
          isException: disbursementRequests.isException,
          exceptionApprovedBy: disbursementRequests.exceptionApprovedBy,
          showCreatorSignature: disbursementRequests.showCreatorSignature,
          showExecutiveDirectorSignature: disbursementRequests.showExecutiveDirectorSignature,
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
            programType: mosqueRequests.programType,
            programData: mosqueRequests.programData,
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

      let resolvedSignatureName = request.requestedBySignatureName || request.creatorSignatureName || request.requestedByName;
      let resolvedSignatureDepartment = request.requestedBySignatureDepartment || request.creatorSignatureDepartment;
      let resolvedSignatureUrl = request.requestedByShowSignature === false ? null : request.requestedBySignatureUrl;

      const hasSignInfo = !!(resolvedSignatureName && resolvedSignatureDepartment);

      // جلب بيانات وصورة توقيع المدير التنفيذي المعتمد بتوقيع وصلاحية توقيع طلبات الصرف
      let executiveDirectorSignatureUrl: string | null = null;
      let executiveDirectorName: string | null = null;
      let executiveDirectorSignatureDepartment: string | null = null;

      const { calculateUserPermissions } = await import("../permissions");

      let execDirector: any = null;

      // جلب بيانات مُنفذ الاستثناء الحية (لتحديث خانة التوقيع عند تغيير البيانات من البروفايل)
      let liveExceptionApproverData: any = null;
      if (request.isException && request.exceptionApprovedBy) {
        const [exceptionApprover] = await db
          .select({
            signatureName: users.signatureName,
            signatureDepartment: users.signatureDepartment,
            signatureUrl: users.signatureUrl,
            name: users.name,
          })
          .from(users)
          .where(eq(users.id, request.exceptionApprovedBy));
        if (exceptionApprover) {
          liveExceptionApproverData = exceptionApprover;
        }
      }

      if ((request as any).approvedBy) {
        const [approver] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            signatureName: users.signatureName,
            signatureDepartment: users.signatureDepartment,
            signatureUrl: users.signatureUrl,
            showSignatureInDocuments: users.showSignatureInDocuments,
            role: users.role,
          })
          .from(users)
          .where(eq(users.id, (request as any).approvedBy));

        if (approver) {
          execDirector = approver;
        }
      }

      if (!execDirector) {
        const potentialGMs = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            signatureName: users.signatureName,
            signatureDepartment: users.signatureDepartment,
            signatureUrl: users.signatureUrl,
            showSignatureInDocuments: users.showSignatureInDocuments,
            role: users.role,
          })
          .from(users)
          .where(
            and(
              isNull(users.deletedAt),
              eq(users.status, "active" as any),
              inArray(users.role, ["general_manager" as any, "executive_director" as any])
            )
          );

        for (const u of potentialGMs) {
          const userPerms = await calculateUserPermissions(u.id);
          if (userPerms.includes("disbursements.sign")) {
            execDirector = u;
            break;
          }
        }
      }

      if (!execDirector) {
        const allStaffSigners = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            signatureName: users.signatureName,
            signatureDepartment: users.signatureDepartment,
            signatureUrl: users.signatureUrl,
            showSignatureInDocuments: users.showSignatureInDocuments,
            role: users.role,
          })
          .from(users)
          .where(
            and(
              isNull(users.deletedAt),
              eq(users.status, "active" as any),
              ne(users.role, "service_requester" as any)
            )
          );

        for (const u of allStaffSigners) {
          const userPerms = await calculateUserPermissions(u.id);
          if (userPerms.includes("disbursements.sign")) {
            const [customRole] = await db
              .select({ nameAr: roles.nameAr })
              .from(userRoleAssignments)
              .innerJoin(roles, eq(userRoleAssignments.roleId, roles.id))
              .where(eq(userRoleAssignments.userId, u.id))
              .limit(1);

            if (
              (customRole && (customRole.nameAr || "").includes("المدير التنفيذي")) ||
              (u.signatureDepartment || "").includes("المدير التنفيذي")
            ) {
              execDirector = u;
              break;
            }
          }
        }
      }

      if (execDirector) {
        executiveDirectorName = execDirector.signatureName || execDirector.name;
        executiveDirectorSignatureDepartment = execDirector.signatureDepartment || "المدير التنفيذي";
        const isShowSig = 
          execDirector.showSignatureInDocuments === true || 
          (execDirector.showSignatureInDocuments as any) === 1 || 
          execDirector.showSignatureInDocuments === null || 
          execDirector.showSignatureInDocuments === undefined || 
          String(execDirector.showSignatureInDocuments) === "true" ||
          String(execDirector.showSignatureInDocuments) === "1";

        if (execDirector.signatureUrl && execDirector.signatureUrl.trim() !== "" && isShowSig) {
          executiveDirectorSignatureUrl = execDirector.signatureUrl;
        }
      }

      return {
        ...request,
        requestedBySignatureName: resolvedSignatureName,
        requestedBySignatureDepartment: resolvedSignatureDepartment,
        requestedBySignatureUrl: resolvedSignatureUrl,
        executiveDirectorName,
        executiveDirectorSignatureDepartment,
        executiveDirectorSignatureUrl,
        creatorHasSignPermission: hasSignInfo,
        // بيانات مُنفذ الاستثناء الحية (تتحدث تلقائياً عند تغيير البيانات من البروفايل)
        liveExceptionApproverName: liveExceptionApproverData
          ? (liveExceptionApproverData.signatureName || liveExceptionApproverData.name || null)
          : null,
        liveExceptionApproverDepartment: liveExceptionApproverData
          ? (liveExceptionApproverData.signatureDepartment || null)
          : null,
        liveExceptionApproverSignatureUrl: liveExceptionApproverData
          ? (liveExceptionApproverData.signatureUrl || null)
          : null,
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
        .where(eq(donationOpportunities.status, 'active'))
        .orderBy(desc(donationOpportunities.createdAt));

      return list;
    }),

  // التحقق من حالة صرف فرصة التبرع للطلب
  checkRequestDisbursementStatus: permissionProcedure("disbursements.view")
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const requests = await db
        .select({
          id: disbursementRequests.id,
          attachmentsJson: disbursementRequests.attachmentsJson,
          orderStatus: disbursementOrders.status,
        })
        .from(disbursementRequests)
        .leftJoin(disbursementOrders, eq(disbursementRequests.id, disbursementOrders.disbursementRequestId));

      const matchingApprovedRequest = requests.find(req => {
        if (!req.attachmentsJson) return false;
        try {
          const attachments = typeof req.attachmentsJson === 'string' 
            ? JSON.parse(req.attachmentsJson) 
            : req.attachmentsJson;
          if (Array.isArray(attachments)) {
            const metadataObj = attachments.find((a: any) => a.name === 'custom_supplier_info' && a.type === 'metadata');
            if (metadataObj && metadataObj.url) {
              const meta = JSON.parse(metadataObj.url);
              if (meta.mosqueRequestId === input.requestId) {
                return req.orderStatus === 'approved' || req.orderStatus === 'executed';
              }
            }
          }
        } catch (e) {
          console.error("Error parsing attachmentsJson:", e);
        }
        return false;
      });

      return {
        hasApprovedDisbursement: !!matchingApprovedRequest,
      };
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
        adminFees: input.adminFees ? input.adminFees.toString() : null,
        paymentType: input.paymentType,
        dateMiladi: input.dateMiladi ? new Date(input.dateMiladi) : null,
        completionPercentage: input.completionPercentage,
        fundingSourceName: input.fundingSourceName || null,
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
        adminFees: z.number().optional(),
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
          adminFees: input.adminFees ? input.adminFees.toString() : null,
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

  // اعتماد طلب صرف (سلسلة الاعتمادات - Stage 1 & Stage 2)
  approveRequest: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [request] = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.id, input.id));

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب الصرف غير موجود" });
      }

      const hasBoardChairmanPerm = 
        ctx.user.role === "board_chairman" ||
        await checkPermission(ctx.user.id, "board_chairman");

      const hasApprovePerm = 
        hasBoardChairmanPerm ||
        await checkPermission(ctx.user.id, "disbursements.approve") ||
        await checkPermission(ctx.user.id, "disbursements.sign") ||
        await checkPermission(ctx.user.id, "disbursement_orders.approve") ||
        await checkPermission(ctx.user.id, "disbursement_orders.sign");

      const isExecDirector = ["general_manager", "executive_director", "board_chairman"].includes(ctx.user.role) || (ctx.user as any)?.customRole?.nameAr === "المدير التنفيذي" || (ctx.user as any)?.customRole?.nameEn?.toLowerCase() === "executive director";

      // الاعتماد البنكي المباشر لرئيس مجلس الإدارة بدون دورة صرف اعتيادية
      if (hasBoardChairmanPerm) {
        await db
          .update(disbursementRequests)
          .set({
            status: "approved",
            approvedBy: ctx.user.id,
            approvedAt: new Date(),
            approvalNotes: input.notes || request.approvalNotes,
            updatedAt: new Date(),
          })
          .where(eq(disbursementRequests.id, input.id));

        return {
          success: true,
          status: "approved",
          message: "تم الاعتماد النهائي والمباشر لطلب الصرف بواسطة رئيس مجلس الإدارة بنجاح",
        };
      }

      // المرحلة الأولى: اعتماد مُعد الطلب أو المدير التنفيذي (pending / draft -> pending_executive)
      if (request.status === "pending" || request.status === "draft") {
        const isPreparer = request.requestedBy === ctx.user.id;
        
        if (!isPreparer && !isExecDirector && !hasApprovePerm) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "فقط مُعدّ الطلب يمتلك صلاحية اعتماد المرحلة الأولى لطلبات الصرف" 
          });
        }

        await db
          .update(disbursementRequests)
          .set({
            status: "pending_executive",
            approvalNotes: input.notes || request.approvalNotes,
            updatedAt: new Date(),
          })
          .where(eq(disbursementRequests.id, input.id));

        // إرسال إشعار للمدير التنفيذي / المدراء
        const executiveUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              inArray(users.role, ["general_manager", "executive_director", "board_chairman"] as any),
              isNull(users.deletedAt)
            )
          );

        for (const execUser of executiveUsers) {
          await createNotification({
            userId: execUser.id,
            title: "طلب صرف بانتظار الاعتماد",
            message: `تم اعتماد طلب الصرف رقم ${request.requestNumber} من قِبَل مُعد الطلب، وهو الآن بانتظار اعتماد المدير التنفيذي`,
            type: "warning",
            relatedType: "disbursement_request",
            relatedId: input.id,
          });
        }

        return {
          success: true,
          status: "pending_executive",
          message: "تمت المرحلة الأولى من الاعتماد بنجاح، والطلب الآن بانتظار اعتماد المدير التنفيذي",
        };
      }

      // المرحلة الثانية: اعتماد المدير التنفيذي فقط (pending_executive -> approved)
      if (request.status === "pending_executive") {
        if (!isExecDirector && !hasApprovePerm) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "فقط المدير التنفيذي يمتلك صلاحية اعتماد المرحلة الثانية لطلبات الصرف",
          });
        }

        await db
          .update(disbursementRequests)
          .set({
            status: "approved",
            approvedBy: ctx.user.id,
            approvedAt: new Date(),
            approvalNotes: input.notes || request.approvalNotes,
            updatedAt: new Date(),
          })
          .where(eq(disbursementRequests.id, input.id));

        // تحديث قيمة الدفعة المجدولة في العقد أو الدفعة اليدوية إذا كان المبلغ أقل
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

        // إرسال إشعار لمقدم/منشئ الطلب
        if (request.requestedBy) {
          await createNotification({
            userId: request.requestedBy,
            title: "تم اعتماد طلب الصرف نهائياً",
            message: `تم اعتماد طلب الصرف رقم ${request.requestNumber} بنجاح من قِبَل المدير التنفيذي، ويمكنك الآن تحويله إلى أمر صرف`,
            type: "success",
            relatedType: "disbursement_request",
            relatedId: input.id,
          });
        }

        // إرسال إشعار للإدارة المالية
        const financialUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.role, "financial"), isNull(users.deletedAt)));

        const project = request.projectId
          ? (await db
              .select({ name: projects.name })
              .from(projects)
              .where(eq(projects.id, request.projectId)))[0]
          : null;

        for (const user of financialUsers) {
          await createNotification({
            userId: user.id,
            title: "طلب صرف معتمد - جاهز لأمر الصرف",
            message: `تم اعتماد طلب الصرف رقم ${request.requestNumber} ${
              project ? `للمشروع ${project.name}` : ""
            } بمبلغ ${Number(request.amount).toLocaleString("ar-SA")} ريال من قِبَل المدير التنفيذي.`,
            type: "info",
            relatedType: "disbursement_request",
            relatedId: input.id,
          });
        }

        return {
          success: true,
          status: "approved",
          message: "تم اعتماد طلب الصرف بنجاح من قِبَل المدير التنفيذي",
        };
      }

      throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن اعتماد هذا الطلب في حالته الحالية" });
    }),

  // رفض طلب صرف
  rejectRequest: protectedProcedure
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

  // استثناء اعتماد طلب صرف (اعتماد بديل لمنشئ الطلب)
  exceptionApproveRequest: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        notes: z.string().min(1, "سبب أو مبرر الاستثناء مطلوب"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من صلاحية استثناء اعتماد مُعد الطلب
      const hasExceptionPerm = await checkPermission(ctx.user.id, "disbursements.exception_approve");

      if (!hasExceptionPerm) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "ليس لديك صلاحية استثناء اعتماد مُعد الطلب",
        });
      }

      if (!input.notes || !input.notes.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يرجى توضيح سبب أو مبرر استثناء الاعتماد",
        });
      }

      const [request] = await db
        .select()
        .from(disbursementRequests)
        .where(eq(disbursementRequests.id, input.id));

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب الصرف غير موجود" });
      }

      if (request.requestedBy === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن استخدام استثناء الاعتماد على طلباتك المنشأة بنفسك، يمكنك استخدام زر الاعتماد العادي لمُعد الطلب",
        });
      }

      if (request.status !== "pending" && request.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن عمل استثناء اعتماد إلا للطلبات التي في مرحلة اعتماد مُعد الطلب",
        });
      }

      // جلب بيانات توقيع المستخدم المنفذ للاستثناء
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

      // عند الاستثناء: اعتماد المرحلة الأولى نيابة عن منشئ الطلب وتحديث الـ Snapshot
      await db
        .update(disbursementRequests)
        .set({
          status: "pending_executive",
          creatorSignatureName: approverName,
          creatorSignatureDepartment: approverDept,
          creatorSignatureUrl: approverSigUrl,
          isException: true,
          exceptionApprovedBy: ctx.user.id,
          approvalNotes: `[مبرر استثناء اعتماد مُعد الطلب]: ${input.notes.trim()}`,
          updatedAt: new Date(),
        })
        .where(eq(disbursementRequests.id, input.id));

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
          title: "طلب صرف - استثناء اعتماد مُعد الطلب",
          message: `تم استخدام استثناء الاعتماد لطلب الصرف رقم ${request.requestNumber} بواسطة (${approverName}) بمبرر: ${input.notes.trim()}`,
          type: "warning",
          relatedType: "disbursement_request",
          relatedId: input.id,
        });
      }

      return {
        success: true,
        status: "pending_executive",
        message: "تم تنفيذ استثناء الاعتماد بنجاح وتوثيق مبرر الاعتماد واسم وتوقيع المعتمِد",
      };
    }),

  // استثناء اعتماد مُعد الأمر (أمر الصرف)
  exceptionApproveOrder: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        notes: z.string().min(1, "سبب أو مبرر الاستثناء مطلوب"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من صلاحية استثناء اعتماد مُعد الأمر
      const hasExceptionPerm = await checkPermission(ctx.user.id, "disbursement_orders.exception_approve");

      if (!hasExceptionPerm) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "ليس لديك صلاحية استثناء اعتماد مُعد أمر الصرف",
        });
      }

      if (!input.notes || !input.notes.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يرجى توضيح سبب أو مبرر استثناء الاعتماد",
        });
      }

      const [order] = await db
        .select()
        .from(disbursementOrders)
        .where(eq(disbursementOrders.id, input.id));

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "أمر الصرف غير موجود" });
      }

      if (ctx.user.email === "solayani@manarah.org.sa") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يمكنك اعتماد أمر الصرف بشكل عادي دون الحاجة لاستخدام استثناء الاعتماد",
        });
      }

      if (order.status !== "pending" && order.status !== "draft" && order.status !== "edited") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكن عمل استثناء اعتماد إلا للأوامر التي في مرحلة اعتماد مُعد الأمر",
        });
      }

      // جلب بيانات توقيع المستخدم المنفذ للاستثناء
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
      const approverDept = approverData?.signatureDepartment || "الإدارة المالية";
      const approverSigUrl = approverData?.signatureUrl || null;

      // عند الاستثناء: اعتماد المرحلة الأولى نيابة عن منشئ الأمر وتحديث الـ Snapshot
      await db
        .update(disbursementOrders)
        .set({
          status: "pending_executive",
          creatorSignatureName: approverName,
          creatorSignatureDepartment: approverDept,
          creatorSignatureUrl: approverSigUrl,
          isException: true,
          exceptionApprovedBy: ctx.user.id,
          financialApprovedAt: new Date(),
          approvalNotes: `[مبرر استثناء اعتماد مُعد الأمر]: ${input.notes.trim()}`,
          showCreatorSignature: true,
          updatedAt: new Date(),
        })
        .where(eq(disbursementOrders.id, input.id));

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
          title: "أمر صرف - استثناء اعتماد مُعد الأمر",
          message: `تم استخدام استثناء الاعتماد لأمر الصرف رقم ${order.orderNumber} بواسطة (${approverName}) بمبرر: ${input.notes.trim()}`,
          type: "warning",
          relatedType: "disbursement_order",
          relatedId: input.id,
        });
      }

      return {
        success: true,
        status: "pending_executive",
        message: "تم تنفيذ استثناء الاعتماد بنجاح وتوثيق مبرر الاعتماد واسم وتوقيع المعتمِد",
      };
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
          createdBy: disbursementOrders.createdBy,
          approvedBy: disbursementOrders.approvedBy,
          createdAt: disbursementOrders.createdAt,
          approvedAt: disbursementOrders.approvedAt,
          isException: disbursementOrders.isException,
          creatorSignatureName: disbursementOrders.creatorSignatureName,
          creatorSignatureDepartment: disbursementOrders.creatorSignatureDepartment,
          creatorSignatureUrl: disbursementOrders.creatorSignatureUrl,
          approvalNotes: disbursementOrders.approvalNotes,
          exceptionApprovedBy: disbursementOrders.exceptionApprovedBy,
          requestNumber: disbursementRequests.requestNumber,
          isDirect: disbursementRequests.isDirect,
          requestTitle: disbursementRequests.description,
          attachmentsJson: disbursementRequests.attachmentsJson,
          projectId: projects.id,
          projectName: projects.name,
          projectBudget: projects.budget,
        })
        .from(disbursementOrders)
        .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
        .leftJoin(projects, eq(disbursementRequests.projectId, projects.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(
          sql`CASE 
            WHEN ${disbursementOrders.status} = 'pending_executive' THEN 0 
            WHEN ${disbursementOrders.status} = 'pending' THEN 1 
            WHEN ${disbursementOrders.status} = 'draft' THEN 2 
            ELSE 3 
          END`,
          desc(disbursementOrders.createdAt)
        )
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
          // جلب بيانات العقد المرتبط بالطلب أولاً، وإلا جلب عقد المشروع
          let contractId = request.contractId;
          if (!contractId && request.contractPaymentId) {
            const [paymentData] = await db
              .select({ contractId: contractPayments.contractId })
              .from(contractPayments)
              .where(eq(contractPayments.id, request.contractPaymentId));
            if (paymentData) {
              contractId = paymentData.contractId;
            }
          }

          let contract = null;
          if (contractId) {
            [contract] = await db
              .select()
              .from(contractsEnhanced)
              .where(eq(contractsEnhanced.id, contractId));
          } else {
            [contract] = await db
              .select()
              .from(contractsEnhanced)
              .where(eq(contractsEnhanced.projectId, projectData.id));
          }

          let contractAmount = 0;
          let fundingAmount = 0;
          let fundingSource = "لا يوجد";
          if (contract) {
            contractAmount = Number(contract.contractAmount || 0);
            fundingAmount = Number(contract.supportedAmount || 0);
            
            if (contract.supportingEntity) {
              try {
                const str = contract.supportingEntity.trim();
                const parsedEntities = str.startsWith("[") ? JSON.parse(str) : str;
                if (Array.isArray(parsedEntities) && parsedEntities.length > 0) {
                  const names = parsedEntities
                    .map((e: any) => {
                      const name = e.entity === "other" || e.entity === "اخرى" ? (e.customEntity || "اخرى") : e.entity;
                      if (parsedEntities.length > 1 && e.amount) {
                        return `${name} (${Number(e.amount).toLocaleString()} ريال)`;
                      }
                      return name;
                    })
                    .filter(Boolean);
                  if (names.length > 0) {
                    fundingSource = names.join("، ");
                  }
                  const sumJsonAmounts = parsedEntities.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
                  if (sumJsonAmounts > 0) {
                    fundingAmount = sumJsonAmounts;
                  }
                } else if (typeof contract.supportingEntity === "string" && contract.supportingEntity.trim()) {
                  fundingSource = contract.supportingEntity;
                }
              } catch (e) {
                if (typeof contract.supportingEntity === "string" && contract.supportingEntity.trim()) {
                  fundingSource = contract.supportingEntity;
                }
              }
            } else if (contract.supportType) {
              fundingSource = contract.supportType;
            }

            const managementPercentage = Number((contract as any).managementPercentage || 0);
            const adminFeesVal = request.adminFees 
              ? Number(request.adminFees) 
              : (contractAmount * managementPercentage) / 100;
            const totalOpportunityValue = contractAmount + adminFeesVal;

            if (fundingAmount === 0 && totalOpportunityValue > 0) {
              fundingAmount = totalOpportunityValue;
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
            managementPercentage: contract ? Number((contract as any).managementPercentage || 0) : 0,
          };
        }
      }

      // جلب بيانات الحسابين المثبتين للإدارة المالية والمدير التنفيذي
      const [financialUser] = await db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          signatureName: users.signatureName,
          signatureDepartment: users.signatureDepartment,
          signatureUrl: users.signatureUrl,
        })
        .from(users)
        .where(eq(users.email, "solayani@manarah.org.sa"));

      const [executiveDirectorUser] = await db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          signatureName: users.signatureName,
          signatureDepartment: users.signatureDepartment,
          signatureUrl: users.signatureUrl,
        })
        .from(users)
        .where(eq(users.email, "ceo@manarah.org.sa"));

      // جلب بيانات مُنفذ الاستثناء الحية (لتحديث خانة التوقيع عند تغيير البيانات من البروفايل)
      let liveExceptionApproverData: any = null;
      if (order.isException && order.exceptionApprovedBy) {
        const [exceptionApprover] = await db
          .select({
            signatureName: users.signatureName,
            signatureDepartment: users.signatureDepartment,
            signatureUrl: users.signatureUrl,
            name: users.name,
          })
          .from(users)
          .where(eq(users.id, order.exceptionApprovedBy));
        if (exceptionApprover) {
          liveExceptionApproverData = exceptionApprover;
        }
      }

      return {
        ...order,
        disbursementRequest: request,
        project,
        createdByUser: financialUser || null,
        approvedByUser: executiveDirectorUser || null,
        financialUser: financialUser || null,
        executiveDirectorUser: executiveDirectorUser || null,
        // بيانات مُنفذ الاستثناء الحية
        liveExceptionApproverName: liveExceptionApproverData
          ? (liveExceptionApproverData.signatureName || liveExceptionApproverData.name || null)
          : null,
        liveExceptionApproverDepartment: liveExceptionApproverData
          ? (liveExceptionApproverData.signatureDepartment || null)
          : null,
        liveExceptionApproverSignatureUrl: liveExceptionApproverData
          ? (liveExceptionApproverData.signatureUrl || null)
          : null,
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
              sadadNumber: input.sadadNumber || null,
              billerCode: input.billerCode || null,
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
        sadadNumber: input.sadadNumber || null,
        billerCode: input.billerCode || null,
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
  createDirectOrder: protectedProcedure
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
      const hasCreatePerm = await checkPermission(ctx.user.id, "disbursements.create");
      const hasCreateDirectPerm = await checkPermission(ctx.user.id, "disbursement_orders.create_direct");
      const hasCreateCustomPerm = await checkPermission(ctx.user.id, "disbursements.create_custom");

      if (!hasCreatePerm && !hasCreateDirectPerm && !hasCreateCustomPerm) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "ليس لديك صلاحية لإنشاء أمر صرف مباشر (يتطلب صلاحية disbursements.create أو disbursement_orders.create_direct أو disbursements.create_custom)",
        });
      }

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

      const requestNumber = await generateDisbursementRequestNumber(db, true);

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
        isDirect: true,
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

      const hasBoardChairmanOrderPerm = 
        ctx.user.role === "board_chairman" ||
        await checkPermission(ctx.user.id, "board_chairman");

      const allowedRoles = ["super_admin", "system_admin", "general_manager", "board_chairman"];
      if (!allowedRoles.includes(ctx.user.role) && !hasBoardChairmanOrderPerm) {
        const { calculateUserPermissions } = await import("../permissions");
        const userPermissions = await calculateUserPermissions(ctx.user.id);
        if (!userPermissions.includes("financial.approve") && !userPermissions.includes("disbursement_orders.approve") && !userPermissions.includes("board_chairman")) {
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

      // الاعتماد البنكي المباشر لأوامر الصرف بواسطة رئيس مجلس الإدارة
      if (hasBoardChairmanOrderPerm) {
        await db
          .update(disbursementOrders)
          .set({
            status: "approved" as any,
            approvedBy: ctx.user.id,
            approvedAt: new Date(),
            approvalNotes: input.notes,
            updatedAt: new Date(),
          })
          .where(eq(disbursementOrders.id, input.id));

        return {
          success: true,
          status: "approved",
          message: "تم الاعتماد النهائي والمباشر لأمر الصرف وتحويله بنكياً بواسطة رئيس مجلس الإدارة بنجاح",
        };
      }

      const hasApprovePermOrder = 
        await checkPermission(ctx.user.id, "disbursement_orders.approve") ||
        await checkPermission(ctx.user.id, "disbursement_orders.sign") ||
        await checkPermission(ctx.user.id, "disbursements.approve") ||
        await checkPermission(ctx.user.id, "disbursements.sign");

      const userEmail = ctx.user.email;
      const isChairmanUser = 
        ctx.user.role === "board_chairman" || 
        ["super_admin", "system_admin"].includes(ctx.user.role) ||
        await checkPermission(ctx.user.id, "board_chairman");

      if (isChairmanUser) {
        // رئيس مجلس الإدارة أو الأدمن يعتمد مباشرة
        await db
          .update(disbursementOrders)
          .set({
            status: "approved" as any,
            approvedBy: ctx.user.id,
            approvedAt: new Date(),
            approvalNotes: input.notes,
            updatedAt: new Date(),
          })
          .where(eq(disbursementOrders.id, input.id));
      } else {
        // المرحلة الأولى: حساب الإدارة المالية (solayani@manarah.org.sa) حصراً
        if (order.status === "pending" || order.status === "draft" || order.status === "edited") {
          if (userEmail !== "solayani@manarah.org.sa") {
            throw new TRPCError({ 
              code: "FORBIDDEN", 
              message: "فقط حساب الإدارة المالية (solayani@manarah.org.sa) يمتلك صلاحية اعتماد المرحلة الأولى لأوامر الصرف" 
            });
          }

          await db
            .update(disbursementOrders)
            .set({
              status: "pending_executive" as any,
              createdBy: ctx.user.id,
              financialApprovedAt: new Date(),
              approvalNotes: input.notes,
              updatedAt: new Date(),
            })
            .where(eq(disbursementOrders.id, input.id));

          return {
            success: true,
            status: "pending_executive",
            message: "تم اعتماد المرحلة الأولى من أمر الصرف بنجاح، والأمر الآن بانتظار اعتماد المدير التنفيذي",
          };
        }

        // المرحلة الثانية: حساب المدير التنفيذي (ceo@manarah.org.sa) حصراً
        if (order.status === "pending_executive") {
          if (userEmail !== "ceo@manarah.org.sa") {
            throw new TRPCError({ 
              code: "FORBIDDEN", 
              message: "فقط حساب المدير التنفيذي (ceo@manarah.org.sa) يمتلك صلاحية اعتماد المرحلة الثانية لأوامر الصرف" 
            });
          }

          await db
            .update(disbursementOrders)
            .set({
              status: "approved" as any,
              approvedBy: ctx.user.id,
              approvedAt: new Date(),
              approvalNotes: input.notes,
              updatedAt: new Date(),
            })
            .where(eq(disbursementOrders.id, input.id));
        }
      }

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

      // تحديث وإغلاق فرصة التبرع والطلب المرتبط تلقائياً عند الصرف
      if (request?.attachmentsJson) {
        try {
          const attachments = typeof request.attachmentsJson === "string"
            ? JSON.parse(request.attachmentsJson)
            : request.attachmentsJson;
          if (Array.isArray(attachments)) {
            const infoAttachment = attachments.find((a: any) => a.name === "custom_supplier_info" && a.type === "metadata");
            if (infoAttachment && infoAttachment.url) {
              const meta = typeof infoAttachment.url === "string" ? JSON.parse(infoAttachment.url) : infoAttachment.url;
              if (meta?.donationOpportunityId) {
                await db
                  .update(donationOpportunities)
                  .set({
                    status: "completed",
                    collectedAmount: sql`targetAmount`,
                    updatedAt: new Date(),
                  })
                  .where(eq(donationOpportunities.id, Number(meta.donationOpportunityId)));
              }
              if (meta?.mosqueRequestId) {
                await db
                  .update(mosqueRequests)
                  .set({
                    currentStage: "closed",
                    status: "completed",
                    updatedAt: new Date(),
                  })
                  .where(eq(mosqueRequests.id, Number(meta.mosqueRequestId)));
                await triggerBeneficiarySatisfactionSurvey(Number(meta.mosqueRequestId));
              }
            }
          }
        } catch (e) {
          console.error("Error updating linked donation opportunity status on order execution:", e);
        }
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

      const [orderData] = await db
        .select({ status: disbursementOrders.status })
        .from(disbursementOrders)
        .where(eq(disbursementOrders.id, input.id));

      if (!orderData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "أمر الصرف غير موجود" });
      }

      const userEmail = ctx.user.email;
      const isChairmanUser = 
        ctx.user.role === "board_chairman" || 
        ["super_admin", "system_admin"].includes(ctx.user.role) ||
        await checkPermission(ctx.user.id, "board_chairman");

      if (!isChairmanUser) {
        if (orderData.status === "pending" || orderData.status === "draft" || orderData.status === "edited") {
          if (userEmail !== "solayani@manarah.org.sa") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "فقط حساب الإدارة المالية (solayani@manarah.org.sa) يمتلك صلاحية رفض أمر الصرف في هذه المرحلة",
            });
          }
        } else if (orderData.status === "pending_executive") {
          if (userEmail !== "ceo@manarah.org.sa") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "فقط حساب المدير التنفيذي (ceo@manarah.org.sa) يمتلك صلاحية رفض أمر الصرف في هذه المرحلة",
            });
          }
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
        .where(and(
          eq(disbursementRequests.projectId, input.projectId),
          eq(disbursementRequests.isDirect, false)
        ))
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
      .where(and(
        eq(disbursementRequests.status, "pending"),
        eq(disbursementRequests.isDirect, false)
      ));

    const [approvedRequests] = await db
      .select({ count: sql<number>`count(*)` })
      .from(disbursementRequests)
      .where(and(
        eq(disbursementRequests.status, "approved"),
        eq(disbursementRequests.isDirect, false)
      ));

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
  // تحديث إظهار/إخفاء توقيع طلب الصرف
  updateRequestSignatureVisibility: protectedProcedure
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

      const updateData: Record<string, any> = {};
      if (typeof input.showCreatorSignature === "boolean") {
        updateData.showCreatorSignature = input.showCreatorSignature;
      }
      if (typeof input.showExecutiveDirectorSignature === "boolean") {
        updateData.showExecutiveDirectorSignature = input.showExecutiveDirectorSignature;
      }

      await db
        .update(disbursementRequests)
        .set(updateData)
        .where(eq(disbursementRequests.id, input.id));

      return { success: true };
    }),

  // تحديث إظهار/إخفاء توقيع أمر الصرف
  updateOrderSignatureVisibility: protectedProcedure
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

      const updateData: Record<string, any> = {};
      if (typeof input.showCreatorSignature === "boolean") {
        updateData.showCreatorSignature = input.showCreatorSignature;
      }
      if (typeof input.showExecutiveDirectorSignature === "boolean") {
        updateData.showExecutiveDirectorSignature = input.showExecutiveDirectorSignature;
      }

      await db
        .update(disbursementOrders)
        .set(updateData)
        .where(eq(disbursementOrders.id, input.id));

      return { success: true };
    }),
});
