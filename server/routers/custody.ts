import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  custodyRequests,
  custodyExceptions,
  users,
  disbursementRequests,
  disbursementOrders,
} from "../../drizzle/schema";
import { eq, desc, and, sql, like, or, ne } from "drizzle-orm";
import { createNotification } from "./notifications";

// توليد رقم تسلسلي لطلب العهدة المالية بصيغة CR-YYYY-XXXX
async function generateCustodyRequestNumber(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CR-${currentYear}-`;

  const [lastReq] = await db
    .select({ requestNumber: custodyRequests.requestNumber })
    .from(custodyRequests)
    .where(like(custodyRequests.requestNumber, `${prefix}%`))
    .orderBy(desc(custodyRequests.id))
    .limit(1);

  let sequence = 1;
  if (lastReq && lastReq.requestNumber) {
    const parts = lastReq.requestNumber.split("-");
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
    .orderBy(desc(disbursementOrders.id))
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

// توليد رقم طلب صرف
async function generateDisbursementRequestNumber(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `DR-${currentYear}-`;

  const [lastReq] = await db
    .select({ requestNumber: disbursementRequests.requestNumber })
    .from(disbursementRequests)
    .where(like(disbursementRequests.requestNumber, `${prefix}%`))
    .orderBy(desc(disbursementRequests.id))
    .limit(1);

  let sequence = 1;
  if (lastReq && lastReq.requestNumber) {
    const parts = lastReq.requestNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${sequence.toString().padStart(4, "0")}`;
}

