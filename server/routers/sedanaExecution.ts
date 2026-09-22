import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { mosqueRequests, mosques, users, quantitySchedules, requestHistory, requestStageTracking, disbursementOrders } from "../../drizzle/schema";
import { eq, desc, and, sql, isNotNull, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const sedanaExecutionRouter = router({
  // ==========================================
  // 0. قائمة بجميع طلبات برنامج سدانة لاختيار الطلب
  // ==========================================
  listSedanaRequests: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const rows = await db
        .select({
          request: mosqueRequests,
          mosque: mosques,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(isNotNull(mosqueRequests.programData))
        .orderBy(desc(mosqueRequests.createdAt));

      const sedanaList: any[] = [];
      for (const row of rows) {
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

        const isSedana = req.programType === "sedana" || pData.isSedana || pData.sedanaProcurement || pData.basketItems;
        if (!isSedana) continue;

        const sedanaProc = pData.sedanaProcurement || {};
        const executionData = pData.sedanaExecution || {};
        const itemsAlloc = sedanaProc.itemsAllocation || {};
        const basketItems = Array.isArray(pData.basketItems) ? pData.basketItems : [];
        const itemsCount = Object.keys(itemsAlloc).length || basketItems.length || 0;
        const inwardCount = Array.isArray(executionData.inwardOrders) ? executionData.inwardOrders.length : 0;
        const outboundCount = Array.isArray(executionData.outboundOrders) ? executionData.outboundOrders.length : 0;
        const deliveryCount = Array.isArray(executionData.deliveryOrders) ? executionData.deliveryOrders.length : 0;

        sedanaList.push({
          id: req.id,
          requestNumber: req.requestNumber || String(req.id),
          descriptiveName: req.descriptiveName || null,
          currentStage: req.currentStage,
          status: req.status,
          mosqueId: mosque?.id || null,
          mosqueName: mosque?.name || "المسجد",
          mosqueCity: mosque?.city || "",
          createdAt: req.createdAt,
          itemsCount,
          inwardCount,
          outboundCount,
          deliveryCount,
        });
      }

      // فرز: طلبات مرحلة التشغيل والتنفيذ أولاً، ثم مراحل التنفيذ اللاحقة، ثم الأحدث
      sedanaList.sort((a, b) => {
        const isAExec = a.currentStage === "execution";
        const isBExec = b.currentStage === "execution";
        if (isAExec && !isBExec) return -1;
        if (!isAExec && isBExec) return 1;

        const isAExecutionRelated = ["handover", "closed"].includes(a.currentStage);
        const isBExecutionRelated = ["handover", "closed"].includes(b.currentStage);
        if (isAExecutionRelated && !isBExecutionRelated) return -1;
        if (!isAExecutionRelated && isBExecutionRelated) return 1;

        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      return sedanaList;
    }),

  // ==========================================
  // 1. جلب بيانات المستودع الافتراضي للطلب
  // ==========================================
  getVirtualInventory: protectedProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [row] = await db
        .select({
          request: mosqueRequests,
          mosque: mosques,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!row || !row.request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

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
      pData = pData && typeof pData === "object" ? pData : {};

      // استخراج البنود المعتمدة من سدانة
      const boqItems = await db
        .select()
        .from(quantitySchedules)
        .where(eq(quantitySchedules.requestId, req.id));

      const sedanaProc = pData.sedanaProcurement || {};
      const allocations = sedanaProc.itemsAllocation || {};
      const executionData = pData.sedanaExecution || {
        inwardOrders: [],
        outboundOrders: [],
        deliveryOrders: [],
      };

      // بناء قائمة الأصناف الأساسية المعتمدة
      let baseItems: any[] = [];
      if (boqItems.length > 0) {
        baseItems = boqItems.map((b) => ({
          id: String(b.id),
          name: b.itemName,
          description: b.itemDescription || "",
          quantity: parseFloat(b.quantity || "1"),
          unit: b.unit || "وحدة",
          allocationMethod: allocations[String(b.id)] || "purchase_order",
        }));
      } else if (pData.evaluation?.items) {
        const evalItems = Array.isArray(pData.evaluation.items) ? pData.evaluation.items : [];
        baseItems = evalItems.map((it: any, idx: number) => ({
          id: String(it.key || it.id || idx + 1),
          name: it.name || it.itemName || `بند ${idx + 1}`,
          description: it.description || it.spec || "",
          quantity: parseFloat(it.approvedQty || it.requestedQty || "1"),
          unit: it.unit || "وحدة",
          allocationMethod: allocations[String(it.key || it.id)] || "purchase_order",
        }));
      } else if (pData.basketItems) {
        const basket = Array.isArray(pData.basketItems) ? pData.basketItems : [];
        baseItems = basket.map((b: any, idx: number) => ({
          id: String(b.id || idx + 1),
          name: b.name,
          description: b.description || b.category || "",
          quantity: parseFloat(b.quantity || "1"),
          unit: b.unit || "وحدة",
          allocationMethod: allocations[String(b.id)] || "purchase_order",
        }));
      }

      // حساب رصيد المخزون الافتراضي لكل صنف
      const inwardMap: Record<string, number> = {};
      const outboundMap: Record<string, number> = {};
      const deliveredMap: Record<string, number> = {};

      (executionData.inwardOrders || []).forEach((inOrder: any) => {
        (inOrder.items || []).forEach((it: any) => {
          inwardMap[it.id] = (inwardMap[it.id] || 0) + Number(it.quantity || 0);
        });
      });

      (executionData.outboundOrders || []).forEach((outOrder: any) => {
        if (outOrder.status !== "cancelled") {
          (outOrder.items || []).forEach((it: any) => {
            outboundMap[it.id] = (outboundMap[it.id] || 0) + Number(it.quantity || 0);
          });
        }
      });

      (executionData.deliveryOrders || []).forEach((delOrder: any) => {
        if (delOrder.status === "confirmed") {
          (delOrder.items || []).forEach((it: any) => {
            deliveredMap[it.id] = (deliveredMap[it.id] || 0) + Number(it.quantity || 0);
          });
        }
      });

      const inventoryItems = baseItems.map((it) => {
        const approvedQty = it.quantity;
        const totalInward = inwardMap[it.id] || 0;
        const totalOutbound = outboundMap[it.id] || 0;
        const totalDelivered = deliveredMap[it.id] || 0;
        const availableStock = Math.max(0, totalInward - totalOutbound);
        const pendingInward = Math.max(0, approvedQty - totalInward);

        return {
          ...it,
          approvedQty,
          totalInward,
          totalOutbound,
          totalDelivered,
          availableStock,
          pendingInward,
        };
      });

      // جلب أوامر الصرف المنفذة فقط المرتبطة بهذا الطلب (أمر شراء، خطاب مجتمعي، أو طلب صرف خاص بالطلب نفسه)
      const activePO = sedanaProc.activePurchaseOrder || null;
      const activeCSR = sedanaProc.activeCsrLetter || null;

      const allPOs: string[] = [];
      if (activePO?.orderNumber) allPOs.push(activePO.orderNumber);
      if (Array.isArray(sedanaProc.purchaseOrders)) {
        sedanaProc.purchaseOrders.forEach((p: any) => {
          if (p.orderNumber && !allPOs.includes(p.orderNumber)) allPOs.push(p.orderNumber);
        });
      }

      const allCSRs: string[] = [];
      if (activeCSR?.letterNumber) allCSRs.push(activeCSR.letterNumber);
      if (Array.isArray(sedanaProc.csrLetters)) {
        sedanaProc.csrLetters.forEach((c: any) => {
          if (c.letterNumber && !allCSRs.includes(c.letterNumber)) allCSRs.push(c.letterNumber);
        });
      }

      const linkedDisbursementOrders = await db
        .select({
          id: disbursementOrders.id,
          orderNumber: disbursementOrders.orderNumber,
          purchaseOrderNumber: disbursementOrders.purchaseOrderNumber,
          csrLetterNumber: disbursementOrders.csrLetterNumber,
          sourceType: disbursementOrders.sourceType,
          status: disbursementOrders.status,
          amount: disbursementOrders.amount,
          adminFees: disbursementOrders.adminFees,
          itemsJson: disbursementOrders.itemsJson,
          beneficiaryName: disbursementOrders.beneficiaryName,
          executedAt: disbursementOrders.executedAt,
          createdAt: disbursementOrders.createdAt,
        })
        .from(disbursementOrders)
        .where(
          and(
            eq(disbursementOrders.status, "executed"),
            or(
              eq(disbursementOrders.requestId, req.id),
              allPOs.length > 0 ? inArray(disbursementOrders.purchaseOrderNumber, allPOs) : sql`1=0`,
              allCSRs.length > 0 ? inArray(disbursementOrders.csrLetterNumber, allCSRs) : sql`1=0`
            )
          )
        );

      // تجهيز قائمة أوامر الصرف المعتمدة مع تفاصيل الكميات المحسوبة (المعتمدة بأمر الصرف، والمدخلة سابقاً، والحد الأقصى المتبقي)
      const enrichedDisbOrders = linkedDisbursementOrders.map((d) => {
        const isExecuted = d.status === "executed";
        const refType = d.sourceType || (d.purchaseOrderNumber ? "purchase_order" : (d.csrLetterNumber ? "csr_letter" : "direct"));
        const refNumber = d.purchaseOrderNumber || d.csrLetterNumber || d.orderNumber;

        // حساب ما تم إدخاله مسبقاً لأمر الصرف هذا
        const alreadyInwardByDisb: Record<string, number> = {};
        (executionData.inwardOrders || []).forEach((inOrder: any) => {
          const matches = (inOrder.disbursementOrderId && Number(inOrder.disbursementOrderId) === Number(d.id)) ||
                          (inOrder.disbursementOrderNumber && inOrder.disbursementOrderNumber === d.orderNumber);
          if (matches) {
            (inOrder.items || []).forEach((it: any) => {
              const k = String(it.id);
              alreadyInwardByDisb[k] = (alreadyInwardByDisb[k] || 0) + Number(it.quantity || 0);
              if (it.itemName) {
                alreadyInwardByDisb[`name:${it.itemName.trim().toLowerCase()}`] = 
                  (alreadyInwardByDisb[`name:${it.itemName.trim().toLowerCase()}`] || 0) + Number(it.quantity || 0);
              }
            });
          }
        });

        // استخراج أصناف أمر الصرف
        let dItems: any[] = [];
        if (d.itemsJson) {
          try {
            const parsed = JSON.parse(d.itemsJson);
            if (Array.isArray(parsed) && parsed.length > 0) dItems = parsed;
          } catch (e) {}
        }
        if (dItems.length === 0) {
          if (d.purchaseOrderNumber) {
            const po = (sedanaProc.purchaseOrders || []).find((p: any) => p.orderNumber === d.purchaseOrderNumber) || activePO;
            if (po?.items) dItems = po.items;
          } else if (d.csrLetterNumber) {
            const csr = (sedanaProc.csrLetters || []).find((c: any) => c.letterNumber === d.csrLetterNumber) || activeCSR;
            if (csr?.items) dItems = csr.items;
          }
        }
        if (dItems.length === 0) {
          dItems = baseItems;
        }

        const resolvedItems = dItems.map((it: any, idx: number) => {
          const id = String(it.id || idx + 1);
          const itemName = it.itemName || it.name || `بند ${id}`;
          const unit = it.unit || "وحدة";
          const maxDisbursedQty = Number(it.quantity || it.approvedQty || 0);
          const alreadyInwardQty = alreadyInwardByDisb[id] || 
                                   alreadyInwardByDisb[`name:${itemName.trim().toLowerCase()}`] || 0;
          const remainingAllowedQty = Math.max(0, maxDisbursedQty - alreadyInwardQty);
          return {
            id,
            itemName,
            unit,
            maxDisbursedQty,
            alreadyInwardQty,
            remainingAllowedQty,
            unitPrice: Number(it.unitPrice || 0),
            isCompleted: remainingAllowedQty <= 0,
          };
        });

        const totalDisbursedUnits = resolvedItems.reduce((s, i) => s + i.maxDisbursedQty, 0);
        const totalInwardUnits = resolvedItems.reduce((s, i) => s + i.alreadyInwardQty, 0);
        const totalRemainingUnits = resolvedItems.reduce((s, i) => s + i.remainingAllowedQty, 0);
        const isFullyInwarded = resolvedItems.length > 0 && resolvedItems.every(i => i.remainingAllowedQty <= 0);

        const statusMap: Record<string, string> = {
          draft: "مسودة",
          pending: "قيد المراجعة المالية",
          pending_executive: "بانتظار اعتماد المدير التنفيذي",
          approved: "معتمد بانتظار التحويل البنكي",
          executed: "منفّذ بالتحويل البنكي",
          rejected: "مرفوض",
          edited: "تم التعديل",
        };

        let blockedReason: string | null = null;
        if (!isExecuted) {
          blockedReason = `لا يمكن عمل أمر إدخال إلا بعد تنفيذ أمر الصرف (${d.orderNumber}) وتحول حالته إلى 'منفّذ'. الحالة الحالية: (${statusMap[d.status || ""] || d.status}).`;
        } else if (isFullyInwarded) {
          blockedReason = `تم استيفاء كامل كميات أمر الصرف هذا في المستودع بنسبة 100% (الرصيد المتبقي المسموح: 0).`;
        }

        return {
          id: d.id,
          orderNumber: d.orderNumber,
          referenceType: refType,
          referenceNumber: refNumber,
          beneficiaryName: d.beneficiaryName || "المورد / المستفيد",
          status: d.status,
          statusLabel: statusMap[d.status || ""] || d.status,
          isExecuted,
          executedAt: d.executedAt,
          amount: Number(d.amount || 0),
          items: resolvedItems,
          totalDisbursedUnits,
          totalInwardUnits,
          totalRemainingUnits,
          isFullyInwarded,
          canCreateInward: isExecuted && !isFullyInwarded,
          blockedReason,
        };
      });

      const disbByPo = new Map<string, any>();
      const disbByCsr = new Map<string, any>();
      enrichedDisbOrders.forEach((d) => {
        if (d.referenceType === "purchase_order" && d.referenceNumber) disbByPo.set(d.referenceNumber.trim(), d);
        if (d.referenceType === "csr_letter" && d.referenceNumber) disbByCsr.set(d.referenceNumber.trim(), d);
      });

      // المستندات المرجعية المتاحة للربط مع أمر الإدخال
      const availableReferences: {
        type: string;
        label: string;
        documentNumber: string;
        partnerOrSupplier?: string;
        hasDisbursementOrder?: boolean;
        disbursementOrderNumber?: string | null;
        disbursementOrderId?: number | null;
        disbursementStatus?: string | null;
        disbursementExecutedAt?: any | null;
        isExecuted: boolean;
        canCreateInward: boolean;
        blockedReason?: string | null;
        items?: any[];
      }[] = [];

      // 1. أمر شراء داخلي
      const hasPO = Object.values(allocations).includes("purchase_order") || !!activePO;
      if (hasPO) {
        const poNum = activePO?.orderNumber || `PO-${req.id}-${new Date().getFullYear()}`;
        const disb = disbByPo.get(poNum) || enrichedDisbOrders.find(d => d.referenceType === "purchase_order");
        const isExecuted = disb?.isExecuted || false;

        let blockedReason: string | null = null;
        if (!disb) {
          blockedReason = "لا يمكن عمل أمر إدخال؛ لم يتم إنشاء أمر صرف لأمر الشراء المعتمد بعد. يجب إنشاء أمر الصرف أولاً واعتماده وتنفيذه بالتحويل البنكي.";
        } else if (!isExecuted) {
          blockedReason = disb.blockedReason;
        } else if (disb.isFullyInwarded) {
          blockedReason = disb.blockedReason;
        }

        availableReferences.push({
          type: "purchase_order",
          label: "أمر شراء داخلي معتمد",
          documentNumber: poNum,
          partnerOrSupplier: activePO?.directedTo || disb?.beneficiaryName || "إدارة المشتريات",
          hasDisbursementOrder: !!disb,
          disbursementOrderNumber: disb?.orderNumber || null,
          disbursementOrderId: disb?.id || null,
          disbursementStatus: disb?.status || null,
          disbursementExecutedAt: disb?.executedAt || null,
          isExecuted,
          canCreateInward: disb ? disb.canCreateInward : false,
          blockedReason,
          items: disb?.items || [],
        });
      }

      // 2. خطاب مسؤولية مجتمعية (CSR)
      const hasCSR = Object.values(allocations).includes("csr_letter") || !!activeCSR;
      if (hasCSR) {
        const csrNum = activeCSR?.letterNumber || `CSR-${req.id}-${new Date().getFullYear()}`;
        const disb = disbByCsr.get(csrNum) || enrichedDisbOrders.find(d => d.referenceType === "csr_letter");
        const isExecuted = disb?.isExecuted || false;

        let blockedReason: string | null = null;
        if (!disb) {
          blockedReason = "لا يمكن عمل أمر إدخال؛ لم يتم إنشاء أمر صرف لخطاب المسؤولية المجتمعية بعد. يجب إنشاء أمر الصرف أولاً واعتماده وتنفيذه بالتحويل البنكي.";
        } else if (!isExecuted) {
          blockedReason = disb.blockedReason;
        } else if (disb.isFullyInwarded) {
          blockedReason = disb.blockedReason;
        }

        availableReferences.push({
          type: "csr_letter",
          label: "خطاب مسؤولية مجتمعية (CSR)",
          documentNumber: csrNum,
          partnerOrSupplier: activeCSR?.recipientName || disb?.beneficiaryName || "الجهة المانحة / الشريك المجتمعي",
          hasDisbursementOrder: !!disb,
          disbursementOrderNumber: disb?.orderNumber || null,
          disbursementOrderId: disb?.id || null,
          disbursementStatus: disb?.status || null,
          disbursementExecutedAt: disb?.executedAt || null,
          isExecuted,
          canCreateInward: disb ? disb.canCreateInward : false,
          blockedReason,
          items: disb?.items || [],
        });
      }

      // 3. عقود التوريد المعتمدة (سدانة)
      const hasContract = Object.values(allocations).includes("contract") || Object.values(allocations).includes("supplier_contract");
      if (hasContract) {
        const contractDisbs = enrichedDisbOrders.filter(d => d.referenceType === "contract");
        if (contractDisbs.length > 0) {
          contractDisbs.forEach((cd) => {
            availableReferences.push({
              type: "contract",
              label: `عقد توريد (${cd.orderNumber})`,
              documentNumber: cd.orderNumber,
              partnerOrSupplier: cd.beneficiaryName || "المورد المتعاقد",
              hasDisbursementOrder: true,
              disbursementOrderNumber: cd.orderNumber,
              disbursementOrderId: cd.id,
              disbursementStatus: cd.status,
              disbursementExecutedAt: cd.executedAt,
              isExecuted: cd.isExecuted,
              canCreateInward: cd.canCreateInward,
              blockedReason: cd.blockedReason,
              items: cd.items || [],
            });
          });
        } else {
          availableReferences.push({
            type: "contract",
            label: "عقد توريد وخدمات (سدانة)",
            documentNumber: `CNT-${req.id}-${new Date().getFullYear()}`,
            partnerOrSupplier: "المورد المعتمد",
            hasDisbursementOrder: false,
            isExecuted: false,
            canCreateInward: false,
            blockedReason: "لا يمكن عمل أمر إدخال؛ لم يتم إصدار أمر صرف للدفعة التعاقدية بعد أو لم يتم تنفيذه بالتحويل البنكي.",
            items: [],
          });
        }
      }

      // 4. خيارات إضافية للتوريد المباشر أو التبرع العيني
      availableReferences.push(
        {
          type: "direct_purchase",
          label: "شراء وتوريد مباشر",
          documentNumber: `DIR-${req.id}`,
          partnerOrSupplier: "شراء مباشر من السوق",
          hasDisbursementOrder: true,
          isExecuted: true,
          canCreateInward: true,
          blockedReason: null,
        },
        {
          type: "in_kind_donation",
          label: "تبرع عيني",
          documentNumber: `DON-${req.id}`,
          partnerOrSupplier: "فاعل خير / متبرع عيني",
          hasDisbursementOrder: true,
          isExecuted: true,
          canCreateInward: true,
          blockedReason: null,
        }
      );

      return {
        request: {
          id: req.id,
          requestNumber: req.requestNumber,
          descriptiveName: req.descriptiveName,
          currentStage: req.currentStage,
          status: req.status,
          createdAt: req.createdAt,
        },
        mosque,
        inventoryItems,
        availableReferences,
        disbursementOrders: enrichedDisbOrders,
        inwardOrders: executionData.inwardOrders || [],
        outboundOrders: executionData.outboundOrders || [],
        deliveryOrders: executionData.deliveryOrders || [],
      };
    }),

  // ==========================================
  // 2. إصدار أمر إدخال مستودعي (Inward Order)
  // ==========================================
  createInwardOrder: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      orderNumber: z.string().optional(),
      orderDate: z.string().optional(),
      receivedBy: z.string().optional(),
      disbursementOrderId: z.number().optional().nullable(),
      disbursementOrderNumber: z.string().optional().nullable(),
      referenceType: z.string().optional(),
      referenceNumber: z.string().optional(),
      supplierInvoiceNumber: z.string().optional(),
      supplierName: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        id: z.string(),
        itemName: z.string(),
        quantity: z.number().min(0.01),
        unit: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [req] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      let pData: any = req.programData;
      while (typeof pData === "string") {
        try {
          pData = JSON.parse(pData);
        } catch {
          break;
        }
      }
      pData = pData && typeof pData === "object" ? pData : {};
      pData.sedanaExecution = pData.sedanaExecution || {};
      pData.sedanaExecution.inwardOrders = pData.sedanaExecution.inwardOrders || [];

      // =========================================================================
      // التحقق النظامي والمطابقة مع أمر الصرف المالي
      // =========================================================================
      let matchedDisbursementOrder: any = null;

      if (input.disbursementOrderId) {
        const [d] = await db
          .select()
          .from(disbursementOrders)
          .where(eq(disbursementOrders.id, input.disbursementOrderId))
          .limit(1);
        matchedDisbursementOrder = d;
      } else if (input.disbursementOrderNumber) {
        const [d] = await db
          .select()
          .from(disbursementOrders)
          .where(eq(disbursementOrders.orderNumber, input.disbursementOrderNumber))
          .limit(1);
        matchedDisbursementOrder = d;
      }

      if (!matchedDisbursementOrder && (input.referenceType === "purchase_order" || input.referenceType === "csr_letter")) {
        const [d] = await db
          .select()
          .from(disbursementOrders)
          .where(
            or(
              input.referenceType === "purchase_order" && input.referenceNumber
                ? eq(disbursementOrders.purchaseOrderNumber, input.referenceNumber)
                : sql`1=0`,
              input.referenceType === "csr_letter" && input.referenceNumber
                ? eq(disbursementOrders.csrLetterNumber, input.referenceNumber)
                : sql`1=0`,
              and(
                eq(disbursementOrders.requestId, input.requestId),
                eq(disbursementOrders.sourceType, input.referenceType)
              )
            )
          )
          .orderBy(desc(disbursementOrders.id))
          .limit(1);
        matchedDisbursementOrder = d;
      }

      if (input.referenceType === "purchase_order" || input.referenceType === "csr_letter") {
        if (!matchedDisbursementOrder) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "لا يمكن إصدار أمر إدخال؛ لم يتم العثور على أمر صرف منفّذ لهذا التوريد. يجب أولاً اعتماد وتنفيذ أمر الصرف بالتحويل البنكي.",
          });
        }

        if (matchedDisbursementOrder.status !== "executed") {
          const statusMap: Record<string, string> = {
            draft: "مسودة",
            pending: "قيد المراجعة المالية",
            pending_executive: "بانتظار اعتماد المدير التنفيذي",
            approved: "معتمد بانتظار التحويل البنكي",
            rejected: "مرفوض",
            edited: "تم التعديل",
          };
          const readableStatus = matchedDisbursementOrder.status ? (statusMap[matchedDisbursementOrder.status] || matchedDisbursementOrder.status) : "غير محدد";
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `لا يمكن إصدار أمر إدخال إلا بعد تنفيذ أمر الصرف وتحول حالته إلى 'منفّذ'. أمر الصرف المرتبط (${matchedDisbursementOrder.orderNumber}) حالته الحالية: (${readableStatus}).`,
          });
        }
      }

      // =========================================================================
      // التحقق الصارم من الحد الأقصى للكميات المعتمدة في أمر الصرف (The user's rule)
      // =========================================================================
      if (matchedDisbursementOrder) {
        // حساب ما تم إدخاله مسبقاً لأمر الصرف هذا تحديداً
        const alreadyInwardForThisDisb: Record<string, number> = {};
        (pData.sedanaExecution.inwardOrders || []).forEach((inOrder: any) => {
          const isSameDisb = (inOrder.disbursementOrderId && Number(inOrder.disbursementOrderId) === Number(matchedDisbursementOrder.id)) ||
                             (inOrder.disbursementOrderNumber && inOrder.disbursementOrderNumber === matchedDisbursementOrder.orderNumber);
          if (isSameDisb) {
            (inOrder.items || []).forEach((it: any) => {
              const k = String(it.id);
              alreadyInwardForThisDisb[k] = (alreadyInwardForThisDisb[k] || 0) + Number(it.quantity || 0);
              if (it.itemName) {
                alreadyInwardForThisDisb[`name:${it.itemName.trim().toLowerCase()}`] = 
                  (alreadyInwardForThisDisb[`name:${it.itemName.trim().toLowerCase()}`] || 0) + Number(it.quantity || 0);
              }
            });
          }
        });

        // استخراج بنود أمر الصرف
        let disbItems: any[] = [];
        if (matchedDisbursementOrder.itemsJson) {
          try {
            const parsed = JSON.parse(matchedDisbursementOrder.itemsJson);
            if (Array.isArray(parsed) && parsed.length > 0) disbItems = parsed;
          } catch (e) {}
        }
        if (disbItems.length === 0) {
          if (matchedDisbursementOrder.purchaseOrderNumber) {
            const po = (pData.sedanaProcurement?.purchaseOrders || []).find((p: any) => p.orderNumber === matchedDisbursementOrder.purchaseOrderNumber) || pData.sedanaProcurement?.activePurchaseOrder;
            if (po?.items) disbItems = po.items;
          } else if (matchedDisbursementOrder.csrLetterNumber) {
            const csr = (pData.sedanaProcurement?.csrLetters || []).find((c: any) => c.letterNumber === matchedDisbursementOrder.csrLetterNumber) || pData.sedanaProcurement?.activeCsrLetter;
            if (csr?.items) disbItems = csr.items;
          }
        }
        if (disbItems.length === 0) {
          disbItems = pData.basketItems || [];
        }

        // التدقيق في كمية كل صنف مدخل
        for (const inputItem of input.items) {
          const target = disbItems.find((di: any) => 
            String(di.id) === String(inputItem.id) ||
            (di.itemName && di.itemName.trim().toLowerCase() === inputItem.itemName.trim().toLowerCase()) ||
            (di.name && di.name.trim().toLowerCase() === inputItem.itemName.trim().toLowerCase())
          );

          if (target) {
            const maxDisbQty = Number(target.quantity || target.approvedQty || 0);
            const prevInward = alreadyInwardForThisDisb[String(inputItem.id)] || 
                               alreadyInwardForThisDisb[`name:${inputItem.itemName.trim().toLowerCase()}`] || 0;
            const remainingAllowed = Math.max(0, maxDisbQty - prevInward);

            if (inputItem.quantity > remainingAllowed + 0.0001) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `الكمية المدخلة للصنف (${inputItem.itemName}) وقدرها ${inputItem.quantity} تتجاوز الحد الأقصى المتبقي من أمر الصرف ${matchedDisbursementOrder.orderNumber}. (المحدد بأمر الصرف: ${maxDisbQty}، المدخل سابقاً: ${prevInward}، الحد الأقصى المتاح للإدخال الآن: ${remainingAllowed} ${inputItem.unit})`,
              });
            }
          }
        }
      }

      const orderCount = pData.sedanaExecution.inwardOrders.length + 1;
      const orderNumber = input.orderNumber || `IN-${req.id}-${String(orderCount).padStart(2, "0")}`;

      const newInwardOrder = {
        id: `IN-${req.id}-${Date.now()}`,
        orderNumber,
        orderDate: input.orderDate || new Date().toISOString().split("T")[0],
        receivedBy: input.receivedBy || ctx.user.name || "أمين المستودع",
        referenceType: input.referenceType || matchedDisbursementOrder?.sourceType || "purchase_order",
        referenceNumber: input.referenceNumber || matchedDisbursementOrder?.purchaseOrderNumber || matchedDisbursementOrder?.csrLetterNumber || "",
        disbursementOrderId: matchedDisbursementOrder?.id || null,
        disbursementOrderNumber: matchedDisbursementOrder?.orderNumber || null,
        disbursementExecutedAt: matchedDisbursementOrder?.executedAt || null,
        supplierInvoiceNumber: input.supplierInvoiceNumber || "",
        supplierName: input.supplierName || matchedDisbursementOrder?.beneficiaryName || "",
        notes: input.notes || "",
        items: input.items,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name,
        createdAt: new Date().toISOString(),
      };

      pData.sedanaExecution.inwardOrders.push(newInwardOrder);

      await db
        .update(mosqueRequests)
        .set({
          programData: pData,
          updatedAt: new Date(),
        })
        .where(eq(mosqueRequests.id, input.requestId));

      try {
        await db.insert(requestHistory).values({
          requestId: input.requestId,
          userId: ctx.user.id,
          fromStage: req.currentStage,
          toStage: req.currentStage,
          fromStatus: req.status,
          toStatus: req.status,
          action: "sedana_inward_order_created",
          notes: `تم تسجيل أمر إدخال مستودعي رقم ${orderNumber} بعدد ${input.items.length} بنود`,
        });
      } catch (e) {
        console.error("Log error:", e);
      }

      return {
        success: true,
        order: newInwardOrder,
      };
    }),

  // ==========================================
  // 3. إصدار أمر إخراج مجدول كمسوغ صرف محاسبي مع تحديد طريقة الإخراج
  // ==========================================
  createOutboundOrder: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      orderNumber: z.string().optional(),
      scheduledDate: z.string(),
      periodLabel: z.string().default("دفعة دورية مجدولة"),
      outboundMethod: z.enum(["direct_imam", "courier_delivery", "warehouse_pickup", "scheduled_batch"]).default("direct_imam").optional(),
      recipientName: z.string().optional(),
      recipientRole: z.string().default("إمام المسجد").optional(),
      recipientPhone: z.string().optional(),
      deliveryLocation: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        id: z.string(),
        itemName: z.string(),
        quantity: z.number().min(0.01),
        unit: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [req] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      let pData: any = req.programData;
      while (typeof pData === "string") {
        try {
          pData = JSON.parse(pData);
        } catch {
          break;
        }
      }
      pData = pData && typeof pData === "object" ? pData : {};
      pData.sedanaExecution = pData.sedanaExecution || {};
      pData.sedanaExecution.outboundOrders = pData.sedanaExecution.outboundOrders || [];
      pData.sedanaExecution.deliveryOrders = pData.sedanaExecution.deliveryOrders || [];

      // التحقق من الرصيد المتوفر في المستودع الافتراضي لكل صنف
      const inwardMap: Record<string, number> = {};
      const outboundMap: Record<string, number> = {};

      (pData.sedanaExecution.inwardOrders || []).forEach((inOrder: any) => {
        (inOrder.items || []).forEach((it: any) => {
          inwardMap[it.id] = (inwardMap[it.id] || 0) + Number(it.quantity || 0);
        });
      });

      (pData.sedanaExecution.outboundOrders || []).forEach((outOrder: any) => {
        if (outOrder.status !== "cancelled") {
          (outOrder.items || []).forEach((it: any) => {
            outboundMap[it.id] = (outboundMap[it.id] || 0) + Number(it.quantity || 0);
          });
        }
      });

      for (const item of input.items) {
        const available = Math.max(0, (inwardMap[item.id] || 0) - (outboundMap[item.id] || 0));
        if (item.quantity > available + 0.0001) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `الكمية المدخلة للصنف (${item.itemName}) وقدرها ${item.quantity} تتجاوز الرصيد المتوفر حالياً في المستودع (${available} ${item.unit})`,
          });
        }
      }

      const count = pData.sedanaExecution.outboundOrders.length + 1;
      const orderNumber = input.orderNumber || `OUT-${req.id}-${String(count).padStart(2, "0")}`;
      const disbursementVoucherCode = `DV-SED-${req.id}-${String(count).padStart(2, "0")}`;

      const outboundId = `OUT-${req.id}-${Date.now()}`;
      const deliveryId = `DEL-${req.id}-${Date.now()}`;

      const newOutbound = {
        id: outboundId,
        orderNumber,
        scheduledDate: input.scheduledDate,
        periodLabel: input.periodLabel,
        outboundMethod: input.outboundMethod || "direct_imam",
        recipientName: input.recipientName || "إمام المسجد",
        recipientRole: input.recipientRole || "إمام المسجد",
        recipientPhone: input.recipientPhone || "",
        deliveryLocation: input.deliveryLocation || "",
        disbursementVoucherCode,
        status: "pending_receipt" as const, // بانتظار تأكيد واستلام الإمام
        notes: input.notes || "",
        items: input.items,
        linkedDeliveryId: deliveryId,
        confirmation: null,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name,
        createdAt: new Date().toISOString(),
      };

      // إنشاء سجل أمر تسليم موازٍ تلقائياً لربطه بمسوغ الصرف والتوقيع الرقمي
      const newDelivery = {
        id: deliveryId,
        deliveryNumber: `DEL-${req.id}-${String(count).padStart(2, "0")}`,
        outboundOrderId: outboundId,
        disbursementVoucherCode,
        outboundMethod: input.outboundMethod || "direct_imam",
        recipientName: input.recipientName || "إمام المسجد",
        recipientRole: input.recipientRole || "إمام المسجد",
        recipientPhone: input.recipientPhone || "",
        scheduledDate: input.scheduledDate,
        status: "pending_delivery" as const,
        items: input.items,
        notes: input.notes || "",
        confirmation: null,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name,
        createdAt: new Date().toISOString(),
      };

      pData.sedanaExecution.outboundOrders.push(newOutbound);
      pData.sedanaExecution.deliveryOrders.push(newDelivery);

      await db
        .update(mosqueRequests)
        .set({
          programData: pData,
          updatedAt: new Date(),
        })
        .where(eq(mosqueRequests.id, input.requestId));

      try {
        await db.insert(requestHistory).values({
          requestId: input.requestId,
          userId: ctx.user.id,
          fromStage: req.currentStage,
          toStage: req.currentStage,
          fromStatus: req.status,
          toStatus: req.status,
          action: "sedana_outbound_order_created",
          notes: `تم إنشاء أمر إخراج مجدول رقم ${orderNumber} (طريقة الإخراج: ${input.outboundMethod || "تسليم مباشر"}) ومسوغ صرف ${disbursementVoucherCode}`,
        });
      } catch (e) {
        console.error("Log error:", e);
      }

      return {
        success: true,
        order: newOutbound,
        delivery: newDelivery,
      };
    }),

  // ==========================================
  // 4. إصدار أمر تسليم ميداني (Delivery Order)
  // ==========================================
  createDeliveryOrder: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      outboundOrderId: z.string().optional(),
      recipientName: z.string(),
      recipientRole: z.string().default("إمام المسجد"),
      recipientPhone: z.string().optional(),
      scheduledDate: z.string(),
      notes: z.string().optional(),
      items: z.array(z.object({
        id: z.string(),
        itemName: z.string(),
        quantity: z.number().min(0.01),
        unit: z.string(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [req] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      let pData: any = req.programData;
      while (typeof pData === "string") {
        try {
          pData = JSON.parse(pData);
        } catch {
          break;
        }
      }
      pData = pData && typeof pData === "object" ? pData : {};
      pData.sedanaExecution = pData.sedanaExecution || {};
      pData.sedanaExecution.deliveryOrders = pData.sedanaExecution.deliveryOrders || [];

      const count = pData.sedanaExecution.deliveryOrders.length + 1;
      const deliveryNumber = `DEL-${req.id}-${String(count).padStart(2, "0")}`;

      let disbursementCode = "";
      if (input.outboundOrderId && pData.sedanaExecution.outboundOrders) {
        const out = pData.sedanaExecution.outboundOrders.find((o: any) => o.id === input.outboundOrderId);
        if (out) {
          disbursementCode = out.disbursementVoucherCode;
          out.status = "dispatched";
        }
      }

      const newDelivery = {
        id: `DEL-${req.id}-${Date.now()}`,
        deliveryNumber,
        outboundOrderId: input.outboundOrderId || null,
        disbursementVoucherCode: disbursementCode,
        recipientName: input.recipientName,
        recipientRole: input.recipientRole,
        recipientPhone: input.recipientPhone || "",
        scheduledDate: input.scheduledDate,
        status: "pending_delivery" as const,
        items: input.items,
        notes: input.notes || "",
        confirmation: null,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name,
        createdAt: new Date().toISOString(),
      };

      pData.sedanaExecution.deliveryOrders.push(newDelivery);

      await db
        .update(mosqueRequests)
        .set({
          programData: pData,
          updatedAt: new Date(),
        })
        .where(eq(mosqueRequests.id, input.requestId));

      try {
        await db.insert(requestHistory).values({
          requestId: input.requestId,
          userId: ctx.user.id,
          fromStage: req.currentStage,
          toStage: req.currentStage,
          fromStatus: req.status,
          toStatus: req.status,
          action: "sedana_delivery_order_created",
          notes: `تم إصدار أمر تسليم رقم ${deliveryNumber} الموجه إلى ${input.recipientName}`,
        });
      } catch (e) {
        console.error("Log error:", e);
      }

      return {
        success: true,
        delivery: newDelivery,
      };
    }),

  // ==========================================
  // 5. إثبات وتأكيد الاستلام الرقمي من قبل الإمام
  // ==========================================
  confirmDeliveryReceipt: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      deliveryOrderId: z.string(),
      signatureUrl: z.string().optional(),
      satisfactionRating: z.number().min(1).max(5).default(5),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [req] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      let pData: any = req.programData;
      while (typeof pData === "string") {
        try {
          pData = JSON.parse(pData);
        } catch {
          break;
        }
      }
      pData = pData && typeof pData === "object" ? pData : {};
      pData.sedanaExecution = pData.sedanaExecution || {};
      const deliveries = pData.sedanaExecution.deliveryOrders || [];

      const targetIndex = deliveries.findIndex((d: any) => d.id === input.deliveryOrderId);
      if (targetIndex === -1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "أمر التسليم غير موجود" });
      }

      const confirmedAt = new Date().toISOString();
      deliveries[targetIndex].status = "confirmed";
      deliveries[targetIndex].deliveredDate = confirmedAt.split("T")[0];
      deliveries[targetIndex].confirmation = {
        confirmedAt,
        confirmedBy: ctx.user.id,
        confirmedByName: ctx.user.name || "إمام المسجد",
        signatureUrl: input.signatureUrl || "",
        satisfactionRating: input.satisfactionRating,
        notes: input.notes || "",
      };

      // إذا كان هناك أمر إخراج مرتبط نحدث حالته أيضاً
      if (deliveries[targetIndex].outboundOrderId && pData.sedanaExecution.outboundOrders) {
        const out = pData.sedanaExecution.outboundOrders.find(
          (o: any) => o.id === deliveries[targetIndex].outboundOrderId
        );
        if (out) {
          out.status = "delivered";
        }
      }

      // هل تم تأكيد جميع أوامر التسليم بنجاح؟ إذا كان كذلك نتقدم في المرحلة
      const allConfirmed = deliveries.length > 0 && deliveries.every((d: any) => d.status === "confirmed");
      let newStage = req.currentStage;
      let newStatus = req.status;

      if (allConfirmed) {
        if (req.currentStage === "execution") {
          newStage = "handover";
        } else if (req.currentStage === "handover") {
          newStage = "closed";
          newStatus = "completed";
        }
      }

      await db
        .update(mosqueRequests)
        .set({
          programData: pData,
          currentStage: newStage,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(mosqueRequests.id, input.requestId));

      try {
        await db.insert(requestHistory).values({
          requestId: input.requestId,
          userId: ctx.user.id,
          fromStage: req.currentStage,
          toStage: newStage,
          fromStatus: req.status,
          toStatus: newStatus,
          action: "sedana_delivery_confirmed",
          notes: `تم تأكيد استلام بنود أمر التسليم ${deliveries[targetIndex].deliveryNumber} إلكترونياً من قبل الإمام`,
        });
      } catch (e) {
        console.error("Log error:", e);
      }

      return {
        success: true,
        message: "تم تأكيد الاستلام وتوثيق العملية إلكترونياً بنجاح",
        delivery: deliveries[targetIndex],
        allConfirmed,
        currentStage: newStage,
      };
    }),

  // ==========================================
  // 5.1 إثبات وتأكيد استلام أمر الإخراج من قبل الإمام
  // ==========================================
  confirmOutboundReceipt: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      outboundOrderId: z.string(),
      deliveredDate: z.string().optional(),
      recipientName: z.string().optional(),
      signatureUrl: z.string().optional(),
      satisfactionRating: z.number().min(1).max(5).default(5),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [req] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      let pData: any = req.programData;
      while (typeof pData === "string") {
        try {
          pData = JSON.parse(pData);
        } catch {
          break;
        }
      }
      pData = pData && typeof pData === "object" ? pData : {};
      pData.sedanaExecution = pData.sedanaExecution || {};
      const outbounds = pData.sedanaExecution.outboundOrders || [];
      const deliveries = pData.sedanaExecution.deliveryOrders || [];

      const targetOutIndex = outbounds.findIndex((o: any) => o.id === input.outboundOrderId || o.orderNumber === input.outboundOrderId);
      if (targetOutIndex === -1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "أمر الإخراج غير موجود" });
      }

      const confirmedAt = new Date().toISOString();
      const deliveredDate = input.deliveredDate || confirmedAt.split("T")[0];
      const recipientName = input.recipientName || outbounds[targetOutIndex].recipientName || ctx.user.name || "إمام المسجد";

      const confirmationData = {
        confirmedAt,
        confirmedBy: ctx.user.id,
        confirmedByName: recipientName,
        signatureUrl: input.signatureUrl || `digital_sig_${Date.now()}`,
        satisfactionRating: input.satisfactionRating,
        notes: input.notes || "",
      };

      outbounds[targetOutIndex].status = "delivered";
      outbounds[targetOutIndex].deliveredDate = deliveredDate;
      outbounds[targetOutIndex].confirmation = confirmationData;

      // تحديث أو إنشاء سجل التسليم المرتبط لضمان تكامل الإحصائيات والطباعة
      let targetDelIndex = deliveries.findIndex((d: any) => d.outboundOrderId === outbounds[targetOutIndex].id || d.id === outbounds[targetOutIndex].linkedDeliveryId);
      if (targetDelIndex !== -1) {
        deliveries[targetDelIndex].status = "confirmed";
        deliveries[targetDelIndex].deliveredDate = deliveredDate;
        deliveries[targetDelIndex].confirmation = confirmationData;
        if (input.recipientName) deliveries[targetDelIndex].recipientName = input.recipientName;
      } else {
        deliveries.push({
          id: `DEL-${req.id}-${Date.now()}`,
          deliveryNumber: `DEL-${req.id}-${String(deliveries.length + 1).padStart(2, "0")}`,
          outboundOrderId: outbounds[targetOutIndex].id,
          disbursementVoucherCode: outbounds[targetOutIndex].disbursementVoucherCode || `DV-SED-${req.id}-01`,
          recipientName,
          recipientRole: outbounds[targetOutIndex].recipientRole || "إمام المسجد",
          recipientPhone: outbounds[targetOutIndex].recipientPhone || "",
          scheduledDate: deliveredDate,
          deliveredDate,
          status: "confirmed",
          items: outbounds[targetOutIndex].items || [],
          notes: input.notes || "",
          confirmation: confirmationData,
          createdBy: ctx.user.id,
          createdByName: ctx.user.name,
          createdAt: confirmedAt,
        });
      }

      // هل تم تأكيد جميع أوامر التسليم بنجاح؟
      const allConfirmed = deliveries.length > 0 && deliveries.every((d: any) => d.status === "confirmed");
      let newStage = req.currentStage;
      let newStatus = req.status;

      if (allConfirmed) {
        if (req.currentStage === "execution") {
          newStage = "handover";
        } else if (req.currentStage === "handover") {
          newStage = "closed";
          newStatus = "completed";
        }
      }

      await db
        .update(mosqueRequests)
        .set({
          programData: pData,
          currentStage: newStage,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(mosqueRequests.id, input.requestId));

      try {
        await db.insert(requestHistory).values({
          requestId: input.requestId,
          userId: ctx.user.id,
          fromStage: req.currentStage,
          toStage: newStage,
          fromStatus: req.status,
          toStatus: newStatus,
          action: "sedana_outbound_receipt_confirmed",
          notes: `تم اعتماد وتأكيد استلام أمر الإخراج ${outbounds[targetOutIndex].orderNumber} (${outbounds[targetOutIndex].disbursementVoucherCode}) إلكترونياً من قبل الإمام`,
        });
      } catch (e) {
        console.error("Log error:", e);
      }

      return {
        success: true,
        message: "تم اعتماد وتأكيد استلام أمر الإخراج وتوثيق المحضر بنجاح",
        outbound: outbounds[targetOutIndex],
        allConfirmed,
        currentStage: newStage,
      };
    }),

  // ==========================================
  // 6. لوحة القوة التفاوضية والشراء المجمع
  // ==========================================
  getBulkPurchasingAnalytics: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const requestsWithMosques = await db
        .select({
          request: mosqueRequests,
          mosque: mosques,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(isNotNull(mosqueRequests.programData));

      // تجميع الاحتياجات عبر كافة مساجد سدانة
      const aggregatedItems: Record<string, {
        name: string;
        category: string;
        unit: string;
        totalQuantity: number;
        mosquesCount: number;
        mosqueNames: Set<string>;
      }> = {};

      let totalSedanaRequests = 0;
      const sedanaMosques = new Set<number>();

      for (const row of requestsWithMosques) {
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

        // التحقق من أنه طلب سدانة
        const isSedana = req.programType === "sedana" || pData.isSedana || pData.sedanaProcurement || pData.basketItems;
        if (!isSedana) continue;

        totalSedanaRequests++;
        if (req.mosqueId) sedanaMosques.add(req.mosqueId);

        const items: any[] = pData.evaluation?.items || pData.basketItems || [];
        items.forEach((it) => {
          const rawName = (it.name || it.itemName || "").trim();
          if (!rawName) return;

          // توحيد المسمى للتحليل
          const cleanName = rawName.toLowerCase();
          const key = cleanName;

          if (!aggregatedItems[key]) {
            aggregatedItems[key] = {
              name: rawName,
              category: it.category || "عام",
              unit: it.unit || "وحدة",
              totalQuantity: 0,
              mosquesCount: 0,
              mosqueNames: new Set<string>(),
            };
          }

          const qty = parseFloat(it.approvedQty || it.quantity || it.requestedQty || "1") || 0;
          aggregatedItems[key].totalQuantity += qty;
          if (mosque?.name) {
            aggregatedItems[key].mosqueNames.add(mosque.name);
          }
        });
      }

      const itemsList = Object.values(aggregatedItems)
        .map((it) => ({
          name: it.name,
          category: it.category,
          unit: it.unit,
          totalQuantity: it.totalQuantity,
          mosquesCount: it.mosqueNames.size,
          // تقدير نسبة التوفير عند الشراء المباشر من المصنع (15% - 25%)
          estimatedBulkSavingsPercent: 20,
        }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity);

      return {
        totalRequests: totalSedanaRequests,
        totalMosques: sedanaMosques.size,
        itemsCount: itemsList.length,
        items: itemsList,
      };
    }),

  // ==========================================
  // 7. الذاكرة المؤسسية وسجل تنقلات الأئمة
  // ==========================================
  getImamInstitutionalHistory: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      mosqueId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const targetUserId = input.userId || ctx.user.id;

      // جلب جميع الطلبات التي قدمها أو أدارها هذا المستخدم
      const userRequests = await db
        .select({
          request: mosqueRequests,
          mosque: mosques,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(
          input.mosqueId
            ? eq(mosqueRequests.mosqueId, input.mosqueId)
            : eq(mosqueRequests.userId, targetUserId)
        )
        .orderBy(desc(mosqueRequests.createdAt));

      const mosquesServed = new Map<number, { id: number; name: string; city: string; requestsCount: number }>();
      const deliveriesHistory: any[] = [];

      for (const row of userRequests) {
        const req = row.request;
        const mosque = row.mosque;

        if (mosque) {
          const existing = mosquesServed.get(mosque.id) || {
            id: mosque.id,
            name: mosque.name,
            city: mosque.city || "",
            requestsCount: 0,
          };
          existing.requestsCount++;
          mosquesServed.set(mosque.id, existing);
        }

        let pData: any = req.programData;
        while (typeof pData === "string") {
          try {
            pData = JSON.parse(pData);
          } catch {
            break;
          }
        }
        if (pData && pData.sedanaExecution?.deliveryOrders) {
          pData.sedanaExecution.deliveryOrders.forEach((d: any) => {
            deliveriesHistory.push({
              deliveryNumber: d.deliveryNumber,
              requestId: req.id,
              requestNumber: req.requestNumber,
              mosqueName: mosque?.name || "المسجد",
              recipientName: d.recipientName,
              recipientRole: d.recipientRole,
              scheduledDate: d.scheduledDate,
              status: d.status,
              itemsCount: d.items?.length || 0,
              confirmedAt: d.confirmation?.confirmedAt || null,
            });
          });
        }
      }

      return {
        mosquesServed: Array.from(mosquesServed.values()),
        totalRequests: userRequests.length,
        deliveriesHistory,
      };
    }),
});
