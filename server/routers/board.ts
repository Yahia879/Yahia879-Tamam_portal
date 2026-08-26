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
  contractsEnhanced,
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
  technical_eval: "التقييم الفني",
  boq_preparation: "جدول الكميات",
  financial_eval: "التقييم المالي",
  financial_eval_and_approval: "التقييم المالي",
  quotation_approval: "اعتماد العرض",
  contracting: "التعاقد",
  execution: "مرحلة التنفيذ",
  handover: "الاستلام والتسليم",
  closed: "مكتمل ومغلق",
  director_review: "مراجعة المدير",
  board_review: "مراجعة المجلس",
  board_approval: "اعتماد المجلس",
  approved: "معتمد",
  completed: "مكتمل",
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
          sql`${disbursementOrders.disbursementRequestId} > 0`,
          or(isNull(disbursementRequests.isDirect), eq(disbursementRequests.isDirect, false))
        );
      } else if (orderTypeFilter === "custom") {
        orderTypeCondition = or(
          isNull(disbursementOrders.disbursementRequestId),
          eq(disbursementOrders.disbursementRequestId, 0),
          eq(disbursementRequests.isDirect, true)
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
          executiveNotes: disbursementOrders.executiveNotes,
          disbursementRequestId: disbursementOrders.disbursementRequestId,
          isDirect: disbursementRequests.isDirect,
          isCustom: sql<boolean>`CASE WHEN ${disbursementOrders.disbursementRequestId} IS NULL OR ${disbursementOrders.disbursementRequestId} = 0 OR ${disbursementRequests.isDirect} = TRUE THEN TRUE ELSE FALSE END`,
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

      const orders = ordersRaw.map((o) => {
        const isCustomOrder = !o.disbursementRequestId || Number(o.disbursementRequestId) === 0 || !o.requestId || Boolean(o.isDirect);
        return {
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
          executiveNotes: o.executiveNotes || null,
          isCustom: isCustomOrder,
          title: isCustomOrder ? (o.requestTitle || "أمر صرف مخصص") : (o.requestTitle || `طلب صرف رقم ${o.requestNumber}`),
          requestId: isCustomOrder ? null : (o.requestId || null),
          requestNumber: isCustomOrder ? null : (o.requestNumber || null),
          requestAmount: isCustomOrder ? null : (o.requestAmount ? Number(o.requestAmount) : null),
          requestStatus: isCustomOrder ? null : (o.requestStatus || null),
        };
      });

      // إجمالي المبالغ والإحصائيات الكلية لكافة الأوامر وحسب الحالات
      const [totalApprovedStatsRes] = await db
        .select({
          totalCount: count(),
          totalAmount: sum(disbursementOrders.amount),
        })
        .from(disbursementOrders)
        .where(baseApprovedOrdersWhere);

      const [linkedApprovedCountRes] = await db
        .select({ count: count() })
        .from(disbursementOrders)
        .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
        .where(
          and(
            baseApprovedOrdersWhere,
            isNotNull(disbursementOrders.disbursementRequestId),
            sql`${disbursementOrders.disbursementRequestId} > 0`,
            or(isNull(disbursementRequests.isDirect), eq(disbursementRequests.isDirect, false))
          )
        );

      const [customApprovedCountRes] = await db
        .select({ count: count() })
        .from(disbursementOrders)
        .leftJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
        .where(
          and(
            baseApprovedOrdersWhere,
            or(
              isNull(disbursementOrders.disbursementRequestId),
              eq(disbursementOrders.disbursementRequestId, 0),
              eq(disbursementRequests.isDirect, true)
            )
          )
        );

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
      .where(eq(mosqueRequests.status, "completed" as any));

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
      .innerJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
      .where(and(isNotNull(mosqueRequests.mosqueId), isNotNull(mosques.name)))
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

    const [totalProjectBudgetRes] = await db
      .select({ total: sum(projects.budget) })
      .from(projects);

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

    const [approvedContractsRes] = await db
      .select({
        count: count(),
        totalAmount: sum(contractsEnhanced.contractAmount),
      })
      .from(contractsEnhanced)
      .where(eq(contractsEnhanced.status, "approved" as any));

    const [totalContractsRes] = await db
      .select({
        count: count(),
        totalAmount: sum(contractsEnhanced.contractAmount),
      })
      .from(contractsEnhanced);

    const contractsByStatusRaw = await db
      .select({
        status: sql<string>`COALESCE(${contractsEnhanced.status}, 'draft')`,
        value: count(),
        totalValue: sum(contractsEnhanced.contractAmount),
      })
      .from(contractsEnhanced)
      .groupBy(sql`COALESCE(${contractsEnhanced.status}, 'draft')`);

    const topSuppliersContractsRaw = await db
      .select({
        supplierId: contractsEnhanced.supplierId,
        supplierName: sql<string>`COALESCE(${suppliers.name}, ${contractsEnhanced.secondPartyName}, 'مورد غير محدد')`,
        count: count(),
        totalValue: sum(contractsEnhanced.contractAmount),
      })
      .from(contractsEnhanced)
      .leftJoin(suppliers, eq(contractsEnhanced.supplierId, suppliers.id))
      .groupBy(contractsEnhanced.supplierId, suppliers.name, contractsEnhanced.secondPartyName)
      .orderBy(desc(count()))
      .limit(5);

    // ==================== 6️⃣ إحصائيات الأمور المالية والصرف ====================
    // 1. طلبات الصرف المعتمدة
    const [approvedDisbursementRequestsRes] = await db
      .select({
        count: count(),
        totalAmount: sum(disbursementRequests.amount),
      })
      .from(disbursementRequests)
      .where(inArray(disbursementRequests.status, ["approved", "completed", "paid", "executing"] as any));

    // 2. إجمالي أوامر الصرف
    const [totalDisbursementOrdersRes] = await db
      .select({
        count: count(),
        totalAmount: sum(disbursementOrders.amount),
      })
      .from(disbursementOrders);

    // 3. أوامر الصرف المعتمدة (المطابقة لصفحة /board-executive)
    const [executiveApprovedOrdersRes] = await db
      .select({
        count: count(),
        totalAmount: sum(disbursementOrders.amount),
      })
      .from(disbursementOrders)
      .where(inArray(disbursementOrders.status, ["approved", "executed"] as any));

    // 4. سندات القبض المعتمدة (المطابقة لصفحة /receipt-vouchers)
    const [approvedReceiptVouchersRes] = await db
      .select({
        count: count(),
        totalAmount: sum(receiptVouchers.amount),
      })
      .from(receiptVouchers)
      .where(eq(receiptVouchers.status, "approved" as any));

    // 5. أوامر الصرف المنفذة (المطابقة لحالة "منفذ" في صفحة /disbursement-orders)
    const [executedDisbursementOrdersRes] = await db
      .select({
        count: count(),
        totalAmount: sum(disbursementOrders.amount),
      })
      .from(disbursementOrders)
      .where(eq(disbursementOrders.status, "executed" as any));

    // 6. مخطط سير طلبات الصرف عبر الأيام (مطابق لصفحة /financial-report)
    const requestsTimelineRaw = await db
      .select({
        date: sql<string>`DATE_FORMAT(${disbursementRequests.createdAt}, '%Y-%m-%d')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(disbursementRequests)
      .where(inArray(disbursementRequests.status, ["pending", "approved", "rejected"]))
      .groupBy(sql`DATE(${disbursementRequests.createdAt})`)
      .orderBy(sql`DATE(${disbursementRequests.createdAt})`)
      .limit(30);

    const requestsTimeline = requestsTimelineRaw.map((item) => ({
      date: item.date,
      count: Number(item.count || 0),
    }));

    // 7. مخطط سير أوامر الصرف عبر الأيام (مطابق لصفحة /financial-report)
    const ordersTimelineRaw = await db
      .select({
        date: sql<string>`DATE_FORMAT(${disbursementOrders.createdAt}, '%Y-%m-%d')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(disbursementOrders)
      .where(inArray(disbursementOrders.status, ["approved", "pending", "rejected", "edited", "executed", "pending_executive"] as any))
      .groupBy(sql`DATE(${disbursementOrders.createdAt})`)
      .orderBy(sql`DATE(${disbursementOrders.createdAt})`)
      .limit(30);

    const ordersTimeline = ordersTimelineRaw.map((item) => ({
      date: item.date,
      count: Number(item.count || 0),
    }));

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
        totalLinkedApprovedCount: Number(linkedApprovedCountRes?.count || 0),
        totalCustomApprovedCount: Number(customApprovedCountRes?.count || 0),
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
        totalContracts: Number(approvedContractsRes?.count || 0),
        totalContractsValue: Number(totalContractsRes?.totalAmount || approvedContractsRes?.totalAmount || 0),
        suppliersByStatus: suppliersByStatusRaw.map((s) => ({
          name: s.status === "approved" ? "مؤهل ومعتمد" : s.status === "rejected" ? "مرفوض" : "قيد التأهيل والاعتماد",
          value: Number(s.value),
        })),
        suppliersByType: suppliersByTypeRaw.map((t) => ({
          name: t.type === "contractor" ? "مقاولون وتنفيذ" : t.type === "service_provider" ? "مقدمو خدمات" : "موردون عموميون",
          value: Number(t.value),
        })),
        contractsByStatus: contractsByStatusRaw.map((c) => ({
          name: c.status === "approved" ? "عقود معتمدة وسارية" : c.status === "completed" ? "عقود مكتملة" : c.status === "cancelled" ? "عقود ملغاة" : "مسودات وقيد الإعداد",
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
        approvedDisbursementRequestsCount: Number(approvedDisbursementRequestsRes?.count || 0),
        approvedDisbursementRequestsAmount: Number(approvedDisbursementRequestsRes?.totalAmount || 0),
        totalApprovedBudget: Number(approvedDisbursementRequestsRes?.totalAmount || 0),

        totalDisbursementOrdersCount: Number(totalDisbursementOrdersRes?.count || 0),
        totalDisbursementOrdersAmount: Number(totalDisbursementOrdersRes?.totalAmount || 0),
        totalDisbursedAmount: Number(totalDisbursementOrdersRes?.totalAmount || 0),

        executedDisbursementOrdersCount: Number(executedDisbursementOrdersRes?.count || 0),
        executedDisbursementOrdersAmount: Number(executedDisbursementOrdersRes?.totalAmount || 0),

        executiveApprovedOrdersCount: Number(executiveApprovedOrdersRes?.count || 0),
        executiveApprovedOrdersAmount: Number(executiveApprovedOrdersRes?.totalAmount || 0),
        completedBankTransfersCount: Number(executiveApprovedOrdersRes?.count || 0),
        completedBankTransfersAmount: Number(executiveApprovedOrdersRes?.totalAmount || 0),

        approvedReceiptVouchersCount: Number(approvedReceiptVouchersRes?.count || 0),
        approvedReceiptVouchersAmount: Number(approvedReceiptVouchersRes?.totalAmount || 0),
        totalReceiptVouchersAmount: Number(approvedReceiptVouchersRes?.totalAmount || 0),

        pendingApprovalsCount: Number(totalApprovedStatsRes?.totalCount || 0),
        monthlyFlow,
        requestsTimeline,
        ordersTimeline,
      },
    };
  }),
});
