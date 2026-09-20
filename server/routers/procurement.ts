import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { mosqueRequests, mosques, quantitySchedules, suppliers } from "../../drizzle/schema";
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

        // تحديد البنود المخصصة لأمر الشراء
        const poItemIds = new Set<string>();
        Object.keys(itemsAlloc).forEach((k) => {
          if (itemsAlloc[k] === "purchase_order") {
            poItemIds.add(k);
          }
        });

        // تجميع الموردين المعتمدين على أوامر الشراء لهذا الطلب
        const supplierGroups = new Map<string, {
          supplierId?: number | null;
          supplierName: string;
          items: any[];
        }>();

        baseItems.forEach((it) => {
          // هل هذا البند مخصص لأمر الشراء؟
          const isPo = poItemIds.has(it.id) || (poItemIds.size === 0 && Object.keys(itemsAlloc).length === 0);
          if (!isPo) return;

          // البحث عن المورد المعتمد لهذا البند
          const mapEntry = itemSuppMap[it.id];
          let sName = mapEntry?.supplierName;
          let sId = mapEntry?.supplierId;

          if (!sName || sName === "لم يحدد بعد") {
            // فحص suppliersAlloc
            for (const k of Object.keys(suppliersAlloc)) {
              const sObj = suppliersAlloc[k];
              if (sObj?.method === "purchase_order" && sObj?.supplierName) {
                sName = sObj.supplierName;
                sId = sObj.supplierId;
                break;
              }
            }
          }

          if (!sName || sName === "لم يحدد بعد") {
            if (activePO?.supplierName) {
              sName = activePO.supplierName;
            } else if (activePO?.directedTo && activePO.directedTo !== "إلى إدارة المشتريات") {
              sName = activePO.directedTo.replace(/^إلى\s*إدارة\s*المشتريات\s*\(?/, "").replace(/\)?$/, "").trim();
            }
          }

          // إذا لم يوجد مورد محدد، لا يتم اعتباره مورداً معتمداً
          if (!sName || sName === "لم يحدد بعد" || sName.trim() === "") {
            return;
          }

          const groupKey = sName.trim();
          const currentGroup: { supplierId?: number | null; supplierName: string; items: any[] } = supplierGroups.get(groupKey) || {
            supplierId: sId || null,
            supplierName: groupKey,
            items: [],
          };

          currentGroup.items.push({
            id: it.id,
            itemName: it.itemName,
            description: it.description || "",
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: mapEntry?.unitPrice || 0,
            totalPrice: mapEntry?.totalPrice || (it.quantity * (mapEntry?.unitPrice || 0)),
          });

          supplierGroups.set(groupKey, currentGroup);
        });

        // إذا لم تكن هناك مجموعات موردين محددة مسبقاً، لكن الطلب يشتمل على بنود
        if (supplierGroups.size === 0 && baseItems.length > 0) {
          const defaultSuppliersList = registeredSuppliers.slice(0, 10).map((s) => ({
            id: s.id,
            supplierId: s.id,
            supplierName: s.name,
            commercialRegister: s.commercialRegister || "",
            phone: s.phone || "",
            email: s.email || "",
            city: s.city || mosque?.city || "",
            contactPerson: s.contactPerson || "",
            bankName: s.bankName || "مصرف الراجحي",
            iban: s.iban || "",
            itemsCount: baseItems.length,
            items: baseItems,
          }));

          if (defaultSuppliersList.length > 0) {
            result.push({
              id: req.id,
              requestNumber: req.requestNumber,
              descriptiveName: req.descriptiveName,
              currentStage: req.currentStage,
              status: req.status,
              mosqueName: mosque?.name || "المسجد",
              mosqueCity: mosque?.city || "",
              mosqueDistrict: mosque?.district || "",
              suppliers: defaultSuppliersList,
              activePO,
            });
            continue;
          }
        }

        // استبعاد أي طلب لا يحوي موردين معتمدين لأمر الشراء!
        if (supplierGroups.size === 0) {
          continue;
        }

        // بناء قائمة الموردين المعتمدين مع تفاصيلهم الرسمية
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
      pData.sedanaProcurement.purchaseOrders = pData.sedanaProcurement.purchaseOrders || [];

      // تخصيص هذه البنود لأمر الشراء
      input.items.forEach((it) => {
        pData.sedanaProcurement.itemsAllocation[it.id] = "purchase_order";
      });

      const orderNumber = input.orderNumber || `PO-${req.id}-${new Date().getFullYear()}`;
      const directedTo = input.directedTo || (input.supplierName ? `إلى إدارة المشتريات (${input.supplierName})` : "إلى إدارة المشتريات");

      const newPO = {
        orderNumber,
        orderDate: input.orderDate || new Date().toISOString().split("T")[0],
        directedTo,
        supplierName: input.supplierName || "",
        supplierId: input.supplierId || null,
        supplierPhone: input.supplierPhone || "",
        supplierCommercialRegister: input.supplierCommercialRegister || "",
        requesterName: input.requesterName || ctx.user.name || "طالب الشراء",
        requesterRole: input.requesterRole || "طالب الشراء / إدارة المشاريع",
        approverName: input.approverName || "المدير التنفيذي",
        approverRole: input.approverRole || "المدير التنفيذي",
        approverSignatureUrl: input.status === "approved" ? "digital_signature_approved" : "",
        notes: input.notes || "",
        status: input.status,
        items: input.items,
        updatedAt: new Date().toISOString(),
      };

      pData.sedanaProcurement.activePurchaseOrder = newPO;
      pData.sedanaProcurement.updatedAt = new Date().toISOString();

      // تحديث أو إضافة أمر الشراء في قائمة purchaseOrders الخاصة بالطلب
      const existingIdx = pData.sedanaProcurement.purchaseOrders.findIndex(
        (p: any) => p.orderNumber === orderNumber
      );

      if (existingIdx >= 0) {
        pData.sedanaProcurement.purchaseOrders[existingIdx] = newPO;
      } else {
        pData.sedanaProcurement.purchaseOrders.unshift(newPO);
      }

      const updateData: any = {
        programData: pData,
        updatedAt: new Date(),
      };

      // إذا تم الاعتماد، وكان الطلب في مرحلة التأمين والتعاقد أو ما قبلها، يتم نقله لمرحلة التشغيل والتنفيذ
      if (input.status === "approved" && (req.currentStage === "contracting" || req.currentStage === "financial_eval_and_approval")) {
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
        message: input.status === "approved" ? "تم حفظ واعتماد أمر الشراء بنجاح" : "تم حفظ أمر الشراء كمسودة بنجاح",
      };
    }),

  // ===============================================
  // 5. اعتماد أمر الشراء فورياً
  // ===============================================
  approvePurchaseOrder: protectedProcedure
    .input(z.object({
      requestId: z.number(),
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

      activePO.status = "approved";
      activePO.approverName = input.approverName || activePO.approverName || ctx.user.name || "المدير التنفيذي";
      activePO.approverSignatureUrl = "digital_signature_approved";
      activePO.approvedAt = new Date().toISOString();
      pData.sedanaProcurement.activePurchaseOrder = activePO;
      pData.sedanaProcurement.updatedAt = new Date().toISOString();

      if (Array.isArray(pData.sedanaProcurement.purchaseOrders)) {
        pData.sedanaProcurement.purchaseOrders = pData.sedanaProcurement.purchaseOrders.map((p: any) => {
          if (!activePO.orderNumber || p.orderNumber === activePO.orderNumber) {
            return {
              ...p,
              status: "approved",
              approverName: activePO.approverName,
              approverSignatureUrl: "digital_signature_approved",
              approvedAt: activePO.approvedAt,
              updatedAt: new Date().toISOString(),
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
});