// التحقق من صلاحيات العهد المالية (super_admin والمدير التنفيذي والمسؤول المالي)
function checkCustodyRoles(user: { id: number; role?: string; name?: string; email?: string; [key: string]: any }) {
  const isSuperAdmin = user.role === "super_admin" || user.role === "system_admin";
  const isExecutiveDirector = 
    user.role === "executive_director" ||
    user.role === "general_manager" ||
    (user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
    (user as any)?.customRole?.nameAr === "الرئيس التنفيذي" ||
    user.name === "المدير التنفيذي" ||
    user.email === "ceo@manarah.org.sa";

  const isFinancialOfficer =
    user.role === "financial" ||
    user.role === "financial_manager" ||
    user.role === "accountant" ||
    (user as any)?.customRole?.nameAr === "المسؤول المالي" ||
    (user as any)?.customRole?.nameAr === "المدير المالي" ||
    (user as any)?.customRole?.nameAr === "محاسب" ||
    isSuperAdmin;

  const canSeeAll = isSuperAdmin || isExecutiveDirector || isFinancialOfficer;
  return { isSuperAdmin, isExecutiveDirector, isFinancialOfficer, canSeeAll };
}

export const custodyRouter = router({
  // جلب كافة طلبات العهد المالية مع ترقيم الصفحات والفلترة
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending_executive", "approved", "rejected", "converted_to_order"]).optional(),
        search: z.string().optional(),
        scope: z.enum(["my", "staff", "all"]).optional(),
        page: z.number().min(1).default(1).optional(),
        limit: z.number().min(1).max(100).default(10).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { canSeeAll } = checkCustodyRoles(ctx.user);

      // إذا لم يكن يملك صلاحية رؤية الكل، يرى فقط طلباته الخاصة
      const conditions: any[] = [];
      if (!canSeeAll) {
        conditions.push(eq(custodyRequests.userId, ctx.user.id));
      } else {
        // للمدير التنفيذي والمسؤول المالي والـ super_admin: تصفية حسب التبويب (طلباتي / طلبات الموظفين)
        if (input?.scope === "my") {
          conditions.push(eq(custodyRequests.userId, ctx.user.id));
        }
      }

      if (input?.status) {
        conditions.push(eq(custodyRequests.status, input.status));
      }

      if (input?.search && input.search.trim()) {
        const s = `%${input.search.trim()}%`;
        conditions.push(
          or(
            like(custodyRequests.requestNumber, s),
            like(custodyRequests.title, s),
            like(custodyRequests.bankAccountName, s),
            like(custodyRequests.bankIban, s),
            like(users.name, s)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const page = Math.max(1, input?.page || 1);
      const limit = Math.max(1, Math.min(100, input?.limit || 10));
      const offset = (page - 1) * limit;

      // حساب إجمالي السجلات المطابقة للتصفية
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(custodyRequests)
        .leftJoin(users, eq(custodyRequests.userId, users.id))
        .where(whereClause);

      const total = Number(countResult?.count || 0);

      const requests = await db
        .select({
          id: custodyRequests.id,
          requestNumber: custodyRequests.requestNumber,
          userId: custodyRequests.userId,
          title: custodyRequests.title,
          amount: custodyRequests.amount,
          description: custodyRequests.description,
          isCustomBank: custodyRequests.isCustomBank,
          bankName: custodyRequests.bankName,
          bankAccountName: custodyRequests.bankAccountName,
          bankIban: custodyRequests.bankIban,
          applicantSignatureName: custodyRequests.applicantSignatureName,
          applicantSignatureDepartment: custodyRequests.applicantSignatureDepartment,
          applicantSignatureUrl: custodyRequests.applicantSignatureUrl,
          status: custodyRequests.status,
          isSettled: custodyRequests.isSettled,
          settledBy: custodyRequests.settledBy,
          settledAt: custodyRequests.settledAt,
          settlementNotes: custodyRequests.settlementNotes,
          hasException: custodyRequests.hasException,
          exceptionId: custodyRequests.exceptionId,
          executiveApprovedBy: custodyRequests.executiveApprovedBy,
          executiveApprovedAt: custodyRequests.executiveApprovedAt,
          executiveSignatureName: custodyRequests.executiveSignatureName,
          executiveNotes: custodyRequests.executiveNotes,
          rejectedBy: custodyRequests.rejectedBy,
          rejectedAt: custodyRequests.rejectedAt,
          rejectionReason: custodyRequests.rejectionReason,
          disbursementOrderId: custodyRequests.disbursementOrderId,
          disbursementOrderNumber: custodyRequests.disbursementOrderNumber,
          createdAt: custodyRequests.createdAt,
          updatedAt: custodyRequests.updatedAt,
          applicantName: users.name,
          applicantPhone: users.phone,
          applicantRole: users.role,
        })
        .from(custodyRequests)
        .leftJoin(users, eq(custodyRequests.userId, users.id))
        .where(whereClause)
        .orderBy(desc(custodyRequests.createdAt))
        .limit(limit)
        .offset(offset);

      // جلب طلبات الاستثناء المعلقة المرتبطة بهذه العهد إن وجدت
      const requestIds = requests.map((r) => r.id);
      let pendingExceptionsMap: Record<number, { id: number; reason: string; createdAt: Date }> = {};
      if (requestIds.length > 0) {
        const pExceptions = await db
          .select({
            id: custodyExceptions.id,
            activeCustodyId: custodyExceptions.activeCustodyId,
            reason: custodyExceptions.reason,
            createdAt: custodyExceptions.createdAt,
          })
          .from(custodyExceptions)
          .where(
            and(
              sql`${custodyExceptions.activeCustodyId} IN (${sql.join(requestIds.map((id) => sql`${id}`), sql`, `)})`,
              eq(custodyExceptions.status, "pending")
            )
          );
        for (const pe of pExceptions) {
          pendingExceptionsMap[pe.activeCustodyId] = pe;
        }
      }

      const itemsWithExceptions = requests.map((req) => ({
        ...req,
        pendingException: pendingExceptionsMap[req.id] || null,
      }));

      return {
        items: itemsWithExceptions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }),

  // جلب تفاصيل طلب عهدة بالمعرف
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [request] = await db
        .select({
          id: custodyRequests.id,
          requestNumber: custodyRequests.requestNumber,
          userId: custodyRequests.userId,
          title: custodyRequests.title,
          amount: custodyRequests.amount,
          description: custodyRequests.description,
          isCustomBank: custodyRequests.isCustomBank,
          bankName: custodyRequests.bankName,
          bankAccountName: custodyRequests.bankAccountName,
          bankIban: custodyRequests.bankIban,
          applicantSignatureName: custodyRequests.applicantSignatureName,
          applicantSignatureDepartment: custodyRequests.applicantSignatureDepartment,
          applicantSignatureUrl: custodyRequests.applicantSignatureUrl,
          status: custodyRequests.status,
          isSettled: custodyRequests.isSettled,
          settledBy: custodyRequests.settledBy,
          settledAt: custodyRequests.settledAt,
          settlementNotes: custodyRequests.settlementNotes,
          hasException: custodyRequests.hasException,
          exceptionId: custodyRequests.exceptionId,
          executiveApprovedBy: custodyRequests.executiveApprovedBy,
          executiveApprovedAt: custodyRequests.executiveApprovedAt,
          executiveSignatureName: custodyRequests.executiveSignatureName,
          executiveSignatureDepartment: custodyRequests.executiveSignatureDepartment,
          executiveSignatureUrl: custodyRequests.executiveSignatureUrl,
          executiveNotes: custodyRequests.executiveNotes,
          rejectedBy: custodyRequests.rejectedBy,
          rejectedAt: custodyRequests.rejectedAt,
          rejectionReason: custodyRequests.rejectionReason,
          disbursementOrderId: custodyRequests.disbursementOrderId,
          disbursementOrderNumber: custodyRequests.disbursementOrderNumber,
          attachmentsJson: custodyRequests.attachmentsJson,
          createdAt: custodyRequests.createdAt,
          updatedAt: custodyRequests.updatedAt,
          applicantName: users.name,
          applicantEmail: users.email,
          applicantPhone: users.phone,
          applicantRole: users.role,
          applicantLiveSignatureName: users.signatureName,
          applicantLiveSignatureDepartment: users.signatureDepartment,
          applicantLiveSignatureUrl: users.signatureUrl,
          applicantShowSignatureInDocuments: users.showSignatureInDocuments,
        })
        .from(custodyRequests)
        .leftJoin(users, eq(custodyRequests.userId, users.id))
        .where(eq(custodyRequests.id, input.id))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب العهدة غير موجود" });
      }

      const { canSeeAll } = checkCustodyRoles(ctx.user);

      if (!canSeeAll && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض هذا الطلب" });
      }

      // جلب بيانات المدير التنفيذي الحية (تظهر بياناته حتى قبل الاعتماد، والتوقيع عند الاعتماد)
      let executiveUser: {
        id: number;
        name: string;
        signatureName: string | null;
        signatureDepartment: string | null;
        signatureUrl: string | null;
        showSignatureInDocuments: boolean | number | null;
      } | null = null;

      if (request.executiveApprovedBy) {
        const [exec] = await db
          .select({
            id: users.id,
            name: users.name,
            signatureName: users.signatureName,
            signatureDepartment: users.signatureDepartment,
            signatureUrl: users.signatureUrl,
            showSignatureInDocuments: users.showSignatureInDocuments,
          })
          .from(users)
          .where(eq(users.id, request.executiveApprovedBy))
          .limit(1);
        if (exec) executiveUser = exec;
      }

      if (!executiveUser) {
        const [exec] = await db
          .select({
            id: users.id,
            name: users.name,
            signatureName: users.signatureName,
            signatureDepartment: users.signatureDepartment,
            signatureUrl: users.signatureUrl,
            showSignatureInDocuments: users.showSignatureInDocuments,
          })
          .from(users)
          .where(
            and(
              or(
                sql`${users.role} IN ('executive_director', 'general_manager')`,
                eq(users.email, "ceo@manarah.org.sa")
              ),
              sql`${users.deletedAt} IS NULL`
            )
          )
          .limit(1);
        if (exec) executiveUser = exec;
      }

      // جلب بيانات أمر الصرف المرتبط إن وجد
      let linkedOrder: any = null;
      if (request.disbursementOrderId) {
        const [order] = await db
          .select({
            id: disbursementOrders.id,
            orderNumber: disbursementOrders.orderNumber,
            status: disbursementOrders.status,
            executedAt: disbursementOrders.executedAt,
            transactionReference: disbursementOrders.transactionReference,
          })
          .from(disbursementOrders)
          .where(eq(disbursementOrders.id, request.disbursementOrderId))
          .limit(1);
        linkedOrder = order || null;
      }

      // جلب بيانات المسؤول المالي الذي قام بالتصفية إن وجدت
      let settledUser: { id: number; name: string } | null = null;
      if (request.settledBy) {
        const [sUser] = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.id, request.settledBy))
          .limit(1);
        settledUser = sUser || null;
      }

      // جلب تفاصيل الاستثناء إن وجد
      let exceptionDetails: any = null;
      if (request.exceptionId) {
        const [ex] = await db
          .select({
            id: custodyExceptions.id,
            reason: custodyExceptions.reason,
            status: custodyExceptions.status,
            reviewedAt: custodyExceptions.reviewedAt,
            reviewNotes: custodyExceptions.reviewNotes,
          })
          .from(custodyExceptions)
          .where(eq(custodyExceptions.id, request.exceptionId))
          .limit(1);
        exceptionDetails = ex || null;
      }

      // فحص ما إذا كان هناك طلب استثناء معلق مرتبط بهذه العهدة كعهدة غير مصفاة
      const [pendingEx] = await db
        .select({
          id: custodyExceptions.id,
          reason: custodyExceptions.reason,
          createdAt: custodyExceptions.createdAt,
        })
        .from(custodyExceptions)
        .where(
          and(
            eq(custodyExceptions.activeCustodyId, request.id),
            eq(custodyExceptions.status, "pending")
          )
        )
        .limit(1);

      return {
        ...request,
        linkedOrder,
        executiveUser,
        settledUser,
        exceptionDetails,
        pendingException: pendingEx || null,
      };
    }),

  // إحصائيات سريعة للعهد المالية
  getStats: protectedProcedure
    .input(
      z.object({
        scope: z.enum(["my", "staff", "all"]).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { canSeeAll } = checkCustodyRoles(ctx.user);

      // 1. حساب العدادات الكلية للتبويبات (مستقلة عن فلتر التبويب النشط)
      const [globalCounts] = await db
        .select({
          totalAll: sql<number>`COUNT(*)`,
          myAll: sql<number>`COALESCE(SUM(CASE WHEN ${custodyRequests.userId} = ${ctx.user.id} THEN 1 ELSE 0 END), 0)`,
        })
        .from(custodyRequests);

      // 2. تطبيق التصفية على إحصائيات بطاقات الحالة
      const conditions: any[] = [];
      if (!canSeeAll) {
        conditions.push(eq(custodyRequests.userId, ctx.user.id));
      } else if (input?.scope === "my") {
        conditions.push(eq(custodyRequests.userId, ctx.user.id));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [stats] = await db
        .select({
          totalCount: sql<number>`COUNT(*)`,
          pendingCount: sql<number>`COALESCE(SUM(CASE WHEN ${custodyRequests.status} = 'pending_executive' THEN 1 ELSE 0 END), 0)`,
          convertedCount: sql<number>`COALESCE(SUM(CASE WHEN ${custodyRequests.status} = 'converted_to_order' THEN 1 ELSE 0 END), 0)`,
          approvedCount: sql<number>`COALESCE(SUM(CASE WHEN ${custodyRequests.status} = 'approved' THEN 1 ELSE 0 END), 0)`,
          rejectedCount: sql<number>`COALESCE(SUM(CASE WHEN ${custodyRequests.status} = 'rejected' THEN 1 ELSE 0 END), 0)`,
          totalAmount: sql<number>`COALESCE(SUM(CAST(${custodyRequests.amount} AS DECIMAL(15,2))), 0)`,
          convertedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${custodyRequests.status} = 'converted_to_order' THEN CAST(${custodyRequests.amount} AS DECIMAL(15,2)) ELSE 0 END), 0)`,
        })
        .from(custodyRequests)
        .where(whereClause);

    return {
      totalCount: Number(stats?.totalCount || 0),
      pendingCount: Number(stats?.pendingCount || 0),
      convertedCount: Number(stats?.convertedCount || 0),
      approvedCount: Number(stats?.approvedCount || 0),
      rejectedCount: Number(stats?.rejectedCount || 0),
      totalAmount: Number(stats?.totalAmount || 0),
      convertedAmount: Number(stats?.convertedAmount || 0),
      myCount: Number(globalCounts?.myAll || 0),
      staffCount: Number(globalCounts?.totalAll || 0),
    };
  }),

  // عدادات الإجراءات المعلقة للنقطة الحمراء للقائمة الجانبية (خاص بالمدير التنفيذي)
  getPendingActionCounts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { pendingCount: 0, hasPendingCustody: false };

    const user = ctx.user;
    const userRole = user.role;
    const userEmail = (user.email || "").toLowerCase().trim();

    const isExecDirector =
      ["general_manager", "executive_director"].includes(userRole) ||
      userEmail === "ceo@manarah.org.sa" ||
      userEmail === "test10@gmail.com" ||
      (user as any)?.customRole?.nameAr === "المدير التنفيذي" ||
      (user as any)?.customRole?.nameAr === "الرئيس التنفيذي";

    // تظهر النقطة الحمراء للمدير التنفيذي عند وجود طلبات عهدة بانتظار الاعتماد
    if (!isExecDirector) {
      return { pendingCount: 0, hasPendingCustody: false };
    }

    const [pending] = await db
      .select({ value: sql<number>`COUNT(*)` })
      .from(custodyRequests)
      .where(eq(custodyRequests.status, "pending_executive"));

    const [pendingEx] = await db
      .select({ value: sql<number>`COUNT(*)` })
      .from(custodyExceptions)
      .where(eq(custodyExceptions.status, "pending"));

    const pendingRequestsCount = Number(pending?.value || 0);
    const pendingExceptionsCount = Number(pendingEx?.value || 0);
    const pendingCount = pendingRequestsCount + pendingExceptionsCount;

    return {
      pendingCount,
      pendingRequestsCount,
      pendingExceptionsCount,
      hasPendingCustody: pendingCount > 0,
    };
  }),

  // إنشاء طلب عهدة مالية جديد
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(2, "يرجى إدخال عنوان أو غرض العهدة"),
        amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
        description: z.string().min(5, "يرجى كتابة بيان تفصيلي لأوجه استخدام العهدة"),
        isCustomBank: z.boolean().default(false),
        bankName: z.string().min(2, "اسم البنك مطلوب"),
        bankAccountName: z.string().min(2, "اسم صاحب الحساب مطلوب"),
        bankIban: z.string().min(10, "رقم الآيبان مطلوب"),
        attachments: z.array(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // التحقق من وجود عهدة نشطة تمنع التقديم إلا باستثناء:
      // (حالة أمر الصرف قيد الاعتماد أو العهدة غير معتمدة من المدير التنفيذي)
      const blockingCustodies = await db
        .select({
          id: custodyRequests.id,
          requestNumber: custodyRequests.requestNumber,
          status: custodyRequests.status,
          disbursementOrderStatus: disbursementOrders.status,
        })
        .from(custodyRequests)
        .leftJoin(disbursementOrders, eq(custodyRequests.disbursementOrderId, disbursementOrders.id))
        .where(
          and(
            eq(custodyRequests.userId, ctx.user.id),
            ne(custodyRequests.status, "rejected"),
            or(
              eq(custodyRequests.status, "pending_executive"),
              and(
                sql`${custodyRequests.disbursementOrderId} IS NOT NULL`,
                or(
                  eq(disbursementOrders.status, "pending"),
                  eq(disbursementOrders.status, "pending_executive")
                )
              )
            )
          )
        )
        .orderBy(desc(custodyRequests.createdAt))
        .limit(1);

      const unsettledCustody = blockingCustodies[0] || null;

      let approvedExceptionId: number | null = null;
      if (unsettledCustody) {
        // التحقق من وجود استثناء معتمد وغير مستخدم
        const [approvedException] = await db
          .select()
          .from(custodyExceptions)
          .where(
            and(
              eq(custodyExceptions.userId, ctx.user.id),
              eq(custodyExceptions.status, "approved"),
              eq(custodyExceptions.isUsed, false)
            )
          )
          .orderBy(desc(custodyExceptions.createdAt))
          .limit(1);

        if (!approvedException) {
          const reasonText = unsettledCustody.status === "pending_executive"
            ? "لأن طلب العهدة السابقة ما زال بانتظار اعتماد المدير التنفيذي"
            : "لأن أمر الصرف المرتبط بالعهدة السابقة ما زال قيد الاعتماد";

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `لا يمكن تقديم طلب عهدة جديد (${reasonText}) برقم (${unsettledCustody.requestNumber}). يمكنكم رفع طلب استثناء لاعتماده من المدير التنفيذي.`,
          });
        }

        approvedExceptionId = approvedException.id;
      }

      // جلب بيانات التوقيع من المستخدم
      const [userData] = await db
        .select({
          name: users.name,
          signatureName: users.signatureName,
          signatureDepartment: users.signatureDepartment,
          signatureUrl: users.signatureUrl,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const requestNumber = await generateCustodyRequestNumber(db);

      const [insertResult] = await db.insert(custodyRequests).values({
        requestNumber,
        userId: ctx.user.id,
        title: input.title,
        amount: input.amount.toFixed(2),
        description: input.description,
        isCustomBank: input.isCustomBank,
        bankName: input.bankName,
        bankAccountName: input.bankAccountName,
        bankIban: input.bankIban.trim().toUpperCase(),
        applicantSignatureName: userData?.signatureName || userData?.name || ctx.user.name,
        applicantSignatureDepartment: userData?.signatureDepartment || null,
        applicantSignatureUrl: userData?.signatureUrl || null,
        status: "pending_executive",
        hasException: !!approvedExceptionId,
        exceptionId: approvedExceptionId,
        attachmentsJson: input.attachments ? JSON.stringify(input.attachments) : null,
      });

      const requestId = Number(insertResult.insertId);

      // استهلاك الاستثناء في حال استخدامه
      if (approvedExceptionId) {
        await db
          .update(custodyExceptions)
          .set({
            isUsed: true,
            usedInRequestId: requestId,
            updatedAt: new Date(),
          })
          .where(eq(custodyExceptions.id, approvedExceptionId));
      }

      // إشعار للمدير التنفيذي والمدير العام
      try {
        const managers = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              sql`${users.role} IN ('super_admin', 'system_admin', 'general_manager', 'executive_director')`,
              sql`${users.deletedAt} IS NULL`
            )
          );

        for (const m of managers) {
          await createNotification({
            userId: m.id,
            title: "طلب صرف عهدة مالية جديد",
            message: `قام الموظف (${userData?.name || ctx.user.name}) بتقديم طلب صرف عهدة مالية رقم ${requestNumber} بمبلغ ${input.amount.toLocaleString()} ريال. بانتظار الاعتماد.`,
            type: "system",
            relatedType: "custody_request",
            relatedId: requestId,
          }).catch(() => {});
        }
      } catch (notifyErr) {
        console.warn("Failed to notify managers of custody request:", notifyErr);
      }

      return {
        success: true,
        id: requestId,
        requestNumber,
        message: "تم رفع طلب صرف العهدة المالية بنجاح وبانتظار اعتماد المدير التنفيذي",
      };
    }),

  // اعتماد طلب العهدة من المدير التنفيذي والتحويل التلقائي لأمر صرف
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

      const { isExecutiveDirector, isSuperAdmin } = checkCustodyRoles(ctx.user);

      if (!isExecutiveDirector && !isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "صلاحية اعتماد طلب العهدة المالية محصورة بالمدير التنفيذي فقط",
        });
      }

      const [request] = await db
        .select()
        .from(custodyRequests)
        .where(eq(custodyRequests.id, input.id))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب العهدة غير موجود" });
      }

      if (request.status === "converted_to_order") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "تم تحويل هذا الطلب لأمر صرف مسبقاً" });
      }

      // جلب توقيع المدير التنفيذي المعتمد
      const [executiveUser] = await db
        .select({
          name: users.name,
          signatureName: users.signatureName,
          signatureDepartment: users.signatureDepartment,
          signatureUrl: users.signatureUrl,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const execSignName = executiveUser?.signatureName || executiveUser?.name || ctx.user.name;
      const execSignDept = executiveUser?.signatureDepartment || "المدير التنفيذي";
      const execSignUrl = executiveUser?.signatureUrl || null;

      // 1. توليد طلب صرف معتمد (سجل توافقي لسلامة الدورة المستندية)
      const drNumber = await generateDisbursementRequestNumber(db);

      let formattedDescription = request.description;
      try {
        const parsed = JSON.parse(request.description);
        if (Array.isArray(parsed) && parsed.length > 0) {
          formattedDescription = parsed
            .map((it: any, i: number) => {
              const detailsText = it.details ? ` (${it.details})` : "";
              return `${i + 1}. ${it.description}${detailsText} (${Number(it.amount).toLocaleString()} ر.س)`;
            })
            .join(" | ");
        }
      } catch {}

      const [drResult] = await db.insert(disbursementRequests).values({
        requestNumber: drNumber,
        title: `طلب صرف عهدة مالية: ${request.title} (${request.requestNumber})`,
        description: `طلب صرف عهدة مالية مقدم من الموظف. البيان: ${formattedDescription}`,
        amount: request.amount,
        adminFees: "0.00",
        paymentType: "progress",
        status: "approved",
        requestedBy: request.userId,
        creatorSignatureName: request.applicantSignatureName,
        creatorSignatureDepartment: request.applicantSignatureDepartment,
        isDirect: true,
      });

      const disbursementRequestId = Number(drResult.insertId);

      // 2. توليد أمر الصرف المالي
      const doNumber = await generateDisbursementOrderNumber(db);
      const [doResult] = await db.insert(disbursementOrders).values({
        orderNumber: doNumber,
        disbursementRequestId,
        amount: request.amount,
        beneficiaryName: request.bankAccountName,
        beneficiaryBank: request.bankName,
        beneficiaryIban: request.bankIban,
        beneficiaryAccountName: request.bankAccountName,
        paymentMethod: "bank_transfer",
        sourceType: "custody",
        status: "pending", // قيد الاعتماد والمراجعة المالية
        createdBy: ctx.user.id,
        approvedBy: null,
        approvedAt: null,
        approvalNotes: null,
        creatorSignatureName: execSignName,
        creatorSignatureDepartment: execSignDept,
        creatorSignatureUrl: execSignUrl,
      });

      const disbursementOrderId = Number(doResult.insertId);

      // 3. تحديث طلب العهدة بالربط والاعتماد
      await db
        .update(custodyRequests)
        .set({
          status: "converted_to_order",
          executiveApprovedBy: ctx.user.id,
          executiveApprovedAt: new Date(),
          executiveSignatureName: execSignName,
          executiveSignatureDepartment: execSignDept,
          executiveSignatureUrl: execSignUrl,
          executiveNotes: input.notes || null,
          disbursementOrderId,
          disbursementOrderNumber: doNumber,
          updatedAt: new Date(),
        })
        .where(eq(custodyRequests.id, request.id));

      // 4. إشعار مقدم الطلب والإدارة المالية
      try {
        // إشعار الموظف
        await createNotification({
          userId: request.userId,
          title: "تم اعتماد طلب العهدة المالية وتوليد أمر صرف",
          message: `تم اعتماد طلب العهدة (${request.requestNumber}) بمبلغ ${Number(request.amount).toLocaleString()} ريال وتحويله لأمر صرف رقم (${doNumber}) لدى الإدارة المالية.`,
          type: "system",
          relatedType: "custody_request",
          relatedId: request.id,
        }).catch(() => {});

        // إشعار الإدارة المالية
        const financeUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              sql`${users.role} IN ('financial', 'super_admin')`,
              sql`${users.deletedAt} IS NULL`
            )
          );

        for (const f of financeUsers) {
          await createNotification({
            userId: f.id,
            title: "أمر صرف عهدة مالية جديد",
            message: `ورد أمر صرف عهدة مالية برقم (${doNumber}) بمبلغ ${Number(request.amount).toLocaleString()} ريال للمستفيد (${request.bankAccountName}). يرجى تنفيذ الصرف.`,
            type: "system",
            relatedType: "disbursement_order",
            relatedId: disbursementOrderId,
          }).catch(() => {});
        }
      } catch (e) {
        console.warn("Failed to notify after custody approval:", e);
      }

      return {
        success: true,
        orderNumber: doNumber,
        disbursementOrderId,
        message: `تم اعتماد طلب العهدة بنجاح وتحويله إلى أمر صرف برقم ${doNumber}`,
      };
    }),

  // رفض طلب العهدة
  reject: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(3, "يرجى كتابة سبب الرفض"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { isExecutiveDirector, isSuperAdmin } = checkCustodyRoles(ctx.user);

      if (!isExecutiveDirector && !isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "صلاحية رفض طلب العهدة المالية محصورة بالمدير التنفيذي فقط",
        });
      }

      const [request] = await db
        .select()
        .from(custodyRequests)
        .where(eq(custodyRequests.id, input.id))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب العهدة غير موجود" });
      }

      await db
        .update(custodyRequests)
        .set({
          status: "rejected",
          rejectedBy: ctx.user.id,
          rejectedAt: new Date(),
          rejectionReason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(custodyRequests.id, request.id));

      // إشعار مقدم الطلب بالرفض مع السبب
      try {
        await createNotification({
          userId: request.userId,
          title: "تم رفض طلب صرف العهدة المالية",
          message: `نعتذر، تم رفض طلب العهدة المالية (${request.requestNumber}). السبب: ${input.reason}`,
          type: "system",
          relatedType: "custody_request",
          relatedId: request.id,
        }).catch(() => {});
      } catch (e) {}

      return {
        success: true,
        message: "تم تسجيل رفض طلب العهدة المالية",
      };
    }),

  // فحص هل لدى الموظف عهدة نشطة / غير مصفاة وهل لديه استثناء معتمد
  checkActiveCustody: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

    // البحث عن العهد النشطة التي تمنع تقديم عهدة ثانية إلا باستثناء:
    // 1) العهدة ما زالت قيد اعتماد المدير التنفيذي (pending_executive)
    // 2) أو العهدة تحولت لأمر صرف وما زال أمر الصرف قيد الاعتماد (pending أو pending_executive)
    const activeCustodies = await db
      .select({
        id: custodyRequests.id,
        requestNumber: custodyRequests.requestNumber,
        title: custodyRequests.title,
        amount: custodyRequests.amount,
        status: custodyRequests.status,
        createdAt: custodyRequests.createdAt,
        disbursementOrderId: custodyRequests.disbursementOrderId,
        disbursementOrderNumber: custodyRequests.disbursementOrderNumber,
        disbursementOrderStatus: disbursementOrders.status,
      })
      .from(custodyRequests)
      .leftJoin(disbursementOrders, eq(custodyRequests.disbursementOrderId, disbursementOrders.id))
      .where(
        and(
          eq(custodyRequests.userId, ctx.user.id),
          ne(custodyRequests.status, "rejected"),
          or(
            // حالة 1: لسا العهدة غير معتمدة من المدير التنفيذي
            eq(custodyRequests.status, "pending_executive"),
            // حالة 2: حالة أمر الصرف المرتبط "قيد الاعتماد"
            and(
              sql`${custodyRequests.disbursementOrderId} IS NOT NULL`,
              or(
                eq(disbursementOrders.status, "pending"),
                eq(disbursementOrders.status, "pending_executive")
              )
            )
          )
        )
      )
      .orderBy(desc(custodyRequests.createdAt));

    const hasActiveCustody = activeCustodies.length > 0;

    // فحص ما إذا كان هناك استثناء معتمد وغير مستخدم
    const [approvedException] = await db
      .select()
      .from(custodyExceptions)
      .where(
        and(
          eq(custodyExceptions.userId, ctx.user.id),
          eq(custodyExceptions.status, "approved"),
          eq(custodyExceptions.isUsed, false)
        )
      )
      .orderBy(desc(custodyExceptions.createdAt))
      .limit(1);

    // فحص ما إذا كان هناك استثناء قيد المراجعة
    const [pendingException] = await db
      .select()
      .from(custodyExceptions)
      .where(
        and(
          eq(custodyExceptions.userId, ctx.user.id),
          eq(custodyExceptions.status, "pending")
        )
      )
      .orderBy(desc(custodyExceptions.createdAt))
      .limit(1);

    // أحدث طلب استثناء للمستخدم لمعرفة حالته وملاحظاته
    const [latestException] = await db
      .select()
      .from(custodyExceptions)
      .where(eq(custodyExceptions.userId, ctx.user.id))
      .orderBy(desc(custodyExceptions.createdAt))
      .limit(1);

    return {
      hasActiveCustody,
      activeCustodies,
      activeCustody: activeCustodies[0] || null,
      canSubmit: !hasActiveCustody || !!approvedException,
      hasApprovedException: !!approvedException,
      approvedException: approvedException || null,
      hasPendingException: !approvedException && !!pendingException,
      pendingException: pendingException || null,
      latestException: latestException || null,
    };
  }),

  // تقديم طلب استثناء لصرف عهدة جديدة لوجود عهدة غير مصفاة
  requestException: protectedProcedure
    .input(
      z.object({
        activeCustodyId: z.number(),
        reason: z.string().min(5, "يرجى كتابة مبررات طلب الاستثناء بشكل واضح"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      // فحص وجود طلب استثناء قيد المراجعة بالفعل
      const [existingPending] = await db
        .select()
        .from(custodyExceptions)
        .where(
          and(
            eq(custodyExceptions.userId, ctx.user.id),
            eq(custodyExceptions.status, "pending")
          )
        )
        .limit(1);

      if (existingPending) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يوجد لديك طلب استثناء قيد المراجعة بالفعل من المدير التنفيذي",
        });
      }

      const [activeCustody] = await db
        .select({
          id: custodyRequests.id,
          requestNumber: custodyRequests.requestNumber,
          title: custodyRequests.title,
        })
        .from(custodyRequests)
        .where(eq(custodyRequests.id, input.activeCustodyId))
        .limit(1);

      const [insertResult] = await db.insert(custodyExceptions).values({
        userId: ctx.user.id,
        activeCustodyId: input.activeCustodyId,
        reason: input.reason,
        status: "pending",
      });

      const exceptionId = Number(insertResult.insertId);

      // إشعار المدير التنفيذي
      try {
        const managers = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              sql`${users.role} IN ('super_admin', 'system_admin', 'general_manager', 'executive_director')`,
              sql`${users.deletedAt} IS NULL`
            )
          );

        for (const m of managers) {
          await createNotification({
            userId: m.id,
            title: "طلب استثناء عهدة مالية جديدة",
            message: `قام الموظف (${ctx.user.name}) بطلب استثناء لتقديم عهدة جديدة رغم وجود عهدة سابقة قائمة (${activeCustody?.requestNumber || `#${input.activeCustodyId}`}). بانتظار المراجعة والاعتماد.`,
            type: "system",
            relatedType: "custody_request",
            relatedId: input.activeCustodyId,
          }).catch(() => {});
        }
      } catch (err) {
        console.warn("Failed to notify managers of custody exception:", err);
      }

      return {
        success: true,
        id: exceptionId,
        message: "تم رفع طلب الاستثناء للمدير التنفيذي بنجاح",
      };
    }),

  // جلب طلبات الاستثناءات للمدير التنفيذي
  getExceptions: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
        page: z.number().min(1).default(1).optional(),
        limit: z.number().min(1).max(50).default(10).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { isExecutiveDirector, isSuperAdmin } = checkCustodyRoles(ctx.user);
      const conditions: any[] = [];
      if (!isExecutiveDirector && !isSuperAdmin) {
        conditions.push(eq(custodyExceptions.userId, ctx.user.id));
      }
      if (input?.status && input.status !== "all") {
        conditions.push(eq(custodyExceptions.status, input.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const page = Math.max(1, input?.page || 1);
      const limit = Math.max(1, Math.min(50, input?.limit || 10));
      const offset = (page - 1) * limit;

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(custodyExceptions)
        .where(whereClause);

      const total = Number(countResult?.count || 0);

      const items = await db
        .select({
          id: custodyExceptions.id,
          userId: custodyExceptions.userId,
          activeCustodyId: custodyExceptions.activeCustodyId,
          reason: custodyExceptions.reason,
          status: custodyExceptions.status,
          reviewedBy: custodyExceptions.reviewedBy,
          reviewedAt: custodyExceptions.reviewedAt,
          reviewNotes: custodyExceptions.reviewNotes,
          isUsed: custodyExceptions.isUsed,
          usedInRequestId: custodyExceptions.usedInRequestId,
          createdAt: custodyExceptions.createdAt,
          applicantName: users.name,
          applicantEmail: users.email,
          applicantRole: users.role,
          activeCustodyNumber: custodyRequests.requestNumber,
          activeCustodyTitle: custodyRequests.title,
          activeCustodyAmount: custodyRequests.amount,
        })
        .from(custodyExceptions)
        .leftJoin(users, eq(custodyExceptions.userId, users.id))
        .leftJoin(custodyRequests, eq(custodyExceptions.activeCustodyId, custodyRequests.id))
        .where(whereClause)
        .orderBy(desc(custodyExceptions.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }),

  // مراجعة واعتماد/رفض طلب الاستثناء من المدير التنفيذي
  reviewException: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        action: z.enum(["approve", "reject"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { isExecutiveDirector, isSuperAdmin } = checkCustodyRoles(ctx.user);
      if (!isExecutiveDirector && !isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "صلاحية مراجعة طلبات الاستثناء محصورة بالمدير التنفيذي فقط",
        });
      }

      const [exceptionRecord] = await db
        .select()
        .from(custodyExceptions)
        .where(eq(custodyExceptions.id, input.id))
        .limit(1);

      if (!exceptionRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب الاستثناء غير موجود" });
      }

      const newStatus = input.action === "approve" ? "approved" : "rejected";

      await db
        .update(custodyExceptions)
        .set({
          status: newStatus,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(custodyExceptions.id, input.id));

      // إشعار مقدم الطلب بنتيجة الاستثناء
      try {
        const isApproved = newStatus === "approved";
        await createNotification({
          userId: exceptionRecord.userId,
          title: isApproved ? "تمت الموافقة على طلب استثناء العهدة المالية" : "تم رفض طلب استثناء العهدة المالية",
          message: isApproved
            ? `وافق المدير التنفيذي على طلب الاستثناء الخاص بك. يمكنك الآن تقديم طلب صرف عهدة جديدة.`
            : `نعتذر، رفض المدير التنفيذي طلب الاستثناء لصرف عهدة جديدة. ${input.notes ? `السبب: ${input.notes}` : "يرجى تصفية العهدة السابقة أولاً."}`,
          type: "system",
          relatedType: "custody_request",
          relatedId: exceptionRecord.activeCustodyId,
        }).catch(() => {});
      } catch (e) {}

      return {
        success: true,
        status: newStatus,
        message: input.action === "approve" ? "تم اعتماد طلب الاستثناء بنجاح" : "تم رفض طلب الاستثناء",
      };
    }),

  // تصفية وإغلاق العهدة المالية من المسؤول المالي
  settle: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const { isFinancialOfficer, isSuperAdmin } = checkCustodyRoles(ctx.user);
      if (!isFinancialOfficer && !isSuperAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "صلاحية تصفية وإغلاق العهد المالية محصورة بالمسؤول المالي أو المشرف العام",
        });
      }

      const [request] = await db
        .select()
        .from(custodyRequests)
        .where(eq(custodyRequests.id, input.id))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب العهدة غير موجود" });
      }

      if (request.isSettled) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "تمت تصفية وإغلاق هذه العهدة بالفعل" });
      }

      await db
        .update(custodyRequests)
        .set({
          isSettled: true,
          settledBy: ctx.user.id,
          settledAt: new Date(),
          settlementNotes: input.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(custodyRequests.id, input.id));

      // إشعار صاحب العهدة باكتمال التصفية
      try {
        await createNotification({
          userId: request.userId,
          title: "تمت تصفية العهدة المالية بنجاح",
          message: `تم اعتماد تصفية وإغلاق العهدة المالية رقم (${request.requestNumber}) بواسطة المسؤول المالي. يمكنك الآن تقديم طلبات عهد جديدة مستقبلاً.`,
          type: "system",
          relatedType: "custody_request",
          relatedId: request.id,
        }).catch(() => {});
      } catch (e) {}

      return {
        success: true,
        message: "تمت تصفية وإغلاق العهدة المالية بنجاح",
      };
    }),
});
