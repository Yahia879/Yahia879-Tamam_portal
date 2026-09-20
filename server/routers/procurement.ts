import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { mosqueRequests, mosques, quantitySchedules } from "../../drizzle/schema";
import { eq, desc, and, sql, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const procurementRouter = router({
  // ==========================================
  // 1. استعراض كافة أوامر الشراء وإحصائياتها
  // ==========================================
  listPurchaseOrders: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      // جلب جميع الطلبات التي تحتوي على برنامج سدانة أو بيانات تأمين
      const requestsWithMosque = await db
        .select({
          request: mosqueRequests,
          mosque: mosques,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(isNotNull(mosqueRequests.programData))
        .orderBy(desc(mosqueRequests.createdAt));

      // جلب بنود جداول الكميات لجميع الطلبات لربطها بالبنود المخصصة
      const allBoqItems = await db
        .select({
          id: quantitySchedules.id,
          requestId: quantitySchedules.requestId,
          itemName: quantitySchedules.itemName,
          itemDescription: quantitySchedules.itemDescription,
          unit: quantitySchedules.unit,
          quantity: quantitySchedules.quantity,
        })
        .from(quantitySchedules);

      const boqByRequest = new Map<number, any[]>();
      allBoqItems.forEach((b) => {
        if (!b.requestId) return;
        const current = boqByRequest.get(b.requestId) || [];
        current.push(b);
        boqByRequest.set(b.requestId, current);
      });

      const orders: any[] = [];

      for (const row of requestsWithMosque) {
        const req = row.request;
        const mosque = row.mosque;

        let pData: any = req.programData;
        while (typeof pData === "string") {
          try {
            pData = JSON.parse(pData);
          } catch {
            break;
          }
        }

        if (!pData || typeof pData !== "object") continue;

        const sedanaProc = pData.sedanaProcurement;
        const allocations = sedanaProc?.itemsAllocation || {};
        const activePO = sedanaProc?.activePurchaseOrder || null;

        // هل توجد بنود مخصصة لأمر الشراء أو تم إعداد أمر شراء مسبقاً؟
        const allocatedItemIds = Object.keys(allocations).filter(
          (k) => allocations[k] === "purchase_order"
        );

        if (allocatedItemIds.length === 0 && !activePO) {
          continue;
        }

        // استخراج تفاصيل البنود
        const reqBoq = boqByRequest.get(req.id) || [];
        let itemsForPO: any[] = [];

        if (reqBoq.length > 0) {
          itemsForPO = reqBoq
            .filter((it) => allocatedItemIds.includes(String(it.id)))
            .map((it, idx) => ({
              id: String(it.id),
              itemName: it.itemName || `بند رقم ${idx + 1}`,
              description: it.itemDescription || "",
              quantity: parseFloat(it.quantity || "1"),
              unit: it.unit || "وحدة",
            }));
        }

        // fallback if items not found in quantitySchedules
        if (itemsForPO.length === 0 && pData?.evaluation?.items) {
          const evalItems = Array.isArray(pData.evaluation.items) ? pData.evaluation.items : [];
          itemsForPO = evalItems
            .filter((it: any) => allocatedItemIds.includes(String(it.key || it.id)))
            .map((it: any, idx: number) => ({
              id: String(it.key || it.id || idx + 1),
              itemName: it.name || it.itemName || `بند ${idx + 1}`,
              description: it.description || it.spec || "",
              quantity: parseFloat(it.approvedQty || it.requestedQty || "1"),
              unit: it.unit || "وحدة",
            }));
        }

        if (itemsForPO.length === 0 && allocatedItemIds.length > 0) {
          itemsForPO = allocatedItemIds.map((id, idx) => ({
            id,
            itemName: `بند رقم ${idx + 1}`,
            description: "",
            quantity: 1,
            unit: "وحدة",
          }));
        }

        const suppliersAlloc = sedanaProc?.suppliersAllocation || {};
        const itemSuppMap = sedanaProc?.itemSupplierMap || {};

        let poSupplierName = "";
        for (const itemId of allocatedItemIds) {
          if (itemSuppMap[itemId]?.supplierName) {
            poSupplierName = itemSuppMap[itemId].supplierName;
            break;
          }
        }
        if (!poSupplierName) {
          for (const sKey of Object.keys(suppliersAlloc)) {
            if (suppliersAlloc[sKey]?.method === "purchase_order" && suppliersAlloc[sKey]?.supplierName) {
              poSupplierName = suppliersAlloc[sKey].supplierName;
              break;
            }
          }
        }

        const poNumber = activePO?.orderNumber || `PO-${req.id}-${new Date().getFullYear()}`;
        const poDate = activePO?.orderDate || (req.createdAt ? new Date(req.createdAt).toISOString().split("T")[0] : "");
        // إذا كان الطلب في مرحلة "التشغيل والتنفيذ" (أو ما بعدها) تكون الحالة معتمد، وعدا ذلك مسودة
        const isExecutionOrBeyond = req.currentStage === "execution" || req.currentStage === "handover" || req.currentStage === "closed";
        const status = isExecutionOrBeyond ? "approved" : "draft";
        const directedTo = activePO?.directedTo || (poSupplierName ? `إلى إدارة المشتريات (${poSupplierName})` : "إلى إدارة المشتريات");

        orders.push({
          id: req.id,
          requestId: req.id,
          requestNumber: req.requestNumber || String(req.id),
          descriptiveName: req.descriptiveName || null,
          currentStage: req.currentStage,
          mosqueId: mosque?.id || null,
          mosqueName: mosque?.name || "المسجد",
          mosqueCity: mosque?.city || "",
          mosqueRegion: mosque?.governorate || "",
          orderNumber: poNumber,
          orderDate: poDate,
          directedTo,
          requesterName: activePO?.requesterName || "طالب الشراء",
          requesterRole: activePO?.requesterRole || "طالب الشراء / إدارة المشاريع",
          approverName: activePO?.approverName || "المدير التنفيذي",
          approverRole: activePO?.approverRole || "المدير التنفيذي",
          approverSignatureUrl: activePO?.approverSignatureUrl || "",
          notes: activePO?.notes || "",
          status,
          items: itemsForPO,
          itemsCount: itemsForPO.length,
          createdAt: req.createdAt,
          updatedAt: sedanaProc?.updatedAt || req.updatedAt || req.createdAt,
        });
      }

      // التصفية بالبحث
      let filtered = orders;
      if (input.search && input.search.trim()) {
        const q = input.search.trim().toLowerCase();
        const cleanQ = q.replace(/^#/, "").replace(/^طلب\s*#?/, "").trim();
        filtered = filtered.filter((o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.descriptiveName?.toLowerCase().includes(q) ||
          o.directedTo?.toLowerCase().includes(q) ||
          o.mosqueName?.toLowerCase().includes(q) ||
          o.mosqueCity?.toLowerCase().includes(q) ||
          o.mosqueRegion?.toLowerCase().includes(q) ||
          o.requestNumber?.toLowerCase().includes(q) ||
          (cleanQ && o.requestNumber?.toLowerCase().includes(cleanQ)) ||
          o.requesterName?.toLowerCase().includes(q) ||
          o.approverName?.toLowerCase().includes(q) ||
          o.items?.some((it: any) => it.itemName?.toLowerCase().includes(q) || it.description?.toLowerCase().includes(q))
        );
      }

      // التصفية بالحالة
      if (input.status && input.status !== "all") {
        if (input.status === "approved" || input.status === "executed") {
          filtered = filtered.filter((o) => o.status === "approved");
        } else if (input.status === "draft") {
          filtered = filtered.filter((o) => o.status === "draft");
        } else {
          filtered = filtered.filter((o) => o.status === input.status);
        }
      }

      // الإحصائيات الشاملة
      const stats = {
        totalOrders: orders.length,
        approvedCount: orders.filter((o) => o.status === "approved").length,
        draftCount: orders.filter((o) => o.status === "draft").length,
        executedCount: orders.filter((o) => o.status === "approved").length,
        totalItemsCount: orders.reduce((sum, o) => sum + (o.itemsCount || 0), 0),
        totalMosquesCount: new Set(orders.map((o) => o.mosqueId).filter(Boolean)).size,
      };

      const total = filtered.length;
      const startIndex = (input.page - 1) * input.limit;
      const paginatedOrders = filtered.slice(startIndex, startIndex + input.limit);

      return {
        orders: paginatedOrders,
        total,
        stats,
      };
    }),

  // ===============================================
  // 2. استعراض كافة خطابات المسؤولية المجتمعية
  // ===============================================
  listCsrLetters: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const requestsWithMosque = await db
        .select({
          request: mosqueRequests,
          mosque: mosques,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(isNotNull(mosqueRequests.programData))
        .orderBy(desc(mosqueRequests.createdAt));

      const allBoqItems = await db
        .select({
          id: quantitySchedules.id,
          requestId: quantitySchedules.requestId,
          itemName: quantitySchedules.itemName,
          itemDescription: quantitySchedules.itemDescription,
          unit: quantitySchedules.unit,
          quantity: quantitySchedules.quantity,
        })
        .from(quantitySchedules);

      const boqByRequest = new Map<number, any[]>();
      allBoqItems.forEach((b) => {
        if (!b.requestId) return;
        const current = boqByRequest.get(b.requestId) || [];
        current.push(b);
        boqByRequest.set(b.requestId, current);
      });

      const letters: any[] = [];

      for (const row of requestsWithMosque) {
        const req = row.request;
        const mosque = row.mosque;

        let pData: any = req.programData;
        while (typeof pData === "string") {
          try {
            pData = JSON.parse(pData);
          } catch {
            break;
          }
        }

        if (!pData || typeof pData !== "object") continue;

        const sedanaProc = pData.sedanaProcurement;
        const allocations = sedanaProc?.itemsAllocation || {};
        const activeCSR = sedanaProc?.activeCsrLetter || null;

        const allocatedItemIds = Object.keys(allocations).filter(
          (k) => allocations[k] === "csr_letter"
        );

        if (allocatedItemIds.length === 0 && !activeCSR) {
          continue;
        }

        const reqBoq = boqByRequest.get(req.id) || [];
        let itemsForCSR: any[] = [];

        if (reqBoq.length > 0) {
          itemsForCSR = reqBoq
            .filter((it) => allocatedItemIds.includes(String(it.id)))
            .map((it, idx) => ({
              id: String(it.id),
              itemName: it.itemName || `صنف رقم ${idx + 1}`,
              description: it.itemDescription || "",
              quantity: parseFloat(it.quantity || "1"),
              unit: it.unit || "وحدة",
            }));
        }

        if (itemsForCSR.length === 0 && pData?.evaluation?.items) {
          const evalItems = Array.isArray(pData.evaluation.items) ? pData.evaluation.items : [];
          itemsForCSR = evalItems
            .filter((it: any) => allocatedItemIds.includes(String(it.key || it.id)))
            .map((it: any, idx: number) => ({
              id: String(it.key || it.id || idx + 1),
              itemName: it.name || it.itemName || `صنف ${idx + 1}`,
              description: it.description || it.spec || "",
              quantity: parseFloat(it.approvedQty || it.requestedQty || "1"),
              unit: it.unit || "وحدة",
            }));
        }

        if (itemsForCSR.length === 0 && allocatedItemIds.length > 0) {
          itemsForCSR = allocatedItemIds.map((id, idx) => ({
            id,
            itemName: `صنف رقم ${idx + 1}`,
            description: "",
            quantity: 1,
            unit: "وحدة",
          }));
        }

        const suppliersAlloc = sedanaProc?.suppliersAllocation || {};
        const itemSuppMap = sedanaProc?.itemSupplierMap || {};

        let csrSupplierName = "";
        for (const itemId of allocatedItemIds) {
          if (itemSuppMap[itemId]?.supplierName) {
            csrSupplierName = itemSuppMap[itemId].supplierName;
            break;
          }
        }
        if (!csrSupplierName) {
          for (const sKey of Object.keys(suppliersAlloc)) {
            if (suppliersAlloc[sKey]?.method === "csr_letter" && suppliersAlloc[sKey]?.supplierName) {
              csrSupplierName = suppliersAlloc[sKey].supplierName;
              break;
            }
          }
        }

        const letterNumber = activeCSR?.letterNumber || `CSR-${req.id}-${new Date().getFullYear()}`;
        const letterDate = activeCSR?.letterDate || (req.createdAt ? new Date(req.createdAt).toISOString().split("T")[0] : "");
        // إذا كان الطلب في مرحلة "التشغيل والتنفيذ" (أو ما بعدها) تكون الحالة معتمد، وعدا ذلك مسودة
        const isExecutionOrBeyond = req.currentStage === "execution" || req.currentStage === "handover" || req.currentStage === "closed";
        const status = isExecutionOrBeyond ? "approved" : "draft";
        const recipientName = activeCSR?.recipientName || csrSupplierName || "الجهة المانحة / الشريك المجتمعي";

        letters.push({
          id: req.id,
          requestId: req.id,
          requestNumber: req.requestNumber || String(req.id),
          descriptiveName: req.descriptiveName || null,
          currentStage: req.currentStage,
          mosqueId: mosque?.id || null,
          mosqueName: mosque?.name || "المسجد",
          mosqueCity: mosque?.city || "",
          letterNumber,
          letterDate,
          salutation: activeCSR?.salutation || "السادة",
          recipientName,
          honorific: activeCSR?.honorific || "المحترمون",
          projectName: activeCSR?.projectName || `مشروع جامع ${mosque?.name || "المسجد"}`,
          signatoryTitle: activeCSR?.signatoryTitle || "المدير التنفيذي",
          signatoryName: activeCSR?.signatoryName || "المهندس المفوض بالتوقيع",
          notes: activeCSR?.additionalNotes || "",
          status,
          items: itemsForCSR,
          itemsCount: itemsForCSR.length,
          createdAt: req.createdAt,
          updatedAt: sedanaProc?.updatedAt || req.updatedAt || req.createdAt,
        });
      }

      let filtered = letters;
      if (input.search && input.search.trim()) {
        const q = input.search.trim().toLowerCase();
        const cleanQ = q.replace(/^#/, "").replace(/^طلب\s*#?/, "").trim();
        filtered = filtered.filter((l) =>
          l.letterNumber?.toLowerCase().includes(q) ||
          l.descriptiveName?.toLowerCase().includes(q) ||
          l.recipientName?.toLowerCase().includes(q) ||
          l.projectName?.toLowerCase().includes(q) ||
          l.mosqueName?.toLowerCase().includes(q) ||
          l.mosqueCity?.toLowerCase().includes(q) ||
          l.requestNumber?.toLowerCase().includes(q) ||
          (cleanQ && l.requestNumber?.toLowerCase().includes(cleanQ)) ||
          l.signatoryName?.toLowerCase().includes(q) ||
          l.signatoryTitle?.toLowerCase().includes(q) ||
          l.items?.some((it: any) => it.itemName?.toLowerCase().includes(q) || it.description?.toLowerCase().includes(q))
        );
      }

      if (input.status && input.status !== "all") {
        if (input.status === "approved") {
          filtered = filtered.filter((l) => l.status === "approved" || l.status === "ready");
        } else if (input.status === "draft") {
          filtered = filtered.filter((l) => l.status === "draft");
        } else {
          filtered = filtered.filter((l) => l.status === input.status);
        }
      }

      const stats = {
        totalLetters: letters.length,
        approvedCount: letters.filter((l) => l.status === "approved").length,
        draftCount: letters.filter((l) => l.status === "draft").length,
        totalRecipients: new Set(letters.map((l) => l.recipientName).filter(Boolean)).size,
        totalItemsCount: letters.reduce((sum, l) => sum + (l.itemsCount || 0), 0),
        totalMosquesCount: new Set(letters.map((l) => l.mosqueId).filter(Boolean)).size,
      };

      const total = filtered.length;
      const startIndex = (input.page - 1) * input.limit;
      const paginatedLetters = filtered.slice(startIndex, startIndex + input.limit);

      return {
        letters: paginatedLetters,
        total,
        stats,
      };
    }),
});
