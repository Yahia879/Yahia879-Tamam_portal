import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  disbursementRequests,
  disbursementOrders,
  progressReports,
  receiptVouchers,
  custodyRequests,
  custodyExceptions,
  mosqueRequests,
  contractsEnhanced,
  users,
  projects,
} from "../../drizzle/schema";
import { eq, inArray, desc, sql, isNotNull } from "drizzle-orm";

export interface UnifiedApprovalItem {
  id: string;
  rawId: number | string;
  itemNumber: string;
  title: string;
  category: string;
  categoryKey: string;
  requesterName: string;
  requesterRole?: string;
  requiredApprover: string;
  requiredApproverKey: string;
  status: string;
  statusLabel: string;
  amount: number | null;
  createdAt: string;
  link: string;
}

export const approvalsRouter = router({
  // استعلام تجميعي لكافة المعاملات والطلبات المعلقة في النظام بانتظار الاعتماد
  getPendingApprovals: protectedProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          approver: z.string().optional(),
          search: z.string().optional(),
          onlyMine: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "قاعدة البيانات غير متاحة",
        });
      }

      const currentUser = ctx.user;
      const userRole = currentUser.role;
      const userEmail = (currentUser.email || "").toLowerCase().trim();

      // التحقق من الصلاحيات (مدير النظام، المدير التنفيذي، الإدارة المالية، أو من يملك صلاحية الاعتماد)
      const isSuperOrSystemAdmin = ["super_admin", "system_admin"].includes(userRole);
      const isExecDirector =
        ["general_manager", "executive_director"].includes(userRole) ||
        userEmail === "ceo@manarah.org.sa" ||
        userEmail === "test10@gmail.com" ||
        (currentUser as any)?.customRole?.nameAr === "المدير التنفيذي" ||
        (currentUser as any)?.customRole?.nameAr === "الرئيس التنفيذي";
      const isFinancial =
        ["financial", "financial_manager"].includes(userRole) ||
        userEmail === "solayani@manarah.org.sa" ||
        (currentUser as any)?.customRole?.nameAr === "الإدارة المالية" ||
        (currentUser as any)?.customRole?.nameAr === "المدير المالي";

      const hasPerm =
        Array.isArray((currentUser as any)?.permissions) &&
        ((currentUser as any).permissions.includes("financial_approval") ||
          (currentUser as any).permissions.includes("financial_approval.view") ||
          (currentUser as any).permissions.includes("*"));

      if (!isSuperOrSystemAdmin && !isExecDirector && !isFinancial && !hasPerm) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "غير مصرح لك بالوصول إلى مركز الاعتمادات",
        });
      }

      const items: UnifiedApprovalItem[] = [];

      // 1. طلبات الصرف المعلقة (pending / draft / pending_executive)
      try {
        const disbReqRows = await db
          .select({
            id: disbursementRequests.id,
            requestNumber: disbursementRequests.requestNumber,
            title: disbursementRequests.title,
            amount: disbursementRequests.amount,
            status: disbursementRequests.status,
            createdAt: disbursementRequests.createdAt,
            creatorName: users.name,
            creatorRole: users.role,
          })
          .from(disbursementRequests)
          .leftJoin(users, eq(disbursementRequests.requestedBy, users.id))
          .where(
            inArray(disbursementRequests.status, ["pending", "draft", "pending_executive"])
          )
          .orderBy(desc(disbursementRequests.createdAt));

        for (const row of disbReqRows) {
          const isExec = row.status === "pending_executive";
          items.push({
            id: `disb_req_${row.id}`,
            rawId: row.id,
            itemNumber: row.requestNumber || `DR-${row.id}`,
            title: row.title || `طلب صرف رقم ${row.requestNumber || row.id}`,
            category: "طلب صرف",
            categoryKey: "disbursement_request",
            requesterName: row.creatorName || "غير محدد",
            requesterRole: row.creatorRole || undefined,
            requiredApprover: isExec ? "المدير التنفيذي" : "مُعد الطلب / الإدارة المالية",
            requiredApproverKey: isExec ? "executive_director" : "financial",
            status: row.status || "pending",
            statusLabel: isExec ? "بانتظار اعتماد المدير التنفيذي" : "قيد المراجعة والاعتماد",
            amount: row.amount ? parseFloat(String(row.amount)) : null,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            link: "/disbursements",
          });
        }
      } catch (err) {
        console.error("Error fetching disbursement requests for approvals:", err);
      }

      // 2. أوامر الصرف المعلقة (pending, draft, edited, pending_executive, approved)
      try {
        const disbOrderRows = await db
          .select({
            id: disbursementOrders.id,
            orderNumber: disbursementOrders.orderNumber,
            beneficiaryName: disbursementOrders.beneficiaryName,
            amount: disbursementOrders.amount,
            status: disbursementOrders.status,
            createdAt: disbursementOrders.createdAt,
            creatorName: users.name,
          })
          .from(disbursementOrders)
          .leftJoin(users, eq(disbursementOrders.createdById, users.id))
          .where(
            inArray(disbursementOrders.status, [
              "pending",
              "draft",
              "edited",
              "pending_executive",
              "approved",
            ])
          )
          .orderBy(desc(disbursementOrders.createdAt));

        for (const row of disbOrderRows) {
          let approver = "المسؤول المالي";
          let approverKey = "financial";
          let statusLabel = "بانتظار اعتماد المسؤول المالي";

          if (row.status === "pending_executive") {
            approver = "المدير التنفيذي";
            approverKey = "executive_director";
            statusLabel = "بانتظار اعتماد المدير التنفيذي";
          } else if (row.status === "approved") {
            approver = "صاحب الصلاحية / المجلس";
            approverKey = "board_chairman";
            statusLabel = "بانتظار اعتماد صاحب الصلاحية";
          }

          items.push({
            id: `disb_ord_${row.id}`,
            rawId: row.id,
            itemNumber: row.orderNumber || `DO-${row.id}`,
            title: row.beneficiaryName
              ? `أمر صرف لـ ${row.beneficiaryName}`
              : `أمر صرف رقم ${row.orderNumber || row.id}`,
            category: "أمر صرف",
            categoryKey: "disbursement_order",
            requesterName: row.creatorName || "غير محدد",
            requiredApprover: approver,
            requiredApproverKey: approverKey,
            status: row.status || "pending",
            statusLabel,
            amount: row.amount ? parseFloat(String(row.amount)) : null,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            link: `/disbursement-orders/${row.id}`,
          });
        }
      } catch (err) {
        console.error("Error fetching disbursement orders for approvals:", err);
      }

      // 3. تقارير الإنجاز المعلقة (pending, submitted, draft, pending_executive)
      try {
        const progRows = await db
          .select({
            id: progressReports.id,
            reportNumber: progressReports.reportNumber,
            title: progressReports.title,
            status: progressReports.status,
            createdAt: progressReports.createdAt,
            creatorName: users.name,
            projectName: projects.name,
          })
          .from(progressReports)
          .leftJoin(users, eq(progressReports.createdBy, users.id))
          .leftJoin(projects, eq(progressReports.projectId, projects.id))
          .where(
            inArray(progressReports.status, ["pending", "submitted", "draft", "pending_executive"])
          )
          .orderBy(desc(progressReports.createdAt));

        for (const row of progRows) {
          const isExec = row.status === "pending_executive";
          items.push({
            id: `prog_rep_${row.id}`,
            rawId: row.id,
            itemNumber: row.reportNumber || `PR-${row.id}`,
            title: row.title || (row.projectName ? `تقرير إنجاز: ${row.projectName}` : `تقرير إنجاز رقم ${row.reportNumber || row.id}`),
            category: "تقرير إنجاز",
            categoryKey: "progress_report",
            requesterName: row.creatorName || "غير محدد",
            requiredApprover: isExec ? "المدير التنفيذي" : "مدير المشروع",
            requiredApproverKey: isExec ? "executive_director" : "project_manager",
            status: row.status || "pending",
            statusLabel: isExec ? "بانتظار اعتماد المدير التنفيذي" : "بانتظار اعتماد مدير المشروع",
            amount: null,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            link: `/progress-reports/${row.id}/print`,
          });
        }
      } catch (err) {
        console.error("Error fetching progress reports for approvals:", err);
      }

      // 4. سندات القبض المعلقة (pending_approval)
      try {
        const voucherRows = await db
          .select({
            id: receiptVouchers.id,
            voucherNumber: receiptVouchers.voucherNumber,
            payerName: receiptVouchers.payerName,
            amount: receiptVouchers.amount,
            status: receiptVouchers.status,
            createdAt: receiptVouchers.createdAt,
            creatorName: users.name,
            projectName: projects.name,
          })
          .from(receiptVouchers)
          .leftJoin(users, eq(receiptVouchers.createdById, users.id))
          .leftJoin(projects, eq(receiptVouchers.projectId, projects.id))
          .where(eq(receiptVouchers.status, "pending_approval"))
          .orderBy(desc(receiptVouchers.createdAt));

        for (const row of voucherRows) {
          items.push({
            id: `rcpt_vch_${row.id}`,
            rawId: row.id,
            itemNumber: row.voucherNumber || `RV-${row.id}`,
            title: row.payerName ? `سند قبض: ${row.payerName}` : `سند قبض رقم ${row.voucherNumber || row.id}`,
            category: "سند قبض",
            categoryKey: "receipt_voucher",
            requesterName: row.creatorName || "غير محدد",
            requiredApprover: "المسؤول المالي",
            requiredApproverKey: "financial",
            status: row.status || "pending_approval",
            statusLabel: "قيد الاعتماد المالي",
            amount: row.amount ? parseFloat(String(row.amount)) : null,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            link: "/receipt-vouchers",
          });
        }
      } catch (err) {
        console.error("Error fetching receipt vouchers for approvals:", err);
      }

      // 5. العهد المالية المعلقة (pending_executive) واستثناءات العهد (pending)
      try {
        const custReqRows = await db
          .select({
            id: custodyRequests.id,
            requestNumber: custodyRequests.requestNumber,
            title: custodyRequests.title,
            amount: custodyRequests.amount,
            status: custodyRequests.status,
            createdAt: custodyRequests.createdAt,
            creatorName: users.name,
          })
          .from(custodyRequests)
          .leftJoin(users, eq(custodyRequests.userId, users.id))
          .where(eq(custodyRequests.status, "pending_executive"))
          .orderBy(desc(custodyRequests.createdAt));

        for (const row of custReqRows) {
          items.push({
            id: `cust_req_${row.id}`,
            rawId: row.id,
            itemNumber: row.requestNumber || `CR-${row.id}`,
            title: row.title || `عهدة مالية رقم ${row.requestNumber || row.id}`,
            category: "عهدة مالية",
            categoryKey: "custody_request",
            requesterName: row.creatorName || "غير محدد",
            requiredApprover: "المدير التنفيذي",
            requiredApproverKey: "executive_director",
            status: row.status || "pending_executive",
            statusLabel: "قيد اعتماد المدير التنفيذي",
            amount: row.amount ? parseFloat(String(row.amount)) : null,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            link: "/custody-requests",
          });
        }

        const custExRows = await db
          .select({
            id: custodyExceptions.id,
            reason: custodyExceptions.reason,
            status: custodyExceptions.status,
            createdAt: custodyExceptions.createdAt,
            creatorName: users.name,
          })
          .from(custodyExceptions)
          .leftJoin(users, eq(custodyExceptions.userId, users.id))
          .where(eq(custodyExceptions.status, "pending"))
          .orderBy(desc(custodyExceptions.createdAt));

        for (const row of custExRows) {
          items.push({
            id: `cust_ex_${row.id}`,
            rawId: row.id,
            itemNumber: `EX-${row.id}`,
            title: `استثناء عهدة: ${(row.reason || "").slice(0, 50)}...`,
            category: "استثناء عهدة",
            categoryKey: "custody_request",
            requesterName: row.creatorName || "غير محدد",
            requiredApprover: "المدير التنفيذي",
            requiredApproverKey: "executive_director",
            status: row.status || "pending",
            statusLabel: "بانتظار قرار المدير التنفيذي",
            amount: null,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            link: "/custody-requests",
          });
        }
      } catch (err) {
        console.error("Error fetching custody items for approvals:", err);
      }

      // 6. أوامر الشراء المعلقة (برنامج سدانة)
      try {
        const poRequests = await db
          .select({
            id: mosqueRequests.id,
            requestNumber: mosqueRequests.requestNumber,
            programData: mosqueRequests.programData,
            createdAt: mosqueRequests.createdAt,
            creatorName: users.name,
          })
          .from(mosqueRequests)
          .leftJoin(users, eq(mosqueRequests.createdById, users.id))
          .where(isNotNull(mosqueRequests.programData));

        for (const reqRow of poRequests) {
          let pData: any = reqRow.programData;
          while (typeof pData === "string") {
            try {
              pData = JSON.parse(pData);
            } catch {
              break;
            }
          }
          if (!pData || typeof pData !== "object") continue;

          const sedanaProc = pData.sedanaProcurement;
          if (!sedanaProc) continue;

          const savedPOs = Array.isArray(sedanaProc.purchaseOrders) ? sedanaProc.purchaseOrders : [];
          const activePO = sedanaProc.activePurchaseOrder;
          const allPOs = [...savedPOs];
          if (activePO && activePO.orderNumber && !allPOs.some((p: any) => p.orderNumber === activePO.orderNumber)) {
            allPOs.push(activePO);
          }

          for (const po of allPOs) {
            const st = po.status || "draft";
            // معلق إذا لم يكن معتمداً أو منفذاً
            if (st !== "approved" && st !== "executed" && st !== "ready") {
              let poTotal = 0;
              if (Array.isArray(po.items)) {
                poTotal = po.items.reduce((sum: number, it: any) => {
                  const qty = parseFloat(String(it.quantity || "1"));
                  const price = parseFloat(String(it.unitPrice || it.price || "0"));
                  return sum + (isNaN(qty * price) ? 0 : qty * price);
                }, 0);
              }

              items.push({
                id: `po_${reqRow.id}_${po.orderNumber || "draft"}`,
                rawId: reqRow.id,
                itemNumber: po.orderNumber || `PO-${reqRow.id}`,
                title: po.supplierName
                  ? `أمر شراء من مورد (${po.supplierName})`
                  : `أمر شراء للطلب #${reqRow.requestNumber || reqRow.id}`,
                category: "أمر شراء",
                categoryKey: "purchase_order",
                requesterName: po.requesterName || reqRow.creatorName || "طالب الشراء",
                requiredApprover: "المدير التنفيذي",
                requiredApproverKey: "executive_director",
                status: st,
                statusLabel: "بانتظار اعتماد المدير التنفيذي",
                amount: poTotal > 0 ? poTotal : null,
                createdAt: po.orderDate
                  ? new Date(po.orderDate).toISOString()
                  : (reqRow.createdAt ? new Date(reqRow.createdAt).toISOString() : new Date().toISOString()),
                link: `/purchase-orders`,
              });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching purchase orders for approvals:", err);
      }

      // 7. العقود المعلقة (pending_approval)
      try {
        const contractRows = await db
          .select({
            id: contractsEnhanced.id,
            contractNumber: contractsEnhanced.contractNumber,
            contractTitle: contractsEnhanced.contractTitle,
            contractAmount: contractsEnhanced.contractAmount,
            status: contractsEnhanced.status,
            createdAt: contractsEnhanced.createdAt,
            creatorName: users.name,
          })
          .from(contractsEnhanced)
          .leftJoin(users, eq(contractsEnhanced.createdBy, users.id))
          .where(eq(contractsEnhanced.status, "pending_approval"))
          .orderBy(desc(contractsEnhanced.createdAt));

        for (const row of contractRows) {
          items.push({
            id: `cntr_${row.id}`,
            rawId: row.id,
            itemNumber: row.contractNumber || `CON-${row.id}`,
            title: row.contractTitle || `عقد رقم ${row.contractNumber || row.id}`,
            category: "عقد",
            categoryKey: "contract",
            requesterName: row.creatorName || "غير محدد",
            requiredApprover: "المدير التنفيذي",
            requiredApproverKey: "executive_director",
            status: row.status || "pending_approval",
            statusLabel: "قيد الاعتماد النهائي",
            amount: row.contractAmount ? parseFloat(String(row.contractAmount)) : null,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            link: `/contracts/${row.id}/preview`,
          });
        }
      } catch (err) {
        console.error("Error fetching contracts for approvals:", err);
      }

      // 8. طلبات المشاريع في مرحلة التقييم المالي واعتماد العرض (financial_eval_and_approval)
      try {
        const finStageRequests = await db
          .select({
            id: mosqueRequests.id,
            requestNumber: mosqueRequests.requestNumber,
            descriptiveName: mosqueRequests.descriptiveName,
            mosqueName: mosqueRequests.mosqueName,
            programName: mosqueRequests.programName,
            createdAt: mosqueRequests.createdAt,
            creatorName: users.name,
          })
          .from(mosqueRequests)
          .leftJoin(users, eq(mosqueRequests.createdById, users.id))
          .where(eq(mosqueRequests.currentStage, "financial_eval_and_approval"))
          .orderBy(desc(mosqueRequests.createdAt));

        for (const row of finStageRequests) {
          items.push({
            id: `proj_eval_${row.id}`,
            rawId: row.id,
            itemNumber: row.requestNumber || `REQ-${row.id}`,
            title: row.mosqueName || row.descriptiveName || `طلب مشروع #${row.id}`,
            category: "اعتماد مالي للطلب",
            categoryKey: "project_quotation",
            requesterName: row.creatorName || "غير محدد",
            requiredApprover: "المسؤول المالي / المدير التنفيذي",
            requiredApproverKey: "financial",
            status: "financial_eval_and_approval",
            statusLabel: "مرحلة التقييم واعتماد العرض",
            amount: null,
            createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
            link: `/requests/${row.id}`,
          });
        }
      } catch (err) {
        console.error("Error fetching project requests for financial approvals:", err);
      }

      // فرز النتائج زمنياً (الأحدث أولاً)
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // إحصائيات عامة قبل التصفية
      const counts = {
        total: items.length,
        pendingExecutive: items.filter(
          (i) => i.requiredApproverKey === "executive_director" || i.requiredApprover.includes("المدير التنفيذي")
        ).length,
        pendingFinancial: items.filter(
          (i) => i.requiredApproverKey === "financial" || i.requiredApprover.includes("المالي")
        ).length,
        pendingOther: items.filter(
          (i) =>
            i.requiredApproverKey !== "executive_director" &&
            i.requiredApproverKey !== "financial" &&
            !i.requiredApprover.includes("المدير التنفيذي") &&
            !i.requiredApprover.includes("المالي")
        ).length,
        byCategory: {} as Record<string, number>,
        byApprover: {} as Record<string, number>,
      };

      for (const item of items) {
        counts.byCategory[item.categoryKey] = (counts.byCategory[item.categoryKey] || 0) + 1;
        counts.byApprover[item.requiredApproverKey] =
          (counts.byApprover[item.requiredApproverKey] || 0) + 1;
      }

      // تطبيق التصفية
      let filtered = [...items];

      if (input?.onlyMine) {
        if (isExecDirector) {
          filtered = filtered.filter(
            (i) => i.requiredApproverKey === "executive_director" || i.requiredApprover.includes("المدير التنفيذي")
          );
        } else if (isFinancial) {
          filtered = filtered.filter(
            (i) => i.requiredApproverKey === "financial" || i.requiredApprover.includes("المالي")
          );
        }
      }

      if (input?.category && input.category !== "all") {
        filtered = filtered.filter((i) => i.categoryKey === input.category);
      }

      if (input?.approver && input.approver !== "all") {
        filtered = filtered.filter((i) => i.requiredApproverKey === input.approver);
      }

      if (input?.search && input.search.trim()) {
        const q = input.search.trim().toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.itemNumber.toLowerCase().includes(q) ||
            i.title.toLowerCase().includes(q) ||
            i.requesterName.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q) ||
            i.requiredApprover.toLowerCase().includes(q)
        );
      }

      return {
        items: filtered,
        counts,
        totalFiltered: filtered.length,
      };
    }),
});
