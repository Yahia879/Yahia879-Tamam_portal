import { eq, and, sql, isNull, inArray, count, sum, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  mosques,
  mosqueRequests,
  disbursementRequests,
  disbursementOrders,
  projects,
  receiptVouchers,
} from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { checkPermission } from "../permissions";

// تسميات المراحل بالعربية
const STAGE_LABELS: Record<string, string> = {
  submitted: "تقديم الطلب",
  initial_review: "المراجعة الأولية",
  field_visit: "الزيارة الميدانية",
  boq_preparation: "جدول الكميات",
  financial_eval_and_approval: "التقييم المالي",
  contracting: "التعاقد",
  execution: "التنفيذ",
  handover: "الاستلام والإنهاء",
  completed: "مكتمل",
  rejected: "مرفوض",
  on_hold: "معلّق",
};

export const boardRouter = router({
  getExecutiveStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "قاعدة البيانات غير متاحة",
      });
    }

    // التحقق الصارم من الصلاحيات والأنوار
    const isChairmanRole = ctx.user.role === "board_chairman";
    const isMemberRole = ctx.user.role === "board_member";
    const isAdminRole = ["super_admin", "system_admin"].includes(ctx.user.role);

    const hasChairmanPerm = await checkPermission(ctx.user.id, "board_chairman");
    const hasMemberPerm = await checkPermission(ctx.user.id, "board_member");

    const isChairman = isChairmanRole || hasChairmanPerm;
    const isMember = isMemberRole || hasMemberPerm;

    if (!isChairman && !isMember && !isAdminRole) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "صفحة اللوحة القيادية مخصصة حصراً لأعضاء ورئيس مجلس الإدارة",
      });
    }

    // ==================== 1️⃣ إحصائيات المساجد ====================
    const [totalMosquesRes] = await db
      .select({ value: count() })
      .from(mosques);

    const [activeMosquesRes] = await db
      .select({ value: count() })
      .from(mosques)
      .where(eq(mosques.approvalStatus, "approved" as any));

    // مساجد جديدة آخر 30 يوماً
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [recentMosquesRes] = await db
      .select({ value: count() })
      .from(mosques)
      .where(sql`${mosques.createdAt} >= ${thirtyDaysAgo}`);

    // توزيع المساجد حسب المدن/المناطق
    const mosquesByCity = await db
      .select({
        name: sql<string>`COALESCE(${mosques.city}, 'غير محدد')`,
        value: count(),
      })
      .from(mosques)
      .groupBy(sql`COALESCE(${mosques.city}, 'غير محدد')`)
      .limit(6);

    // توزيع المساجد حسب الفئات أو الحالات
    const mosquesByStatus = await db
      .select({
        status: sql<string>`COALESCE(${mosques.approvalStatus}, 'approved')`,
        value: count(),
      })
      .from(mosques)
      .groupBy(sql`COALESCE(${mosques.approvalStatus}, 'approved')`);

    // ==================== 2️⃣ إحصائيات الطلبات ====================
    const [totalRequestsRes] = await db
      .select({ value: count() })
      .from(mosqueRequests);

    const [approvedRequestsRes] = await db
      .select({ value: count() })
      .from(mosqueRequests)
      .where(eq(mosqueRequests.status, "approved" as any));

    const [rejectedRequestsRes] = await db
      .select({ value: count() })
      .from(mosqueRequests)
      .where(eq(mosqueRequests.status, "rejected" as any));

    const [inProgressRequestsRes] = await db
      .select({ value: count() })
      .from(mosqueRequests)
      .where(inArray(mosqueRequests.status, ["in_progress", "executing"] as any));

    const [pendingRequestsRes] = await db
      .select({ value: count() })
      .from(mosqueRequests)
      .where(inArray(mosqueRequests.status, ["pending", "submitted", "initial_review"] as any));

    // توزيع الطلبات على مراحل العمل
    const requestsByStageRaw = await db
      .select({
        stage: sql<string>`COALESCE(${mosqueRequests.currentStage}, 'submitted')`,
        value: count(),
      })
      .from(mosqueRequests)
      .groupBy(sql`COALESCE(${mosqueRequests.currentStage}, 'submitted')`);

    const requestsByStage = requestsByStageRaw.map((item) => ({
      stage: item.stage,
      label: STAGE_LABELS[item.stage] || item.stage,
      value: Number(item.value),
    }));

    // أكثر المساجد طلباً للخدمات
    const topMosquesRequests = await db
      .select({
        mosqueId: mosqueRequests.mosqueId,
        mosqueName: mosques.name,
        count: count(),
      })
      .from(mosqueRequests)
      .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
      .groupBy(mosqueRequests.mosqueId, mosques.name)
      .orderBy(desc(count()))
      .limit(5);

    // ==================== 3️⃣ إحصائيات الأمور المالية والصرف ====================
    // إجمالي الميزانيات المعتمدة للمشاريع
    const [totalProjectBudgetRes] = await db
      .select({ total: sum(projects.budget) })
      .from(projects);

    // إجمالي المبالغ المصروفة المعتمدة
    const [totalDisbursedOrdersRes] = await db
      .select({ total: sum(disbursementOrders.amount) })
      .from(disbursementOrders)
      .where(inArray(disbursementOrders.status, ["approved", "executed"] as any));

    // التحويلات البنكية المكتملة
    const [completedBankTransfersRes] = await db
      .select({
        count: count(),
        totalAmount: sum(disbursementOrders.amount),
      })
      .from(disbursementOrders)
      .where(
        and(
          inArray(disbursementOrders.status, ["approved", "executed"] as any),
          eq(disbursementOrders.paymentMethod, "bank_transfer" as any)
        )
      );

    // إجمالي مبالغ سندات القبض
    const [totalReceiptVouchersRes] = await db
      .select({ total: sum(receiptVouchers.amount) })
      .from(receiptVouchers);

    // أمر أو طلبات الصرف بانتظار الاعتماد (مؤشر مهم لرئيس مجلس الإدارة)
    const pendingOrdersRaw = await db
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
      })
      .from(disbursementOrders)
      .where(inArray(disbursementOrders.status, ["pending", "pending_executive", "edited"] as any))
      .orderBy(desc(disbursementOrders.createdAt))
      .limit(10);

    const pendingOrders = pendingOrdersRaw.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      amount: Number(o.amount || 0),
      beneficiaryName: o.beneficiaryName,
      beneficiaryBank: o.beneficiaryBank || "مصرف الراجحي",
      beneficiaryIban: o.beneficiaryIban || "-",
      paymentMethod: o.paymentMethod || "bank_transfer",
      status: o.status,
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    }));

    // التدفق المالي المعتمد الشهري (آخر 6 أشهر)
    const monthlyFlowRaw = await db
      .select({
        month: sql<string>`DATE_FORMAT(${disbursementOrders.createdAt}, '%Y-%m')`,
        disbursed: sum(disbursementOrders.amount),
        count: count(),
      })
      .from(disbursementOrders)
      .where(inArray(disbursementOrders.status, ["approved", "executed"] as any))
      .groupBy(sql`DATE_FORMAT(${disbursementOrders.createdAt}, '%Y-%m')`)
      .orderBy(desc(sql`DATE_FORMAT(${disbursementOrders.createdAt}, '%Y-%m')`))
      .limit(6);

    const monthlyFlow = monthlyFlowRaw.reverse().map((item) => ({
      month: item.month,
      disbursed: Number(item.disbursed || 0),
      count: Number(item.count || 0),
    }));

    return {
      userRole: isChairman ? "board_chairman" : "board_member",
      isChairman,
      isMember,
      mosques: {
        total: Number(totalMosquesRes?.value || 0),
        active: Number(activeMosquesRes?.value || 0),
        recent: Number(recentMosquesRes?.value || 0),
        byCity: mosquesByCity.map((c) => ({ name: c.name, value: Number(c.value) })),
        byStatus: mosquesByStatus.map((s) => ({
          name: s.status === "active" ? "نشط" : "غير نشط",
          value: Number(s.value),
        })),
      },
      requests: {
        total: Number(totalRequestsRes?.value || 0),
        approved: Number(approvedRequestsRes?.value || 0),
        rejected: Number(rejectedRequestsRes?.value || 0),
        inProgress: Number(inProgressRequestsRes?.value || 0),
        pending: Number(pendingRequestsRes?.value || 0),
        byStage: requestsByStage,
        topMosques: topMosquesRequests.map((m) => ({
          id: m.mosqueId,
          name: m.mosqueName || `مسجد #${m.mosqueId}`,
          count: Number(m.count),
        })),
      },
      financials: {
        totalApprovedBudget: Number(totalProjectBudgetRes?.total || 0),
        totalDisbursedAmount: Number(totalDisbursedOrdersRes?.total || 0),
        completedBankTransfersCount: Number(completedBankTransfersRes?.count || 0),
        completedBankTransfersAmount: Number(completedBankTransfersRes?.totalAmount || 0),
        totalReceiptVouchersAmount: Number(totalReceiptVouchersRes?.total || 0),
        pendingApprovalsCount: pendingOrders.length,
        pendingOrders,
        monthlyFlow,
      },
    };
  }),
});
