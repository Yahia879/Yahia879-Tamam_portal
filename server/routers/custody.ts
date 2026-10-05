import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  custodyRequests,
  users,
  disbursementRequests,
  disbursementOrders,
} from "../../drizzle/schema";
import { eq, desc, and, sql, like, or } from "drizzle-orm";
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

export const custodyRouter = router({
  // جلب كافة طلبات العهد المالية
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending_executive", "approved", "rejected", "converted_to_order"]).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const userRole = ctx.user.role;
      const isManagementOrFinance = [
        "super_admin",
        "system_admin",
        "board_chairman",
        "general_manager",
        "executive_director",
        "financial",
      ].includes(userRole);

      // إذا كان الموظف عادياً (ليس من الإدارة العليا أو المالية) يرى فقط طلباته الخاصة
      const conditions: any[] = [];
      if (!isManagementOrFinance) {
        conditions.push(eq(custodyRequests.userId, ctx.user.id));
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
            like(custodyRequests.bankIban, s)
          )
        );
      }

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
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(custodyRequests.createdAt));

      return requests;
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
        })
        .from(custodyRequests)
        .leftJoin(users, eq(custodyRequests.userId, users.id))
        .where(eq(custodyRequests.id, input.id))
        .limit(1);

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "طلب العهدة غير موجود" });
      }

      const userRole = ctx.user.role;
      const isManagementOrFinance = [
        "super_admin",
        "system_admin",
        "board_chairman",
        "general_manager",
        "executive_director",
        "financial",
      ].includes(userRole);

      if (!isManagementOrFinance && request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "ليس لديك صلاحية لعرض هذا الطلب" });
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

      return {
        ...request,
        linkedOrder,
      };
    }),

  // إحصائيات سريعة للعهد المالية
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

    const userRole = ctx.user.role;
    const isManagementOrFinance = [
      "super_admin",
      "system_admin",
      "board_chairman",
      "general_manager",
      "executive_director",
      "financial",
    ].includes(userRole);

    const conditions: any[] = [];
    if (!isManagementOrFinance) {
      conditions.push(eq(custodyRequests.userId, ctx.user.id));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [stats] = await db
      .select({
        totalCount: sql<number>`COUNT(*)`,
        pendingCount: sql<number>`SUM(CASE WHEN ${custodyRequests.status} = 'pending_executive' THEN 1 ELSE 0 END)`,
        convertedCount: sql<number>`SUM(CASE WHEN ${custodyRequests.status} = 'converted_to_order' THEN 1 ELSE 0 END)`,
        approvedCount: sql<number>`SUM(CASE WHEN ${custodyRequests.status} = 'approved' THEN 1 ELSE 0 END)`,
        rejectedCount: sql<number>`SUM(CASE WHEN ${custodyRequests.status} = 'rejected' THEN 1 ELSE 0 END)`,
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
        applicantSignatureDepartment: userData?.signatureDepartment || "الموظف مقدم الطلب",
        applicantSignatureUrl: userData?.signatureUrl || null,
        status: "pending_executive",
        attachmentsJson: input.attachments ? JSON.stringify(input.attachments) : null,
      });

      const requestId = Number(insertResult.insertId);

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

      const userRole = ctx.user.role;
      const canApprove = [
        "super_admin",
        "system_admin",
        "board_chairman",
        "general_manager",
        "executive_director",
      ].includes(userRole);

      if (!canApprove) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "صلاحية اعتماد طلب العهدة المالية محصورة بالمدير التنفيذي والإدارة العليا",
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
      const [drResult] = await db.insert(disbursementRequests).values({
        requestNumber: drNumber,
        title: `طلب صرف عهدة مالية: ${request.title} (${request.requestNumber})`,
        description: `طلب صرف عهدة مالية مقدم من الموظف. البيان: ${request.description}`,
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
        status: "pending", // قيد التنفيذ والمراجعة المالية
        createdBy: ctx.user.id,
        approvedBy: ctx.user.id,
        approvedAt: new Date(),
        approvalNotes: input.notes || "تم اعتماد طلب صرف العهدة المالية وتحويله لأمر صرف من المدير التنفيذي",
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

      const userRole = ctx.user.role;
      const canReject = [
        "super_admin",
        "system_admin",
        "board_chairman",
        "general_manager",
        "executive_director",
      ].includes(userRole);

      if (!canReject) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "صلاحية رفض طلب العهدة المالية محصورة بالمدير التنفيذي والإدارة العليا",
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
});
