import { eq, and, or, like, sql, isNull, isNotNull, inArray, count, sum, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  mosques,
  mosqueRequests,
  disbursementRequests,
  disbursementOrders,
  projects,
  receiptVouchers,
  suppliers,
  contracts,
  partners,
  supportTickets,
} from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { checkPermission } from "../permissions";

const STAGE_LABELS: Record<string, string> = {
  submitted: "تقديم الطلب",
  initial_review: "المراجعة الأولية",
  field_visit: "الزيارة الميدانية",
  boq_preparation: "جدول الكميات",
  financial_eval_and_approval: "التقييم المالي",
  director_review: "مراجعة المدير التنفيذي",
  board_review: "مراجعة مجلس الإدارة",
  board_approval: "اعتماد مجلس الإدارة",
  approved: "معتمد",
  rejected: "مرفوض",
  on_hold: "معلّق",
};

export const boardRouter = router({
  getExecutiveStats: protectedProcedure
    .input(
      z
        .object({
          page: z.number().optional().default(1),
          pageSize: z.number().optional().default(20),
          search: z.string().optional().default(""),
          status: z.string().optional().default("all"),
          orderType: z.string().optional().default("all"),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const page = Math.max(Number(input?.page) || 1, 1);
      const pageSize = Math.max(Number(input?.pageSize) || 20, 1);
      const search = input?.search?.trim() || "";
      const statusFilter = input?.status || "all";
      const orderTypeFilter = input?.orderType || "all";
      const offset = (page - 1) * pageSize;

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });
      }

      // التحقق الصارم من الصلاحيات والأدوار
      const isChairmanRole = ctx.user.role === "board_chairman";
      const isMemberRole = ctx.user.role === "board_member";
      const isAdminRole = ["super_admin", "system_admin"].includes(ctx.user.role);

      const hasChairmanPerm = await checkPermission(ctx.user.id, "board_chairman") || await checkPermission(ctx.user.id, "board_leadership.board_chairman") || await checkPermission(ctx.user.id, "board.board_chairman");
      const hasChairmanViewPerm = await checkPermission(ctx.user.id, "board_chairman_view") || await checkPermission(ctx.user.id, "board_leadership.board_chairman_view") || await checkPermission(ctx.user.id, "board.board_chairman_view");
      const hasMemberPerm = await checkPermission(ctx.user.id, "board_member") || await checkPermission(ctx.user.id, "board_leadership.board_member") || await checkPermission(ctx.user.id, "board.board_member");

      const isChairman = isChairmanRole || hasChairmanPerm;
      const isChairmanView = hasChairmanViewPerm;
      const isMember = (isChairman || isChairmanView) ? false : (isMemberRole || hasMemberPerm || isAdminRole);

      const canAccessBoard = isChairman || isChairmanView || isMember || isAdminRole || hasMemberPerm;

      if (!canAccessBoard) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "صفحة اللوحة القيادية مخصصة حصراً لأعضاء ورئيس مجلس الإدارة أو من يمتلك صلاحية عرض اللوحة",
        });
      }

      // ==================== 1️⃣ طلبات وأوامر الصرف المعتمدة لرئيس مجلس الإدارة مع البحث والترقيم والفلترة ====================
      // لا تظهر في لوحة رئيس مجلس الإدارة إلا الأوامر المعتمدة من الإدارة (approved) أو المنفذة/المرفوضة
      const baseApprovedOrdersWhere = inArray(
        disbursementOrders.status,
        ["approved", "executed", "rejected"] as any
      );

      let statusCondition;
      if (statusFilter === "pending_approval" || statusFilter === "pending" || statusFilter === "pending_executive") {
        statusCondition = eq(disbursementOrders.status, "approved" as any);
      } else if (statusFilter === "executed" || statusFilter === "approved_done") {
        statusCondition = eq(disbursementOrders.status, "executed" as any);
      } else if (statusFilter === "rejected") {
        statusCondition = eq(disbursementOrders.status, "rejected" as any);
      } else {
        statusCondition = baseApprovedOrdersWhere;
      }

      let orderTypeCondition;
      if (orderTypeFilter === "linked") {
        orderTypeCondition = and(
          isNotNull(disbursementOrders.disbursementRequestId),
          sql`${disbursementOrders.disbursementRequestId} > 0`
        );
      } else if (orderTypeFilter === "custom") {
        orderTypeCondition = or(
          isNull(disbursementOrders.disbursementRequestId),
          eq(disbursementOrders.disbursementRequestId, 0)
        );
      }

      const searchCondition = search
        ? or(
            like(disbursementOrders.orderNumber, `%${search}%`),
            like(disbursementOrders.beneficiaryName, `%${search}%`),
            like(disbursementRequests.requestNumber, `%${search}%`),
            like(disbursementRequests.title, `%${search}%`)
          )
        : undefined;

      const conditions = [statusCondition];
      if (orderTypeCondition) conditions.push(orderTypeCondition);
      if (searchCondition) conditions.push(searchCondition);

      const finalWhere = conditions.length === 1 ? conditions[0] : and(...conditions);

      // إجمالي العدد المفلتر بحسب البحث والحالة
      const [filteredCountRes] = await db
        .select({ count: count() })
        .from(disbursementOrders)
        .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
        .where(finalWhere);

      const totalFilteredCount = Number(filteredCountRes?.count || 0);
      const totalPages = Math.max(Math.ceil(totalFilteredCount / pageSize), 1);

      // استعلام أوامر الصرف مع الترقيم والبحث والفلترة في MySQL
      const ordersRaw = await db
        .select({
          orderId: disbursementOrders.id,
          orderNumber: disbursementOrders.orderNumber,
          amount: disbursementOrders.amount,
          beneficiaryName: disbursementOrders.beneficiaryName,
          beneficiaryBank: disbursementOrders.beneficiaryBank,
          beneficiaryIban: disbursementOrders.beneficiaryIban,
          paymentMethod: disbursementOrders.paymentMethod,
          orderStatus: disbursementOrders.status,
          orderCreatedAt: disbursementOrders.createdAt,
          rejectionReason: disbursementOrders.rejectionReason,
          approvalNotes: disbursementOrders.approvalNotes,
          isCustom: sql<boolean>`CASE WHEN ${disbursementOrders.disbursementRequestId} IS NULL OR ${disbursementOrders.disbursementRequestId} = 0 THEN TRUE ELSE FALSE END`,
          requestId: disbursementRequests.id,
          requestNumber: disbursementRequests.requestNumber,
          requestTitle: disbursementRequests.title,
          requestAmount: disbursementRequests.amount,
          requestStatus: disbursementRequests.status,
        })
        .from(disbursementOrders)
        .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
        .where(finalWhere)
        .orderBy(desc(disbursementOrders.createdAt))
        .limit(pageSize)
        .offset(offset);

      const orders = ordersRaw.map((o) => ({
        id: o.orderId,
        orderId: o.orderId,
        orderNumber: o.orderNumber,
        amount: Number(o.amount || 0),
        beneficiaryName: o.beneficiaryName,
        beneficiaryBank: o.beneficiaryBank || "مصرف الراجحي",
        beneficiaryIban: o.beneficiaryIban || "-",
        paymentMethod: o.paymentMethod || "bank_transfer",
        orderStatus: o.orderStatus,
        orderCreatedAt: o.orderCreatedAt ? new Date(o.orderCreatedAt).toISOString() : new Date().toISOString(),
        rejectionReason: o.rejectionReason || null,
        approvalNotes: o.approvalNotes || null,
        isCustom: Boolean(o.isCustom),
        title: o.isCustom ? "أمر صرف مخصص" : (o.requestTitle || `طلب صرف رقم ${o.requestNumber}`),
        requestId: o.requestId || null,
        requestNumber: o.requestNumber || null,
        requestAmount: o.requestAmount ? Number(o.requestAmount) : null,
        requestStatus: o.requestStatus || null,
      }));

      // إجمالي المبالغ والإحصائيات الكلية لكافة الأوامر وحسب الحالات
      const [totalApprovedStatsRes] = await db
        .select({
          totalCount: count(),
          totalAmount: sum(disbursementOrders.amount),
        })
        .from(disbursementOrders)
        .where(baseApprovedOrdersWhere);

      const [pendingCountRes] = await db
        .select({ count: count() })
        .from(disbursementOrders)
        .where(eq(disbursementOrders.status, "approved" as any));

      const [executedCountRes] = await db
        .select({ count: count() })
        .from(disbursementOrders)
        .where(eq(disbursementOrders.status, "executed" as any));

      const [rejectedCountRes] = await db
        .select({ count: count() })
        .from(disbursementOrders)
        .where(eq(disbursementOrders.status, "rejected" as any));

    // ==================== 2️⃣ إحصائيات المساجد ====================
    const [totalMosquesRes] = await db
      .select({ value: count() })
      .from(mosques);

    const [activeMosquesRes] = await db
      .select({ value: count() })
      .from(mosques)
      .where(eq(mosques.approvalStatus, "approved" as any));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [recentMosquesRes] = await db
      .select({ value: count() })
      .from(mosques)
      .where(sql`${mosques.createdAt} >= ${thirtyDaysAgo}`);

    const mosquesByCity = await db
      .select({
        name: sql<string>`COALESCE(${mosques.city}, 'غير محدد')`,
        value: count(),
      })
      .from(mosques)
      .groupBy(sql`COALESCE(${mosques.city}, 'غير محدد')`)
      .limit(6);

    const mosquesByStatus = await db
      .select({
        status: sql<string>`COALESCE(${mosques.approvalStatus}, 'approved')`,
        value: count(),
      })
      .from(mosques)
      .groupBy(sql`COALESCE(${mosques.approvalStatus}, 'approved')`);

    // ==================== 3️⃣ إحصائيات الطلبات ====================
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

    // ==================== 4️⃣ إحصائيات الهندسة والمشاريع ====================
    const [totalProjectsRes] = await db
      .select({ value: count() })
      .from(projects);

    const [activeProjectsRes] = await db
      .select({ value: count() })
      .from(projects)
      .where(inArray(projects.status, ["in_progress", "active", "executing"] as any));

    const [completedProjectsRes] = await db
      .select({ value: count() })
      .from(projects)
      .where(inArray(projects.status, ["completed", "delivered"] as any));

    const projectsByStatusRaw = await db
      .select({
        status: sql<string>`COALESCE(${projects.status}, 'active')`,
        value: count(),
      })
      .from(projects)
      .groupBy(sql`COALESCE(${projects.status}, 'active')`);

    // ==================== 5️⃣ إحصائيات المشتريات والعقود والموردين ====================
    const [totalSuppliersRes] = await db
      .select({ value: count() })
      .from(suppliers);

    const [approvedSuppliersRes] = await db
      .select({ value: count() })
      .from(suppliers)
      .where(eq(suppliers.approvalStatus, "approved" as any));

    const suppliersByStatusRaw = await db
      .select({
        status: sql<string>`COALESCE(${suppliers.approvalStatus}, 'pending')`,
        value: count(),
      })
      .from(suppliers)
      .groupBy(sql`COALESCE(${suppliers.approvalStatus}, 'pending')`);

    const suppliersByTypeRaw = await db
      .select({
        type: sql<string>`COALESCE(${suppliers.type}, 'supplier')`,
        value: count(),
      })
      .from(suppliers)
      .groupBy(sql`COALESCE(${suppliers.type}, 'supplier')`);

    const [totalContractsRes] = await db
      .select({
        count: count(),
        totalAmount: sum(contracts.amount),
      })
      .from(contracts);

    const contractsByStatusRaw = await db
      .select({
        status: sql<string>`COALESCE(${contracts.status}, 'draft')`,
        value: count(),
        totalValue: sum(contracts.amount),
      })
      .from(contracts)
      .groupBy(sql`COALESCE(${contracts.status}, 'draft')`);

    const topSuppliersContractsRaw = await db
      .select({
        supplierId: contracts.supplierId,
        supplierName: suppliers.name,
        count: count(),
        totalValue: sum(contracts.amount),
      })
      .from(contracts)
      .leftJoin(suppliers, eq(contracts.supplierId, suppliers.id))
      .groupBy(contracts.supplierId, suppliers.name)
      .orderBy(desc(count()))
      .limit(5);

    // ==================== 6️⃣ إحصائيات الأمور المالية والصرف ====================
    const [totalProjectBudgetRes] = await db
      .select({ total: sum(projects.budget) })
      .from(projects);

    const [totalDisbursedOrdersRes] = await db
      .select({ total: sum(disbursementOrders.amount) })
      .from(disbursementOrders)
      .where(inArray(disbursementOrders.status, ["approved", "executed"] as any));

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

    const [totalReceiptVouchersRes] = await db
      .select({ total: sum(receiptVouchers.amount) })
      .from(receiptVouchers);

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
      chairmanData: {
        orders,
        linkedApprovedOrders: orders.filter((o) => !o.isCustom),
        customApprovedOrders: orders.filter((o) => o.isCustom),
        totalApprovedCount: Number(totalApprovedStatsRes?.totalCount || 0),
        totalApprovedAmount: Number(totalApprovedStatsRes?.totalAmount || 0),
        totalFilteredCount,
        totalPages,
        currentPage: page,
        pageSize,
        statusCounts: {
          all: Number(totalApprovedStatsRes?.totalCount || 0),
          pending_approval: Number(pendingCountRes?.count || 0),
          executed: Number(executedCountRes?.count || 0),
          rejected: Number(rejectedCountRes?.count || 0),
        },
      },
      mosques: {
        total: Number(totalMosquesRes?.value || 0),
        active: Number(activeMosquesRes?.value || 0),
        recent: Number(recentMosquesRes?.value || 0),
        byCity: mosquesByCity.map((c) => ({ name: c.name, value: Number(c.value) })),
        byStatus: mosquesByStatus.map((s) => ({
          name: s.status === "approved" ? "نشط" : "قيد الدراسة",
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
      projects: {
        total: Number(totalProjectsRes?.value || 0),
        active: Number(activeProjectsRes?.value || 0),
        completed: Number(completedProjectsRes?.value || 0),
        totalBudget: Number(totalProjectBudgetRes?.total || 0),
        byStatus: projectsByStatusRaw.map((p) => ({
          name: p.status === "completed" ? "مكتمل" : p.status === "in_progress" ? "قيد التنفيذ" : "مخطط",
          value: Number(p.value),
        })),
      },
      procurement: {
        totalSuppliers: Number(totalSuppliersRes?.value || 0),
        approvedSuppliers: Number(approvedSuppliersRes?.value || 0),
        totalContracts: Number(totalContractsRes?.count || 0),
        totalContractsValue: Number(totalContractsRes?.totalAmount || 0),
        suppliersByStatus: suppliersByStatusRaw.map((s) => ({
          name: s.status === "approved" ? "مؤهل ومعتمد" : s.status === "rejected" ? "مرفوض" : "قيد التأهيل والاعتماد",
          value: Number(s.value),
        })),
        suppliersByType: suppliersByTypeRaw.map((t) => ({
          name: t.type === "contractor" ? "مقاولون وتنفيذ" : t.type === "service_provider" ? "مقدمو خدمات" : "موردون عموميون",
          value: Number(t.value),
        })),
        contractsByStatus: contractsByStatusRaw.map((c) => ({
          name: c.status === "active" ? "عقود سارية ونشطة" : c.status === "completed" ? "عقود مكتملة" : c.status === "terminated" ? "عقود منتهية" : "قيد الإعداد والاعتماد",
          value: Number(c.value),
          totalValue: Number(c.totalValue || 0),
        })),
        topSuppliers: topSuppliersContractsRaw.map((s) => ({
          id: s.supplierId,
          name: s.supplierName || `مورد #${s.supplierId}`,
          count: Number(s.count),
          totalValue: Number(s.totalValue || 0),
        })),
      },
      financials: {
        totalApprovedBudget: Number(totalProjectBudgetRes?.total || 0),
        totalDisbursedAmount: Number(totalDisbursedOrdersRes?.total || 0),
        completedBankTransfersCount: Number(completedBankTransfersRes?.count || 0),
        completedBankTransfersAmount: Number(completedBankTransfersRes?.totalAmount || 0),
        totalReceiptVouchersAmount: Number(totalReceiptVouchersRes?.total || 0),
        pendingApprovalsCount: Number(totalApprovedStatsRes?.totalCount || 0),
        monthlyFlow,
      },
    };
  }),
});
