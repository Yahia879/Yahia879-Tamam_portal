import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { mosqueRequests, mosques, users, quantitySchedules, requestHistory, requestStageTracking } from "../../drizzle/schema";
import { eq, desc, and, sql, isNotNull, inArray } from "drizzle-orm";
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

      // المستندات المرجعية المتاحة للربط مع أمر الإدخال
      const activePO = sedanaProc.activePurchaseOrder || null;
      const activeCSR = sedanaProc.activeCsrLetter || null;
      const availableReferences: {
        type: string;
        label: string;
        documentNumber: string;
        partnerOrSupplier?: string;
      }[] = [];

      // 1. أمر شراء داخلي
      const hasPO = Object.values(allocations).includes("purchase_order") || !!activePO;
      if (hasPO) {
        availableReferences.push({
          type: "purchase_order",
          label: "أمر شراء داخلي معتمد",
          documentNumber: activePO?.orderNumber || `PO-${req.id}-${new Date().getFullYear()}`,
          partnerOrSupplier: activePO?.directedTo || "إدارة المشتريات",
        });
      }

      // 2. خطاب مسؤولية مجتمعية (CSR)
      const hasCSR = Object.values(allocations).includes("csr_letter") || !!activeCSR;
      if (hasCSR) {
        availableReferences.push({
          type: "csr_letter",
          label: "خطاب مسؤولية مجتمعية (CSR)",
          documentNumber: activeCSR?.letterNumber || `CSR-${req.id}-${new Date().getFullYear()}`,
          partnerOrSupplier: activeCSR?.recipientName || "الجهة المانحة / الشريك المجتمعي",
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
        });
      }

      // 4. خيارات إضافية دائماً متاحة للتوريد المباشر أو التبرع العيني
      availableReferences.push(
        {
          type: "direct_purchase",
          label: "شراء وتوريد مباشر",
          documentNumber: `DIR-${req.id}`,
          partnerOrSupplier: "شراء مباشر من السوق",
        },
        {
          type: "in_kind_donation",
          label: "تبرع عيني",
          documentNumber: `DON-${req.id}`,
          partnerOrSupplier: "فاعل خير / متبرع عيني",
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

      const orderCount = pData.sedanaExecution.inwardOrders.length + 1;
      const orderNumber = input.orderNumber || `IN-${req.id}-${String(orderCount).padStart(2, "0")}`;

      const newInwardOrder = {
        id: `IN-${req.id}-${Date.now()}`,
        orderNumber,
        orderDate: input.orderDate || new Date().toISOString().split("T")[0],
        receivedBy: input.receivedBy || ctx.user.name || "أمين المستودع",
        referenceType: input.referenceType || "purchase_order",
        referenceNumber: input.referenceNumber || "",
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
  // 3. إصدار أمر إخراج مجدول كمسوغ صرف محاسبي
  // ==========================================
  createOutboundOrder: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      orderNumber: z.string().optional(),
      scheduledDate: z.string(),
      periodLabel: z.string().default("دفعة دورية مجدولة"),
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

      const count = pData.sedanaExecution.outboundOrders.length + 1;
      const orderNumber = input.orderNumber || `OUT-${req.id}-${String(count).padStart(2, "0")}`;
      const disbursementVoucherCode = `DV-SED-${req.id}-${String(count).padStart(2, "0")}`;

      const newOutbound = {
        id: `OUT-${req.id}-${Date.now()}`,
        orderNumber,
        scheduledDate: input.scheduledDate,
        periodLabel: input.periodLabel,
        disbursementVoucherCode,
        status: "scheduled" as const,
        notes: input.notes || "",
        items: input.items,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name,
        createdAt: new Date().toISOString(),
      };

      pData.sedanaExecution.outboundOrders.push(newOutbound);

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
          notes: `تم إنشاء أمر إخراج مجدول رقم ${orderNumber} ومسوغ صرف ${disbursementVoucherCode}`,
        });
      } catch (e) {
        console.error("Log error:", e);
      }

      return {
        success: true,
        order: newOutbound,
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
