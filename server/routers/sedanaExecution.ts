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
        });
      }

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

      // جلب أوامر الصرف المرتبطة بهذا الطلب للتحقق من حالة تنفيذها
      const activePO = sedanaProc.activePurchaseOrder || null;
      const activeCSR = sedanaProc.activeCsrLetter || null;

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
          executedAt: disbursementOrders.executedAt,
        })
        .from(disbursementOrders)
        .where(
          or(
            eq(disbursementOrders.requestId, req.id),
            activePO?.orderNumber ? eq(disbursementOrders.purchaseOrderNumber, activePO.orderNumber) : sql`1=0`,
            activeCSR?.letterNumber ? eq(disbursementOrders.csrLetterNumber, activeCSR.letterNumber) : sql`1=0`
          )
        );

      const disbByPo = new Map<string, any>();
      const disbByCsr = new Map<string, any>();
      linkedDisbursementOrders.forEach((d) => {
        if (d.purchaseOrderNumber) disbByPo.set(d.purchaseOrderNumber.trim(), d);
        if (d.csrLetterNumber) disbByCsr.set(d.csrLetterNumber.trim(), d);
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
      }[] = [];

      // 1. أمر شراء داخلي
      const hasPO = Object.values(allocations).includes("purchase_order") || !!activePO;
      if (hasPO) {
        const poNum = activePO?.orderNumber || `PO-${req.id}-${new Date().getFullYear()}`;
        const disb = disbByPo.get(poNum) || linkedDisbursementOrders.find(d => d.sourceType === "purchase_order");
        const isExecuted = disb?.status === "executed";

        let blockedReason: string | null = null;
        if (!disb) {
          blockedReason = "لا يمكن عمل أمر إدخال؛ لم يتم إنشاء أمر صرف لأمر الشراء المعتمد بعد. يجب إنشاء أمر الصرف أولاً واعتماده وتنفيذه بالتحويل البنكي.";
        } else if (!isExecuted) {
          const statusText = disb.status === "pending"
            ? "قيد المراجعة المالية"
            : disb.status === "pending_executive"
            ? "بانتظار اعتماد المدير التنفيذي"
            : disb.status === "approved"
            ? "معتمد بانتظار التحويل البنكي"
            : disb.status;
          blockedReason = `لا يمكن عمل أمر إدخال إلا بعد تنفيذ أمر الصرف (${disb.orderNumber}) وتحول حالته إلى "منفّذ". الحالة الحالية: (${statusText}).`;
        }

        availableReferences.push({
          type: "purchase_order",
          label: "أمر شراء داخلي معتمد",
          documentNumber: poNum,
          partnerOrSupplier: activePO?.directedTo || "إدارة المشتريات",
          hasDisbursementOrder: !!disb,
          disbursementOrderNumber: disb?.orderNumber || null,
          disbursementOrderId: disb?.id || null,
          disbursementStatus: disb?.status || null,
          disbursementExecutedAt: disb?.executedAt || null,
          isExecuted,
          canCreateInward: isExecuted,
          blockedReason,
        });
      }

      // 2. خطاب مسؤولية مجتمعية (CSR)
      const hasCSR = Object.values(allocations).includes("csr_letter") || !!activeCSR;
      if (hasCSR) {
        const csrNum = activeCSR?.letterNumber || `CSR-${req.id}-${new Date().getFullYear()}`;
        const disb = disbByCsr.get(csrNum) || linkedDisbursementOrders.find(d => d.sourceType === "csr_letter");
        const isExecuted = disb?.status === "executed";

        let blockedReason: string | null = null;
        if (!disb) {
          blockedReason = "لا يمكن عمل أمر إدخال؛ لم يتم إنشاء أمر صرف لخطاب المسؤولية المجتمعية بعد. يجب إنشاء أمر الصرف أولاً واعتماده وتنفيذه بالتحويل البنكي.";
        } else if (!isExecuted) {
          const statusText = disb.status === "pending"
            ? "قيد المراجعة المالية"
            : disb.status === "pending_executive"
            ? "بانتظار اعتماد المدير التنفيذي"
            : disb.status === "approved"
            ? "معتمد بانتظار التحويل البنكي"
            : disb.status;
          blockedReason = `لا يمكن عمل أمر إدخال إلا بعد تنفيذ أمر الصرف (${disb.orderNumber}) وتحول حالته إلى "منفّذ". الحالة الحالية: (${statusText}).`;
        }

        availableReferences.push({
          type: "csr_letter",
          label: "خطاب مسؤولية مجتمعية (CSR)",
          documentNumber: csrNum,
          partnerOrSupplier: activeCSR?.recipientName || "الجهة المانحة / الشريك المجتمعي",
          hasDisbursementOrder: !!disb,
          disbursementOrderNumber: disb?.orderNumber || null,
          disbursementOrderId: disb?.id || null,
          disbursementStatus: disb?.status || null,
          disbursementExecutedAt: disb?.executedAt || null,
          isExecuted,
          canCreateInward: isExecuted,
          blockedReason,
        });
      }

      // 3. عقد مورد سنوي
      const hasContract = Object.values(allocations).includes("supplier_contract");
      if (hasContract) {
        availableReferences.push({
          type: "supplier_contract",
          label: "عقد مورد معتمد",
          documentNumber: `CNT-${req.id}-${new Date().getFullYear()}`,
          partnerOrSupplier: "المورد المعتمد",
          hasDisbursementOrder: true,
          isExecuted: true,
          canCreateInward: true,
          blockedReason: null,
        });
      }

      // 4. خيارات إضافية دائماً متاحة للتوريد المباشر أو التبرع العيني
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

      // التحقق النظامي: إذا كان التوريد ناتجاً عن أمر شراء أو خطاب مسؤولية مجتمعية، لا يُسمح بعمل أمر إدخال إلا بعد تنفيذ أمر الصرف
      let matchedDisbursementOrder: any = null;
      if (input.referenceType === "purchase_order" || input.referenceType === "csr_letter") {
        const [disbOrder] = await db
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

        if (!disbOrder) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "لا يمكن إصدار أمر إدخال؛ لم يتم إنشاء أمر صرف لهذا التوريد بعد. يجب أولاً إنشاء أمر الصرف واعتماده وتنفيذه بالتحويل البنكي.",
          });
        }

        if (disbOrder.status !== "executed") {
          const statusMap: Record<string, string> = {
            draft: "مسودة",
            pending: "قيد المراجعة المالية",
            pending_executive: "بانتظار اعتماد المدير التنفيذي",
            approved: "معتمد بانتظار التحويل البنكي",
            rejected: "مرفوض",
            edited: "تم التعديل",
          };
          const readableStatus = disbOrder.status ? (statusMap[disbOrder.status] || disbOrder.status) : "غير محدد";
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `لا يمكن إصدار أمر إدخال إلا بعد تنفيذ أمر الصرف وتحول حالته إلى 'منفّذ'. أمر الصرف المرتبط (${disbOrder.orderNumber}) حالته الحالية: (${readableStatus}).`,
          });
        }

        matchedDisbursementOrder = disbOrder;
      }

      const orderCount = pData.sedanaExecution.inwardOrders.length + 1;
      const orderNumber = input.orderNumber || `IN-${req.id}-${String(orderCount).padStart(2, "0")}`;

      const newInwardOrder = {
        id: `IN-${req.id}-${Date.now()}`,
        orderNumber,
        orderDate: input.orderDate || new Date().toISOString().split("T")[0],
        receivedBy: input.receivedBy || ctx.user.name || "أمين المستودع",
        referenceType: input.referenceType || "purchase_order",
        referenceNumber: input.referenceNumber || "",
        disbursementOrderId: matchedDisbursementOrder?.id || null,
        disbursementOrderNumber: matchedDisbursementOrder?.orderNumber || null,
        disbursementExecutedAt: matchedDisbursementOrder?.executedAt || null,
        supplierInvoiceNumber: input.supplierInvoiceNumber || "",
        supplierName: input.supplierName || "",
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
