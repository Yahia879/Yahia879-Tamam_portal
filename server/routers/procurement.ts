import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { mosqueRequests, mosques, quantitySchedules, suppliers, disbursementOrders } from "../../drizzle/schema";
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

      // جلب أوامر الصرف لمطابقة كل أمر شراء بأمر صرفه إن وجد
      const disbOrders = await db
        .select({
          id: disbursementOrders.id,
          orderNumber: disbursementOrders.orderNumber,
          purchaseOrderNumber: disbursementOrders.purchaseOrderNumber,
          status: disbursementOrders.status,
          amount: disbursementOrders.amount,
          adminFees: disbursementOrders.adminFees,
          executedAt: disbursementOrders.executedAt,
        })
        .from(disbursementOrders);

      const disbByPo = new Map<string, any>();
      disbOrders.forEach((d) => {
        if (d.purchaseOrderNumber) disbByPo.set(d.purchaseOrderNumber.trim(), d);
      });

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
        const savedPOs = Array.isArray(sedanaProc?.purchaseOrders) ? sedanaProc.purchaseOrders : [];

        // هل توجد بنود مخصصة لأمر الشراء أو تم إعداد أمر شراء مسبقاً؟
        const allocatedItemIds = Object.keys(allocations).filter(
          (k) => allocations[k] === "purchase_order"
        );

        if (allocatedItemIds.length === 0 && !activePO && savedPOs.length === 0) {
          continue;
        }

        // استخراج تفاصيل البنود
        const reqBoq = boqByRequest.get(req.id) || [];
        let itemsForPO: any[] = [];

        if (activePO?.items && Array.isArray(activePO.items) && activePO.items.length > 0) {
          itemsForPO = activePO.items;
        } else if (reqBoq.length > 0) {
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

        const poList: any[] = [...savedPOs];
        if (activePO && !poList.some((p: any) => p.orderNumber === activePO.orderNumber)) {
          poList.push(activePO);
        }

        const isExecutionOrBeyond = req.currentStage === "execution" || req.currentStage === "handover" || req.currentStage === "closed";

        if (poList.length > 0) {
          poList.forEach((po: any, pIdx: number) => {
            const poNumber = po.orderNumber || `PO-${req.id}-${new Date().getFullYear()}`;
            const poDate = po.orderDate || (req.createdAt ? new Date(req.createdAt).toISOString().split("T")[0] : "");
            const status = po.status || (isExecutionOrBeyond ? "approved" : "draft");
            const poItems = (po.items && Array.isArray(po.items) && po.items.length > 0) ? po.items : itemsForPO;
            const directedTo = po.directedTo || (po.supplierName ? `إلى إدارة المشتريات (${po.supplierName})` : (poSupplierName ? `إلى إدارة المشتريات (${poSupplierName})` : "إلى إدارة المشتريات"));

            orders.push({
              id: `${req.id}-${pIdx}`,
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
              supplierName: po.supplierName || poSupplierName || "",
              requesterName: po.requesterName || activePO?.requesterName || "طالب الشراء",
              requesterRole: po.requesterRole || activePO?.requesterRole || "طالب الشراء / إدارة المشاريع",
              approverName: po.approverName || activePO?.approverName || "المدير التنفيذي",
              approverRole: po.approverRole || activePO?.approverRole || "المدير التنفيذي",
              approverSignatureUrl: po.approverSignatureUrl || activePO?.approverSignatureUrl || "",
              notes: po.notes || activePO?.notes || "",
              status,
              items: poItems,
              itemsCount: poItems.length,
              disbursementOrder: disbByPo.get(poNumber) || null,
              createdAt: req.createdAt,
              updatedAt: po.updatedAt || sedanaProc?.updatedAt || req.updatedAt || req.createdAt,
            });
          });
        } else {
          const poNumber = `PO-${req.id}-${new Date().getFullYear()}`;
          const poDate = req.createdAt ? new Date(req.createdAt).toISOString().split("T")[0] : "";
          const status = isExecutionOrBeyond ? "approved" : "draft";
          const directedTo = poSupplierName ? `إلى إدارة المشتريات (${poSupplierName})` : "إلى إدارة المشتريات";

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
            supplierName: poSupplierName || "",
            requesterName: "طالب الشراء",
            requesterRole: "طالب الشراء / إدارة المشاريع",
            approverName: "المدير التنفيذي",
            approverRole: "المدير التنفيذي",
            approverSignatureUrl: "",
            notes: "",
            status,
            items: itemsForPO,
            itemsCount: itemsForPO.length,
            disbursementOrder: disbByPo.get(poNumber) || null,
            createdAt: req.createdAt,
            updatedAt: sedanaProc?.updatedAt || req.updatedAt || req.createdAt,
          });
        }
      }

      // فرز الأوامر بحيث تظهر الأحدث المنشأة أو المحدثة في المقدمة دائماً
      orders.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.orderDate || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.orderDate || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      // التصفية بالبحث
      let filtered = orders;
      if (input.search && input.search.trim()) {
        const q = input.search.trim().toLowerCase();
        const cleanQ = q.replace(/^#/, "").replace(/^طلب\s*#?/, "").trim();
        filtered = filtered.filter((o) =>
          o.orderNumber?.toLowerCase().includes(q) ||
          o.descriptiveName?.toLowerCase().includes(q) ||
          o.directedTo?.toLowerCase().includes(q) ||
          o.supplierName?.toLowerCase().includes(q) ||
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

      // جلب أوامر الصرف لمطابقة كل خطاب مسؤولية بأمر صرفه إن وجد
      const disbOrders = await db
        .select({
          id: disbursementOrders.id,
          orderNumber: disbursementOrders.orderNumber,
          csrLetterNumber: disbursementOrders.csrLetterNumber,
          status: disbursementOrders.status,
          amount: disbursementOrders.amount,
          adminFees: disbursementOrders.adminFees,
          executedAt: disbursementOrders.executedAt,
        })
        .from(disbursementOrders);

      const disbByCsr = new Map<string, any>();
      disbOrders.forEach((d) => {
        if (d.csrLetterNumber) disbByCsr.set(d.csrLetterNumber.trim(), d);
      });

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
        const savedCsrs: any[] = Array.isArray(sedanaProc?.csrLetters) ? sedanaProc.csrLetters : [];

        const allocatedItemIds = Object.keys(allocations).filter(
          (k) => allocations[k] === "csr_letter"
        );

        if (allocatedItemIds.length === 0 && !activeCSR && savedCsrs.length === 0) {
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

        const csrList: any[] = [...savedCsrs];
        if (activeCSR && !csrList.some((c: any) => c.letterNumber === activeCSR.letterNumber)) {
          csrList.push(activeCSR);
        }

        const isExecutionOrBeyond = req.currentStage === "execution" || req.currentStage === "handover" || req.currentStage === "closed";

        if (csrList.length > 0) {
          csrList.forEach((csr: any, cIdx: number) => {
            const letterNumber = csr.letterNumber || `CSR-${req.id}-${new Date().getFullYear()}`;
            const letterDate = csr.letterDate || (req.createdAt ? new Date(req.createdAt).toISOString().split("T")[0] : "");
            const status = csr.status || (isExecutionOrBeyond ? "approved" : "draft");
            const finalItems = (csr.items && Array.isArray(csr.items) && csr.items.length > 0) ? csr.items : itemsForCSR;

            letters.push({
              id: `${req.id}-${cIdx}`,
              requestId: req.id,
              requestNumber: req.requestNumber || String(req.id),
              descriptiveName: req.descriptiveName || null,
              currentStage: req.currentStage,
              mosqueId: mosque?.id || null,
              mosqueName: mosque?.name || "المسجد",
              mosqueCity: mosque?.city || "",
              mosqueRegion: mosque?.governorate || "",
              letterNumber,
              letterDate,
              salutation: csr.salutation || "السادة",
              recipientName: csr.recipientName || csrSupplierName || "الجهة المانحة / الشريك المجتمعي",
              honorific: csr.honorific || "المحترمون",
              projectName: csr.projectName || `مشروع جامع ${mosque?.name || "المسجد"}`,
              signatoryTitle: csr.signatoryTitle || "المدير التنفيذي",
              signatoryName: csr.signatoryName || "المهندس المفوض بالتوقيع",
              notes: csr.notes || csr.additionalNotes || "",
              status,
              items: finalItems,
              itemsCount: finalItems.length,
              disbursementOrder: disbByCsr.get(letterNumber) || null,
              createdAt: req.createdAt,
              updatedAt: csr.updatedAt || sedanaProc?.updatedAt || req.updatedAt || req.createdAt,
            });
          });
        } else {
          const letterNumber = `CSR-${req.id}-${new Date().getFullYear()}`;
          const letterDate = req.createdAt ? new Date(req.createdAt).toISOString().split("T")[0] : "";
          const status = isExecutionOrBeyond ? "approved" : "draft";
          const recipientName = csrSupplierName || "الجهة المانحة / الشريك المجتمعي";

          letters.push({
            id: req.id,
            requestId: req.id,
            requestNumber: req.requestNumber || String(req.id),
            descriptiveName: req.descriptiveName || null,
            currentStage: req.currentStage,
            mosqueId: mosque?.id || null,
            mosqueName: mosque?.name || "المسجد",
            mosqueCity: mosque?.city || "",
            mosqueRegion: mosque?.governorate || "",
            letterNumber,
            letterDate,
            salutation: "السادة",
            recipientName,
            honorific: "المحترمون",
            projectName: `مشروع جامع ${mosque?.name || "المسجد"}`,
            signatoryTitle: "المدير التنفيذي",
            signatoryName: "المهندس المفوض بالتوقيع",
            notes: "",
            status,
            items: itemsForCSR,
            itemsCount: itemsForCSR.length,
            disbursementOrder: disbByCsr.get(letterNumber) || null,
            createdAt: req.createdAt,
            updatedAt: sedanaProc?.updatedAt || req.updatedAt || req.createdAt,
          });
        }
      }

      // فرز الخطابات بحيث تظهر الأحدث في المقدمة دائماً
      letters.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.letterDate || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.letterDate || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

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

  // ===============================================
  // 3. جلب قائمة طلبات سدانة التي تحوي موردين معتمدين لأوامر الشراء
  // ===============================================
  getAvailableRequestsForPO: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      // جلب جميع الموردين المسجلين في النظام لمطابقة معلوماتهم
      const registeredSuppliers = await db.select().from(suppliers);
      const supplierMapByName = new Map<string, any>();
      const supplierMapById = new Map<number, any>();
      registeredSuppliers.forEach((s) => {
        if (s.name) supplierMapByName.set(s.name.trim().toLowerCase(), s);
        supplierMapById.set(s.id, s);
      });

      // جلب طلبات المساجد
      const requests = await db
        .select({
          request: mosqueRequests,
          mosque: mosques,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(isNotNull(mosqueRequests.programData))
        .orderBy(desc(mosqueRequests.createdAt));

      const allBoq = await db
        .select()
        .from(quantitySchedules);

      const boqMap = new Map<number, any[]>();
      allBoq.forEach((b) => {
        if (!b.requestId) return;
        const list = boqMap.get(b.requestId) || [];
        list.push(b);
        boqMap.set(b.requestId, list);
      });

      const result: any[] = [];

      for (const row of requests) {
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

        // التحقق من أن الطلب يشتمل على بيانات سدانة أو بنود كميات
        const boqItems = boqMap.get(req.id) || [];
        const isSedana = req.programType === "sedana" || pData.isSedana || pData.sedanaProcurement || pData.basketItems || boqItems.length > 0;
        if (!isSedana) continue;

        // لا تتاح طلبات سدانة لإنشاء أوامر الشراء إلا بعد الوصول لمرحلة "التشغيل والتنفيذ"
        const allowedExecutionStages = ["execution", "handover", "closed"];
        if (!allowedExecutionStages.includes(req.currentStage)) continue;

        const sedanaProc = pData.sedanaProcurement || {};
        const itemsAlloc = sedanaProc.itemsAllocation || {};
        const itemSuppMap = sedanaProc.itemSupplierMap || {};
        const suppliersAlloc = sedanaProc.suppliersAllocation || {};
        const activePO = sedanaProc.activePurchaseOrder || null;

        // جمع جميع بنود الطلب المعتمدة
        let baseItems: any[] = [];

        if (boqItems.length > 0) {
          baseItems = boqItems.map((b) => ({
            id: String(b.id),
            itemName: b.itemName,
            description: b.itemDescription || "",
            quantity: parseFloat(b.quantity || "1"),
            unit: b.unit || "وحدة",
          }));
        } else if (pData.evaluation?.items && Array.isArray(pData.evaluation.items)) {
          baseItems = pData.evaluation.items.map((it: any, idx: number) => ({
            id: String(it.key || it.id || idx + 1),
            itemName: it.name || it.itemName || `بند ${idx + 1}`,
            description: it.description || it.spec || "",
            quantity: parseFloat(it.approvedQty || it.requestedQty || "1"),
            unit: it.unit || "وحدة",
          }));
        } else if (pData.basketItems && Array.isArray(pData.basketItems)) {
          baseItems = pData.basketItems.map((b: any, idx: number) => ({
            id: String(b.id || idx + 1),
            itemName: b.name,
            description: b.description || b.category || "",
            quantity: parseFloat(b.quantity || "1"),
            unit: b.unit || "وحدة",
          }));
        }

        // فحص طريقة التأمين المعتمدة للمورد في صفحة procurement
        const getSupplierMethod = (sId?: number | null, sName?: string | null): string | null => {
          const k1 = sId ? `sup_${sId}` : "";
          const k2 = sName ? `name_${sName.trim()}` : "";
          const k3 = sId ? String(sId) : "";
          const k4 = sName ? sName.trim() : "";

          return (k1 && suppliersAlloc[k1]) ||
                 (k2 && suppliersAlloc[k2]) ||
                 (k3 && suppliersAlloc[k3]) ||
                 (k4 && suppliersAlloc[k4]) ||
                 null;
        };

        // تجميع الموردين المعتمدين على أمر الشراء الداخلي حصراً
        const supplierGroups = new Map<string, {
          supplierId?: number | null;
          supplierName: string;
          items: any[];
        }>();

        baseItems.forEach((it) => {
          const mapEntry = itemSuppMap[it.id];
          const sName = mapEntry?.supplierName?.trim().replace(/\s+/g, " ");
          const sId = mapEntry?.supplierId ? Number(mapEntry.supplierId) : null;

          if (!sName || sName === "لم يحدد بعد" || sName === "غير محدد") {
            return;
          }

          const supMethod = getSupplierMethod(sId, sName);

          // إذا تم تحديد المورد كعقد توريد أو مسؤولية مجتمعية، يتم استبعاده فوراً من أمر الشراء
          if (supMethod === "contract" || supMethod === "csr_letter") {
            return;
          }

          // يعتبر المورد والبنود تابعة لأمر الشراء فقط إذا حُدد المورد أو البند كـ purchase_order
          const itemMethod = itemsAlloc[it.id];
          const isPo = supMethod === "purchase_order" || itemMethod === "purchase_order";

          if (!isPo) {
            return;
          }

          const groupKey = sName;
          const currentGroup = supplierGroups.get(groupKey) || {
            supplierId: sId,
            supplierName: groupKey,
            items: [] as any[],
          };

          if (!currentGroup.items.some((item) => item.id === it.id)) {
            currentGroup.items.push({
              id: it.id,
              itemName: it.itemName,
              description: it.description || "",
              quantity: it.quantity,
              unit: it.unit,
              unitPrice: mapEntry?.unitPrice || 0,
              totalPrice: mapEntry?.totalPrice || (it.quantity * (mapEntry?.unitPrice || 0)),
            });
          }

          supplierGroups.set(groupKey, currentGroup);
        });

        // فحص الموردين المحددين في suppliersAlloc كـ purchase_order مباشرة إن لم تُضف بنودهم أعلاه
        Object.keys(suppliersAlloc).forEach((k) => {
          if (suppliersAlloc[k] === "purchase_order") {
            let matchedSupName = "";
            let matchedSupId: number | null = null;
            if (k.startsWith("name_")) {
              matchedSupName = k.replace(/^name_/, "").trim().replace(/\s+/g, " ");
            } else if (k.startsWith("sup_")) {
              const idNum = parseInt(k.replace(/^sup_/, ""), 10);
              const reg = supplierMapById.get(idNum);
              if (reg) {
                matchedSupId = reg.id;
                matchedSupName = reg.name.trim().replace(/\s+/g, " ");
              }
            } else if (!isNaN(Number(k))) {
              const idNum = parseInt(k, 10);
              const reg = supplierMapById.get(idNum);
              if (reg) {
                matchedSupId = reg.id;
                matchedSupName = reg.name.trim().replace(/\s+/g, " ");
              }
            } else {
              matchedSupName = k.trim().replace(/\s+/g, " ");
            }

            if (matchedSupName && !supplierGroups.has(matchedSupName)) {
              const supItems = baseItems.filter(
                (it) => itemSuppMap[it.id]?.supplierName?.trim() === matchedSupName ||
                        (matchedSupId && itemSuppMap[it.id]?.supplierId === matchedSupId)
              );
              if (supItems.length > 0) {
                supplierGroups.set(matchedSupName, {
                  supplierId: matchedSupId,
                  supplierName: matchedSupName,
                  items: supItems.map((it) => ({
                    id: it.id,
                    itemName: it.itemName,
                    description: it.description || "",
                    quantity: it.quantity,
                    unit: it.unit,
                    unitPrice: itemSuppMap[it.id]?.unitPrice || 0,
                    totalPrice: itemSuppMap[it.id]?.totalPrice || (it.quantity * (itemSuppMap[it.id]?.unitPrice || 0)),
                  })),
                });
              }
            }
          }
        });

        // استبعاد أي طلب لا يحوي موردين معتمدين لأمر الشراء الداخلي
        if (supplierGroups.size === 0) {
          continue;
        }

        // بناء قائمة الموردين المعتمدين فقط
        const approvedSuppliers: any[] = [];
        supplierGroups.forEach((group, sName) => {
          const reg = (group.supplierId ? supplierMapById.get(group.supplierId) : null) || supplierMapByName.get(sName.toLowerCase());

          approvedSuppliers.push({
            id: group.supplierId || sName,
            supplierId: group.supplierId || reg?.id || null,
            supplierName: sName,
            commercialRegister: reg?.commercialRegister || "",
            phone: reg?.phone || "",
            email: reg?.email || "",
            city: reg?.city || "",
            contactPerson: reg?.contactPerson || "",
            bankName: reg?.bankName || "",
            iban: reg?.iban || "",
            itemsCount: group.items.length,
            items: group.items,
          });
        });

        result.push({
          id: req.id,
          requestNumber: req.requestNumber,
          descriptiveName: req.descriptiveName,
          currentStage: req.currentStage,
          status: req.status,
          mosqueName: mosque?.name || "المسجد",
          mosqueCity: mosque?.city || "",
          mosqueDistrict: mosque?.district || "",
          suppliers: approvedSuppliers,
          activePO,
          purchaseOrders: Array.isArray(sedanaProc.purchaseOrders) ? sedanaProc.purchaseOrders : [],
        });
      }

      return result;
    }),

  // ===============================================
  // 4. إنشاء أو تحديث أمر شراء مع تحديد البنود والكميات والمورد
  // ===============================================
  createOrUpdatePurchaseOrder: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      supplierName: z.string().optional(),
      supplierId: z.number().optional().nullable(),
      supplierPhone: z.string().optional(),
      supplierCommercialRegister: z.string().optional(),
      orderNumber: z.string().optional(),
      orderDate: z.string().optional(),
      directedTo: z.string().optional(),
      requesterName: z.string().optional(),
      requesterRole: z.string().optional(),
      approverName: z.string().optional(),
      approverRole: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["approved", "draft"]).default("draft"),
      isEdit: z.boolean().optional().default(false),
      items: z.array(z.object({
        id: z.string(),
        itemName: z.string(),
        description: z.string().optional(),
        quantity: z.number().min(0.01),
        unit: z.string(),
        unitPrice: z.number().optional(),
        totalPrice: z.number().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const [req] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      // التحقق من أن طلب سدانة في مرحلة "التشغيل والتنفيذ"
      if (req.programType === "sedana") {
        const allowedExecutionStages = ["execution", "handover", "closed"];
        if (!allowedExecutionStages.includes(req.currentStage)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن إنشاء أو تعديل أمر شراء لطلب سدانة إلا بعد الانتقال لمرحلة 'التشغيل والتنفيذ'",
          });
        }
      }

      let pData: any = req.programData;
      while (typeof pData === "string") {
        try {
          pData = JSON.parse(pData);
        } catch {
          break;
        }
      }
      pData = pData && typeof pData === "object" ? pData : {};
      pData.sedanaProcurement = pData.sedanaProcurement || {};
      pData.sedanaProcurement.itemsAllocation = pData.sedanaProcurement.itemsAllocation || {};
      pData.sedanaProcurement.purchaseOrders = Array.isArray(pData.sedanaProcurement.purchaseOrders)
        ? pData.sedanaProcurement.purchaseOrders
        : [];

      // تخصيص هذه البنود لأمر الشراء
      input.items.forEach((it) => {
        pData.sedanaProcurement.itemsAllocation[it.id] = "purchase_order";
      });

      const isApproved = input.status === "approved";
      const nowIso = new Date().toISOString();

      const existingPOs: any[] = pData.sedanaProcurement.purchaseOrders;
      const usedNumbers = new Set<string>();
      existingPOs.forEach((p: any) => {
        if (p.orderNumber) usedNumbers.add(p.orderNumber.trim());
      });
      if (pData.sedanaProcurement.activePurchaseOrder?.orderNumber) {
        usedNumbers.add(pData.sedanaProcurement.activePurchaseOrder.orderNumber.trim());
      }

      // توليد رقم فريد ذكي عند إنشاء أمر جديد يمنع استبدال الأوامر السابقة نهائياً
      let orderNumber = input.orderNumber?.trim();
      const basePrefix = `PO-${req.id}-${new Date().getFullYear()}`;

      if (!orderNumber || (usedNumbers.has(orderNumber) && !input.isEdit)) {
        if (!usedNumbers.has(basePrefix)) {
          orderNumber = basePrefix;
        } else {
          let seq = usedNumbers.size + 1;
          let candidate = `${basePrefix}-${String(seq).padStart(2, "0")}`;
          while (usedNumbers.has(candidate)) {
            seq++;
            candidate = `${basePrefix}-${String(seq).padStart(2, "0")}`;
          }
          orderNumber = candidate;
        }
      }

      const directedTo = input.directedTo || (input.supplierName ? `إلى إدارة المشتريات (${input.supplierName})` : "إلى إدارة المشتريات");

      const newPO = {
        orderNumber,
        orderDate: input.orderDate || nowIso.split("T")[0],
        directedTo,
        supplierName: input.supplierName || "",
        supplierId: input.supplierId || null,
        supplierPhone: input.supplierPhone || "",
        supplierCommercialRegister: input.supplierCommercialRegister || "",
        requesterName: input.requesterName || ctx.user.name || "طالب الشراء",
        requesterRole: input.requesterRole || "طالب الشراء / إدارة المشاريع",
        approverName: input.approverName || "المدير التنفيذي",
        approverRole: input.approverRole || "المدير التنفيذي",
        approverSignatureUrl: isApproved ? "digital_signature_approved" : "",
        approvedAt: isApproved ? nowIso : undefined,
        notes: input.notes || "",
        status: input.status,
        items: input.items,
        updatedAt: nowIso,
      };

      pData.sedanaProcurement.activePurchaseOrder = newPO;
      pData.sedanaProcurement.updatedAt = nowIso;

      // إضافة أمر الشراء الجديد أو تحديث أمر حالي إذا كان في وضع التعديل الصريح فقط
      const existingIdx = pData.sedanaProcurement.purchaseOrders.findIndex(
        (p: any) => p.orderNumber === orderNumber
      );

      if (existingIdx >= 0 && input.isEdit) {
        pData.sedanaProcurement.purchaseOrders[existingIdx] = newPO;
      } else {
        pData.sedanaProcurement.purchaseOrders.unshift(newPO);
      }

      const updateData: any = {
        programData: pData,
        updatedAt: new Date(),
      };

      // إذا تم الاعتماد، وكان الطلب في مرحلة التأمين والتعاقد أو ما قبلها، يتم نقله لمرحلة التشغيل والتنفيذ
      if (isApproved && (req.currentStage === "contracting" || req.currentStage === "financial_eval_and_approval")) {
        updateData.currentStage = "execution";
      }

      await db
        .update(mosqueRequests)
        .set(updateData)
        .where(eq(mosqueRequests.id, input.requestId));

      return {
        success: true,
        orderNumber,
        status: input.status,
        message: isApproved ? "تم حفظ واعتماد أمر الشراء بنجاح" : "تم حفظ أمر الشراء كمسودة بنجاح",
      };
    }),

  // ===============================================
  // 5. اعتماد أمر الشراء فورياً
  // ===============================================
  approvePurchaseOrder: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      orderNumber: z.string().optional(),
      approverName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const [req] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      let pData: any = req.programData;
      while (typeof pData === "string") {
        try {
          pData = JSON.parse(pData);
        } catch {
          break;
        }
      }
      pData = pData && typeof pData === "object" ? pData : {};
      pData.sedanaProcurement = pData.sedanaProcurement || {};
      const activePO = pData.sedanaProcurement.activePurchaseOrder || {};
      const targetOrderNumber = input.orderNumber || activePO.orderNumber;
      const nowIso = new Date().toISOString();

      activePO.status = "approved";
      activePO.approverName = input.approverName || activePO.approverName || ctx.user.name || "المدير التنفيذي";
      activePO.approverSignatureUrl = "digital_signature_approved";
      activePO.approvedAt = nowIso;
      pData.sedanaProcurement.activePurchaseOrder = activePO;
      pData.sedanaProcurement.updatedAt = nowIso;

      if (Array.isArray(pData.sedanaProcurement.purchaseOrders)) {
        pData.sedanaProcurement.purchaseOrders = pData.sedanaProcurement.purchaseOrders.map((p: any) => {
          if (!targetOrderNumber || p.orderNumber === targetOrderNumber || p.orderNumber === activePO.orderNumber) {
            return {
              ...p,
              status: "approved",
              approverName: activePO.approverName,
              approverSignatureUrl: "digital_signature_approved",
              approvedAt: nowIso,
              updatedAt: nowIso,
            };
          }
          return p;
        });
      }

      const updateData: any = {
        programData: pData,
        updatedAt: new Date(),
      };

      // ترقية الطلب لمرحلة التشغيل والتنفيذ
      if (req.currentStage === "contracting" || req.currentStage === "financial_eval_and_approval") {
        updateData.currentStage = "execution";
      }

      await db
        .update(mosqueRequests)
        .set(updateData)
        .where(eq(mosqueRequests.id, input.requestId));

      return {
        success: true,
        message: "تم اعتماد أمر الشراء بنجاح",
      };
    }),

  // ===============================================
  // 6. جلب قائمة طلبات سدانة المتاحة لإنشاء خطابات مسؤولية مجتمعية
  // ===============================================
  getAvailableRequestsForCSR: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      // جلب جميع الموردين المسجلين في النظام لمطابقة معلوماتهم
      const registeredSuppliers = await db.select().from(suppliers);
      const supplierMapByName = new Map<string, any>();
      const supplierMapById = new Map<number, any>();
      registeredSuppliers.forEach((s) => {
        if (s.name) supplierMapByName.set(s.name.trim().toLowerCase(), s);
        supplierMapById.set(s.id, s);
      });

      // جلب طلبات المساجد
      const requests = await db
        .select({
          request: mosqueRequests,
          mosque: mosques,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(isNotNull(mosqueRequests.programData))
        .orderBy(desc(mosqueRequests.createdAt));

      const allBoq = await db
        .select()
        .from(quantitySchedules);

      const boqMap = new Map<number, any[]>();
      allBoq.forEach((b) => {
        if (!b.requestId) return;
        const list = boqMap.get(b.requestId) || [];
        list.push(b);
        boqMap.set(b.requestId, list);
      });

      const result: any[] = [];

      for (const row of requests) {
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

        const boqItems = boqMap.get(req.id) || [];
        const isSedana = req.programType === "sedana" || pData.isSedana || pData.sedanaProcurement || pData.basketItems || boqItems.length > 0;
        if (!isSedana) continue;

        // لا تتاح طلبات سدانة لإنشاء خطابات المسؤولية المجتمعية إلا بعد الوصول لمرحلة "التشغيل والتنفيذ"
        const allowedExecutionStages = ["execution", "handover", "closed"];
        if (!allowedExecutionStages.includes(req.currentStage)) continue;

        const sedanaProc = pData.sedanaProcurement || {};
        const itemsAlloc = sedanaProc.itemsAllocation || {};
        const itemSuppMap = sedanaProc.itemSupplierMap || {};
        const suppliersAlloc = sedanaProc.suppliersAllocation || {};
        const activeCSR = sedanaProc.activeCsrLetter || null;
        const existingCsrs: any[] = Array.isArray(sedanaProc.csrLetters) ? sedanaProc.csrLetters : [];

        // جمع كافة بنود الطلب
        let baseItems: any[] = [];
        if (boqItems.length > 0) {
          baseItems = boqItems.map((b) => ({
            id: String(b.id),
            itemName: b.itemName,
            description: b.itemDescription || "",
            quantity: parseFloat(b.quantity || "1"),
            unit: b.unit || "وحدة",
          }));
        } else if (pData.evaluation?.items && Array.isArray(pData.evaluation.items)) {
          baseItems = pData.evaluation.items.map((it: any, idx: number) => ({
            id: String(it.key || it.id || idx + 1),
            itemName: it.name || it.itemName || `بند ${idx + 1}`,
            description: it.description || it.spec || "",
            quantity: parseFloat(it.approvedQty || it.requestedQty || "1"),
            unit: it.unit || "وحدة",
          }));
        } else if (pData.basketItems && Array.isArray(pData.basketItems)) {
          baseItems = pData.basketItems.map((b: any, idx: number) => ({
            id: String(b.id || idx + 1),
            itemName: b.name,
            description: b.description || b.category || "",
            quantity: parseFloat(b.quantity || "1"),
            unit: b.unit || "وحدة",
          }));
        }

        if (baseItems.length === 0) continue;

        // فحص طريقة التأمين المعتمدة للمورد في صفحة procurement
        const getSupplierMethod = (sId?: number | null, sName?: string | null): string | null => {
          const k1 = sId ? `sup_${sId}` : "";
          const k2 = sName ? `name_${sName.trim()}` : "";
          const k3 = sId ? String(sId) : "";
          const k4 = sName ? sName.trim() : "";

          return (k1 && suppliersAlloc[k1]) ||
                 (k2 && suppliersAlloc[k2]) ||
                 (k3 && suppliersAlloc[k3]) ||
                 (k4 && suppliersAlloc[k4]) ||
                 null;
        };

        // تجميع الموردين والشركاء المعتمدين على المسؤولية المجتمعية حصراً
        const supplierGroups = new Map<string, {
          supplierId?: number | null;
          supplierName: string;
          items: any[];
        }>();

        baseItems.forEach((it) => {
          const mapEntry = itemSuppMap[it.id];
          const sName = mapEntry?.supplierName?.trim().replace(/\s+/g, " ");
          const sId = mapEntry?.supplierId ? Number(mapEntry.supplierId) : null;

          if (!sName || sName === "لم يحدد بعد" || sName === "غير محدد") {
            return;
          }

          const supMethod = getSupplierMethod(sId, sName);

          // إذا تم تحديد المورد كعقد توريد أو أمر شراء، يتم استبعاده فوراً من المسؤولية المجتمعية
          if (supMethod === "contract" || supMethod === "purchase_order") {
            return;
          }

          // يعتبر المورد والبنود تابعة للمسؤولية المجتمعية إذا حُدد كـ csr_letter
          const itemMethod = itemsAlloc[it.id];
          const isCsr = supMethod === "csr_letter" || itemMethod === "csr_letter";

          if (!isCsr) {
            return;
          }

          const groupKey = sName;
          const currentGroup = supplierGroups.get(groupKey) || {
            supplierId: sId,
            supplierName: groupKey,
            items: [] as any[],
          };

          if (!currentGroup.items.some((item) => item.id === it.id)) {
            currentGroup.items.push({
              id: it.id,
              itemName: it.itemName,
              description: it.description || "",
              quantity: it.quantity,
              unit: it.unit,
            });
          }

          supplierGroups.set(groupKey, currentGroup);
        });

        // فحص الموردين المحددين في suppliersAlloc كـ csr_letter مباشرة إن لم تُضف بنودهم أعلاه
        Object.keys(suppliersAlloc).forEach((k) => {
          if (suppliersAlloc[k] === "csr_letter") {
            let matchedSupName = "";
            let matchedSupId: number | null = null;
            if (k.startsWith("name_")) {
              matchedSupName = k.replace(/^name_/, "").trim().replace(/\s+/g, " ");
            } else if (k.startsWith("sup_")) {
              const idNum = parseInt(k.replace(/^sup_/, ""), 10);
              const reg = supplierMapById.get(idNum);
              if (reg) {
                matchedSupId = reg.id;
                matchedSupName = reg.name.trim().replace(/\s+/g, " ");
              }
            } else if (!isNaN(Number(k))) {
              const idNum = parseInt(k, 10);
              const reg = supplierMapById.get(idNum);
              if (reg) {
                matchedSupId = reg.id;
                matchedSupName = reg.name.trim().replace(/\s+/g, " ");
              }
            } else {
              matchedSupName = k.trim().replace(/\s+/g, " ");
            }

            if (matchedSupName && !supplierGroups.has(matchedSupName)) {
              const supItems = baseItems.filter(
                (it) => itemSuppMap[it.id]?.supplierName?.trim() === matchedSupName ||
                        (matchedSupId && itemSuppMap[it.id]?.supplierId === matchedSupId)
              );
              const targetItems = supItems.length > 0 ? supItems : baseItems.filter((it) => itemsAlloc[it.id] === "csr_letter");

              if (targetItems.length > 0) {
                supplierGroups.set(matchedSupName, {
                  supplierId: matchedSupId,
                  supplierName: matchedSupName,
                  items: targetItems.map((it) => ({
                    id: it.id,
                    itemName: it.itemName,
                    description: it.description || "",
                    quantity: it.quantity,
                    unit: it.unit,
                  })),
                });
              }
            }
          }
        });

        // استبعاد أي طلب لا يحوي موردين أو شركاء معتمدين للمسؤولية المجتمعية
        if (supplierGroups.size === 0) {
          continue;
        }

        // بناء قائمة الموردين المعتمدين للمسؤولية المجتمعية حصراً
        const approvedSuppliers: any[] = [];
        supplierGroups.forEach((group, sName) => {
          const reg = (group.supplierId ? supplierMapById.get(group.supplierId) : null) || supplierMapByName.get(sName.toLowerCase());

          approvedSuppliers.push({
            id: group.supplierId || sName,
            supplierId: group.supplierId || reg?.id || null,
            supplierName: sName,
            recipientName: sName,
            recipientContactPerson: reg?.contactPerson || "إدارة المسؤولية المجتمعية",
            commercialRegister: reg?.commercialRegister || "",
            phone: reg?.phone || "",
            email: reg?.email || "",
            city: reg?.city || mosque?.city || "",
            contactPerson: reg?.contactPerson || "",
            itemsCount: group.items.length,
            items: group.items,
          });
        });

        // الأصناف المؤهلة للمسؤولية المجتمعية في هذا الطلب
        const allCsrItems: any[] = [];
        approvedSuppliers.forEach((s) => {
          s.items.forEach((it: any) => {
            if (!allCsrItems.some((x) => x.id === it.id)) {
              allCsrItems.push(it);
            }
          });
        });

        result.push({
          id: req.id,
          requestNumber: req.requestNumber,
          descriptiveName: req.descriptiveName,
          currentStage: req.currentStage,
          status: req.status,
          mosqueName: mosque?.name || "المسجد",
          mosqueCity: mosque?.city || "",
          mosqueDistrict: mosque?.district || "",
          suppliers: approvedSuppliers,
          partners: approvedSuppliers,
          activeCSR,
          csrLetters: existingCsrs,
          eligibleItems: allCsrItems,
        });
      }

      return result;
    }),

  // ===============================================
  // 7. إنشاء أو تحديث خطاب مسؤولية مجتمعية (حفظ كمسودة)
  // ===============================================
  createOrUpdateCsrLetter: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      recipientName: z.string(),
      recipientContactPerson: z.string().optional(),
      recipientPhone: z.string().optional(),
      recipientEmail: z.string().optional(),
      recipientCity: z.string().optional(),
      letterNumber: z.string().optional(),
      letterDate: z.string().optional(),
      salutation: z.string().optional().default("السادة"),
      honorific: z.string().optional().default("المحترمون"),
      projectName: z.string().optional(),
      signatoryTitle: z.string().optional().default("المدير التنفيذي"),
      signatoryName: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["approved", "draft"]).default("draft"),
      isEdit: z.boolean().optional().default(false),
      items: z.array(z.object({
        id: z.string(),
        itemName: z.string(),
        description: z.string().optional(),
        quantity: z.number().min(0.01),
        unit: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const [req] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      // التحقق من أن طلب سدانة في مرحلة "التشغيل والتنفيذ"
      if (req.programType === "sedana") {
        const allowedExecutionStages = ["execution", "handover", "closed"];
        if (!allowedExecutionStages.includes(req.currentStage)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن إنشاء أو تعديل خطاب مسؤولية مجتمعية لطلب سدانة إلا بعد الانتقال لمرحلة 'التشغيل والتنفيذ'",
          });
        }
      }

      let pData: any = req.programData;
      while (typeof pData === "string") {
        try {
          pData = JSON.parse(pData);
        } catch {
          break;
        }
      }
      pData = pData && typeof pData === "object" ? pData : {};
      pData.sedanaProcurement = pData.sedanaProcurement || {};
      pData.sedanaProcurement.itemsAllocation = pData.sedanaProcurement.itemsAllocation || {};
      pData.sedanaProcurement.csrLetters = Array.isArray(pData.sedanaProcurement.csrLetters)
        ? pData.sedanaProcurement.csrLetters
        : [];

      // تخصيص هذه البنود للمسؤولية المجتمعية
      input.items.forEach((it) => {
        pData.sedanaProcurement.itemsAllocation[it.id] = "csr_letter";
      });

      const isApproved = input.status === "approved";
      const nowIso = new Date().toISOString();

      const existingCSRs: any[] = pData.sedanaProcurement.csrLetters;
      const usedNumbers = new Set<string>();
      existingCSRs.forEach((c: any) => {
        if (c.letterNumber) usedNumbers.add(c.letterNumber.trim());
      });
      if (pData.sedanaProcurement.activeCsrLetter?.letterNumber) {
        usedNumbers.add(pData.sedanaProcurement.activeCsrLetter.letterNumber.trim());
      }

      // توليد رقم فريد ذكي عند إنشاء خطاب جديد يمنع التكرار والاستبدال
      let letterNumber = input.letterNumber?.trim();
      const basePrefix = `CSR-${req.id}-${new Date().getFullYear()}`;

      if (!letterNumber || (usedNumbers.has(letterNumber) && !input.isEdit)) {
        if (!usedNumbers.has(basePrefix)) {
          letterNumber = basePrefix;
        } else {
          let seq = usedNumbers.size + 1;
          let candidate = `${basePrefix}-${String(seq).padStart(2, "0")}`;
          while (usedNumbers.has(candidate)) {
            seq++;
            candidate = `${basePrefix}-${String(seq).padStart(2, "0")}`;
          }
          letterNumber = candidate;
        }
      }

      const newCSR = {
        letterNumber,
        letterDate: input.letterDate || nowIso.split("T")[0],
        salutation: input.salutation || "السادة",
        recipientName: input.recipientName,
        recipientContactPerson: input.recipientContactPerson || "",
        recipientPhone: input.recipientPhone || "",
        recipientEmail: input.recipientEmail || "",
        recipientCity: input.recipientCity || "",
        honorific: input.honorific || "المحترمون",
        projectName: input.projectName || `مشروع جامع ${req.descriptiveName || `طلب #${req.id}`}`,
        signatoryTitle: input.signatoryTitle || "المدير التنفيذي",
        signatoryName: input.signatoryName || ctx.user.name || "المهندس المفوض بالتوقيع",
        signatorySignatureUrl: isApproved ? "digital_signature_approved" : "",
        approvedAt: isApproved ? nowIso : undefined,
        notes: input.notes || "",
        status: input.status,
        items: input.items,
        updatedAt: nowIso,
      };

      pData.sedanaProcurement.activeCsrLetter = newCSR;
      pData.sedanaProcurement.updatedAt = nowIso;

      // إضافة الخطاب الجديد أو تحديث الحالي في وضع التعديل
      const existingIdx = pData.sedanaProcurement.csrLetters.findIndex(
        (c: any) => c.letterNumber === letterNumber
      );

      if (existingIdx >= 0 && input.isEdit) {
        pData.sedanaProcurement.csrLetters[existingIdx] = newCSR;
      } else {
        pData.sedanaProcurement.csrLetters.unshift(newCSR);
      }

      const updateData: any = {
        programData: pData,
        updatedAt: new Date(),
      };

      if (isApproved && (req.currentStage === "contracting" || req.currentStage === "financial_eval_and_approval")) {
        updateData.currentStage = "execution";
      }

      await db
        .update(mosqueRequests)
        .set(updateData)
        .where(eq(mosqueRequests.id, input.requestId));

      return {
        success: true,
        letterNumber,
        status: input.status,
        message: isApproved ? "تم حفظ واعتماد خطاب المسؤولية المجتمعية بنجاح" : "تم حفظ خطاب المسؤولية المجتمعية كمسودة بنجاح",
      };
    }),

  // ===============================================
  // 8. اعتماد خطاب المسؤولية المجتمعية فورياً
  // ===============================================
  approveCsrLetter: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      letterNumber: z.string().optional(),
      signatoryName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      }

      const [req] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      let pData: any = req.programData;
      while (typeof pData === "string") {
        try {
          pData = JSON.parse(pData);
        } catch {
          break;
        }
      }
      pData = pData && typeof pData === "object" ? pData : {};
      pData.sedanaProcurement = pData.sedanaProcurement || {};
      const activeCsr = pData.sedanaProcurement.activeCsrLetter || {};
      const targetLetterNumber = input.letterNumber || activeCsr.letterNumber;
      const nowIso = new Date().toISOString();

      activeCsr.status = "approved";
      activeCsr.signatoryName = input.signatoryName || activeCsr.signatoryName || ctx.user.name || "المدير التنفيذي";
      activeCsr.signatorySignatureUrl = "digital_signature_approved";
      activeCsr.approvedAt = nowIso;
      pData.sedanaProcurement.activeCsrLetter = activeCsr;
      pData.sedanaProcurement.updatedAt = nowIso;

      if (Array.isArray(pData.sedanaProcurement.csrLetters)) {
        pData.sedanaProcurement.csrLetters = pData.sedanaProcurement.csrLetters.map((c: any) => {
          if (!targetLetterNumber || c.letterNumber === targetLetterNumber || c.letterNumber === activeCsr.letterNumber) {
            return {
              ...c,
              status: "approved",
              signatoryName: activeCsr.signatoryName,
              signatorySignatureUrl: "digital_signature_approved",
              approvedAt: nowIso,
              updatedAt: nowIso,
            };
          }
          return c;
        });
      }

      const updateData: any = {
        programData: pData,
        updatedAt: new Date(),
      };

      if (req.currentStage === "contracting" || req.currentStage === "financial_eval_and_approval") {
        updateData.currentStage = "execution";
      }

      await db
        .update(mosqueRequests)
        .set(updateData)
        .where(eq(mosqueRequests.id, input.requestId));

      return {
        success: true,
        message: "تم اعتماد خطاب المسؤولية المجتمعية بنجاح",
      };
    }),
});
