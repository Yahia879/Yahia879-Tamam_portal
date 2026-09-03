import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { permissionProcedure, checkPermission } from "../permissions";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { 
  mosqueRequests, 
  requestAttachments, 
  requestComments, 
  requestHistory,
  requestEvaluations,
  mosques,
  users,
  auditLogs,
  notifications,
  fieldVisitReports,
  quickResponseReports,
  finalReports,
  quantitySchedules,
  quotations,
  projects,
  projectPhases,
  projectNumberSequence,
  stageSettings,
  requestStageTracking,
  contractsEnhanced,
  requestNumberSequence,
  projectMosques,
  fieldVisits,
  programs,
  contractPayments,
  payments,
  requestExceptions,
  donationOpportunities,
  publicSubmissions,
  receiptVouchers,
  donations,
  notificationTemplates,
} from "../../drizzle/schema";
import { eq, ne, and, desc, sql, inArray, notInArray, or, gte, lte, gt, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { randomBytes } from "crypto";
import { 
  STAGE_TRANSITION_PERMISSIONS, 
  STATUS_CHANGE_PERMISSIONS, 
  STAGE_LABELS,
  TECHNICAL_EVAL_OPTIONS,
  TECHNICAL_EVAL_OPTION_LABELS,
  getPrerequisites,
  PREREQUISITE_ERROR_MESSAGES,
  type PrerequisiteType,
} from "@shared/constants";
import { notifyRequestCreation, notifyUsersByRole, createNotification, notifyRequestStageChangeToOfficers, notifyQuotationApproval, sendEmailNotification } from "./notifications";

export function getSurveyBaseUrl(req?: any): string {
  // إذا توفر كائن الطلب في الجلسة، نستخرج الرابط الذي يعمل عليه المتصفح حالياً
  if (req) {
    const origin = req.headers?.origin;
    if (origin && typeof origin === "string" && origin.trim()) {
      return origin.replace(/\/+$/, "");
    }
    const host = req.headers?.["x-forwarded-host"] || req.headers?.host;
    if (host && typeof host === "string" && host.trim()) {
      const proto = req.headers?.["x-forwarded-proto"] || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  }

  // في التطوير والتشغيل المحلي، نستخدم localhost:3000
  const envUrl = process.env.APP_URL || process.env.BASE_URL;
  if (envUrl && (envUrl.includes("localhost") || envUrl.includes("127.0.0.1"))) {
    return envUrl.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

export async function triggerBeneficiarySatisfactionSurvey(requestId: number) {
  const db = await getDb();
  if (!db) return;

  try {
    const [request] = await db
      .select()
      .from(mosqueRequests)
      .where(eq(mosqueRequests.id, requestId))
      .limit(1);

    if (!request || !request.userId) return;

    const [beneficiary] = await db
      .select({ id: users.id, email: users.email, role: users.role, name: users.name })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!beneficiary || beneficiary.role !== "service_requester") return;

    const appBaseUrl = getSurveyBaseUrl();
    const evalUrl = `${appBaseUrl}/requests/${request.id}/evaluation`;
    const emailTitle = `📋 تقييم رضا المستفيد - تم إغلاق الطلب رقم ${request.requestNumber}`;
    const emailMessage = `السلام عليكم ورحمة الله وبركاته،\n\nنفيدكم بأنه تم إغلاق طلبكم رقم ${request.requestNumber} بنجاح لدى جمعية عمارة المساجد (منارة).\n\nحرصاً منا على تحسين وتطوير خدماتنا، نأمل منكم تكرمكم بتقييم مستوى رضاكم عن الخدمة المقدمة من خلال الضغط على زر التقييم أدناه:\n\nشكراً لتعاونكم معنا.`;

    // 1. In-App Notification (قائمة الإشعارات)
    await createNotification({
      userId: beneficiary.id,
      title: `📋 تقييم رضا المستفيد (طلب ${request.requestNumber})`,
      message: `تم إغلاق طلبك رقم ${request.requestNumber} بنجاح. يسعدنا مشاركتك تقييم مستوى الخدمة المقدمة عبر الرابط المباشر.`,
      type: "request",
      relatedType: "request_evaluation",
      relatedId: requestId,
    });

    // 2. Email Notification (إشعار البريد الإلكتروني بزر تفاعلي أنيق)
    if (beneficiary.email) {
      sendEmailNotification(
        beneficiary.email, 
        emailTitle, 
        emailMessage, 
        evalUrl, 
        "⭐️ تقييم الخدمة الآن ⭐️"
      ).catch((e) => {
        console.error("Failed to send email survey notification in background:", e);
      });
    }

    // 3. تسجيل عملية الإرسال في سجل التدقيق (audit_logs)
    await db.insert(auditLogs).values({
      userId: beneficiary.id,
      action: "survey_dispatched_on_closed",
      entityType: "request",
      entityId: request.id,
      newValues: JSON.stringify({
        dispatchType: "request_closed",
        dispatchTypeLabel: "إرسال تلقائي عند انتهاء الطلب",
        requestId: request.id,
        requestNumber: request.requestNumber,
        programType: request.programType,
        mosqueName: null,
        recipientName: beneficiary.name || "",
        recipientEmail: beneficiary.email || "",
        dispatchedAt: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("Error triggering beneficiary satisfaction survey:", error);
  }
}

// دالة إنشاء رقم طلب فريد بمنهجية سنوية
async function generateRequestNumber(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  programType: string
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
  // تنسيق: REQ-YYYY-PGM-XXXX
  return `REQ-${currentYear}-${prefix}-${String(sequence).padStart(4, "0")}`;
}

// المراحل الـ 11
const requestStages = [
  "submitted", "initial_review", "field_visit", 
  "technical_eval", "boq_preparation", "financial_eval_and_approval", 
  "contracting", "execution", 
  "handover", "closed"
] as const;

// حالات الطلب
const requestStatuses = [
  "pending", "under_review", "approved", "rejected", 
  "suspended", "in_progress", "completed"
] as const;

// مخطط إنشاء طلب جديد
const createRequestSchema = z.object({
  mosqueId: z.number().optional().nullable(), // اختياري لبرنامج بنيان
  programType: z.string().min(1, "يرجى اختيار البرنامج"),
  priority: z.enum(["urgent", "medium", "normal"]).default("normal"),
  programData: z.record(z.string(), z.any()).optional(),
  descriptiveName: z.string().optional().nullable(),
  description: z.string().optional(),
});

// مخطط البحث والفلترة
const searchRequestsSchema = z.object({
  search: z.string().optional(),
  programType: z.string().optional(),
  currentStage: z.enum(requestStages).optional(),
  boqPreparationsView: z.boolean().optional(),
  status: z.enum(requestStatuses).optional(),
  priority: z.enum(["urgent", "medium", "normal"]).optional(),
  mosqueId: z.number().optional(),
  assignedTo: z.number().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  creatorType: z.enum(["all", "beneficiary", "officer"]).optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
});

export const requestsRouter = router({
  // إنشاء طلب جديد
  create: protectedProcedure
    .input(createRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من صلاحية إنشاء الطلب
      // يُسمح لكل من: الموظفين الحاصلين على صلاحية requests.create، وطالبي الخدمة (service_requester)
      const hasPermission = await checkPermission(ctx.user.id, "requests.create");
      const isRequester = ctx.user.role === "service_requester";

      if (!hasPermission && !isRequester) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "ليس لديك صلاحية لإنشاء طلبات جديدة" 
        });
      }

      if (isRequester) {
        const [userRow] = await db
          .select({ requesterType: users.requesterType })
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);

        if (userRow && userRow.requesterType === "imam") {
          const previousRequests = await db
            .select({ 
              status: mosqueRequests.status,
              createdAt: mosqueRequests.createdAt 
            })
            .from(mosqueRequests)
            .where(eq(mosqueRequests.userId, ctx.user.id))
            .orderBy(desc(mosqueRequests.createdAt))
            .limit(1);

          if (previousRequests.length > 0) {
            const latestRequest = previousRequests[0];
            if (latestRequest.status !== "completed" && latestRequest.status !== "rejected") {
              // التحقق من وجود استثناء معتمد تم إنشاؤه بعد الطلب الأخير
              const activeException = await db
                .select()
                .from(requestExceptions)
                .where(
                  and(
                    eq(requestExceptions.userId, ctx.user.id),
                    eq(requestExceptions.status, "approved"),
                    gt(requestExceptions.createdAt, latestRequest.createdAt)
                  )
                )
                .limit(1);

              if (activeException.length === 0) {
                throw new TRPCError({
                  code: "FORBIDDEN",
                  message: "لا يمكنك تقديم طلب جديد لوجود طلب سابق قيد المعالجة ولم يكتمل بعد"
                });
              }
            }
          }
        }
      }

      // التحقق من وجود المسجد (برنامج بنيان والبرامج التي لا تتطلب مسجداً)
      let mosqueData = null;
      
      // جلب إعدادات البرنامج من قاعدة البيانات
      const [programConfig] = await db.select().from(programs).where(eq(programs.id, input.programType)).limit(1);
      
      // إذا لم يوجد البرنامج في القاعدة (قد يكون من الثوابت القديمة)، نستخدم المنطق القديم للتوافق
      const requiresMosque = programConfig ? programConfig.requiresMosque : (input.programType !== "bunyan");

      if (requiresMosque) {
        // البرامج التي تتطلب مسجد موجود
        if (!input.mosqueId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "يجب اختيار مسجد لهذا البرنامج" });
        }
        const mosque = await db.select().from(mosques).where(eq(mosques.id, input.mosqueId)).limit(1);
        if (mosque.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "المسجد غير موجود" });
        }
        mosqueData = mosque[0];
      }

      // التحقق من اعتماد المسجد (فقط إذا كان البرنامج يتطلب مسجد)
      if (mosqueData && mosqueData.approvalStatus !== "approved" && ctx.user.role === "service_requester") {
        throw new TRPCError({ code: "FORBIDDEN", message: "المسجد غير معتمد بعد" });
      }

      const requestNumber = await generateRequestNumber(db, input.programType);
      const programDataJson = input.programData ? JSON.stringify(input.programData) : null;

      const result = await db.insert(mosqueRequests).values({
        requestNumber,
        mosqueId: requiresMosque ? input.mosqueId : null,
        userId: ctx.user.id,
        programType: input.programType,
        currentStage: "submitted",
        status: "pending",
        priority: input.priority,
        programData: input.programData || {},
        descriptiveName: input.descriptiveName || null,
      });

      const requestId = Number(result[0].insertId);

      // إضافة سجل في تاريخ الطلب
      await db.insert(requestHistory).values({
        requestId,
        userId: ctx.user.id,
        toStage: "submitted",
        toStatus: "pending",
        action: "request_created",
        notes: input.description || "تم تقديم الطلب",
      });

      // تسجيل في سجل التدقيق
      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "request_created",
        entityType: "request",
        entityId: requestId,
        newValues: { requestNumber, programType: input.programType, mosqueId: input.mosqueId },
      });

      // إرسال إشعار عند إنشاء طلب جديد
      await notifyRequestCreation(requestId, requestNumber, ctx.user.id);

      return { success: true, requestId, requestNumber, message: "تم تقديم الطلب بنجاح" };
    }),

  // تحديث التسمية التوضيحية للطلب
  updateDescriptiveName: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      descriptiveName: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db
        .update(mosqueRequests)
        .set({ descriptiveName: input.descriptiveName || null })
        .where(eq(mosqueRequests.id, input.requestId));

      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "request_updated",
        entityType: "request",
        entityId: input.requestId,
        newValues: { descriptiveName: input.descriptiveName },
      });

      return { success: true, message: "تم تحديث التسمية التوضيحية بنجاح" };
    }),

  // الحصول على طلب بالمعرف
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const result = await db.select({
        request: mosqueRequests,
        programName: programs.name,
        programConditions: programs.conditions,
        evaluationNotes: sql<string | null>`(select notes from request_evaluations where request_evaluations.requestId = mosque_requests.id and request_evaluations.evaluationType = 'beneficiary_satisfaction' order by id desc limit 1)`,
      }).from(mosqueRequests)
        .leftJoin(programs, eq(mosqueRequests.programType, programs.id))
        .where(eq(mosqueRequests.id, input.id))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      const request = {
        ...result[0].request,
        programName: result[0].programName,
        programConditions: result[0].programConditions,
        evaluationNotes: result[0].evaluationNotes,
      };

      const isOwner = request.userId === ctx.user.id;
      const isAssigned = request.assignedTo === ctx.user.id;
      const isFinalReportAssignee = request.finalReportAssignedTo === ctx.user.id;
      const isInternal = ["super_admin", "system_admin", "projects_office", "field_team", "quick_response", "financial", "financial_manager", "project_manager", "corporate_comm"].includes(ctx.user.role);
      const hasDetailsPerm = await checkPermission(ctx.user.id, "requests.view_details") || 
                             await checkPermission(ctx.user.id, "requests.manage_as_field_team") ||
                             await checkPermission(ctx.user.id, "requests.manage_as_quick_response") ||
                             await checkPermission(ctx.user.id, "pending_reports.view") ||
                             (ctx.user.role === 'corporate_comm' && isFinalReportAssignee);

      if (!isOwner && !isAssigned && !isFinalReportAssignee && !hasDetailsPerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض هذا الطلب" });
      }

      // الحصول على بيانات المسجد (قد يكون null في حالة برنامج بنيان أو طلب سريع مخصص)
      let mosque: typeof mosques.$inferSelect | null = null;
      if (request.mosqueId) {
        const mosqueResult = await db.select().from(mosques).where(eq(mosques.id, request.mosqueId)).limit(1);
        mosque = mosqueResult[0] || null;
      } else if (request.programData) {
        let progData: any = null;
        try {
          if (typeof request.programData === 'string') {
            progData = JSON.parse(request.programData);
          } else if (typeof request.programData === 'object') {
            progData = request.programData;
          }
        } catch (e) {
          console.error("Error parsing programData in getById:", e);
        }
        if (progData && typeof progData === 'object' && progData.customMosqueName) {
          mosque = {
            id: 0,
            name: progData.customMosqueName,
            city: progData.customMosqueCity || "غير محدد",
            address: progData.customMosqueAddress || null,
            district: null,
            latitude: null,
            longitude: null,
            approvalStatus: "approved",
            registeredBy: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            notes: null,
            imamName: null,
            imamPhone: null,
            muezzinName: null,
            muezzinPhone: null,
            servantName: null,
            servantPhone: null,
            mosqueAge: null,
            hasPrayerHall: false,
            area: null,
          } as any;
        }
      }

      // الحصول على بيانات مقدم الطلب
      const requester = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        nationalId: users.nationalId,
        city: users.city,
      }).from(users).where(eq(users.id, request.userId as number)).limit(1);

      // الحصول على بيانات المسؤول عن الزيارة الميدانية
      let fieldVisitAssignedToUser = null;
      if (request.fieldVisitAssignedTo) {
        const assignedUserResult = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
        }).from(users).where(eq(users.id, request.fieldVisitAssignedTo)).limit(1);
        fieldVisitAssignedToUser = assignedUserResult[0] || null;
      }

      // الحصول على بيانات المسؤول المعين حالياً للطلب (موظف الاستجابة السريعة)
      let assignedToUser = null;
      if (request.assignedTo) {
        const assignedUserResult = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
        }).from(users).where(eq(users.id, request.assignedTo)).limit(1);
        assignedToUser = assignedUserResult[0] || null;
      }

      // الحصول على بيانات المسؤول عن التقرير الختامي
      let finalReportAssignedToUser = null;
      if (request.finalReportAssignedTo) {
        const assignedUserResult = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
        }).from(users).where(eq(users.id, request.finalReportAssignedTo)).limit(1);
        finalReportAssignedToUser = assignedUserResult[0] || null;
      }

      // الحصول على المرفقات
      const attachments = await db.select().from(requestAttachments).where(eq(requestAttachments.requestId, input.id));

      // الحصول على التعليقات (فلترة التعليقات الداخلية لطالبي الخدمة)
      let comments = await db.select({
        id: requestComments.id,
        comment: requestComments.comment,
        isInternal: requestComments.isInternal,
        isRead: requestComments.isRead,
        createdAt: requestComments.createdAt,
        userName: users.name,
        userId: users.id,
      }).from(requestComments)
        .leftJoin(users, eq(requestComments.userId, users.id))
        .where(eq(requestComments.requestId, input.id))
        .orderBy(desc(requestComments.createdAt));

      if (ctx.user.role === "service_requester") {
        comments = comments.filter(c => !c.isInternal);
      }

      // الحصول على سجل الطلب (فقط للموظفين الداخليين)
      let history: any[] = [];
      if (isInternal || isAssigned) {
        history = await db.select({
          id: requestHistory.id,
          fromStage: requestHistory.fromStage,
          toStage: requestHistory.toStage,
          fromStatus: requestHistory.fromStatus,
          toStatus: requestHistory.toStatus,
          action: requestHistory.action,
          notes: requestHistory.notes,
          createdAt: requestHistory.createdAt,
          userName: users.name,
        }).from(requestHistory)
          .leftJoin(users, eq(requestHistory.userId, users.id))
          .where(eq(requestHistory.requestId, input.id))
          .orderBy(desc(requestHistory.createdAt));
      }

      // الحصول على تقارير الزيارات الميدانية (للموظفين ومقدم الطلب)
      let fieldReports: any[] = [];
      let quickReports: any[] = [];
      if (isInternal || isAssigned || isOwner) {
        fieldReports = await db.select().from(fieldVisitReports).where(eq(fieldVisitReports.requestId, input.id));
        quickReports = await db.select().from(quickResponseReports).where(eq(quickResponseReports.requestId, input.id));
      }

      // حساب نسبة التقدم
      const stages = ["submitted", "initial_review", "field_visit", "technical_eval", "financial_eval_and_approval", "execution", "closed"];
      const currentStageIndex = stages.indexOf(request.currentStage);
      const progressPercentage = Math.round(((currentStageIndex + 1) / stages.length) * 100);

      // الحصول على المشروع المرتبط بالطلب (إن وجد)
      const projectResult = await db.select({
        id: projects.id,
        projectNumber: projects.projectNumber,
        name: projects.name,
        status: projects.status,
        budget: projects.budget,
        isMultiMosque: projects.isMultiMosque,
      }).from(projects).where(eq(projects.requestId, input.id)).limit(1);
      const project = projectResult[0] || null;

      let multiMosques: any[] = [];
      if (project && project.isMultiMosque) {
        multiMosques = await db.select({
          id: mosques.id,
          name: mosques.name,
          city: mosques.city,
          district: mosques.district,
        }).from(projectMosques)
          .innerJoin(mosques, eq(projectMosques.mosqueId, mosques.id))
          .where(eq(projectMosques.projectId, project.id));
      }

      const isMultiMosque = Boolean(project?.isMultiMosque || (typeof request.programData === 'object' && (request.programData as any)?.isMultiMosque));
      const multiProjectName = project?.name || (typeof request.programData === 'object' && (request.programData as any)?.projectName) || null;

      // التحقق من وجود عرض سعر معتمد
      const [acceptedQuotation] = await db
        .select({ id: quotations.id })
        .from(quotations)
        .where(
          and(
            or(
              eq(quotations.requestId, input.id),
              project?.id ? eq(quotations.projectId, project.id) : undefined
            ),
            inArray(quotations.status, ["accepted", "approved"])
          )
        )
        .limit(1);
      const hasAcceptedQuotation = !!acceptedQuotation;

      return {
        ...request,
        mosque: isMultiMosque ? null : mosque,
        requester: requester[0] || null,
        attachments,
        comments,
        history,
        fieldReports,
        quickReports,
        project,
        isMultiMosque,
        projectName: multiProjectName,
        multiMosques,
        progressPercentage,
        hasAcceptedQuotation,
        isOwner,
        fieldVisitAssignedToUser,
        assignedToUser,
        finalReportAssignedToUser,
      };
    }),

  // البحث والفلترة في الطلبات
  search: protectedProcedure
    .input(searchRequestsSchema)
    .query(async ({ input, ctx }) => {
      console.log('[search] User:', ctx.user.id, 'Role:', ctx.user.role);
      try {
      const db = await getDb();
      if (!db) {
        console.log('[search] No database connection');
        return { requests: [], total: 0 };
      }

      const { calculateUserPermissions } = await import("../permissions");
      const userPermissions = await calculateUserPermissions(ctx.user.id);
      const hasViewDetailsPermission = userPermissions.includes("requests.view_details");
      const isFieldTeam = ctx.user.role === "field_team" || userPermissions.includes("requests.manage_as_field_team");

      const conditions = [];

      // المدير العام ومكتب المشاريع يرون جميع الطلبات
      const adminRoles = ["super_admin", "system_admin", "projects_office", "financial_manager", "executive_director", "technical_supervisor"];
      
      // إذا لم يكن يملك صلاحية requests.view_details، نطبق شروط التصفية حسب الأدوار
      if (!hasViewDetailsPermission) {
        // طالب الخدمة يرى فقط طلباته
        if (ctx.user.role === "service_requester") {
          conditions.push(eq(mosqueRequests.userId, ctx.user.id));
        }

        // الفريق الميداني يرى الطلبات المسندة إليه فقط (سواء كمسؤول عام أو مسؤول زيارة ميدانية)
        if (isFieldTeam) {
          conditions.push(
            or(
              eq(mosqueRequests.assignedTo, ctx.user.id),
              eq(mosqueRequests.fieldVisitAssignedTo, ctx.user.id)
            )
          );
        }

        // فريق الاستجابة السريعة
        if (ctx.user.role === "quick_response") {
          conditions.push(
            sql`(${mosqueRequests.assignedTo} = ${ctx.user.id} OR ${mosqueRequests.priority} = 'urgent')`
          );
        }

        // موظف الاتصال المؤسسي يرى فقط الطلبات المسندة إليه للتقرير الختامي
        if (ctx.user.role === "corporate_comm") {
          conditions.push(eq(mosqueRequests.finalReportAssignedTo, ctx.user.id));
        }
      }
      
      // الأدوار الإدارية أو من يملك صلاحية requests.view_details يرون جميع الطلبات (لا تضيف شروط)

      if (input.search) {
        conditions.push(
          or(
            sql`${mosqueRequests.requestNumber} LIKE ${`%${input.search}%`}`,
            sql`${mosqueRequests.descriptiveName} LIKE ${`%${input.search}%`}`,
            sql`${mosques.name} LIKE ${`%${input.search}%`}`,
            sql`JSON_UNQUOTE(JSON_EXTRACT(${mosqueRequests.programData}, '$.customMosqueName')) LIKE ${`%${input.search}%`}`,
            sql`${users.name} LIKE ${`%${input.search}%`}`,
            sql`${users.nationalId} LIKE ${`%${input.search}%`}`
          )!
        );
      }
      if (input.programType) {
        conditions.push(eq(mosqueRequests.programType, input.programType));
      }
      if (input.boqPreparationsView) {
        // إظهار جداول الكميات التي لم يتم اعتماد عرض سعر لها:
        // تشمل مرحلة إعداد جدول الكميات (boq_preparation) ومرحلة التقييم المالي وعروض الأسعار (financial_eval_and_approval)
        // طالما لم يتم اعتماد أي عرض سعر
        conditions.push(
          inArray(mosqueRequests.currentStage, ["boq_preparation", "financial_eval_and_approval"])
        );
        conditions.push(
          ne(mosqueRequests.status, "rejected")
        );
        conditions.push(
          sql`NOT EXISTS (
            SELECT 1 FROM quotations 
            LEFT JOIN projects ON quotations.projectId = projects.id
            WHERE (quotations.requestId = ${mosqueRequests.id} OR projects.requestId = ${mosqueRequests.id})
              AND quotations.status IN ('accepted', 'approved')
          )`
        );
      } else if (input.currentStage) {
        // إذا كان المستخدم من الفريق الميداني وطلب مرحلة الزيارة الميدانية، لا نفلتر بها لكي لا تختفي طلباته بعد رفع التقرير
        if (isFieldTeam && !hasViewDetailsPermission && input.currentStage === "field_visit") {
          // لا تفعل شيئاً
        } else {
          conditions.push(eq(mosqueRequests.currentStage, input.currentStage));
        }
      }
      if (input.status) {
        if (isFieldTeam && !hasViewDetailsPermission && input.status === "completed") {
          const postStages = ["technical_eval", "boq_preparation", "financial_eval_and_approval", "contracting", "execution", "handover", "closed"] as const;
          conditions.push(
            or(
              eq(mosqueRequests.status, "completed"),
              and(eq(mosqueRequests.status, "in_progress"), inArray(mosqueRequests.currentStage, postStages))
            )
          );
        } else if (isFieldTeam && !hasViewDetailsPermission && input.status === "in_progress") {
          const preStages = ["submitted", "initial_review", "field_visit"] as const;
          conditions.push(
            and(eq(mosqueRequests.status, "in_progress"), inArray(mosqueRequests.currentStage, preStages))
          );
        } else if (ctx.user.role === "quick_response" && !hasViewDetailsPermission && input.status === "completed") {
          conditions.push(
            sql`exists(select 1 from quick_response_reports where quick_response_reports.requestId = ${mosqueRequests.id})`
          );
        } else if (ctx.user.role === "quick_response" && !hasViewDetailsPermission && input.status === "in_progress") {
          conditions.push(
            sql`not exists(select 1 from quick_response_reports where quick_response_reports.requestId = ${mosqueRequests.id})`
          );
        } else {
          conditions.push(eq(mosqueRequests.status, input.status));
        }
      }
      if (input.priority) {
        conditions.push(eq(mosqueRequests.priority, input.priority));
      }
      if (input.mosqueId) {
        conditions.push(eq(mosqueRequests.mosqueId, input.mosqueId));
      }
      if (input.assignedTo) {
        conditions.push(eq(mosqueRequests.assignedTo, input.assignedTo));
      }
      if (input.fromDate) {
        conditions.push(gte(mosqueRequests.createdAt, new Date(input.fromDate)));
      }
      if (input.toDate) {
        conditions.push(lte(mosqueRequests.createdAt, new Date(input.toDate)));
      }
      if (input.creatorType && input.creatorType !== "all") {
        if (input.creatorType === "beneficiary") {
          conditions.push(eq(users.role, "service_requester"));
        } else if (input.creatorType === "officer") {
          conditions.push(ne(users.role, "service_requester"));
        }
      }

      const offset = (input.page - 1) * input.limit;

      let query = db.select({
        request: mosqueRequests,
        mosqueName: mosques.name,
        mosqueCity: mosques.city,
        requesterName: users.name,
        programName: programs.name,
        hasQuickReport: sql<number>`case when exists(select 1 from quick_response_reports where quick_response_reports.requestId = mosque_requests.id) then 1 else 0 end`,
        projectId: projects.id,
        projectNumber: projects.projectNumber,
        projectName: projects.name,
        isMultiMosque: projects.isMultiMosque,
        multiMosqueNames: sql<string | null>`(
          SELECT GROUP_CONCAT(m.name SEPARATOR '، ') 
          FROM project_mosques pm 
          JOIN mosques m ON pm.mosqueId = m.id 
          WHERE pm.projectId = projects.id
        )`,
        evaluationNotes: sql<string | null>`(select notes from request_evaluations where request_evaluations.requestId = mosque_requests.id and request_evaluations.evaluationType = 'beneficiary_satisfaction' order by id desc limit 1)`,
        hasAcceptedQuotation: sql<number>`case when exists(
          select 1 from quotations 
          left join projects on quotations.projectId = projects.id
          where (quotations.requestId = mosque_requests.id or projects.requestId = mosque_requests.id)
            and quotations.status in ('accepted', 'approved')
        ) then 1 else 0 end`,
      }).from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .leftJoin(users, eq(mosqueRequests.userId, users.id))
        .leftJoin(programs, eq(mosqueRequests.programType, programs.id))
        .leftJoin(projects, eq(mosqueRequests.id, projects.requestId));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const results = await query.orderBy(desc(mosqueRequests.createdAt)).limit(input.limit).offset(offset);
      console.log('[search] Results count:', results.length);

      // الحصول على العدد الإجمالي والإحصائيات
      let countQuery = db.select({ count: sql<number>`count(*)` })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .leftJoin(users, eq(mosqueRequests.userId, users.id));
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as typeof countQuery;
      }
      const countResult = await countQuery;
      const total = countResult[0]?.count || 0;

      // الحصول على الإحصائيات حسب الحالة للنتائج المفلترة
      let statsQuery = db.select({ 
        status: mosqueRequests.status, 
        currentStage: mosqueRequests.currentStage,
        hasReport: sql<number>`case when exists(select 1 from quick_response_reports where quick_response_reports.requestId = mosque_requests.id) then 1 else 0 end`,
        count: sql<number>`count(*)` 
      })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .leftJoin(users, eq(mosqueRequests.userId, users.id));
      if (conditions.length > 0) {
        statsQuery = statsQuery.where(and(...conditions)) as typeof statsQuery;
      }
      const statsResult = await statsQuery.groupBy(
        mosqueRequests.status, 
        mosqueRequests.currentStage,
        sql`case when exists(select 1 from quick_response_reports where quick_response_reports.requestId = mosque_requests.id) then 1 else 0 end`
      );
      
      const stats: Record<string, number> = { pending: 0, under_review: 0, in_progress: 0, completed: 0, rejected: 0, cancelled: 0 };
      const postStages = ["technical_eval", "boq_preparation", "financial_eval_and_approval", "contracting", "execution", "handover", "closed"];
      
      for (const s of statsResult) {
        let effectiveStatus = s.status || 'unknown';
        if (isFieldTeam && !hasViewDetailsPermission && s.status === "in_progress" && postStages.includes(s.currentStage as string)) {
          effectiveStatus = "completed";
        } else if (ctx.user.role === "quick_response" && !hasViewDetailsPermission) {
          effectiveStatus = s.hasReport ? "completed" : "in_progress";
        }
        stats[effectiveStatus] = (stats[effectiveStatus] || 0) + s.count;
      }

      console.log('[search] Total count:', total, 'Stats:', stats);

      return {
        requests: results.map(r => {
          let effectiveStatus = r.request.status;
          if (isFieldTeam && !hasViewDetailsPermission && effectiveStatus === "in_progress" && postStages.includes(r.request.currentStage as string)) {
            effectiveStatus = "completed" as any;
          } else if (ctx.user.role === "quick_response" && !hasViewDetailsPermission) {
            effectiveStatus = r.hasQuickReport ? "completed" as any : "in_progress" as any;
          }
          let isMultiMosque = Boolean(r.isMultiMosque || (typeof r.request.programData === 'object' && (r.request.programData as any)?.isMultiMosque));
          let mosqueName = r.multiMosqueNames || r.mosqueName;
          let mosqueCity = r.mosqueCity;
          if (!r.request.mosqueId && r.request.programData) {
            let progData: any = null;
            try {
              if (typeof r.request.programData === 'string') {
                progData = JSON.parse(r.request.programData);
              } else if (typeof r.request.programData === 'object') {
                progData = r.request.programData;
              }
            } catch (e) {
              console.error("Error parsing programData in search:", e);
            }
            if (progData && typeof progData === 'object') {
              if (progData.customMosqueName) {
                mosqueName = progData.customMosqueName;
              }
              if (progData.customMosqueCity) {
                mosqueCity = progData.customMosqueCity;
              }
            }
          }
          return {
            ...r.request,
            status: effectiveStatus,
            mosqueName,
            mosqueCity,
            multiMosqueNames: r.multiMosqueNames,
            isMultiMosque,
            requesterName: r.requesterName,
            programName: r.programName,
            projectId: r.projectId,
            projectNumber: r.projectNumber,
            projectName: r.projectName,
            evaluationNotes: r.evaluationNotes,
            hasAcceptedQuotation: Boolean(r.hasAcceptedQuotation),
          };
        }),
        total,
        stats,
      };
      } catch (error) {
        console.error('[search] Error:', error);
        throw error;
      }
    }),

  // الحصول على طلبات المستخدم الحالي (مع الفلترة والبحث والصفحات)
  getMyRequests: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      programType: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(10),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        return {
          requests: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          stats: { total: 0, pending: 0, inProgress: 0, completed: 0, rejected: 0 }
        };
      }

      const page = Math.max(1, input?.page || 1);
      const limit = Math.max(1, input?.limit || 10);
      const offset = (page - 1) * limit;

      const conditions: any[] = [eq(mosqueRequests.userId, ctx.user.id)];

      if (input?.search && input.search.trim()) {
        const term = input.search.trim();
        conditions.push(
          or(
            sql`${mosqueRequests.requestNumber} LIKE ${`%${term}%`}`,
            sql`${mosqueRequests.descriptiveName} LIKE ${`%${term}%`}`,
            sql`${mosques.name} LIKE ${`%${term}%`}`,
            sql`JSON_UNQUOTE(JSON_EXTRACT(${mosqueRequests.programData}, '$.customMosqueName')) LIKE ${`%${term}%`}`
          )!
        );
      }

      if (input?.status && input.status !== "all") {
        if (input.status === "pending") {
          conditions.push(or(eq(mosqueRequests.status, "pending"), eq(mosqueRequests.status, "under_review"))!);
        } else {
          conditions.push(eq(mosqueRequests.status, input.status as any));
        }
      }

      if (input?.programType && input.programType !== "all") {
        conditions.push(eq(mosqueRequests.programType, input.programType as any));
      }

      // 1. حساب إحصائيات المستخدم الإجمالية
      const statsRows = await db.select({
        status: mosqueRequests.status,
        count: sql<number>`count(*)`,
      }).from(mosqueRequests)
        .where(eq(mosqueRequests.userId, ctx.user.id))
        .groupBy(mosqueRequests.status);

      const stats = {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        rejected: 0,
      };

      for (const row of statsRows) {
        const count = Number(row.count) || 0;
        stats.total += count;
        if (row.status === "pending" || row.status === "under_review") {
          stats.pending += count;
        } else if (row.status === "in_progress") {
          stats.inProgress += count;
        } else if (row.status === "completed") {
          stats.completed += count;
        } else if (row.status === "rejected") {
          stats.rejected += count;
        }
      }

      // 2. حساب إجمالي النتائج المطابقة للفلتر
      let countQuery = db.select({ count: sql<number>`count(*)` })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id));
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as typeof countQuery;
      }
      const countResult = await countQuery;
      const total = Number(countResult[0]?.count) || 0;
      const totalPages = Math.ceil(total / limit) || 1;

      // 3. الاستعلام عن الطلبات مع الصفحات
      let query = db.select({
        request: mosqueRequests,
        mosqueName: mosques.name,
        mosqueCity: mosques.city,
        programName: programs.name,
        projectId: projects.id,
        projectNumber: projects.projectNumber,
        projectName: projects.name,
        evaluationNotes: sql<string | null>`(select notes from request_evaluations where request_evaluations.requestId = mosque_requests.id and request_evaluations.evaluationType = 'beneficiary_satisfaction' order by id desc limit 1)`,
        satisfactionRating: sql<number | null>`(select rating from request_evaluations where request_evaluations.requestId = mosque_requests.id and request_evaluations.evaluationType = 'beneficiary_satisfaction' order by id desc limit 1)`,
      }).from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .leftJoin(programs, eq(mosqueRequests.programType, programs.id))
        .leftJoin(projects, eq(mosqueRequests.id, projects.requestId));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const results = await query
        .orderBy(desc(mosqueRequests.createdAt))
        .limit(limit)
        .offset(offset);

      const requests = results.map(r => {
        let mosqueName = r.mosqueName;
        let mosqueCity = r.mosqueCity;
        if (!r.request.mosqueId && r.request.programData) {
          let progData: any = null;
          try {
            if (typeof r.request.programData === 'string') {
              progData = JSON.parse(r.request.programData);
            } else if (typeof r.request.programData === 'object') {
              progData = r.request.programData;
            }
          } catch (e) {
            console.error("Error parsing programData in getMyRequests:", e);
          }
          if (progData && typeof progData === 'object') {
            if (progData.customMosqueName) {
              mosqueName = progData.customMosqueName;
            }
            if (progData.customMosqueCity) {
              mosqueCity = progData.customMosqueCity;
            }
          }
        }
        return {
          ...r.request,
          mosqueName,
          mosqueCity,
          programName: r.programName,
          projectId: r.projectId,
          projectNumber: r.projectNumber,
          projectName: r.projectName,
          evaluationNotes: r.evaluationNotes,
          satisfactionRating: r.satisfactionRating,
          isEvaluated: r.satisfactionRating !== null && r.satisfactionRating !== undefined,
        };
      });

      return {
        requests,
        total,
        page,
        limit,
        totalPages,
        stats,
      };
    }),

  // تحديث مرحلة الطلب
  updateStage: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      newStage: z.enum(requestStages),
      notes: z.string().optional(),
      skipPrerequisites: z.boolean().optional(), // للاستخدام في حالات خاصة فقط
      finalReportAssignedTo: z.number().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const request = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (request.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      const oldStage = request[0].currentStage;
      const requestTrack = request[0].requestTrack || 'standard';

      // التحقق من صلاحية تحويل المرحلة حسب المرحلة الحالية والدور
      const allowedRoles = STAGE_TRANSITION_PERMISSIONS[oldStage] || [];
      const { calculateUserPermissions } = await import("../permissions");
      const userPermissions = await calculateUserPermissions(ctx.user.id);
      const hasViewDetailsPermission = userPermissions.includes("requests.view_details");

      if (!allowedRoles.includes(ctx.user.role) && !hasViewDetailsPermission) {
        const currentStageName = STAGE_LABELS[oldStage] || oldStage;
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: `ليس لديك صلاحية لتحويل الطلب من مرحلة "${currentStageName}". الأدوار المسموح لها: ${allowedRoles.map(r => r).join(', ')}` 
        });
      }

      // التحقق من أن المرحلة الجديدة هي المرحلة التالية المنطقية
      // المراحل الـ 11 الجديدة
      const standardStages = ["submitted", "initial_review", "field_visit", "technical_eval", "boq_preparation", "financial_eval_and_approval", "contracting", "execution", "handover", "closed"];
      const quickResponseStages = ["submitted", "initial_review", "field_visit", "technical_eval", "execution", "closed"];
      
      // تحديد المسار بناءً على نوع الطلب
      const isQuickResponse = requestTrack === 'quick_response' || request[0].technicalEvalDecision === 'quick_response';
      const isDonation = request[0].technicalEvalDecision === 'convert_to_donation';
      const stages = isQuickResponse 
        ? quickResponseStages 
        : isDonation 
          ? ["submitted", "initial_review", "field_visit", "technical_eval", "execution", "closed"] 
          : standardStages;
      const currentIndex = stages.indexOf(oldStage);
      const newIndex = stages.indexOf(input.newStage);
      
      // السماح فقط بالتقدم للمرحلة التالية (وليس القفز)
      if (newIndex !== currentIndex + 1) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "يمكن فقط التحويل للمرحلة التالية مباشرة" 
        });
      }

      // التحقق من شروط الدفعات للانتقال لمرحلة الاستلام
      if (input.newStage === 'handover') {
        const projectResult = await db.select({ id: projects.id }).from(projects)
          .where(eq(projects.requestId, input.requestId)).limit(1);
        if (projectResult.length > 0) {
          const projId = projectResult[0].id;

          // 1. جلب العقود
          const projectContracts = await db
            .select({
              id: contractsEnhanced.id,
              amount: contractsEnhanced.contractAmount,
            })
            .from(contractsEnhanced)
            .where(eq(contractsEnhanced.projectId, projId));

          // 2. جلب الدفعات المجدولة
          const contractIds = projectContracts.map(c => c.id);
          const allContractPayments = contractIds.length > 0
            ? await db.select().from(contractPayments).where(inArray(contractPayments.contractId, contractIds))
            : [];

          // 3. جلب الدفعات اليدوية
          const manualPayments = await db
            .select()
            .from(payments)
            .where(eq(payments.projectId, projId));

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
      }

      // التحقق من الشروط المسبقة للانتقال
      // ملاحظة: لا يمكن تجاوز الشروط الحرجة (المراجعة الأولية، الزيارة الميدانية) حتى مع skipPrerequisites
      const criticalStages = ['initial_review', 'field_visit'];
      const isCriticalTransition = criticalStages.includes(input.newStage);
      
      if (!input.skipPrerequisites || isCriticalTransition) {
        const prerequisites = getPrerequisites(oldStage, input.newStage, requestTrack, request[0].technicalEvalDecision || undefined);
        const missingPrerequisites: string[] = [];

        for (const prereq of prerequisites) {
          if (!prereq.required) continue;

          let isMet = false;

          // التحقق من تقرير المعاينة الميدانية
          if (prereq.type === 'field_inspection_report') {
            const reports = await db.select().from(fieldVisitReports)
              .where(eq(fieldVisitReports.requestId, input.requestId)).limit(1);
            isMet = reports.length > 0;
          }
          // التحقق من تقرير الاستجابة السريعة
          else if (prereq.type === 'quick_response_report') {
            const reports = await db.select().from(quickResponseReports)
              .where(eq(quickResponseReports.requestId, input.requestId)).limit(1);
            isMet = reports.length > 0;
          }
          // التحقق من قرار التقييم الفني
          else if (prereq.type === 'technical_eval_decision') {
            isMet = !!request[0].technicalEvalDecision;
          }
          // التحقق من وجود جدول الكميات
          else if (prereq.type === 'boq_created') {
            const boqItems = await db.select().from(quantitySchedules)
              .where(eq(quantitySchedules.requestId, input.requestId)).limit(1);
            isMet = boqItems.length > 0;
          }
          // التحقق من وجود عروض أسعار مستلمة
          else if (prereq.type === 'quotes_received') {
            const quotes = await db.select({ id: quotations.id }).from(quotations)
              .where(eq(quotations.requestId, input.requestId)).limit(1);
            isMet = quotes.length > 0;
          }
          // التحقق من وجود عرض سعر معتمد
          else if (prereq.type === 'supplier_selected') {
            const acceptedQuotes = await db.select({ id: quotations.id }).from(quotations)
              .where(and(
                eq(quotations.requestId, input.requestId),
                inArray(quotations.status, ['accepted', 'approved'])
              )).limit(1);
            isMet = acceptedQuotes.length > 0;
          }
          // التحقق من وجود عقد موقع/معتمد
          else if (prereq.type === 'contract_signed') {
            const signedContracts = await db.select({ id: contractsEnhanced.id }).from(contractsEnhanced)
              .where(and(
                eq(contractsEnhanced.requestId, input.requestId),
                inArray(contractsEnhanced.status, ['approved', 'active'])
              )).limit(1);
            isMet = signedContracts.length > 0;
          }
          // التحقق من وجود تقرير نهائي (وإنشائه تلقائياً إن لم يوجد لضمان الإغلاق)
          else if (prereq.type === 'final_report') {
            let reports = await db.select({ id: finalReports.id }).from(finalReports)
              .where(eq(finalReports.requestId, input.requestId)).limit(1);
            if (reports.length === 0) {
              const [proj] = await db.select().from(projects).where(eq(projects.requestId, input.requestId)).limit(1);
              await db.insert(finalReports).values({
                requestId: input.requestId,
                projectId: proj ? proj.id : null,
                preparedBy: ctx.user.id,
                summary: "تم استكمال كافة أعمال المشروع والتقارير وإغلاق الطلب بنجاح",
                achievements: "تم تنفيذ وتأهيل كافة البنود المطلوبة",
                totalCost: proj ? ((proj as any).budget || (proj as any).actualCost || null) : null,
                completionDate: new Date(),
              });
              reports = await db.select({ id: finalReports.id }).from(finalReports)
                .where(eq(finalReports.requestId, input.requestId)).limit(1);
            }
            isMet = reports.length > 0;
          }

          if (!isMet) {
            missingPrerequisites.push(PREREQUISITE_ERROR_MESSAGES[prereq.type]);
          }
        }

        if (missingPrerequisites.length > 0) {
          const errorMessage = missingPrerequisites.length === 1 
            ? missingPrerequisites[0] 
            : `لا يمكن الانتقال للمرحلة التالية. الشروط المطلوبة:\n- ${missingPrerequisites.join('\n- ')}`;
            
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: errorMessage,
          });
        }
      }

      // تحديد المسؤول الحالي والإدارة حسب المرحلة الجديدة
      let currentResponsible = ctx.user.id;
      let currentResponsibleDepartment = "مكتب المشاريع";
      
      // تحديد الإدارة المسؤولة حسب المرحلة
      const stageDepartmentMap: Record<string, string> = {
        submitted: "مكتب المشاريع",
        initial_review: "مكتب المشاريع",
        field_visit: "الفريق الميداني",
        technical_eval: "مكتب المشاريع",
        boq_preparation: "مكتب المشاريع",
        financial_eval_and_approval: "الإدارة المالية",
        contracting: "مكتب المشاريع",
        execution: requestTrack === 'quick_response' ? "فريق الاستجابة السريعة" : "مدير المشروع",
        handover: "الاتصال المؤسسي",
        closed: "مكتب المشاريع",
      };
      
      currentResponsibleDepartment = stageDepartmentMap[input.newStage] || "مكتب المشاريع";

      if (input.newStage === 'handover' && input.finalReportAssignedTo) {
        currentResponsible = input.finalReportAssignedTo;
      }

      const updateData: any = {
        currentStage: input.newStage,
        status: input.newStage === "closed" ? "completed" : "in_progress",
        currentResponsible: currentResponsible,
        currentResponsibleDepartment: currentResponsibleDepartment,
      };

      if (input.finalReportAssignedTo !== undefined) {
        updateData.finalReportAssignedTo = input.finalReportAssignedTo;
      }

      await db.update(mosqueRequests).set(updateData).where(eq(mosqueRequests.id, input.requestId));

      // تحديث تقدم المشروع المرتبط عند الانتقال للتقييم المالي
      if (input.newStage === 'financial_eval_and_approval') {
        const [project] = await db.select().from(projects).where(eq(projects.requestId, input.requestId)).limit(1);
        if (project) {
          // تحديث نسبة إنجاز المشروع إلى 33% (2/6) وتحديث الحالة
          await db.update(projects)
            .set({ completionPercentage: 33, status: 'in_progress' })
            .where(eq(projects.id, project.id));

          // تحديث المراحل: إكمال المرحلة الثانية وبدء المرحلة الثالثة
          await db.update(projectPhases)
            .set({ status: 'completed', completionPercentage: 100 })
            .where(and(eq(projectPhases.projectId, project.id), eq(projectPhases.phaseOrder, 2)));
          
          await db.update(projectPhases)
            .set({ status: 'in_progress' })
            .where(and(eq(projectPhases.projectId, project.id), eq(projectPhases.phaseOrder, 3)));
        }
      }

      // تحديث تقدم المشروع المرتبط عند الانتقال لمرحلة التعاقد
      if (input.newStage === 'contracting') {
        const [project] = await db.select().from(projects).where(eq(projects.requestId, input.requestId)).limit(1);
        if (project) {
          // تحديث نسبة إنجاز المشروع إلى 50% (3/6) وتحديث الحالة
          await db.update(projects)
            .set({ completionPercentage: 50, status: 'in_progress' })
            .where(eq(projects.id, project.id));

          // تحديث المراحل: إكمال المرحلة الثالثة وبدء المرحلة الرابعة
          await db.update(projectPhases)
            .set({ status: 'completed', completionPercentage: 100 })
            .where(and(eq(projectPhases.projectId, project.id), eq(projectPhases.phaseOrder, 3)));
          
          await db.update(projectPhases)
            .set({ status: 'in_progress' })
            .where(and(eq(projectPhases.projectId, project.id), eq(projectPhases.phaseOrder, 4)));
        }
      }

      // تحديث تقدم المشروع المرتبط عند الانتقال لمرحلة التنفيذ
      if (input.newStage === 'execution') {
        const [project] = await db.select().from(projects).where(eq(projects.requestId, input.requestId)).limit(1);
        if (project) {
          // تحديث نسبة إنجاز المشروع إلى 67% (4/6) وتحديث الحالة
          await db.update(projects)
            .set({ completionPercentage: 67, status: 'in_progress' })
            .where(eq(projects.id, project.id));

          // تحديث المراحل: إكمال المرحلة الرابعة (التعاقد) وبدء المرحلة الخامسة (صرف المدفوعات)
          await db.update(projectPhases)
            .set({ status: 'completed', completionPercentage: 100 })
            .where(and(eq(projectPhases.projectId, project.id), eq(projectPhases.phaseOrder, 4)));
          
          await db.update(projectPhases)
            .set({ status: 'in_progress' })
            .where(and(eq(projectPhases.projectId, project.id), eq(projectPhases.phaseOrder, 5)));

          // اعتماد العقد المرتبط بالمشروع تلقائياً عند الانتقال لمرحلة التنفيذ
          await db.update(contractsEnhanced)
            .set({
              status: "approved",
              approvedBy: ctx.user.id,
              approvedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(contractsEnhanced.projectId, project.id),
                or(
                  eq(contractsEnhanced.status, "draft"),
                  eq(contractsEnhanced.status, "pending_approval")
                )
              )
            );
        }
      }

      // إضافة سجل في تاريخ الطلب
      const newStageName = STAGE_LABELS[input.newStage] || input.newStage;
      await db.insert(requestHistory).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        fromStage: oldStage,
        toStage: input.newStage,
        action: "stage_updated",
        notes: input.notes || `تم تحويل الطلب إلى مرحلة ${newStageName}`,
      });

      // إرسال إشعار مخصص لمقدم الطلب بناءً على المرحلة الجديدة
      const stageNotificationMessages: Record<string, { title: string; message: string }> = {
        initial_review: {
          title: "✅ تم استلام طلبك",
          message: `تم استلام طلبك رقم ${request[0].requestNumber} وهو قيد المراجعة الأولية. سنتواصل معك قريباً.`,
        },
        field_visit: {
          title: "📋 جدولة زيارة ميدانية",
          message: `تم الموافقة على طلبك رقم ${request[0].requestNumber} وسيتم جدولة زيارة ميدانية لمسجدك قريباً.`,
        },
        technical_eval: {
          title: "🔍 التقييم الفني جارٍ",
          message: `اكتملت الزيارة الميدانية لطلبك رقم ${request[0].requestNumber} وجارٍ الآن التقييم الفني.`,
        },
        boq_preparation: {
          title: "📊 إعداد جدول الكميات",
          message: `تم اعتماد التقييم الفني لطلبك رقم ${request[0].requestNumber} وجارٍ إعداد جدول الكميات.`,
        },
        financial_eval_and_approval: {
          title: "💰 تقييم العروض المالية",
          message: `اكتمل جدول الكميات لطلبك رقم ${request[0].requestNumber} وجارٍ تقييم عروض الأسعار واعتمادها.`,
        },
        contracting: {
          title: "📝 مرحلة التعاقد",
          message: `تم اعتماد عرض السعر لطلبك رقم ${request[0].requestNumber} وجارٍ الآن إعداد العقد مع المقاول.`,
        },
        execution: {
          title: "🏗️ بدء التنفيذ",
          message: `تم توقيع العقد لطلبك رقم ${request[0].requestNumber} وبدأت أعمال التنفيذ في مسجدك. يمكنك متابعة التقدم من بوابتك.`,
        },
        handover: {
          title: "🎉 اكتمال التنفيذ",
          message: `اكتملت أعمال التنفيذ في مسجدك للطلب رقم ${request[0].requestNumber} وجارٍ الاستلام الرسمي.`,
        },
        closed: {
          title: "✨ تم إغلاق الطلب بنجاح",
          message: `يسعدنا إعلامك باكتمال مشروع طلبك رقم ${request[0].requestNumber} وإغلاقه رسمياً. شكراً لثقتك بمنارة.`,
        },
      };
      // استخدام الرسالة المخصصة من قاعدة البيانات إن وجدت، وإلا الرسالة الافتراضية
      const defaultMsg = stageNotificationMessages[input.newStage] || {
        title: "تحديث مرحلة الطلب",
        message: `تم تحويل طلبك رقم ${request[0].requestNumber} إلى مرحلة ${newStageName}`,
      };
      // جلب إعدادات المرحلة للتحقق من وجود رسالة مخصصة
      const [stageSettingForNotif] = await db.select().from(stageSettings)
        .where(eq(stageSettings.stageCode, input.newStage)).limit(1);
      const stageMsg = {
        title: stageSettingForNotif?.notificationTitle || defaultMsg.title,
        message: stageSettingForNotif?.notificationMessage 
          ? stageSettingForNotif.notificationMessage
              .replace('{requestNumber}', request[0].requestNumber || '')
              .replace('{stageName}', newStageName)
          : defaultMsg.message,
      };
      // إرسال إشعار مخصص لمقدم الطلب بناءً على المرحلة الجديدة (فقط إذا كان طالب خدمة)
      const [ownerUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, request[0].userId!))
        .limit(1);

      if (ownerUser && ownerUser.role === "service_requester") {
        await createNotification({
          userId: request[0].userId!,
          title: stageMsg.title,
          message: stageMsg.message,
          type: "request_update",
          relatedType: "request",
          relatedId: input.requestId,
        });
      }

      // إرسال إشعار للمسؤولين الآخرين بتغيير مرحلة الطلب
      await notifyRequestStageChangeToOfficers(
        input.requestId,
        request[0].requestNumber,
        oldStage,
        input.newStage,
        ctx.user.id
      );

      // تسجيل بداية المرحلة الجديدة للتتبع
      const [stageSetting] = await db.select().from(stageSettings)
        .where(eq(stageSettings.stageCode, input.newStage)).limit(1);
      
      if (stageSetting) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + stageSetting.durationDays);
        
        await db.insert(requestStageTracking).values({
          requestId: input.requestId,
          stageCode: input.newStage,
          startedAt: new Date(),
          dueAt: dueDate,
          assignedTo: ctx.user.id,
        });
      }

      if (input.newStage === "closed") {
        await triggerBeneficiarySatisfactionSurvey(input.requestId);
      }

      return { success: true, message: `تم تحويل الطلب إلى مرحلة ${newStageName} بنجاح` };
    }),

  // تحديث حالة الطلب
  updateStatus: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      newStatus: z.enum(requestStatuses),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const request = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (request.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      const allowedRoles = ["super_admin", "system_admin", "projects_office"];
      const { calculateUserPermissions } = await import("../permissions");
      const userPermissions = await calculateUserPermissions(ctx.user.id);
      const hasViewDetailsPermission = userPermissions.includes("requests.view_details");

      const isAllowed = allowedRoles.includes(ctx.user.role) || 
                        (ctx.user.role === 'project_manager' && request[0].assignedTo === ctx.user.id) ||
                        hasViewDetailsPermission;
      if (!isAllowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتحديث حالة الطلب" });
      }

      const oldStatus = request[0].status;

      await db.update(mosqueRequests).set({
        status: input.newStatus,
        reviewedAt: input.newStatus === "under_review" ? new Date() : request[0].reviewedAt,
        approvedAt: input.newStatus === "approved" ? new Date() : request[0].approvedAt,
        completedAt: input.newStatus === "completed" ? new Date() : request[0].completedAt,
      }).where(eq(mosqueRequests.id, input.requestId));

      await db.insert(requestHistory).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        fromStatus: oldStatus,
        toStatus: input.newStatus,
        action: "status_updated",
        notes: input.notes || `تم تغيير الحالة من ${oldStatus} إلى ${input.newStatus}`,
      });

      // إرسال إشعار لمقدم الطلب فقط إذا كان طالب خدمة
      const [ownerUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, request[0].userId!))
        .limit(1);

      if (ownerUser && ownerUser.role === "service_requester") {
        const statusLabelsAr: Record<string, string> = {
          pending: "قيد الانتظار",
          under_review: "قيد المراجعة",
          approved: "معتمد",
          rejected: "مرفوض",
          suspended: "معلق",
          in_progress: "قيد التنفيذ",
          completed: "مكتمل",
        };
        const statusLabel = statusLabelsAr[input.newStatus] || input.newStatus;
        const msg = input.newStatus === "in_progress" 
          ? `تم استئناف طلبك رقم ${request[0].requestNumber}`
          : `تم تحديث حالة طلبك رقم ${request[0].requestNumber} إلى: ${statusLabel}`;

        await createNotification({
          userId: request[0].userId!,
          title: "تحديث حالة الطلب",
          message: msg,
          type: "request_update",
          relatedType: "request",
          relatedId: input.requestId,
        });
      }

      if ((input.newStatus as string) === "completed" || (input.newStatus as string) === "closed") {
        await triggerBeneficiarySatisfactionSurvey(input.requestId);
      }

      return { success: true, message: "تم تحديث حالة الطلب بنجاح" };
    }),

  // إسناد الطلب لموظف
  assignTo: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["super_admin", "system_admin", "projects_office"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإسناد الطلبات" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.update(mosqueRequests).set({
        assignedTo: input.userId,
      }).where(eq(mosqueRequests.id, input.requestId));

      // إرسال إشعار للموظف المسند إليه
      const request = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (request.length > 0) {
        await createNotification({
          userId: input.userId,
          title: "طلب جديد مسند إليك",
          message: `تم إسناد الطلب رقم ${request[0].requestNumber} إليك`,
          type: "request_update",
          relatedType: "request",
          relatedId: input.requestId,
        });
      }

      return { success: true, message: "تم إسناد الطلب بنجاح" };
    }),

  // إسناد التقرير الختامي لموظف الاتصال المؤسسي
  assignFinalReport: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      userId: z.number(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const allowedRoles = ["super_admin", "system_admin", "projects_office", "project_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإسناد التقرير الختامي" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // فحص تعارض المواعيد الصارم للموظف في إسناد التقرير الختامي
      if (input.userId && input.scheduledDate && input.scheduledTime) {
        const finalConflicts = await db.select({ id: mosqueRequests.id })
          .from(mosqueRequests)
          .where(
            and(
              eq(mosqueRequests.finalReportAssignedTo, input.userId),
              sql`DATE(${mosqueRequests.finalReportScheduledDate}) = DATE(${input.scheduledDate})`,
              eq(mosqueRequests.finalReportScheduledTime, input.scheduledTime),
              ne(mosqueRequests.id, input.requestId)
            )
          )
          .limit(1);

        if (finalConflicts.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `هذا الموظف لديه موعد تقرير ختامي محجوز بالفعل في تاريخ (${input.scheduledDate}) الساعة (${input.scheduledTime}). يرجى اختيار موعد آخر أو موظف آخر.`,
          });
        }
      }

      await db.update(mosqueRequests).set({
        finalReportAssignedTo: input.userId,
        currentResponsible: input.userId,
        currentResponsibleDepartment: "الاتصال المؤسسي",
        finalReportScheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        finalReportScheduledTime: input.scheduledTime || null,
      }).where(eq(mosqueRequests.id, input.requestId));

      // إرسال إشعار للموظف المسند إليه
      const request = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (request.length > 0) {
        await createNotification({
          userId: input.userId,
          title: "تقرير ختامي بانتظار الرفع",
          message: `تم إسناد مهمة رفع التقرير الختامي للطلب رقم ${request[0].requestNumber} إليك`,
          type: "request_update",
          relatedType: "request",
          relatedId: input.requestId,
        });
      }

      return { success: true, message: "تم إسناد التقرير الختامي بنجاح" };
    }),

  // إضافة تعليق
  addComment: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      comment: z.string().min(1),
      isInternal: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // طالب الخدمة لا يمكنه إضافة تعليقات داخلية
      const isInternal = ctx.user.role === "service_requester" ? false : input.isInternal;

      await db.insert(requestComments).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        comment: input.comment,
        isInternal,
      });

      return { success: true, message: "تم إضافة التعليق بنجاح" };
    }),

  // إضافة ملاحظة على مراجعة المعلومات والمرفقات
  addReviewNote: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      note: z.string().min(1, "يرجى كتابة الملاحظة"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const hasPerm = await checkPermission(ctx.user.id, "requests.add_review_note");
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);

      if (!hasPerm && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية إضافة ملاحظة على مراجعة الطلب" });
      }

      // إضافة الملاحظة في جدول التعليقات كتعليق داخلي
      await db.insert(requestComments).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        comment: `[ملاحظة مراجعة الطلب]: ${input.note}`,
        isInternal: true,
      });

      // جلب الملاحظات الحالية وتحديث حقل reviewNotes في جدول الطلب
      const [existingRequest] = await db
        .select({ reviewNotes: mosqueRequests.reviewNotes })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = now.getFullYear();
      const month = pad(now.getMonth() + 1);
      const day = pad(now.getDate());
      let hoursNum = now.getHours();
      const minutes = pad(now.getMinutes());
      const ampm = hoursNum >= 12 ? 'م' : 'ص';
      const hours = pad(hoursNum % 12 || 12);
      const timestamp = `${year}/${month}/${day} ${hours}:${minutes} ${ampm}`;

      const userDisplayName = ctx.user.name || "مستخدم النظام";
      const newEntry = `• ${userDisplayName} (${timestamp}):\n${input.note.trim()}`;
      const updatedReviewNotes = existingRequest?.reviewNotes 
        ? `${newEntry}\n\n${existingRequest.reviewNotes}`
        : newEntry;

      await db.update(mosqueRequests).set({
        reviewNotes: updatedReviewNotes,
        updatedAt: new Date(),
      }).where(eq(mosqueRequests.id, input.requestId));

      // تسجيل العملية في سجل تاريخ الطلب
      await db.insert(requestHistory).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        action: "إضافة ملاحظة على مراجعة الطلب",
        notes: input.note,
      }).catch(() => {});

      return { 
        success: true, 
        message: "تم إضافة ملاحظة المراجعة بنجاح",
        reviewNotes: updatedReviewNotes
      };
    }),

  // إضافة مرفق
  addAttachment: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      fileName: z.string(),
      fileUrl: z.string().url(),
      fileType: z.string().optional(),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.insert(requestAttachments).values({
        requestId: input.requestId,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        fileType: input.fileType || "document",
        fileSize: input.fileSize || null,
        uploadedBy: ctx.user.id,
      });

      return { success: true, message: "تم إضافة المرفق بنجاح" };
    }),

  // إحصائيات الطلبات
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, byProgram: {}, byStage: {}, byStatus: {} };

    const conditions = [];
    if (ctx.user.role === "service_requester") {
      conditions.push(eq(mosqueRequests.userId, ctx.user.id));
    }

    let totalQuery = db.select({ count: sql<number>`count(*)` }).from(mosqueRequests);
    if (conditions.length > 0) {
      totalQuery = totalQuery.where(and(...conditions)) as typeof totalQuery;
    }
    const total = await totalQuery;

    const byProgram = await db.select({
      programType: mosqueRequests.programType,
      programName: programs.name,
      count: sql<number>`count(*)`,
    }).from(mosqueRequests)
      .leftJoin(programs, eq(mosqueRequests.programType, programs.id))
      .groupBy(mosqueRequests.programType, programs.name);

    const byStage = await db.select({
      currentStage: mosqueRequests.currentStage,
      count: sql<number>`count(*)`,
    }).from(mosqueRequests).groupBy(mosqueRequests.currentStage);

    const byStatus = await db.select({
      status: mosqueRequests.status,
      count: sql<number>`count(*)`,
    }).from(mosqueRequests).groupBy(mosqueRequests.status);

    return {
      total: total[0]?.count || 0,
      byProgram: Object.fromEntries(byProgram.map(p => [p.programType, { count: p.count, name: p.programName }])),
      byStage: Object.fromEntries(byStage.map(s => [s.currentStage, s.count])),
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s.count])),
    };
  }),

  // إضافة تقرير زيارة ميدانية
  addFieldVisitReport: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      visitDate: z.string(),
      // التقييم الفني
      mosqueCondition: z.string().optional(),
      conditionRating: z.enum(["excellent", "good", "fair", "poor", "critical"]).optional(),
      // مساحة مصلى الرجال
      menPrayerLength: z.number().optional(),
      menPrayerWidth: z.number().optional(),
      menPrayerHeight: z.number().optional(),
      // مساحة مصلى النساء
      womenPrayerExists: z.boolean().optional(),
      womenPrayerLength: z.number().optional(),
      womenPrayerWidth: z.number().optional(),
      womenPrayerHeight: z.number().optional(),
      // الاحتياج والتوصيف
      requiredNeeds: z.string().optional(),
      generalDescription: z.string().optional(),
      // فريق المعاينة
      teamMember1: z.string().optional(),
      teamMember2: z.string().optional(),
      teamMember3: z.string().optional(),
      teamMember4: z.string().optional(),
      teamMember5: z.string().optional(),
      // الحقول القديمة للتوافق
      findings: z.string().optional(),
      recommendations: z.string().optional(),
      estimatedCost: z.number().optional(),
      technicalNeeds: z.string().optional(),
      // تقييم صحة معلومات المستفيد
      beneficiaryInfoAccuracyRating: z.number().min(1).max(5).optional(),
      beneficiaryInfoAccuracyNotes: z.string().optional(),
      // تعديل بيانات الطلب الأصلية عند إدراج تقرير الزيارة الميدانية
      programData: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const hasFieldTeamPerm = await checkPermission(ctx.user.id, "requests.manage_as_field_team");
      const hasIntervenePerm = await checkPermission(ctx.user.id, "pending_reports.intervene");
      if (ctx.user.role !== "field_team" && !hasFieldTeamPerm && !["super_admin", "system_admin"].includes(ctx.user.role) && !hasIntervenePerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإضافة تقارير ميدانية" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.insert(fieldVisitReports).values({
        requestId: input.requestId,
        visitedBy: ctx.user.id,
        visitDate: new Date(input.visitDate),
        mosqueCondition: input.mosqueCondition || null,
        conditionRating: input.conditionRating || null,
        menPrayerLength: input.menPrayerLength?.toString() || null,
        menPrayerWidth: input.menPrayerWidth?.toString() || null,
        menPrayerHeight: input.menPrayerHeight?.toString() || null,
        womenPrayerExists: input.womenPrayerExists || false,
        womenPrayerLength: input.womenPrayerLength?.toString() || null,
        womenPrayerWidth: input.womenPrayerWidth?.toString() || null,
        womenPrayerHeight: input.womenPrayerHeight?.toString() || null,
        requiredNeeds: input.requiredNeeds || null,
        generalDescription: input.generalDescription || null,
        teamMember1: input.teamMember1 || null,
        teamMember2: input.teamMember2 || null,
        teamMember3: input.teamMember3 || null,
        teamMember4: input.teamMember4 || null,
        teamMember5: input.teamMember5 || null,
        findings: input.findings || input.requiredNeeds || null,
        recommendations: input.recommendations || null,
        estimatedCost: input.estimatedCost?.toString() || null,
        technicalNeeds: input.technicalNeeds || null,
        beneficiaryInfoAccuracyRating: input.beneficiaryInfoAccuracyRating || null,
        beneficiaryInfoAccuracyNotes: input.beneficiaryInfoAccuracyNotes || null,
      });

      // تحديث بيانات الطلب الأساسية المذكورة عند إنشاء الطلب
      if (input.programData) {
        await db.update(mosqueRequests).set({
          programData: input.programData,
        }).where(eq(mosqueRequests.id, input.requestId));
      }

      // تحديث حالة الزيارة الميدانية في جدول field_visits إن وجدت
      await db
        .update(fieldVisits)
        .set({
          reportSubmitted: true,
          reportSubmittedBy: ctx.user.id,
          reportSubmittedAt: new Date(),
          status: "reported",
          executionDate: new Date(input.visitDate),
          executedBy: ctx.user.id,
          executedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(fieldVisits.requestId, input.requestId));

      // تحديث مرحلة الطلب
      await db.update(mosqueRequests).set({
        currentStage: "technical_eval",
        currentResponsibleDepartment: "مكتب المشاريع",
        estimatedCost: input.estimatedCost?.toString() || null,
      }).where(eq(mosqueRequests.id, input.requestId));

      // إضافة سجل في تاريخ الطلب
      await db.insert(requestHistory).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        fromStage: "field_visit",
        toStage: "technical_eval",
        action: "stage_updated",
        notes: "تم رفع تقرير الزيارة الميدانية والتحويل للتقييم الفني",
      });

      // إرسال إشعار للمسؤولين عن قسم الطلبات
      const [req] = await db
        .select({ requestNumber: mosqueRequests.requestNumber })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (req) {
        try {
          await notifyUsersByRole(
            ["super_admin", "system_admin", "projects_office"],
            "request_update",
            "تم رفع تقرير المعاينة الميدانية",
            `تم رفع تقرير زيارة ميدانية من قبل ${ctx.user.name || "عضو الفريق الميداني"} للطلب رقم ${req.requestNumber}`,
            "request",
            input.requestId
          );
        } catch (error) {
          console.error("Failed to send field visit report notification:", error);
        }
      }

      return { success: true, message: "تم إضافة تقرير الزيارة الميدانية بنجاح" };
    }),

  // إضافة تقرير استجابة سريعة
  addQuickResponseReport: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      responseDate: z.string(),
      // التقييم الفني
      technicalEvaluation: z.string().optional(),
      finalEvaluation: z.string().optional(),
      // الأعمال غير المنفذة
      unexecutedWorks: z.string().optional(),
      // الفني المختص
      technicianName: z.string().optional(),
      // الحقول القديمة للتوافق
      issueDescription: z.string(),
      actionsTaken: z.string(),
      resolved: z.boolean().default(false),
      requiresProject: z.boolean().default(false),
      status: z.enum(['partially_solved', 'fully_solved', 'not_solved']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const hasQRPerm = await checkPermission(ctx.user.id, "requests.manage_as_quick_response");
      const hasIntervenePerm = await checkPermission(ctx.user.id, "pending_reports.intervene");
      const isAllowed = ["quick_response", "projects_office", "super_admin", "system_admin"].includes(ctx.user.role) || hasQRPerm || hasIntervenePerm;
      if (!isAllowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإضافة تقارير الاستجابة السريعة" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.insert(quickResponseReports).values({
        requestId: input.requestId,
        respondedBy: ctx.user.id,
        responseDate: new Date(input.responseDate),
        technicalEvaluation: input.technicalEvaluation || null,
        finalEvaluation: input.finalEvaluation || null,
        unexecutedWorks: input.unexecutedWorks || null,
        technicianName: input.technicianName || null,
        issueDescription: input.issueDescription,
        actionsTaken: input.actionsTaken,
        resolved: input.resolved,
        requiresProject: input.requiresProject,
        status: input.status || null,
      });

      // تم إلغاء الإغلاق التلقائي للطلب عند حفظ التقرير بناء على طلب المستخدم
      /*
      if (input.resolved && !input.requiresProject) {
        await db.update(mosqueRequests).set({
          currentStage: "closed",
          status: "completed",
          completedAt: new Date(),
        }).where(eq(mosqueRequests.id, input.requestId));
      }
      */

      // إرسال إشعار للمسؤولين عن قسم الطلبات
      const [req] = await db
        .select({ requestNumber: mosqueRequests.requestNumber })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (req) {
        try {
          await notifyUsersByRole(
            ["super_admin", "system_admin", "projects_office"],
            "request_update",
            "تم رفع تقرير الاستجابة السريعة",
            `تم رفع تقرير الاستجابة السريعة من قبل ${ctx.user.name || "عضو الاستجابة السريعة"} للطلب رقم ${req.requestNumber}`,
            "request",
            input.requestId
          );
        } catch (error) {
          console.error("Failed to send quick response report notification:", error);
        }
      }

      return { success: true, message: "تم إضافة تقرير الاستجابة السريعة بنجاح" };
    }),

  // إنشاء طلب سريع وإغلاقه مباشرة من قبل فريق الاستجابة السريعة
  createQuickRequest: protectedProcedure
    .input(z.object({
      mosqueId: z.number().optional().nullable(),
      newMosqueName: z.string().optional().nullable(),
      newMosqueCity: z.string().optional().nullable(),
      newMosqueAddress: z.string().optional().nullable(),
      programType: z.string(),
      priority: z.enum(["urgent", "medium", "normal"]).default("normal"),
      description: z.string().optional(),
      technicianName: z.string().optional(),
      technicalEvaluation: z.string(),
      finalEvaluation: z.string().optional().nullable(),
      unexecutedWorks: z.string().optional().nullable(),
      actionsTaken: z.string(),
      status: z.enum(['partially_solved', 'fully_solved', 'not_solved']),
      resolved: z.boolean().default(false),
      requiresProject: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const hasPermission = 
        ["super_admin", "system_admin"].includes(ctx.user.role) ||
        ctx.user.role === "quick_response" ||
        (await checkPermission(ctx.user.id, "requests.create_quick_request")) ||
        (await checkPermission(ctx.user.id, "requests.manage_as_quick_response"));
      if (!hasPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لإضافة طلب استجابة سريعة" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      let mosqueId = input.mosqueId;
      const programData: Record<string, any> = {
        isQuickCreate: true,
        source: "quick_create",
      };

      if (!mosqueId && input.newMosqueName) {
        // Do NOT insert into mosques table. Just store custom name in programData.
        programData.customMosqueName = input.newMosqueName;
        programData.customMosqueCity = input.newMosqueCity || "غير محدد";
        programData.customMosqueAddress = input.newMosqueAddress || null;
      }

      if (!mosqueId && !input.newMosqueName) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "يجب اختيار مسجد أو إدخال بيانات مسجد جديد" });
      }

      const requestNumber = await generateRequestNumber(db, input.programType);

      const requestResult = await db.insert(mosqueRequests).values({
        requestNumber,
        mosqueId,
        userId: ctx.user.id,
        programType: input.programType,
        currentStage: "closed",
        status: "completed",
        priority: input.priority,
        requestTrack: "quick_response",
        assignedTo: ctx.user.id,
        currentResponsible: ctx.user.id,
        completedAt: new Date(),
        programData: programData,
      });

      const requestId = Number(requestResult[0].insertId);
      await triggerBeneficiarySatisfactionSurvey(requestId);

      await db.insert(quickResponseReports).values({
        requestId,
        respondedBy: ctx.user.id,
        responseDate: new Date(),
        technicalEvaluation: input.technicalEvaluation,
        finalEvaluation: input.finalEvaluation || null,
        unexecutedWorks: input.unexecutedWorks || null,
        issueDescription: input.description || input.technicalEvaluation,
        actionsTaken: input.actionsTaken,
        resolved: input.resolved,
        requiresProject: input.requiresProject,
        status: input.status,
        technicianName: input.technicianName || ctx.user.name || null,
      });

      await db.insert(requestHistory).values({
        requestId,
        userId: ctx.user.id,
        toStage: "closed",
        toStatus: "completed",
        action: "request_created",
        notes: input.description || "تم إنشاء وإغلاق طلب استجابة سريعة تلقائياً",
      });

      await db.insert(auditLogs).values({
        userId: ctx.user.id,
        action: "quick_request_created_and_closed",
        entityType: "request",
        entityId: requestId,
        newValues: { requestNumber, programType: input.programType, mosqueId },
      });

      return { success: true, requestId, requestNumber, message: "تم إنشاء طلب الاستجابة السريعة وإغلاقه بنجاح" };
    }),

  // التقييم الفني - الخيارات الأربعة
  technicalEvalDecision: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      decision: z.enum(['apologize', 'suspend', 'quick_response', 'convert_to_project', 'convert_to_donation']),
      justification: z.string().optional(),
      notes: z.string().optional(),
      projectName: z.string().optional(), // اسم المشروع عند التحويل
      managerId: z.number().optional(), // مدير المشروع عند التحويل
      assignedToId: z.number().optional(), // المسؤول عن الاستجابة السريعة
      startDate: z.string().optional(), // تاريخ البدء
      endDate: z.string().optional(), // تاريخ الانتهاء المتوقع
      scheduledDate: z.string().optional(), // تاريخ الاستجابة السريعة المجدولة
      scheduledTime: z.string().optional(), // وقت الاستجابة السريعة المجدولة
      donationTitle: z.string().optional(), // عنوان فرصة التبرع
      donationTargetAmount: z.number().optional(), // المبلغ المستهدف للتبرع
      donationDescription: z.string().optional(), // وصف فرصة التبرع
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود الطلب
      const request = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (request.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      // التحقق من أن الطلب في مرحلة التقييم الفني أو مرحلة التنفيذ (في حال الاستجابة السريعة)
      if (request[0].currentStage !== 'technical_eval' && !(request[0].currentStage === 'execution' && (input.decision === 'convert_to_project' || input.decision === 'suspend'))) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "يمكن اتخاذ هذا القرار فقط في مرحلة التقييم الفني أو أثناء مرحلة التنفيذ للاستجابة السريعة" 
        });
      }

      // التحقق من الصلاحيات
      const { calculateUserPermissions } = await import("../permissions");
      const userPermissions = await calculateUserPermissions(ctx.user.id);
      const hasViewDetailsPermission = userPermissions.includes("requests.view_details");

      const option = TECHNICAL_EVAL_OPTIONS[input.decision];
      const isAllowedRole = (option.allowedRoles as readonly string[]).includes(ctx.user.role) ||
        (ctx.user.role === 'project_manager' && request[0].assignedTo === ctx.user.id) ||
        hasViewDetailsPermission;
      if (!isAllowedRole) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: `ليس لديك صلاحية لاتخاذ قرار "${option.name}"` 
        });
      }

      // التحقق من وجود المبررات إذا كانت مطلوبة
      if (option.requiresJustification && !input.justification) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "يجب ذكر المبررات لهذا القرار" 
        });
      }

      if (input.decision === 'quick_response' && !input.assignedToId) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "يجب تحديد الشخص المسؤول للاستجابة السريعة" 
        });
      }

      // تحديث الطلب حسب القرار
      const updateData: any = {
        status: option.resultStatus,
        technicalEvalDecision: input.decision,
        technicalEvalJustification: input.justification || input.notes,
      };

      // تحديد المرحلة التالية
      if (option.nextStage) {
        updateData.currentStage = option.nextStage;
      }

      // إذا كان القرار هو التحويل للاستجابة السريعة، تحديد المسار
      if (input.decision === 'quick_response') {
        updateData.requestTrack = 'quick_response';
        if (input.assignedToId) {
          updateData.assignedTo = input.assignedToId;
          updateData.currentResponsible = input.assignedToId;
        }
        if (input.startDate) {
          updateData.quickResponseStartDate = new Date(input.startDate);
        }
        if (input.endDate) {
          updateData.quickResponseEndDate = new Date(input.endDate);
        }
        if (input.scheduledDate) {
          updateData.quickResponseScheduledDate = new Date(input.scheduledDate);
        }
        if (input.scheduledTime) {
          updateData.quickResponseScheduledTime = input.scheduledTime;
        }

        // فحص تعارض المواعيد لمسؤول الاستجابة السريعة
        if (input.assignedToId && input.scheduledDate && input.scheduledTime) {
          const quickConflicts = await db.select({ id: mosqueRequests.id })
            .from(mosqueRequests)
            .where(
              and(
                eq(mosqueRequests.assignedTo, input.assignedToId),
                eq(mosqueRequests.requestTrack, 'quick_response'),
                sql`DATE(${mosqueRequests.quickResponseScheduledDate}) = DATE(${input.scheduledDate})`,
                eq(mosqueRequests.quickResponseScheduledTime, input.scheduledTime),
                ne(mosqueRequests.id, input.requestId)
              )
            )
            .limit(1);

          if (quickConflicts.length > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `هذا المسؤول لديه مهمة استجابة سريعة محجوزة بالفعل في تاريخ (${input.scheduledDate}) الساعة (${input.scheduledTime}). يرجى اختيار موعد آخر أو إسناد الطلب لمسؤول آخر.`,
            });
          }
        }
      }

      // إذا كان القرار هو التحويل لمشروع أو فرصة تبرع، إعادة تعيين المسار لـ standard وتحديد المسؤول
      if (input.decision === 'convert_to_project' || input.decision === 'convert_to_donation') {
        updateData.requestTrack = 'standard';
        if (input.managerId) {
          updateData.assignedTo = input.managerId;
          updateData.currentResponsible = input.managerId;
        }
      }

      // إذا كان القرار هو الاعتذار، تحديد تاريخ الإغلاق
      if (input.decision === 'apologize') {
        updateData.completedAt = new Date();
      }

      await db.update(mosqueRequests).set(updateData).where(eq(mosqueRequests.id, input.requestId));

      // إضافة سجل في جدول التقييمات الفنية
      await db.insert(requestEvaluations).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        decision: input.decision,
        justification: input.justification || null,
        notes: input.notes || null,
      });

      // إضافة سجل في تاريخ الطلب
      const actionNote = input.justification 
        ? `${option.name}: ${input.justification}`
        : option.name;
      
      await db.insert(requestHistory).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        fromStage: request[0].currentStage,
        toStage: option.nextStage || request[0].currentStage,
        fromStatus: request[0].status,
        toStatus: option.resultStatus,
        action: `technical_eval_${input.decision}`,
        notes: input.notes || actionNote,
      });

      // إرسال إشعار لمقدم الطلب
      let notificationMessage = '';
      switch (input.decision) {
        case 'apologize':
          notificationMessage = `نعتذر عن عدم إمكانية تنفيذ طلبك رقم ${request[0].requestNumber}`;
          break;
        case 'suspend':
          notificationMessage = `تم تعليق طلبك رقم ${request[0].requestNumber} مؤقتاً`;
          break;
        case 'quick_response':
          notificationMessage = `تم تحويل طلبك رقم ${request[0].requestNumber} لفريق الاستجابة السريعة`;
          break;
        case 'convert_to_project':
          notificationMessage = `تم اعتماد طلبك رقم ${request[0].requestNumber} وتحويله إلى مشروع`;
          break;
        case 'convert_to_donation':
          notificationMessage = `تم اعتماد طلبك رقم ${request[0].requestNumber} وتحويله إلى فرصة تبرع`;
          break;
      }

      // إرسال إشعار لمقدم الطلب فقط إذا كان طالب خدمة
      const [ownerUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, request[0].userId!))
        .limit(1);

      if (ownerUser && ownerUser.role === "service_requester") {
        await createNotification({
          userId: request[0].userId!,
          title: `تحديث التقييم الفني`,
          message: notificationMessage,
          type: "request_update",
          relatedType: "request",
          relatedId: input.requestId,
        });
      }

      // إرسال إشعار للمسؤولين الآخرين بتغيير مرحلة الطلب
      await notifyRequestStageChangeToOfficers(
        input.requestId,
        request[0].requestNumber,
        request[0].currentStage,
        option.nextStage || request[0].currentStage,
        ctx.user.id
      );

      // إرسال إشعارات للفريق المختص حسب المسار
      if (input.decision === 'quick_response') {
        if (input.assignedToId) {
          // إشعار الشخص المسؤول فقط
          await createNotification({
            userId: input.assignedToId,
            title: 'طلب جديد للاستجابة السريعة',
            message: `تم تكليفك بالطلب رقم ${request[0].requestNumber} للاستجابة السريعة`,
            type: 'info',
            relatedType: 'request',
            relatedId: input.requestId,
          });
        }
      } else if (input.decision === 'convert_to_project' || input.decision === 'convert_to_donation') {
        let newProjectId: number | null = null;
        if (input.decision === 'convert_to_project') {
          // إنشاء المشروع تلقائياً مع اسم المشروع المدخل
          const existingProject = await db.select().from(projects).where(eq(projects.requestId, input.requestId)).limit(1);
          if (existingProject.length === 0) {
            // توليد رقم مشروع جديد
            const currentYear = new Date().getFullYear();
            const [existingSeq] = await db.select().from(projectNumberSequence).where(eq(projectNumberSequence.year, currentYear));
            let sequence: number;
            if (existingSeq) {
              sequence = existingSeq.lastSequence + 1;
              await db.update(projectNumberSequence).set({ lastSequence: sequence }).where(eq(projectNumberSequence.year, currentYear));
            } else {
              sequence = 1;
              await db.insert(projectNumberSequence).values({ year: currentYear, lastSequence: sequence });
            }
            const projectNumber = `PRJ-${currentYear}-${String(sequence).padStart(4, '0')}`;
            let defaultProjectName = "";
            const requestWithNames = await db.select({
              programType: mosqueRequests.programType,
              programData: mosqueRequests.programData,
              mosqueName: mosques.name,
              requesterName: users.name,
            }).from(mosqueRequests)
              .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
              .leftJoin(users, eq(mosqueRequests.userId, users.id))
              .where(eq(mosqueRequests.id, input.requestId))
              .limit(1);
            
            if (requestWithNames.length > 0) {
              const r = requestWithNames[0];
              if (r.programType === "bunyan") {
                defaultProjectName = `مشروع ${r.requesterName || ""}`;
              } else {
                let mosqueName = r.mosqueName;
                if (!mosqueName && r.programData) {
                  let progData: any = null;
                  try {
                    if (typeof r.programData === 'string') {
                      progData = JSON.parse(r.programData);
                    } else if (typeof r.programData === 'object') {
                      progData = r.programData;
                    }
                  } catch (e) {
                    console.error("Error parsing programData:", e);
                  }
                  if (progData && typeof progData === 'object' && progData.customMosqueName) {
                    mosqueName = progData.customMosqueName;
                  }
                }
                defaultProjectName = `مشروع مسجد ${mosqueName || ""}`;
              }
            }

            const projectNameToUse = input.projectName || defaultProjectName || `مشروع مسجد ${request[0].requestNumber}`;
            const [newProject] = await db.insert(projects).values({
              projectNumber,
              requestId: input.requestId,
              name: projectNameToUse,
              managerId: input.managerId,
              status: 'planning',
              completionPercentage: 17, // 1/6 تقريبا
              startDate: input.startDate ? new Date(input.startDate) : undefined,
              expectedEndDate: input.endDate ? new Date(input.endDate) : undefined,
            });
            newProjectId = newProject.insertId;
            
            // إنشاء المراحل الافتراضية
            const defaultPhases = [
              { phaseName: 'المرحلة الأولى : الإنشاء والتخطيط', phaseOrder: 1 },
              { phaseName: 'المرحلة الثانية : إعداد جدول الكميات', phaseOrder: 2 },
              { phaseName: 'المرحلة الثالثة : اعتماد عرض السعر المناسب', phaseOrder: 3 },
              { phaseName: 'المرحلة الرابعة : التعاقد', phaseOrder: 4 },
              { phaseName: 'المرحلة الخامسة : صرف المدفوعات', phaseOrder: 5 },
              { phaseName: 'المرحلة السادسة : المراجعة والإغلاق', phaseOrder: 6 },
            ];
            for (const phase of defaultPhases) {
              await db.insert(projectPhases).values({
                projectId: newProjectId,
                phaseName: phase.phaseName,
                phaseOrder: phase.phaseOrder,
                completionPercentage: phase.phaseOrder === 1 ? 100 : 0,
                status: phase.phaseOrder === 1 ? 'completed' : (phase.phaseOrder === 2 ? 'in_progress' : 'pending'),
              });
            }
          } else {
            newProjectId = existingProject[0].id;
          }
        }

        // إذا كان القرار هو فرصة تبرع، قم بإنشاء فرصة التبرع في قاعدة البيانات
        if (input.decision === 'convert_to_donation') {
          await db.insert(donationOpportunities).values({
            requestId: input.requestId,
            projectId: null,
            title: input.donationTitle || input.projectName || `فرصة تبرع: ${request[0].requestNumber}`,
            targetAmount: input.donationTargetAmount?.toString() || request[0].estimatedCost?.toString() || "0",
            description: input.donationDescription || input.justification || null,
            status: 'active',
            isPublic: true,
          });
        }

        // إشعار الإدارة المالية ومكتب المشاريع
        const financialTeam = await db.select({ id: users.id })
          .from(users)
          .where(inArray(users.role, ['financial', 'projects_office']));
        
        for (const member of financialTeam) {
          await createNotification({
            userId: member.id,
            title: input.decision === 'convert_to_donation' ? 'فرصة تبرع جديدة للتقييم المالي' : 'مشروع جديد للتقييم المالي',
            message: input.decision === 'convert_to_donation' 
              ? `تم تحويل الطلب رقم ${request[0].requestNumber} إلى فرصة تبرع ويحتاج للتقييم المالي`
              : `تم تحويل الطلب رقم ${request[0].requestNumber} إلى مشروع ويحتاج للتقييم المالي`,
            type: 'info',
            relatedType: 'request',
          });
        }
      } 

      return {
        success: true, 
        message: `تم ${option.name} بنجاح`,
        nextStage: option.nextStage,
        newStatus: option.resultStatus,
      };
    }),

  // إسناد الزيارة الميدانية لموظف
  assignFieldVisit: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      assignedTo: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!["projects_office", "super_admin", "system_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية إسناد الزيارات الميدانية" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود الطلب
      const request = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (request.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      // التحقق من وجود الموظف
      const assignee = await db.select().from(users).where(eq(users.id, input.assignedTo)).limit(1);
      if (assignee.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الموظف غير موجود" });
      }

      await db.update(mosqueRequests).set({
        fieldVisitAssignedTo: input.assignedTo,
        fieldVisitNotes: input.notes || null,
      }).where(eq(mosqueRequests.id, input.requestId));

      // إرسال إشعار للموظف المسند إليه
      await createNotification({
        userId: input.assignedTo,
        title: 'مهمة زيارة ميدانية جديدة',
        message: `تم إسناد الطلب رقم ${request[0].requestNumber} إليك للزيارة الميدانية`,
        type: 'info',
        relatedType: 'request',
        relatedId: input.requestId,
      });

      // إضافة سجل في تاريخ الطلب
      await db.insert(requestHistory).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        action: 'field_visit_assigned',
        notes: `تم إسناد الزيارة الميدانية إلى ${assignee[0].name}`,
      });

      return { success: true, message: `تم إسناد الزيارة الميدانية إلى ${assignee[0].name}` };
    }),

  // جدولة الزيارة الميدانية
  scheduleFieldVisit: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      scheduledDate: z.string(),
      scheduledTime: z.string().optional(),
      notes: z.string().optional(),
      contactName: z.string().optional(), // اسم الشخص المسؤول
      contactTitle: z.string().optional(), // صفة الشخص
      contactPhone: z.string().optional(), // رقم جوال الشخص
    }))
    .mutation(async ({ input, ctx }) => {
      const hasCalendarPerm = await checkPermission(ctx.user.id, "appointments_calendar");
      const hasFieldTeamPerm = await checkPermission(ctx.user.id, "requests.manage_as_field_team");
      const isAllowed = ["field_team", "projects_office", "super_admin", "system_admin"].includes(ctx.user.role) || hasCalendarPerm || hasFieldTeamPerm;
      if (!isAllowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية جدولة الزيارات الميدانية" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود الطلب
      const request = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (request.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      await db.update(mosqueRequests).set({
        fieldVisitScheduledDate: new Date(input.scheduledDate),
        fieldVisitScheduledTime: input.scheduledTime || null,
        fieldVisitNotes: input.notes || request[0].fieldVisitNotes,
        fieldVisitContactName: input.contactName || null,
        fieldVisitContactTitle: input.contactTitle || null,
        fieldVisitContactPhone: input.contactPhone || null,
      }).where(eq(mosqueRequests.id, input.requestId));

      // إرسال إشعار لمقدم الطلب فقط إذا كان طالب خدمة
      const [ownerUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, request[0].userId!))
        .limit(1);

      if (ownerUser && ownerUser.role === "service_requester") {
        await createNotification({
          userId: request[0].userId!,
          title: 'تم جدولة زيارة ميدانية',
          message: `تم جدولة زيارة ميدانية لطلبك رقم ${request[0].requestNumber} بتاريخ ${new Date(input.scheduledDate).toLocaleDateString('ar-SA')}`,
          type: 'info',
          relatedType: 'request',
          relatedId: input.requestId,
        });
      }

      // إضافة سجل في تاريخ الطلب
      await db.insert(requestHistory).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        action: 'field_visit_scheduled',
        notes: `تم جدولة الزيارة الميدانية بتاريخ ${new Date(input.scheduledDate).toLocaleDateString('ar-SA')} ${input.scheduledTime || ''}`,
      });

      return { success: true, message: 'تم جدولة الزيارة الميدانية بنجاح' };
    }),

  // الحصول على الزيارات المجدولة (تقويم الزيارات)
  getScheduledVisits: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      assignedTo: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const hasCalendarPerm = await checkPermission(ctx.user.id, "appointments_calendar");
      const hasFieldTeamPerm = await checkPermission(ctx.user.id, "requests.manage_as_field_team");
      const isDefaultAllowedRole = ["field_team", "projects_office", "super_admin", "system_admin"].includes(ctx.user.role) || hasFieldTeamPerm;
      if (!isDefaultAllowedRole && !hasCalendarPerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية عرض تقويم الزيارات" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // قراءة من جدول fieldVisits المنفصل (المصدر الصحيح للجدولة)
      const conditions: any[] = [sql`${fieldVisits.scheduledDate} IS NOT NULL`];
      
      if (input.startDate) {
        conditions.push(gte(fieldVisits.scheduledDate, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(fieldVisits.scheduledDate, new Date(input.endDate)));
      }

      const hasViewOwn = await checkPermission(ctx.user.id, "appointments.view_own");
      const hasViewAll = await checkPermission(ctx.user.id, "appointments.view_all");

      if (hasViewAll) {
        if (input.assignedTo) {
          conditions.push(eq(fieldVisits.assignedTo, input.assignedTo));
        }
      } else if (hasViewOwn || ctx.user.role === 'field_team') {
        conditions.push(eq(fieldVisits.assignedTo, ctx.user.id));
      } else {
        conditions.push(eq(fieldVisits.assignedTo, ctx.user.id));
      }
      const assignedUser = alias(users, 'assignedUser');
      const visits = await db.select({
        id: mosqueRequests.id,
        requestNumber: mosqueRequests.requestNumber,
        programType: mosqueRequests.programType,
        currentStage: mosqueRequests.currentStage,
        scheduledDate: fieldVisits.scheduledDate,
        scheduledTime: fieldVisits.scheduledTime,
        notes: fieldVisits.scheduleNotes,
        assignedToId: fieldVisits.assignedTo,
        fieldVisitId: fieldVisits.id,
        fieldVisitStatus: fieldVisits.status,
        mosqueId: mosqueRequests.mosqueId,
        mosqueName: mosques.name,
        mosqueCity: mosques.city,
        assignedToName: assignedUser.name,
      })
        .from(fieldVisits)
        .innerJoin(mosqueRequests, eq(fieldVisits.requestId, mosqueRequests.id))
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .leftJoin(assignedUser, eq(fieldVisits.assignedTo, assignedUser.id))
        .where(and(...conditions))
        .orderBy(fieldVisits.scheduledDate);

      return visits;
    }),

  getFieldTeamMembers: protectedProcedure
    .query(async ({ ctx }) => {
      if (!["projects_office", "super_admin", "system_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية عرض موظفي الفريق الميداني" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        role: users.role,
        email: users.email,
        phone: users.phone,
        status: users.status,
      }).from(users).where(eq(users.status, 'active'));

      const { calculateUserPermissions } = await import("../permissions");
      const matched = [];
      const defaultRoles = ['field_team', 'projects_office', 'super_admin', 'system_admin'];
      for (const u of allUsers) {
        if (defaultRoles.includes(u.role)) {
          matched.push({ id: u.id, name: u.name, email: u.email, phone: u.phone });
        } else {
          const userPerms = await calculateUserPermissions(u.id);
          if (userPerms.includes("requests.manage_as_field_team")) {
            matched.push({ id: u.id, name: u.name, email: u.email, phone: u.phone });
          }
        }
      }

      matched.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      return matched;
    }),

  // الحصول على موظفي فريق الاستجابة السريعة
  getQuickResponseTeamMembers: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        role: users.role,
        status: users.status,
      }).from(users).where(eq(users.status, 'active'));

      const { calculateUserPermissions } = await import("../permissions");
      const matched = [];
      for (const u of allUsers) {
        if (u.role === 'quick_response') {
          matched.push({ id: u.id, name: u.name });
        } else {
          const userPerms = await calculateUserPermissions(u.id);
          if (userPerms.includes("requests.manage_as_quick_response")) {
            matched.push({ id: u.id, name: u.name });
          }
        }
      }

      matched.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      return matched;
    }),

  // الحصول على الساعات المحجوزة لمسؤول الاستجابة السريعة في تاريخ معين
  getTechnicianBusyHours: protectedProcedure
    .input(z.object({
      userId: z.number(),
      date: z.string(), // YYYY-MM-DD
      excludeRequestId: z.number().optional().nullable(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      if (!input.userId || !input.date) return [];

      // جلب المواعيد المحجوزة للاستجابة السريعة فقط
      const scheduledQuickRequests = await db.select({
        scheduledTime: mosqueRequests.quickResponseScheduledTime,
      })
      .from(mosqueRequests)
      .where(
        and(
          eq(mosqueRequests.assignedTo, input.userId),
          eq(mosqueRequests.requestTrack, 'quick_response'),
          sql`DATE(${mosqueRequests.quickResponseScheduledDate}) = DATE(${input.date})`,
          sql`${mosqueRequests.quickResponseScheduledTime} IS NOT NULL`,
          input.excludeRequestId ? ne(mosqueRequests.id, input.excludeRequestId) : sql`1=1`
        )
      );

      const busyHours = scheduledQuickRequests
        .map(r => r.scheduledTime)
        .filter(Boolean) as string[];

      return Array.from(new Set(busyHours));
    }),

  // الحصول على الساعات المحجوزة للتقرير الختامي لموظف في تاريخ معين
  getFinalReportBusySlots: protectedProcedure
    .input(z.object({
      userId: z.number().optional().nullable(),
      date: z.string(),
      excludeRequestId: z.number().optional().nullable(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      if (!input.userId || !input.date) return [];

      const scheduledFinalReports = await db.select({
        scheduledTime: mosqueRequests.finalReportScheduledTime,
      })
      .from(mosqueRequests)
      .where(
        and(
          eq(mosqueRequests.finalReportAssignedTo, input.userId),
          sql`DATE(${mosqueRequests.finalReportScheduledDate}) = DATE(${input.date})`,
          sql`${mosqueRequests.finalReportScheduledTime} IS NOT NULL`,
          input.excludeRequestId ? ne(mosqueRequests.id, input.excludeRequestId) : sql`1=1`
        )
      );

      const busyHours = scheduledFinalReports
        .map(r => r.scheduledTime)
        .filter(Boolean) as string[];

      return Array.from(new Set(busyHours));
    }),

  // الحصول على طلب برقم الطلب (للتتبع العام)
  getByNumber: publicProcedure
    .input(z.object({ requestNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const result = await db.select({
        request: mosqueRequests,
        programName: programs.name,
      }).from(mosqueRequests)
        .leftJoin(programs, eq(mosqueRequests.programType, programs.id))
        .where(eq(mosqueRequests.requestNumber, input.requestNumber))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      const { request, programName } = result[0];
      
      // إرجاع معلومات محدودة للعامة
      return {
        requestNumber: request.requestNumber,
        programType: request.programType,
        programName: programName,
        currentStage: request.currentStage,
        status: request.status,
        priority: request.priority,
        createdAt: request.createdAt,
        reviewedAt: request.reviewedAt,
        approvedAt: request.approvedAt,
        completedAt: request.completedAt,
      };
    }),

  // اختيار عرض السعر الفائز للاعتماد المالي
  selectWinningQuotation: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      quotationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من الصلاحيات (الإدارة المالية أو المدير العام أو أي مستخدم يملك صلاحية الاعتماد المالي)
      const hasApprovePerm = await checkPermission(ctx.user.id, "financial_approval.approve");
      if (!hasApprovePerm && !["financial", "financial_manager", "super_admin", "system_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لاختيار عرض السعر الفائز" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود الطلب
      const request = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (request.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      // التحقق من أن الطلب في مرحلة التقييم المالي
      if (request[0].currentStage !== "financial_eval_and_approval") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "يمكن اختيار عرض السعر فقط في مرحلة التقييم المالي واعتماد العرض" });
      }

      // التحقق من وجود عرض السعر
      const quotation = await db.select().from(quotations).where(eq(quotations.id, input.quotationId)).limit(1);
      if (quotation.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "عرض السعر غير موجود" });
      }

      // التحقق من أن عرض السعر يخص الطلب نفسه
      if (quotation[0].requestId !== input.requestId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "عرض السعر لا يخص هذا الطلب" });
      }

      // تحديث الطلب بعرض السعر المختار (حفظ quotationNumber)
      await db.update(mosqueRequests).set({
        selectedQuotationId: quotation[0].quotationNumber,
      }).where(eq(mosqueRequests.id, input.requestId));

      // إضافة سجل في تاريخ الطلب
      await db.insert(requestHistory).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        fromStage: "financial_eval_and_approval",
        toStage: "financial_eval_and_approval",
        fromStatus: request[0].status,
        toStatus: request[0].status,
        action: "select_winning_quotation",
        notes: `تم اختيار عرض السعر ${quotation[0].quotationNumber} كعرض فائز`,
      });

      return { success: true, message: "تم اختيار عرض السعر الفائز بنجاح" };
    }),

  // الاعتماد المالي النهائي والانتقال للتنفيذ
  approveFinancially: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      approvalNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // التحقق من الصلاحيات (الإدارة المالية أو المدير العام أو أي مستخدم يملك صلاحية الاعتماد المالي)
      const hasApprovePerm = await checkPermission(ctx.user.id, "financial_approval.approve");
      if (!hasApprovePerm && !["financial", "financial_manager", "super_admin", "system_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية للاعتماد المالي" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود الطلب
      const request = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (request.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      // التحقق من أن الطلب في مرحلة التقييم المالي
      if (request[0].currentStage !== "financial_eval_and_approval") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "يمكن الاعتماد المالي فقط في مرحلة التقييم المالي واعتماد العرض" });
      }

      // التحقق من وجود عرض سعر مختار
      if (!request[0].selectedQuotationId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "يجب اختيار عرض سعر أولاً" });
      }

      // جلب بيانات عرض السعر المختار
      const quotation = await db.select().from(quotations).where(eq(quotations.quotationNumber, request[0].selectedQuotationId)).limit(1);
      if (quotation.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "عرض السعر المختار غير موجود" });
      }

      const finalAmount = parseFloat(quotation[0].finalAmount || "0");

      // تحديث الطلب: الانتقال لمرحلة التعاقد وحفظ الميزانية المعتمدة
      await db.update(mosqueRequests).set({
        currentStage: "contracting",
        status: "approved",
        approvedBudget: finalAmount.toString(),
        approvedAt: new Date(),
      }).where(eq(mosqueRequests.id, input.requestId));

      // تحديث حالة عرض السعر إلى "accepted"
      await db.update(quotations).set({
        status: "accepted",
      }).where(eq(quotations.quotationNumber, request[0].selectedQuotationId));

      await notifyQuotationApproval(
        quotation[0].id,
        quotation[0].quotationNumber,
        quotation[0].requestId,
        quotation[0].projectId,
        quotation[0].supplierId,
        (quotation[0].finalAmount || quotation[0].totalAmount || "0").toString()
      );

      // تحديث تقدم المشروع المرتبط: 3/6 مراحل مكتملة
      const [linkedProject] = await db.select().from(projects).where(eq(projects.requestId, input.requestId)).limit(1);
      if (linkedProject) {
        // تحديث نسبة إنجاز المشروع إلى 50% (3/6) وتحديث الحالة
        await db.update(projects)
          .set({ completionPercentage: 50, status: 'in_progress' })
          .where(eq(projects.id, linkedProject.id));

        // تحديث المراحل: إكمال المرحلة الثالثة (اعتماد عرض السعر المناسب) وبدء المرحلة الرابعة (التعاقد)
        await db.update(projectPhases)
          .set({ status: 'completed', completionPercentage: 100 })
          .where(and(eq(projectPhases.projectId, linkedProject.id), eq(projectPhases.phaseOrder, 3)));
        
        await db.update(projectPhases)
          .set({ status: 'in_progress' })
          .where(and(eq(projectPhases.projectId, linkedProject.id), eq(projectPhases.phaseOrder, 4)));
      }

      // إضافة سجل في تاريخ الطلب
      const notes = input.approvalNotes 
        ? `الاعتماد المالي: ${finalAmount.toLocaleString("ar-SA")} ريال. ${input.approvalNotes}`
        : `الاعتماد المالي: ${finalAmount.toLocaleString("ar-SA")} ريال`;
      
      await db.insert(requestHistory).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        fromStage: "financial_eval_and_approval",
        toStage: "contracting",
        fromStatus: request[0].status,
        toStatus: "approved",
        action: "financial_approval",
        notes,
      });

      // إرسال إشعار لمقدم الطلب فقط إذا كان طالب خدمة
      const [ownerUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, request[0].userId!))
        .limit(1);

      if (ownerUser && ownerUser.role === "service_requester") {
        await createNotification({
          userId: request[0].userId!,
          title: "تم اعتماد طلبك مالياً",
          message: `تم اعتماد طلبك رقم ${request[0].requestNumber} مالياً بمبلغ ${finalAmount.toLocaleString("ar-SA")} ريال وتم الانتقال لمرحلة التعاقد`,
          type: "request_update",
          relatedType: "request",
          relatedId: input.requestId,
        });
      }

      // إرسال إشعار للمسؤولين الآخرين بتغيير مرحلة الطلب (الاعتماد المالي والتحويل للتعاقد)
      await notifyRequestStageChangeToOfficers(
        input.requestId,
        request[0].requestNumber,
        "financial_eval_and_approval",
        "contracting",
        ctx.user.id
      );

      return { success: true, message: "تم الاعتماد المالي بنجاح وتم الانتقال لمرحلة التعاقد" };
    }),

  // حساب عدد التعليقات غير المقروءة
  getUnreadCommentsCount: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const result = await db.select({ count: sql<number>`count(*)` })
        .from(requestComments)
        .where(
          and(
            eq(requestComments.requestId, input.requestId),
            eq(requestComments.isRead, false)
          )
        );

      return { count: result[0]?.count || 0 };
    }),

    // تحديث التعليقات كمقروءة
  markCommentsAsRead: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      await db.update(requestComments)
        .set({ isRead: true })
        .where(eq(requestComments.requestId, input.requestId));
      return { success: true };
    }),

  // تحديث حالة إتمام المراجعة الأولية
  updateReviewCompleted: protectedProcedure
    .input(z.object({ 
      requestId: z.number(),
      reviewCompleted: z.boolean()
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      
      await db.update(mosqueRequests)
        .set({ reviewCompleted: input.reviewCompleted })
        .where(eq(mosqueRequests.id, input.requestId));
      
      return { success: true };
    }),

  // الرجوع للمرحلة السابقة (لتصحيح الأخطاء)
  revertStage: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      reason: z.string().min(5, "يجب ذكر سبب الرجوع (خمسة أحرف على الأقل)"),
    }))
    .mutation(async ({ input, ctx }) => {
      // فقط المدراء يمكنهم الرجوع
      if (!["super_admin", "system_admin", "projects_office"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية الرجوع للمرحلة السابقة" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const request = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (request.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      const currentStage = request[0].currentStage;
      
      // المراحل التي لا يمكن الرجوع منها
      const nonRevertableStages = ['submitted', 'closed'];
      if (nonRevertableStages.includes(currentStage)) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `لا يمكن الرجوع من مرحلة "${STAGE_LABELS[currentStage] || currentStage}"` 
        });
      }

      // تحديد المرحلة السابقة من سجل التاريخ
      const history = await db.select()
        .from(requestHistory)
        .where(and(
          eq(requestHistory.requestId, input.requestId),
          sql`${requestHistory.fromStage} IS NOT NULL AND ${requestHistory.toStage} = ${currentStage}`
        ))
        .orderBy(desc(requestHistory.createdAt))
        .limit(1);

      let previousStage: string;
      if (history.length > 0 && history[0].fromStage) {
        previousStage = history[0].fromStage;
      } else {
        // المرحلة السابقة الافتراضية من قائمة المراحل
        const stageOrder = ['submitted', 'initial_review', 'field_visit', 'technical_eval', 'boq_preparation', 'financial_eval_and_approval', 'contracting', 'execution', 'handover', 'closed'];
        const currentIndex = stageOrder.indexOf(currentStage);
        if (currentIndex <= 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "لا توجد مرحلة سابقة للرجوع إليها" });
        }
        previousStage = stageOrder[currentIndex - 1];
      }

      // تحديث الطلب
      await db.update(mosqueRequests).set({
        currentStage: previousStage as any,
        status: 'in_progress',
      }).where(eq(mosqueRequests.id, input.requestId));

      // إضافة سجل في تاريخ الطلب
      const prevStageName = STAGE_LABELS[previousStage] || previousStage;
      const currStageName = STAGE_LABELS[currentStage] || currentStage;
      await db.insert(requestHistory).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        fromStage: currentStage,
        toStage: previousStage,
        action: 'stage_reverted',
        notes: `تم الرجوع من مرحلة "${currStageName}" إلى مرحلة "${prevStageName}". السبب: ${input.reason}`,
      });

      // إرسال إشعار للمسؤولين الآخرين بتغيير مرحلة الطلب (الرجوع للمرحلة السابقة)
      await notifyRequestStageChangeToOfficers(
        input.requestId,
        request[0].requestNumber,
        currentStage,
        previousStage,
        ctx.user.id
      );

      return { 
        success: true, 
        message: `تم الرجوع إلى مرحلة "${prevStageName}" بنجاح`,
        previousStage,
      };
    }),

  // الحصول على الطلبات التي تنتظر زيارة ميدانية (للقائمة المنسدلة في التقويم)
  getPendingVisits: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const conditions = [
        eq(mosqueRequests.currentStage, "field_visit"),
      ];

      if (input.search) {
        conditions.push(
          or(
            sql`${mosqueRequests.requestNumber} LIKE ${`%${input.search}%`}`,
            sql`${mosques.name} LIKE ${`%${input.search}%`}`
          )!
        );
      }

      const results = await db.select({
        id: mosqueRequests.id,
        requestNumber: mosqueRequests.requestNumber,
        mosqueName: mosques.name,
        mosqueCity: mosques.city,
      }).from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(and(...conditions))
        .orderBy(desc(mosqueRequests.createdAt))
        .limit(50);

      return results;
    }),

  // تحديث أو إضافة مبلغ التنفيذ (Upsert)
  upsertExecutionPrice: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      amount: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من الصلاحيات
      const allowedRoles = ["super_admin", "system_admin", "projects_office", "financial", "project_manager"];
      if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لتحديث ميزانية التنفيذ" });
      }

      // التحقق من وجود الطلب
      const requestResult = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, input.requestId)).limit(1);
      if (requestResult.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      // تحديث الميزانية المعتمدة في الطلب
      await db.update(mosqueRequests).set({
        approvedBudget: input.amount,
        updatedAt: new Date(),
      }).where(eq(mosqueRequests.id, input.requestId));

      // البحث عن تقرير ختامي لتحديث التكلفة فيه أيضاً إن وجد (للحفاظ على الاتساق)
      await db.update(finalReports).set({
        totalCost: input.amount,
        updatedAt: new Date(),
      }).where(eq(finalReports.requestId, input.requestId));

      // إضافة سجل في التاريخ
      const { requestHistory } = await import("../../drizzle/schema");
      await db.insert(requestHistory).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        action: "execution_price_updated",
        notes: input.notes || `تم تحديث مبلغ التنفيذ إلى ${parseFloat(input.amount).toLocaleString("ar-SA")} ريال`,
      });

      return { success: true, message: "تم تحديث السعر بنجاح" };
    }),

  // الحصول على التقارير المعلقة
  getPendingReports: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        typeFilter: z.string().optional(),
        statusFilter: z.string().optional(),
        page: z.number().optional().default(1),
        limit: z.number().optional().default(15),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const {
        search = "",
        typeFilter = "all",
        statusFilter = "all",
        page = 1,
        limit = 15,
      } = input || {};

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const hasViewPerm = await checkPermission(ctx.user.id, "pending_reports.view");
      if (!["super_admin", "system_admin"].includes(ctx.user.role) && !hasViewPerm) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض هذه الصفحة" });
      }

      // Fetch all requests that might have reports or completed reports
      const activeRequests = await db.select({
        request: mosqueRequests,
        mosque: mosques,
      })
      .from(mosqueRequests)
      .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
      .where(
        and(
          or(
            sql`${mosqueRequests.fieldVisitAssignedTo} IS NOT NULL`,
            and(
              eq(mosqueRequests.requestTrack, 'quick_response'),
              sql`${mosqueRequests.assignedTo} IS NOT NULL`
            ),
            sql`${mosqueRequests.finalReportAssignedTo} IS NOT NULL`,
            sql`EXISTS (SELECT 1 FROM quick_response_reports WHERE quick_response_reports.requestId = ${mosqueRequests.id})`,
            sql`EXISTS (SELECT 1 FROM field_visit_reports WHERE field_visit_reports.requestId = ${mosqueRequests.id})`,
            sql`EXISTS (SELECT 1 FROM final_reports WHERE final_reports.requestId = ${mosqueRequests.id})`
          ),
          sql`${mosqueRequests.status} != 'rejected'`
        )
      );

      if (activeRequests.length === 0) {
        return {
          reports: [],
          total: 0,
          stats: {
            totalCount: 0,
            pendingCount: 0,
            fieldVisitsCount: 0,
            quickResponsesCount: 0,
            quickRequestsCount: 0,
            finalReportsCount: 0,
            lateCount: 0,
          }
        };
      }

      const requestIds = activeRequests.map(r => r.request.id);

      // Fetch all reports for these request IDs
      const fvReports = await db.select().from(fieldVisitReports).where(inArray(fieldVisitReports.requestId, requestIds));
      const qrReports = await db.select().from(quickResponseReports).where(inArray(quickResponseReports.requestId, requestIds));
      const fnReports = await db.select().from(finalReports).where(inArray(finalReports.requestId, requestIds));

      // Fetch all unique user IDs involved
      const userIds = new Set<number>();
      activeRequests.forEach(r => {
        if (r.request.fieldVisitAssignedTo) userIds.add(r.request.fieldVisitAssignedTo);
        if (r.request.assignedTo) userIds.add(r.request.assignedTo);
        if (r.request.finalReportAssignedTo) userIds.add(r.request.finalReportAssignedTo);
      });
      qrReports.forEach(qr => {
        if (qr.respondedBy) userIds.add(qr.respondedBy);
      });
      fvReports.forEach(fv => {
        if (fv.visitedBy) userIds.add(fv.visitedBy);
      });
      fnReports.forEach(fn => {
        if (fn.preparedBy) userIds.add(fn.preparedBy);
      });

      let usersList: any[] = [];
      if (userIds.size > 0) {
        usersList = await db.select({
          id: users.id,
          name: users.name,
          phone: users.phone,
          email: users.email,
        })
        .from(users)
        .where(inArray(users.id, Array.from(userIds)));
      }

      const userMap = new Map(usersList.map(u => [u.id, u]));
      const fvReportMap = new Set(fvReports.map(r => r.requestId));
      const qrReportMap = new Set(qrReports.map(r => r.requestId));
      const fnReportMap = new Set(fnReports.map(r => r.requestId));
      const fnReportIdMap = new Map(fnReports.map(r => [r.requestId, r.id]));

      const allReportsList: any[] = [];
      const now = new Date();

      activeRequests.forEach(({ request, mosque }) => {
        let pData: any = {};
        try {
          pData = typeof request.programData === 'string' ? JSON.parse(request.programData) : request.programData || {};
        } catch (e) {}

        let displayMosqueName = mosque?.name;
        if (!displayMosqueName || displayMosqueName === "مسجد غير محدد") {
          if (pData?.customMosqueName) displayMosqueName = pData.customMosqueName;
        }
        if (!displayMosqueName) displayMosqueName = "مسجد غير محدد";

        let displayMosqueCity = mosque?.city;
        if (!displayMosqueCity || displayMosqueCity === "غير محدد") {
          if (pData?.customMosqueCity) displayMosqueCity = pData.customMosqueCity;
        }
        if (!displayMosqueCity) displayMosqueCity = "غير محدد";

        // 1. Check Field Visit Report
        const hasFvReport = fvReportMap.has(request.id);
        const fvReportData = fvReports.find(r => r.requestId === request.id);
        if (request.fieldVisitAssignedTo && (request.currentStage === 'field_visit' || hasFvReport)) {
          let isLate = false;
          if (!hasFvReport && request.fieldVisitScheduledDate) {
            const scheduledDate = new Date(request.fieldVisitScheduledDate);
            if (request.fieldVisitScheduledTime) {
              const [hours, minutes] = request.fieldVisitScheduledTime.split(':').map(Number);
              if (!isNaN(hours)) scheduledDate.setHours(hours, minutes || 0, 0, 0);
            }
            const limitDate = new Date(scheduledDate);
            limitDate.setDate(limitDate.getDate() + 2);
            isLate = now > limitDate;
          }

          allReportsList.push({
            id: request.id,
            requestNumber: request.requestNumber,
            mosqueName: displayMosqueName,
            mosqueCity: displayMosqueCity,
            assignedTo: userMap.get(request.fieldVisitAssignedTo) || (fvReportData?.visitedBy ? userMap.get(fvReportData.visitedBy) : null) || null,
            scheduledDate: request.fieldVisitScheduledDate,
            scheduledTime: request.fieldVisitScheduledTime,
            isLate,
            isCompleted: hasFvReport,
            reportType: "field_visit",
            dueDate: request.fieldVisitScheduledDate ? `${new Date(request.fieldVisitScheduledDate).toLocaleDateString("ar-SA")} ${request.fieldVisitScheduledTime || ""}` : "غير محدد",
            actionUrl: `/requests/${request.id}/field-inspection`,
          });
        }

        // 2. Check Quick Request / Quick Response Report
        const isQuickResponseTrack = request.requestTrack === 'quick_response';
        const hasQrReport = qrReportMap.has(request.id);
        const qrReportData = qrReports.find(r => r.requestId === request.id);

        const isQuickCreate = Boolean(
          pData?.isQuickCreate || 
          pData?.source === 'quick_create' ||
          (isQuickResponseTrack && (pData?.customMosqueName || (request.currentStage === 'closed' && hasQrReport)))
        );

        if (isQuickCreate && hasQrReport) {
          // تقرير طلب سريع مرفوع عن طريق صفحة إنشاء طلب سريع
          const respondent = qrReportData?.respondedBy ? userMap.get(qrReportData.respondedBy) : (request.assignedTo ? userMap.get(request.assignedTo) : null);
          allReportsList.push({
            id: request.id,
            requestNumber: request.requestNumber,
            mosqueName: displayMosqueName,
            mosqueCity: displayMosqueCity,
            assignedTo: respondent || { name: qrReportData?.technicianName || "فريق الاستجابة السريعة" },
            startDate: request.quickResponseStartDate || qrReportData?.responseDate,
            endDate: request.quickResponseEndDate || qrReportData?.responseDate,
            scheduledDate: request.quickResponseScheduledDate || qrReportData?.responseDate,
            scheduledTime: request.quickResponseScheduledTime,
            isLate: false,
            isCompleted: true,
            reportType: "quick_request",
            dueDate: qrReportData?.responseDate ? new Date(qrReportData.responseDate).toLocaleDateString("ar-SA") : (request.createdAt ? new Date(request.createdAt).toLocaleDateString("ar-SA") : "غير محدد"),
            actionUrl: `/requests/${request.id}`,
          });
        } else if (isQuickResponseTrack && (request.assignedTo || hasQrReport) && (request.currentStage === 'execution' || hasQrReport)) {
          let isLate = false;
          if (!hasQrReport && request.quickResponseScheduledDate) {
            const scheduledDate = new Date(request.quickResponseScheduledDate);
            if (request.quickResponseScheduledTime) {
              const [hours, minutes] = request.quickResponseScheduledTime.split(':').map(Number);
              if (!isNaN(hours)) scheduledDate.setHours(hours, minutes || 0, 0, 0);
            }
            const limitDate = new Date(scheduledDate);
            limitDate.setDate(limitDate.getDate() + 2);
            isLate = now > limitDate;
          }

          allReportsList.push({
            id: request.id,
            requestNumber: request.requestNumber,
            mosqueName: displayMosqueName,
            mosqueCity: displayMosqueCity,
            assignedTo: userMap.get(request.assignedTo) || (qrReportData?.respondedBy ? userMap.get(qrReportData.respondedBy) : null) || { name: qrReportData?.technicianName || "غير مسند" },
            startDate: request.quickResponseStartDate,
            endDate: request.quickResponseEndDate,
            scheduledDate: request.quickResponseScheduledDate,
            scheduledTime: request.quickResponseScheduledTime,
            isLate,
            isCompleted: hasQrReport,
            reportType: "quick_response",
            dueDate: request.quickResponseScheduledDate ? `${new Date(request.quickResponseScheduledDate).toLocaleDateString("ar-SA")} ${request.quickResponseScheduledTime || ""}` : (qrReportData?.responseDate ? new Date(qrReportData.responseDate).toLocaleDateString("ar-SA") : "غير محدد"),
            actionUrl: `/requests/${request.id}/quick-response`,
          });
        }

        // 3. Check Corporate Communication Final Report
        const hasFnReport = fnReportMap.has(request.id);
        const fnReportData = fnReports.find(r => r.requestId === request.id);
        if (request.finalReportAssignedTo || hasFnReport) {
          let isLate = false;
          if (!hasFnReport && request.finalReportScheduledDate) {
            const scheduledDate = new Date(request.finalReportScheduledDate);
            if (request.finalReportScheduledTime) {
              const [hours, minutes] = request.finalReportScheduledTime.split(':').map(Number);
              if (!isNaN(hours)) scheduledDate.setHours(hours, minutes || 0, 0, 0);
            }
            const limitDate = new Date(scheduledDate);
            limitDate.setDate(limitDate.getDate() + 2);
            isLate = now > limitDate;
          }

          allReportsList.push({
            id: request.id,
            requestNumber: request.requestNumber,
            mosqueName: displayMosqueName,
            mosqueCity: displayMosqueCity,
            assignedTo: userMap.get(request.finalReportAssignedTo) || (fnReportData?.preparedBy ? userMap.get(fnReportData.preparedBy) : null) || null,
            scheduledDate: request.finalReportScheduledDate,
            scheduledTime: request.finalReportScheduledTime,
            isLate,
            isCompleted: hasFnReport,
            reportId: fnReportIdMap.get(request.id) || null,
            reportType: "final_report",
            dueDate: request.finalReportScheduledDate ? `${new Date(request.finalReportScheduledDate).toLocaleDateString("ar-SA")} ${request.finalReportScheduledTime || ""}` : "غير محدد",
            actionUrl: `/final-report/new?requestId=${request.id}`,
          });
        }
      });

      // Sort by status (incomplete first) then by request ID descending (newest assigned first)
      const sortedReportsList = [...allReportsList].sort((a, b) => {
        // 1. Show incomplete/pending tasks first, completed tasks last
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }
        // 2. Sort by request ID descending (newest first)
        return b.id - a.id;
      });

      // Filter list
      const filteredList = sortedReportsList.filter((item) => {
        const matchesSearch =
          item.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
          item.mosqueName.toLowerCase().includes(search.toLowerCase()) ||
          (item.assignedTo?.name || "").toLowerCase().includes(search.toLowerCase());

        const matchesType = typeFilter === "all" || item.reportType === typeFilter;

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "late" && !item.isCompleted && item.isLate) ||
          (statusFilter === "pending" && !item.isCompleted && !item.isLate) ||
          (statusFilter === "completed" && item.isCompleted);

        return matchesSearch && matchesType && matchesStatus;
      });

      // Calculate statistics over filtered list
      const fieldVisitsCount = filteredList.filter(r => r.reportType === "field_visit" && !r.isCompleted).length;
      const quickResponsesCount = filteredList.filter(r => r.reportType === "quick_response" && !r.isCompleted).length;
      const quickRequestsCount = filteredList.filter(r => r.reportType === "quick_request").length;
      const finalReportsCount = filteredList.filter(r => r.reportType === "final_report" && !r.isCompleted).length;
      const pendingCount = filteredList.filter(r => !r.isCompleted).length;
      const totalCount = filteredList.length;
      const lateCount = filteredList.filter(r => !r.isCompleted && r.isLate).length;

      const totalFiltered = filteredList.length;
      const startIndex = (page - 1) * limit;
      const paginatedList = filteredList.slice(startIndex, startIndex + limit);

      return {
        reports: paginatedList,
        total: totalFiltered,
        stats: {
          totalCount,
          pendingCount,
          fieldVisitsCount,
          quickResponsesCount,
          quickRequestsCount,
          finalReportsCount,
          lateCount,
        }
      };
    }),

  // تقديم طلب استثناء
  submitException: protectedProcedure
    .input(
      z.object({
        reason: z.string(),
        attachment: z.string().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db.insert(requestExceptions).values({
        userId: ctx.user.id,
        reason: input.reason,
        attachment: input.attachment,
        status: "pending",
      });

      // إرسال إشعار للإمام نفسه
      try {
        await createNotification({
          userId: ctx.user.id,
          type: "system",
          title: "تم تقديم طلب الاستثناء",
          message: "تم استلام طلب الاستثناء الخاص بك وهو قيد المراجعة حالياً من قبل الإدارة.",
          relatedType: "user",
          relatedId: ctx.user.id,
        });
      } catch (err) {
        console.error("Error sending self notification to user:", err);
      }

      // إرسال إشعار للمشرفين
      try {
        const admins = await db
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.role, ["super_admin", "system_admin"]));

        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "system",
            title: "طلب استثناء جديد",
            message: `قام المستفيد ${ctx.user.name} بتقديم طلب استثناء لإنشاء طلب جديد.`,
            relatedType: "user",
            relatedId: ctx.user.id,
          });
        }
      } catch (err) {
        console.error("Error sending admin notifications for exception:", err);
      }

      return { success: true };
    }),

  // الحصول على أحدث حالة طلب استثناء للمستخدم الحالي
  getLatestException: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const result = await db
      .select()
      .from(requestExceptions)
      .where(eq(requestExceptions.userId, ctx.user.id))
      .orderBy(desc(requestExceptions.createdAt))
      .limit(1);

    return result[0] || null;
  }),

  // الحصول على كل طلبات الاستثناء (للمسؤولين)
  getExceptionRequests: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const results = await db
      .select({
        exception: requestExceptions,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
      })
      .from(requestExceptions)
      .innerJoin(users, eq(requestExceptions.userId, users.id))
      .orderBy(desc(requestExceptions.createdAt));

    return results;
  }),

  // مراجعة طلب الاستثناء (للمسؤولين)
  reviewException: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["approved", "rejected"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      await db
        .update(requestExceptions)
        .set({ status: input.status })
        .where(eq(requestExceptions.id, input.id));

      const [exRow] = await db.select().from(requestExceptions).where(eq(requestExceptions.id, input.id)).limit(1);
      if (exRow) {
        try {
          const [targetUser] = await db.select().from(users).where(eq(users.id, exRow.userId)).limit(1);

          const isApproved = input.status === "approved";
          const emailTitle = "إشعار جديد من جمعية عمارة المساجد (منارة)";
          const emailMessage = isApproved 
            ? `بوابة تمام - قبول طلب الاستثناء\n\nالسلام عليكم ورحمة الله وبركاته،\n\nنفيدكم بأنه قد تم قبول طلب الاستثناء الخاص بكم رقم ${exRow.id} لإنشاء طلب جديد. يمكنك الآن الدخول للبوابة وتقديم طلبك الجديد.\n\nجمعية عمارة المساجد\n\nهذا البريد تم إرساله تلقائياً من نظام التنبيهات لجمعية عمارة المساجد (منارة).`
            : `تم رفض طلب الاستثناء\n\nعذراً، تم رفض طلب الاستثناء الخاص بك.`;

          // 1. Send in-app notification on website
          await createNotification({
            userId: exRow.userId,
            type: "system",
            title: isApproved ? "تم قبول طلب الاستثناء" : "تم رفض طلب الاستثناء",
            message: isApproved
              ? "تم قبول طلب الاستثناء الخاص بك، يمكنك الآن تقديم طلب جديد."
              : "عذراً، تم رفض طلب الاستثناء الخاص بك.",
            relatedType: "user",
            relatedId: exRow.userId,
          });

          // 2. Email sending in background
          if (targetUser && targetUser.email) {
            sendEmailNotification(targetUser.email, emailTitle, emailMessage).catch((e) => {
              console.error("Failed to send email notification in background:", e);
            });
          }
        } catch (err) {
          console.error("Error sending user notification for exception review:", err);
        }
      }

      return { success: true };
    }),

  // تقديم تقييم رضا المستفيد (Beneficiary Satisfaction Survey)
  submitBeneficiaryEvaluation: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        rating: z.number().min(1).max(5).optional(),
        notes: z.string().optional(),
        beneficiaryName: z.string().optional(),
        beneficiaryPhone: z.string().optional(),
        serviceName: z.string().optional(),
        beneficiaryEmail: z.string().optional(),
        servicesRating: z.number().min(1).max(5).optional(),
        speedRating: z.number().min(1).max(5).optional(),
        communicationRating: z.number().min(1).max(5).optional(),
        overallSatisfaction: z.number().min(1).max(5).optional(),
        comments: z.string().optional(),
        answers: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [request] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      const isOwner = request.userId === ctx.user.id;
      const isRequesterRole = ctx.user.role === "service_requester";
      const isAdmin = ["super_admin", "system_admin"].includes(ctx.user.role);

      if (!isOwner && !isRequesterRole && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "عفواً، التقييم مخصص فقط للمستفيد (طالب الخدمة) صاحب الطلب.",
        });
      }

      if (!["handover", "closed"].includes(request.currentStage) && request.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "عفواً، يمكن تقييم الطلب عند مرحلة الاستلام أو تحويله إلى مغلق (closed).",
        });
      }

      const existing = await db
        .select()
        .from(requestEvaluations)
        .where(
          and(
            eq(requestEvaluations.requestId, input.requestId),
            eq(requestEvaluations.evaluationType, "beneficiary_satisfaction")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تم تقييم هذا الطلب سابقاً، شكراً لمشاركتك!",
        });
      }

      // حساب التقييم العام (من 1 إلى 5)
      let finalRating = input.overallSatisfaction || input.rating || input.servicesRating || 5;

      // إذا وُجدت إجابات ديناميكية، نحاول استخلاص التقييم منها
      if (input.answers) {
        if (typeof input.answers.overallSatisfaction === "number" && input.answers.overallSatisfaction > 0) {
          finalRating = input.answers.overallSatisfaction;
        } else {
          // البحث عن أول حقل تقييم برقم
          const numericRatings = Object.entries(input.answers)
            .filter(([k, v]) => (k.toLowerCase().includes("rating") || k.toLowerCase().includes("satisfaction")) && typeof v === "number" && v > 0)
            .map(([, v]) => v as number);
          if (numericRatings.length > 0) {
            const avg = Math.round(numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length);
            finalRating = Math.max(1, Math.min(5, avg));
          }
        }
      }

      const surveyPayload = {
        beneficiaryName: input.beneficiaryName || input.answers?.beneficiaryName || null,
        beneficiaryPhone: input.beneficiaryPhone || input.answers?.beneficiaryPhone || null,
        serviceName: input.serviceName || input.answers?.serviceName || null,
        beneficiaryEmail: input.beneficiaryEmail || input.answers?.beneficiaryEmail || null,
        servicesRating: input.servicesRating || input.answers?.servicesRating || null,
        speedRating: input.speedRating || input.answers?.speedRating || null,
        communicationRating: input.communicationRating || input.answers?.communicationRating || null,
        overallSatisfaction: input.overallSatisfaction || input.answers?.overallSatisfaction || null,
        comments: input.comments || input.notes || input.answers?.comments || null,
        answers: input.answers || null,
      };

      await db.insert(requestEvaluations).values({
        requestId: input.requestId,
        userId: ctx.user.id,
        rating: finalRating,
        evaluationType: "beneficiary_satisfaction",
        notes: JSON.stringify(surveyPayload),
        createdAt: new Date(),
      });

      await db
        .update(mosqueRequests)
        .set({
          isEvaluated: true,
          satisfactionRating: finalRating,
          evaluatedAt: new Date(),
        })
        .where(eq(mosqueRequests.id, input.requestId));

      return {
        success: true,
        message: "شكراً لك! تم استلام تقييمك بنجاح ونقدر مشاركتك.",
      };
    }),

  // جلب تفاصيل تقييم المستفيد للطلب
  getBeneficiaryEvaluation: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [request] = await db
        .select({
          id: mosqueRequests.id,
          requestNumber: mosqueRequests.requestNumber,
          descriptiveName: mosqueRequests.descriptiveName,
          programType: mosqueRequests.programType,
          currentStage: mosqueRequests.currentStage,
          status: mosqueRequests.status,
          userId: mosqueRequests.userId,
          isEvaluated: mosqueRequests.isEvaluated,
          satisfactionRating: mosqueRequests.satisfactionRating,
          evaluatedAt: mosqueRequests.evaluatedAt,
          mosqueId: mosqueRequests.mosqueId,
          completedAt: mosqueRequests.completedAt,
        })
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      const isOwner = request.userId === ctx.user.id;
      const isRequesterRole = ctx.user.role === "service_requester";
      const isStaff = ctx.user.role !== "service_requester";

      if (!isOwner && !isRequesterRole && !isStaff) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "عفواً، ليس لديك صلاحية لعرض هذا التقييم.",
        });
      }

      let existingEvaluation = null;
      if (request.isEvaluated) {
        const [evalRow] = await db
          .select()
          .from(requestEvaluations)
          .where(
            and(
              eq(requestEvaluations.requestId, input.requestId),
              eq(requestEvaluations.evaluationType, "beneficiary_satisfaction")
            )
          )
          .limit(1);
        existingEvaluation = evalRow || null;
      }

      let mosqueName = null;
      if (request.mosqueId) {
        const [m] = await db
          .select({ name: mosques.name })
          .from(mosques)
          .where(eq(mosques.id, request.mosqueId))
          .limit(1);
        if (m) mosqueName = m.name;
      }

      return {
        request: {
          ...request,
          mosqueName,
        },
        existingEvaluation,
        isOwner,
      };
    }),

  // إرسال استبيان تقييم رضا المستفيد العام والمباشر (متاح للجميع عبر الرابط المباشر)
  submitPublicBeneficiaryEvaluation: publicProcedure
    .input(
      z.object({
        requestId: z.number().optional().nullable(),
        beneficiaryName: z.string().optional(),
        beneficiaryPhone: z.string().optional(),
        serviceName: z.string().optional(),
        beneficiaryEmail: z.string().optional(),
        servicesRating: z.number().optional(),
        speedRating: z.number().optional(),
        communicationRating: z.number().optional(),
        overallSatisfaction: z.number().optional(),
        rating: z.number().optional(),
        comments: z.string().optional(),
        notes: z.string().optional(),
        answers: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "تعذر الاتصال بقاعدة البيانات",
        });
      }

      if (input.requestId) {
        const [request] = await db
          .select()
          .from(mosqueRequests)
          .where(eq(mosqueRequests.id, input.requestId))
          .limit(1);

        if (request && request.isEvaluated) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "تم تسجيل تقييم لهذا الطلب سابقاً، شكراً لمشاركتك!",
          });
        }
      }

      // حساب التقييم العام (من 1 إلى 5)
      let finalRating = input.overallSatisfaction || input.rating || input.servicesRating || 5;

      if (input.answers) {
        if (typeof input.answers.overallSatisfaction === "number" && input.answers.overallSatisfaction > 0) {
          finalRating = input.answers.overallSatisfaction;
        } else {
          const numericRatings = Object.entries(input.answers)
            .filter(([k, v]) => (k.toLowerCase().includes("rating") || k.toLowerCase().includes("satisfaction")) && typeof v === "number" && v > 0)
            .map(([, v]) => v as number);
          if (numericRatings.length > 0) {
            const avg = Math.round(numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length);
            finalRating = Math.max(1, Math.min(5, avg));
          }
        }
      }

      const surveyPayload = {
        beneficiaryName: input.beneficiaryName || input.answers?.beneficiaryName || null,
        beneficiaryPhone: input.beneficiaryPhone || input.answers?.beneficiaryPhone || null,
        serviceName: input.serviceName || input.answers?.serviceName || null,
        beneficiaryEmail: input.beneficiaryEmail || input.answers?.beneficiaryEmail || null,
        servicesRating: input.servicesRating || input.answers?.servicesRating || null,
        speedRating: input.speedRating || input.answers?.speedRating || null,
        communicationRating: input.communicationRating || input.answers?.communicationRating || null,
        overallSatisfaction: input.overallSatisfaction || input.answers?.overallSatisfaction || null,
        comments: input.comments || input.notes || input.answers?.comments || null,
        answers: input.answers || null,
        submittedVia: "public_link",
      };

      await db.insert(requestEvaluations).values({
        requestId: input.requestId || null,
        userId: (ctx.user as any)?.id || null,
        rating: finalRating,
        evaluationType: "beneficiary_satisfaction",
        notes: JSON.stringify(surveyPayload),
        createdAt: new Date(),
      });

      if (input.requestId) {
        await db
          .update(mosqueRequests)
          .set({
            isEvaluated: true,
            satisfactionRating: finalRating,
            evaluatedAt: new Date(),
          })
          .where(eq(mosqueRequests.id, input.requestId));
      }

      return {
        success: true,
        message: "شكراً لك! تم استلام تقييمك بنجاح ونقدر مشاركتك القيمة.",
      };
    }),

  // جلب كافة تقييمات رضا المستفيدين للموظفين والإدارة
  getAllBeneficiaryEvaluations: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        ratingFilter: z.number().optional(),
        programType: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const isStaff = ctx.user.role !== "service_requester";
      if (!isStaff) {
        throw new TRPCError({ code: "FORBIDDEN", message: "هذا القسم متاح للموظفين والإدارة فقط." });
      }

      // جلب جميع التقييمات المسجلة من جدول requestEvaluations وجدول mosqueRequests
      const allEvaluations = await db
        .select({
          evalId: requestEvaluations.id,
          requestId: mosqueRequests.id,
          requestNumber: mosqueRequests.requestNumber,
          programType: mosqueRequests.programType,
          descriptiveName: mosqueRequests.descriptiveName,
          status: mosqueRequests.status,
          currentStage: mosqueRequests.currentStage,
          rating: requestEvaluations.rating,
          notes: requestEvaluations.notes,
          evaluatedAt: requestEvaluations.createdAt,
          requesterName: users.name,
          requesterPhone: users.phone,
          requesterEmail: users.email,
          mosqueId: mosqueRequests.mosqueId,
        })
        .from(requestEvaluations)
        .leftJoin(mosqueRequests, eq(requestEvaluations.requestId, mosqueRequests.id))
        .leftJoin(users, eq(requestEvaluations.userId, users.id))
        .where(
          and(
            eq(requestEvaluations.evaluationType, "beneficiary_satisfaction"),
            or(
              isNotNull(requestEvaluations.rating),
              isNotNull(requestEvaluations.notes),
              eq(mosqueRequests.isEvaluated, true)
            )
          )
        )
        .orderBy(desc(requestEvaluations.createdAt));

      // جلب أسماء المساجد للتقييمات
      const mosqueIds = Array.from(new Set(allEvaluations.map((e) => e.mosqueId).filter(Boolean))) as number[];
      const mosqueMap = new Map<number, string>();
      if (mosqueIds.length > 0) {
        const mosqueList = await db
          .select({ id: mosques.id, name: mosques.name })
          .from(mosques)
          .where(inArray(mosques.id, mosqueIds));
        mosqueList.forEach((m) => mosqueMap.set(m.id, m.name));
      }

      // تحضير العناصر مع تحليل الـ notes وحساب متوسط كافة حقول التقييم
      const items = allEvaluations.map((e) => {
        let parsedNotes: any = {};
        try {
          if (e.notes) parsedNotes = JSON.parse(e.notes);
        } catch {
          parsedNotes = { comments: e.notes };
        }

        const answers = parsedNotes.answers || parsedNotes || {};

        // استخراج كافة التقييمات الرقمية بالنجوم لحساب المتوسط الحقيقي
        const starRatings: number[] = [];

        // 1. فحص المحاور الأساسية
        if (typeof answers.servicesRating === "number" && answers.servicesRating > 0) starRatings.push(answers.servicesRating);
        else if (typeof parsedNotes.servicesRating === "number" && parsedNotes.servicesRating > 0) starRatings.push(parsedNotes.servicesRating);

        if (typeof answers.speedRating === "number" && answers.speedRating > 0) starRatings.push(answers.speedRating);
        else if (typeof parsedNotes.speedRating === "number" && parsedNotes.speedRating > 0) starRatings.push(parsedNotes.speedRating);

        if (typeof answers.communicationRating === "number" && answers.communicationRating > 0) starRatings.push(answers.communicationRating);
        else if (typeof parsedNotes.communicationRating === "number" && parsedNotes.communicationRating > 0) starRatings.push(parsedNotes.communicationRating);

        if (typeof answers.overallSatisfaction === "number" && answers.overallSatisfaction > 0) starRatings.push(answers.overallSatisfaction);
        else if (typeof parsedNotes.overallSatisfaction === "number" && parsedNotes.overallSatisfaction > 0) starRatings.push(parsedNotes.overallSatisfaction);

        // 2. فحص أي حقول تقييم إضافية في answers
        const standardKeys = ["servicesRating", "speedRating", "communicationRating", "overallSatisfaction", "beneficiaryName", "beneficiaryPhone", "beneficiaryEmail", "serviceName", "comments", "notes", "answers"];
        Object.entries(answers).forEach(([k, v]) => {
          if (!standardKeys.includes(k) && typeof v === "number" && v >= 1 && v <= 5) {
            starRatings.push(v);
          }
        });

        // 3. في حال لم يوجد أي حقل، نستخدم e.rating إن وجد
        if (starRatings.length === 0 && typeof e.rating === "number" && e.rating > 0) {
          starRatings.push(e.rating);
        }

        const computedAverage = starRatings.length > 0
          ? Math.round((starRatings.reduce((acc, curr) => acc + curr, 0) / starRatings.length) * 10) / 10
          : (e.rating || 5);

        const rawService = parsedNotes.serviceName || (e.mosqueId ? mosqueMap.get(e.mosqueId) : null) || e.descriptiveName || "طلب خدمة";
        const programLabels: Record<string, string> = {
          bunyan: "بنيان",
          daaem: "دعائم",
          enaya: "عناية",
          emdad: "إمداد",
          ethraa: "إثراء",
          sedana: "سدانة",
          taqa: "طاقة",
          miyah: "مياه",
          suqya: "سقيا",
          kasswa: "كسوة",
          tathir: "تطهير",
          sakina: "سكينة",
          fursh: "فرش",
        };
        const resolvedServiceName = programLabels[String(rawService).toLowerCase().trim()] || rawService;

        if (answers.serviceName) {
          answers.serviceName = programLabels[String(answers.serviceName).toLowerCase().trim()] || answers.serviceName;
        }

        return {
          id: e.evalId,
          requestId: e.requestId,
          requestNumber: e.requestNumber,
          programType: e.programType,
          descriptiveName: e.descriptiveName,
          status: e.status,
          currentStage: e.currentStage,
          rating: computedAverage,
          evaluatedAt: e.evaluatedAt,
          requesterName: parsedNotes.beneficiaryName || e.requesterName || "مستفيد",
          requesterPhone: parsedNotes.beneficiaryPhone || e.requesterPhone || null,
          requesterEmail: parsedNotes.beneficiaryEmail || e.requesterEmail || null,
          serviceName: resolvedServiceName,
          mosqueName: e.mosqueId ? mosqueMap.get(e.mosqueId) || null : null,
          servicesRating: parsedNotes.servicesRating || answers.servicesRating || null,
          speedRating: parsedNotes.speedRating || answers.speedRating || null,
          communicationRating: parsedNotes.communicationRating || answers.communicationRating || null,
          overallSatisfaction: parsedNotes.overallSatisfaction || answers.overallSatisfaction || null,
          comments: parsedNotes.comments || parsedNotes.notes || answers.comments || null,
          answers: answers,
          rawNotes: e.notes,
        };
      });

      // إحصائيات عامة
      const totalEvaluations = items.length;
      const avgRating = totalEvaluations > 0
        ? Math.round((items.reduce((acc, curr) => acc + (curr.rating || 5), 0) / totalEvaluations) * 10) / 10
        : 0;

      const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      items.forEach((item) => {
        const r = Math.max(1, Math.min(5, Math.round(item.rating || 5)));
        ratingCounts[r] = (ratingCounts[r] || 0) + 1;
      });

      const positiveCount = (ratingCounts[4] || 0) + (ratingCounts[5] || 0);
      const positivePercent = totalEvaluations > 0 ? Math.round((positiveCount / totalEvaluations) * 100) : 100;
      const withCommentsCount = items.filter((i) => !!i.comments).length;

      // تطبيق الفلترة والبحث في الباك إند
      let filteredItems = items;

      if (input?.search && input.search.trim().length > 0) {
        const q = input.search.toLowerCase().trim();
        filteredItems = filteredItems.filter((item) => {
          const matchReq = item.requestNumber?.toLowerCase().includes(q);
          const matchName = item.requesterName?.toLowerCase().includes(q);
          const matchPhone = item.requesterPhone?.toLowerCase().includes(q);
          const matchEmail = item.requesterEmail?.toLowerCase().includes(q);
          const matchService = item.serviceName?.toLowerCase().includes(q);
          const matchMosque = item.mosqueName?.toLowerCase().includes(q);
          const matchComments = item.comments?.toLowerCase().includes(q);
          return !!(matchReq || matchName || matchPhone || matchEmail || matchService || matchMosque || matchComments);
        });
      }

      if (input?.ratingFilter !== undefined && input.ratingFilter !== null && input.ratingFilter > 0) {
        filteredItems = filteredItems.filter((item) => Math.round(item.rating) === input.ratingFilter);
      }

      if (input?.programType && input.programType !== "all") {
        const prog = input.programType.toLowerCase().trim();
        filteredItems = filteredItems.filter((item) => item.programType?.toLowerCase().trim() === prog);
      }

      return {
        items: filteredItems,
        stats: {
          totalEvaluations,
          avgRating,
          positivePercent,
          withCommentsCount,
          ratingCounts,
        },
      };
    }),

  // جلب سجلات إرسال استبيانات رضا المستفيدين (الطلبات المغلقة والمكتملة المرسل لها استبيان)
  getBeneficiarySurveyLogs: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        statusFilter: z.enum(["all", "pending", "evaluated"]).optional(),
        programType: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(15),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const isStaff = ctx.user.role !== "service_requester";
      if (!isStaff) {
        throw new TRPCError({ code: "FORBIDDEN", message: "هذا القسم متاح للموظفين والإدارة فقط." });
      }

      const page = input?.page || 1;
      const limit = input?.limit || 15;
      const offset = (page - 1) * limit;

      // الطلبات التي تم إغلاقها أو اكتمالها وترسل لها استبيانات حصراً لطالبي الخدمة (service_requester)
      const baseConditions = [
        or(
          eq(mosqueRequests.currentStage, "closed"),
          eq(mosqueRequests.status, "completed")
        ),
        eq(users.role, "service_requester"),
      ];

      // جلب جميع الطلبات المؤهلة لطالبي الخدمة
      const allRows = await db
        .select({
          requestId: mosqueRequests.id,
          requestNumber: mosqueRequests.requestNumber,
          programType: mosqueRequests.programType,
          descriptiveName: mosqueRequests.descriptiveName,
          stage: mosqueRequests.currentStage,
          status: mosqueRequests.status,
          isEvaluated: mosqueRequests.isEvaluated,
          satisfactionRating: mosqueRequests.satisfactionRating,
          evaluatedAt: mosqueRequests.evaluatedAt,
          closedAt: mosqueRequests.updatedAt,
          userId: mosqueRequests.userId,
          requesterName: users.name,
          requesterEmail: users.email,
          requesterPhone: users.phone,
          requesterRole: users.role,
          mosqueId: mosqueRequests.mosqueId,
          mosqueName: mosques.name,
          mosqueCity: mosques.city,
          evalId: sql<number | null>`(
            SELECT id FROM request_evaluations 
            WHERE request_evaluations.requestId = mosque_requests.id 
              AND request_evaluations.evaluationType = 'beneficiary_satisfaction' 
            ORDER BY id DESC LIMIT 1
          )`,
          evalRating: sql<number | null>`(
            SELECT rating FROM request_evaluations 
            WHERE request_evaluations.requestId = mosque_requests.id 
              AND request_evaluations.evaluationType = 'beneficiary_satisfaction' 
            ORDER BY id DESC LIMIT 1
          )`,
          evalNotes: sql<string | null>`(
            SELECT notes FROM request_evaluations 
            WHERE request_evaluations.requestId = mosque_requests.id 
              AND request_evaluations.evaluationType = 'beneficiary_satisfaction' 
            ORDER BY id DESC LIMIT 1
          )`,
          actualClosedDate: sql<Date | null>`(
            SELECT createdAt FROM request_history 
            WHERE request_history.requestId = mosque_requests.id 
              AND request_history.toStage = 'closed' 
            ORDER BY id DESC LIMIT 1
          )`,
        })
        .from(mosqueRequests)
        .innerJoin(users, eq(mosqueRequests.userId, users.id))
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(and(...baseConditions))
        .orderBy(desc(mosqueRequests.updatedAt));

      const appBaseUrl = getSurveyBaseUrl(ctx.req);

      // معالجة السجلات وتشكيل البيانات
      let mapped = allRows.map((row) => {
        const isCompletedEval = Boolean(row.isEvaluated || (row.evalRating !== null && row.evalRating !== undefined));
        const effectiveRating = row.satisfactionRating || row.evalRating || null;
        const dispatchedAt = row.actualClosedDate || row.closedAt;
        const evaluationUrl = `${appBaseUrl}/requests/${row.requestId}/evaluation`;

        return {
          id: `req-${row.requestId}`,
          requestId: row.requestId,
          requestNumber: row.requestNumber,
          programType: row.programType,
          descriptiveName: row.descriptiveName,
          stage: row.stage,
          status: row.status,
          mosqueName: row.mosqueName,
          mosqueCity: row.mosqueCity,
          beneficiary: {
            id: row.userId,
            name: row.requesterName || "غير محدد",
            email: row.requesterEmail || null,
            phone: row.requesterPhone || null,
            role: row.requesterRole,
            categoryLabel: "طالب خدمة (طلب مكتمل)",
          },
          survey: {
            isDispatched: true,
            dispatchedAt,
            dispatchType: "request_closed" as const,
            dispatchTypeLabel: "إرسال تلقائي عند انتهاء الطلب",
            isEvaluated: isCompletedEval,
            evaluatedAt: row.evaluatedAt || (isCompletedEval ? dispatchedAt : null),
            rating: effectiveRating,
            evaluationUrl,
          },
        };
      });

      // جلب سجلات إرسال الاستبيانات والتذكيرات الإضافية من جدول التدقيق (audit_logs)
      let parsedAuditRows: typeof mapped = [];
      try {
        const auditLogRows = await db
          .select()
          .from(auditLogs)
          .where(
            inArray(auditLogs.action, [
              "survey_reminder_sent",
              "survey_invite_sent",
            ])
          )
          .orderBy(desc(auditLogs.createdAt));

        parsedAuditRows = auditLogRows.map((row) => {
          let details: any = row.newValues;
          while (typeof details === "string") {
            try {
              details = JSON.parse(details);
            } catch {
              break;
            }
          }
          if (!details || typeof details !== "object") details = {};

          const isReminder = row.action === "survey_reminder_sent";
          const reqId = details.requestId || (isReminder ? row.entityId : null);
          const reqNumber = details.requestNumber || (reqId ? `REQ-${reqId}` : null);
          const evalUrl = details.evalUrl || (reqId ? `${appBaseUrl}/requests/${reqId}/evaluation` : null);

          // التحقق مما إذا كان الطلب المرتبط قد تم تقييمه
          const matchedRequest = reqId ? allRows.find((r) => r.requestId === reqId) : null;
          const isCompletedEval = matchedRequest ? Boolean(matchedRequest.isEvaluated || matchedRequest.evalRating) : false;
          const effectiveRating = matchedRequest ? (matchedRequest.satisfactionRating || matchedRequest.evalRating || null) : null;

          return {
            id: `audit-${row.id}`,
            requestId: reqId,
            requestNumber: reqNumber,
            programType: details.programType || (matchedRequest ? matchedRequest.programType : "general_satisfaction"),
            descriptiveName: isReminder ? `رسالة تذكيرية للاستبيان` : "استبيان رضا مباشر (بدون طلب مرتبط)",
            stage: matchedRequest ? matchedRequest.stage : null,
            status: matchedRequest ? matchedRequest.status : null,
            mosqueName: details.mosqueName || (matchedRequest ? matchedRequest.mosqueName : null),
            mosqueCity: matchedRequest ? matchedRequest.mosqueCity : null,
            beneficiary: {
              id: isReminder ? (matchedRequest ? matchedRequest.userId : null) : (row.entityId || null),
              name: details.recipientName || (matchedRequest ? matchedRequest.requesterName : "غير محدد"),
              email: details.recipientEmail || (matchedRequest ? matchedRequest.requesterEmail : null),
              phone: details.recipientPhone || (matchedRequest ? matchedRequest.requesterPhone : null),
              role: details.recipientRole || "service_requester",
              categoryLabel: isReminder 
                ? "طالب خدمة (رسالة تذكيرية)" 
                : (details.categoryLabel || "طالب خدمة / جهة مسجلة"),
            },
            survey: {
              isDispatched: true,
              dispatchedAt: row.createdAt,
              dispatchType: isReminder ? ("reminder" as const) : ("general_invite" as const),
              dispatchTypeLabel: isReminder ? "رسالة تذكيرية للاستبيان" : "استبيان مباشر لطالب خدمة (بدون طلب)",
              isEvaluated: isCompletedEval,
              evaluatedAt: isCompletedEval ? (matchedRequest?.evaluatedAt || row.createdAt) : null,
              rating: effectiveRating,
              evaluationUrl: evalUrl,
            },
          };
        });
      } catch (err) {
        console.error("Error reading survey audit logs:", err);
      }

      // دمج جميع سجلات الإرسال وفرزها زمنياً من الأحدث إلى الأقدم
      let combined = [...mapped, ...parsedAuditRows];
      combined.sort((a, b) => {
        const timeA = a.survey.dispatchedAt ? new Date(a.survey.dispatchedAt).getTime() : 0;
        const timeB = b.survey.dispatchedAt ? new Date(b.survey.dispatchedAt).getTime() : 0;
        return timeB - timeA;
      });

      // إحصائيات السجلات الإجمالية قبل الفلترة
      const totalDispatched = combined.length;
      const totalEvaluated = combined.filter((m) => m.survey.isEvaluated).length;
      const totalPending = totalDispatched - totalEvaluated;
      const responseRate = totalDispatched > 0 ? Math.round((totalEvaluated / totalDispatched) * 100) : 0;

      // تطبيق الفلاتر
      let filtered = combined;
      if (input?.search && input.search.trim()) {
        const q = input.search.trim().toLowerCase();
        filtered = filtered.filter((item) => {
          return (
            item.requestNumber?.toLowerCase().includes(q) ||
            item.beneficiary.name?.toLowerCase().includes(q) ||
            item.beneficiary.email?.toLowerCase().includes(q) ||
            item.beneficiary.phone?.toLowerCase().includes(q) ||
            item.beneficiary.categoryLabel?.toLowerCase().includes(q) ||
            item.survey.dispatchTypeLabel?.toLowerCase().includes(q) ||
            item.mosqueName?.toLowerCase().includes(q) ||
            item.mosqueCity?.toLowerCase().includes(q) ||
            item.descriptiveName?.toLowerCase().includes(q)
          );
        });
      }

      if (input?.statusFilter && input.statusFilter !== "all") {
        if (input.statusFilter === "evaluated") {
          filtered = filtered.filter((item) => item.survey.isEvaluated);
        } else if (input.statusFilter === "pending") {
          filtered = filtered.filter((item) => !item.survey.isEvaluated);
        }
      }

      if (input?.programType && input.programType !== "all") {
        const prog = input.programType.toLowerCase().trim();
        filtered = filtered.filter((item) => item.programType?.toLowerCase().trim() === prog);
      }

      const totalFiltered = filtered.length;
      const paginatedItems = filtered.slice(offset, offset + limit);

      return {
        items: paginatedItems,
        total: totalFiltered,
        page,
        limit,
        totalPages: Math.ceil(totalFiltered / limit) || 1,
        stats: {
          totalDispatched,
          totalEvaluated,
          totalPending,
          responseRate,
        },
      };
    }),

  // إرسال بريد تذكيري للمستفيد لتقييم الطلب
  sendBeneficiarySurveyReminder: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [request] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      if (!request.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يوجد مستخدم مرتبط بهذا الطلب" });
      }

      const [beneficiary] = await db
        .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role })
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);

      if (!beneficiary) {
        throw new TRPCError({ code: "NOT_FOUND", message: "بيانات المستفيد غير موجودة" });
      }

      if (beneficiary.role !== "service_requester") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "لا يمكن إرسال استبيان رضا المستفيد لهذا الطلب لأنه لم يتم إنشاؤه بواسطة طالب خدمة (service_requester)." 
        });
      }

      if (!beneficiary.email) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: `المستفيد (${beneficiary.name || 'العميل'}) ليس لديه بريد إلكتروني مسجل بالنظام لإرسال التذكير.` 
        });
      }

      const appBaseUrl = getSurveyBaseUrl(ctx.req);
      const evalUrl = `${appBaseUrl}/requests/${request.id}/evaluation`;
      const emailTitle = `تذكير: تقييم رضا المستفيد - الطلب رقم ${request.requestNumber}`;

      // استرجاع القالب المخصص من قسم الطلبات والمساجد في حال وجوده
      const [customReminderTemplate] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.triggerId, "beneficiary_survey_reminder"))
        .limit(1);

      let emailMessage = "";
      if (customReminderTemplate?.templateMessage) {
        emailMessage = customReminderTemplate.templateMessage
          .replace(/\{اسم_المستفيد\}/g, beneficiary.name || "العميل")
          .replace(/\{رقم_الطلب\}/g, request.requestNumber)
          .replace(/\{اسم_المسجد\}/g, request.mosqueName || "المسجد");
      } else {
        emailMessage = `السلام عليكم ورحمة الله وبركاته ${beneficiary.name ? `الأستاذ/ة ${beneficiary.name}` : ''}،\n\nنود تذكيركم بلطف بأنه تم إغلاق طلبكم رقم ${request.requestNumber} بنجاح لدى جمعية عمارة المساجد (منارة).\n\nرأيكم واقتراحاتكم محل اهتمامنا البالغ وتسهم مباشرة في تطوير جودة خدماتنا، نأمل منكم التكرم بتخصيص دقيقة واحدة لتقييم الخدمة المقدمة من خلال الضغط على الزر أدناه:\n\nشاكرين ومقدرين حسن تعاونكم الدائم.`;
      }

      // إرسال الإيميل دون تعطيل استجابة الخادم
      sendEmailNotification(
        beneficiary.email,
        emailTitle,
        emailMessage,
        evalUrl,
        "⭐️ تقييم الخدمة الآن ⭐️"
      ).catch((err) => {
        console.error("Error sending survey reminder email asynchronously:", err);
      });

      // إرسال إشعار داخل النظام للمستفيد
      await createNotification({
        userId: beneficiary.id,
        title: `تذكير: تقييم رضا المستفيد (طلب ${request.requestNumber})`,
        message: `نود تذكيركم بمشاركتنا تقييم مستوى الخدمة لطلبكم المكتمل رقم ${request.requestNumber}.`,
        type: "request",
        relatedType: "request_evaluation",
        relatedId: request.id,
      });

      // تسجيل إرسال الرسالة التذكيرية في سجل التدقيق (audit_logs)
      try {
        await db.insert(auditLogs).values({
          userId: ctx.user.id,
          action: "survey_reminder_sent",
          entityType: "request",
          entityId: request.id,
          newValues: JSON.stringify({
            dispatchType: "reminder",
            dispatchTypeLabel: "رسالة تذكيرية للاستبيان",
            requestId: request.id,
            requestNumber: request.requestNumber,
            programType: request.programType,
            mosqueName: null,
            recipientName: beneficiary.name || "",
            recipientEmail: beneficiary.email || "",
            recipientPhone: beneficiary.phone || null,
            recipientRole: beneficiary.role,
            dispatchedAt: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error("Failed to log survey reminder to audit_logs:", err);
      }

      return {
        success: true,
        message: `تم إرسال بريد التذكير بنجاح إلى ${beneficiary.email}`,
        email: beneficiary.email,
        evalUrl,
      };
    }),

  /**
   * جلب المستفيدين المعتمدين، المتبرعين، وأصحاب الاستفسارات لإرسال استبيانات رضا لهم
   */
  getApprovedBeneficiariesAndContacts: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        category: z.enum(["all", "approved_beneficiary", "donor", "inquiry"]).default("all"),
        page: z.number().default(1),
        limit: z.number().default(20),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متوفرة" });

      const isStaff = ctx.user.role !== "service_requester";
      if (!isStaff) {
        throw new TRPCError({ code: "FORBIDDEN", message: "هذه الصلاحية متاحة للمسؤولين فقط." });
      }

      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const offset = (page - 1) * limit;
      const search = input?.search?.trim().toLowerCase() || "";
      const selectedCat = input?.category || "all";

      const getRequesterTypeLabel = (type: string | null | undefined): string => {
        if (!type) return "طالب خدمة";
        const types: Record<string, string> = {
          imam: "إمام",
          muezzin: "مؤذن",
          donor: "متبرع",
          other: "أخرى",
        };
        return types[type] || type;
      };

      // 1. المستفيدين المعتمدين من صفحة اعتمادات طالبي الخدمة (users role = service_requester and status = active)
      const approvedUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          requesterType: users.requesterType,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(eq(users.role, "service_requester"), eq(users.status, "active")));

      // جلب عدد الطلبات لكل مستفيد
      const userRequestsCount = await db
        .select({
          userId: mosqueRequests.userId,
          count: sql<number>`count(*)`,
        })
        .from(mosqueRequests)
        .where(isNotNull(mosqueRequests.userId))
        .groupBy(mosqueRequests.userId);

      const requestCountMap = new Map<number, number>();
      for (const r of userRequestsCount) {
        if (r.userId) requestCountMap.set(r.userId, Number(r.count));
      }

      // 2. طلبات التبرعات الواردة من صفحة اعتمادات طالبي الخدمة (الأراضي والعينية والمبادرات)
      const donorSubmissions = await db
        .select({
          id: publicSubmissions.id,
          name: publicSubmissions.name,
          email: publicSubmissions.email,
          phone: publicSubmissions.phone,
          submissionType: publicSubmissions.submissionType,
          details: publicSubmissions.details,
          createdAt: publicSubmissions.createdAt,
        })
        .from(publicSubmissions)
        .where(and(
          eq(publicSubmissions.category, "donor"),
          ne(publicSubmissions.submissionType, "donor_financial")
        ));

      // 3. أصحاب الاستفسارات من صفحة اعتمادات طالبي الخدمة
      const inquirers = await db
        .select({
          id: publicSubmissions.id,
          name: publicSubmissions.name,
          email: publicSubmissions.email,
          phone: publicSubmissions.phone,
          details: publicSubmissions.details,
          createdAt: publicSubmissions.createdAt,
        })
        .from(publicSubmissions)
        .where(eq(publicSubmissions.submissionType, "general_inquiry"));

      // 4. تقييمات تم إرسالها أو تسجيلها مسبقاً
      const existingEvals = await db
        .select({
          userId: requestEvaluations.userId,
          rating: requestEvaluations.rating,
          createdAt: requestEvaluations.createdAt,
        })
        .from(requestEvaluations)
        .where(isNotNull(requestEvaluations.userId));

      const evalByUserId = new Map<number, { rating: number | null; date: Date }>();

      for (const ev of existingEvals) {
        if (ev.userId) evalByUserId.set(ev.userId, { rating: ev.rating, date: ev.createdAt });
      }

      // تجميع القائمة الموحدة الخاصة بصفحة اعتمادات طالبي الخدمة
      const allItems: Array<{
        id: string;
        sourceId: number;
        category: "approved_beneficiary" | "donor" | "inquiry";
        categoryLabel: string;
        requesterType: string | null;
        requesterTypeLabel: string;
        name: string;
        email: string | null;
        phone: string | null;
        subText: string;
        date: Date;
        userId: number | null;
        isEvaluated: boolean;
        rating: number | null;
      }> = [];

      // أ) إضافة المستفيدين المعتمدين
      for (const u of approvedUsers) {
        const reqCount = requestCountMap.get(u.id) || 0;
        const ev = evalByUserId.get(u.id);
        const reqTypeLabel = getRequesterTypeLabel(u.requesterType);
        const isDonorType = u.requesterType === "donor" || u.requesterType === "متبرع";

        allItems.push({
          id: `ben-${u.id}`,
          sourceId: u.id,
          category: isDonorType ? "donor" : "approved_beneficiary",
          categoryLabel: isDonorType ? "متبرع معتمد" : "مستفيد معتمد",
          requesterType: u.requesterType || null,
          requesterTypeLabel: reqTypeLabel,
          name: u.name || "مستفيد مسجل",
          email: u.email || null,
          phone: u.phone || null,
          subText: reqCount > 0 ? `${reqCount} طلب مسجل بالمنصة` : "حساب نشط ومعتمد",
          date: u.createdAt,
          userId: u.id,
          isEvaluated: Boolean(ev),
          rating: ev?.rating || null,
        });
      }

      // ب) إضافة طلبات التبرعات الواردة من صفحة اعتمادات طالبي الخدمة
      for (const d of donorSubmissions) {
        let typeLabel = "متبرع";
        if (d.submissionType === "donor_land") typeLabel = "تبرع بأرض مسجد";
        else if (d.submissionType === "donor_inkind") typeLabel = "تبرع عيني ومواد";
        else if (d.submissionType === "donor_other") typeLabel = "مبادرة تبرع";

        allItems.push({
          id: `sub-don-${d.id}`,
          sourceId: d.id,
          category: "donor",
          categoryLabel: "متبرع",
          requesterType: d.submissionType || "donor",
          requesterTypeLabel: typeLabel,
          name: d.name,
          email: d.email || null,
          phone: d.phone || null,
          subText: d.details ? d.details.slice(0, 50) : typeLabel,
          date: d.createdAt,
          userId: null,
          isEvaluated: false,
          rating: null,
        });
      }

      // ج) إضافة أصحاب الاستفسارات من صفحة اعتمادات طالبي الخدمة
      for (const inq of inquirers) {
        allItems.push({
          id: `inq-${inq.id}`,
          sourceId: inq.id,
          category: "inquiry",
          categoryLabel: "صاحب استفسار",
          requesterType: "inquiry",
          requesterTypeLabel: "استفسار عام",
          name: inq.name,
          email: inq.email || null,
          phone: inq.phone || null,
          subText: inq.details ? inq.details.slice(0, 50) : "استفسار عام وتواصل",
          date: inq.createdAt,
          userId: null,
          isEvaluated: false,
          rating: null,
        });
      }

      // حساب الإحصائيات الدقيقة
      const stats = {
        totalApprovedBeneficiaries: approvedUsers.length,
        totalDonors: allItems.filter(i => i.category === "donor").length,
        totalInquirers: inquirers.length,
        totalAll: allItems.length,
      };

      // تطبيق الفلترة
      let filtered = allItems;
      if (selectedCat !== "all") {
        if (selectedCat === "approved_beneficiary") {
          filtered = filtered.filter(i => i.category === "approved_beneficiary" || i.userId !== null);
        } else {
          filtered = filtered.filter(i => i.category === selectedCat);
        }
      }
      if (search) {
        filtered = filtered.filter(i => 
          i.name.toLowerCase().includes(search) ||
          (i.email && i.email.toLowerCase().includes(search)) ||
          (i.phone && i.phone.includes(search)) ||
          i.subText.toLowerCase().includes(search)
        );
      }

      // الترتيب: الأحدث أولاً
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const items = filtered.slice(offset, offset + limit);

      return {
        items,
        total,
        page,
        limit,
        totalPages,
        stats,
      };
    }),

  /**
   * إرسال استبيان رضا عام للمستفيدين المعتمدين، المتبرعين، أو أصحاب الاستفسارات
   */
  sendGeneralSatisfactionSurvey: protectedProcedure
    .input(
      z.object({
        recipientEmail: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
        recipientName: z.string().min(1, "اسم المستلم مطلوب"),
        recipientPhone: z.string().optional(),
        category: z.enum(["approved_beneficiary", "donor", "inquiry", "custom"]).default("approved_beneficiary"),
        userId: z.number().optional(),
        customMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متوفرة" });

      const isStaff = ctx.user.role !== "service_requester";
      if (!isStaff) {
        throw new TRPCError({ code: "FORBIDDEN", message: "هذه الصلاحية متاحة للمسؤولين فقط." });
      }

      const appBaseUrl = getSurveyBaseUrl(ctx.req);
      const evalUrl = `${appBaseUrl}/evaluation?type=${input.category}&name=${encodeURIComponent(input.recipientName)}&email=${encodeURIComponent(input.recipientEmail)}&phone=${encodeURIComponent(input.recipientPhone || "")}`;

      let emailTitle = "استبيان قياس رضا المستفيدين - جمعية عمارة المساجد (منارة)";
      if (input.category === "donor") {
        emailTitle = "استبيان رضا الشركاء والداعمين - جمعية عمارة المساجد (منارة)";
      } else if (input.category === "inquiry") {
        emailTitle = "استبيان رضا المستفيدين عن خدمات الاستفسار والتواصل - جمعية عمارة المساجد (منارة)";
      }

      // استرجاع القالب المخصص من قسم الطلبات والمساجد في حال وجوده
      const [customTemplate] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.triggerId, "beneficiary_survey_invite"))
        .limit(1);

      let emailMessage = "";
      if (customTemplate?.templateMessage) {
        emailMessage = customTemplate.templateMessage
          .replace(/\{اسم_المستلم\}/g, input.recipientName)
          .replace(/\{صفة_المستفيد\}/g, input.category === "donor" ? "متبرع / داعم" : input.category === "inquiry" ? "صاحب استفسار" : "مستفيد معتمد");
      } else {
        emailMessage = `السلام عليكم ورحمة الله وبركاته ${input.recipientName}،\n\nنود دعوتكم بلطف للمشاركة في استبيان قياس رضا المستفيدين لدى جمعية عمارة المساجد (منارة).\n\nرأيكم وملاحظاتكم تهمنا للغاية لتطوير خدماتنا والارتقاء برعاية بيوت الله، نأمل منكم التكرم بالضغط على الرابط أدناه لتعبئة الاستبيان:\n\nشاكرين ومقدرين حسن تعاونكم الدائم.`;

        if (input.category === "donor") {
          emailMessage = `السلام عليكم ورحمة الله وبركاته ${input.recipientName}،\n\nنشكركم جزيلاً على عطائكم المبارك ودعمكم لبيوت الله من خلال جمعية عمارة المساجد (منارة).\n\nحرصاً منا على تقديم أعلى معايير الشفافية والتميز لشركائنا والداعمين الكرام، يسعدنا قياس رضاكم واقتراحاتكم الكريمة من خلال الرابط أدناه:\n\nجزاكم الله خيراً وبارك في عطائكم.`;
        } else if (input.category === "inquiry") {
          emailMessage = `السلام عليكم ورحمة الله وبركاته ${input.recipientName}،\n\nيسرنا التواصل معكم بعد استفساركم وتواصلكم الكريم مع جمعية عمارة المساجد (منارة).\n\nنأمل منكم التكرم بتقييم سرعة وجودة التجاوب والخدمة المقدمة لكم من خلال الرابط أدناه:\n\nشاكرين لكم وقتكم واهتمامكم.`;
        }
      }

      if (input.customMessage?.trim()) {
        emailMessage += `\n\nملاحظة خاصة: ${input.customMessage.trim()}`;
      }

      // إرسال الإيميل دون تعطيل أو تجميد استجابة الخادم
      sendEmailNotification(
        input.recipientEmail,
        emailTitle,
        emailMessage,
        evalUrl,
        "⭐️ تعبئة استبيان الرضا الآن ⭐️"
      ).catch((err) => {
        console.error("Error sending survey invite email asynchronously:", err);
      });

      // إرسال إشعار داخل النظام إذا كان للمستلم حساب
      if (input.userId) {
        await createNotification({
          userId: input.userId,
          title: emailTitle,
          message: "ندعوكم للمشاركة في استبيان قياس رضا المستفيدين لتطوير جودة الخدمات.",
          type: "general",
          relatedType: "evaluation",
          relatedId: input.userId,
        });
      }

      // تسجيل إرسال الاستبيان في سجل التدقيق (audit_logs)
      try {
        await db.insert(auditLogs).values({
          userId: ctx.user?.id || null,
          action: "survey_invite_sent",
          entityType: "survey_invite",
          entityId: input.userId || null,
          newValues: JSON.stringify({
            dispatchType: "general_invite",
            dispatchTypeLabel: "إرسال استبيان لطالب خدمة / جهة مسجلة",
            requestId: null,
            requestNumber: null,
            programType: "general_satisfaction",
            mosqueName: null,
            recipientName: input.recipientName,
            recipientEmail: input.recipientEmail,
            recipientPhone: input.recipientPhone || null,
            category: input.category,
            categoryLabel: input.category === "donor" ? "متبرع / داعم" : input.category === "inquiry" ? "صاحب استفسار" : "مستفيد معتمد",
            evalUrl,
            dispatchedAt: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error("Failed to log survey invite to audit_logs:", err);
      }

      return {
        success: true,
        message: `تم إرسال رابط الاستبيان بنجاح إلى ${input.recipientEmail}`,
        email: input.recipientEmail,
        evalUrl,
      };
    }),
});
