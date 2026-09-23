import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { mosqueRequests, mosques, users, quantitySchedules, requestHistory, requestStageTracking, disbursementOrders, projects, payments } from "../../drizzle/schema";
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
          user: users,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .leftJoin(users, eq(mosqueRequests.userId, users.id))
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!row || !row.request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      const req = row.request;
      const mosque = row.mosque;
      const requester = row.user;

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

      // بناء خريطة لبنود سلة سدانة الأصلية لاستخراج الدوريات والفترات
      const basket = Array.isArray(pData.basketItems) ? pData.basketItems : [];
      const basketMap = new Map<string, any>();
      basket.forEach((b: any) => {
        if (b.id) basketMap.set(String(b.id), b);
        if (b.name) basketMap.set(b.name.trim(), b);
      });

      // بناء قائمة الأصناف الأساسية المعتمدة
      let baseItems: any[] = [];
      if (boqItems.length > 0) {
        baseItems = boqItems.map((b) => {
          let matchedBasket: any = null;
          if (b.boqCode && b.boqCode.startsWith("BOQ-SED-")) {
            const rawId = b.boqCode.replace("BOQ-SED-", "");
            matchedBasket = basketMap.get(rawId);
          }
          if (!matchedBasket && b.itemName) {
            matchedBasket = basketMap.get(b.itemName.trim());
          }

          let frequency = matchedBasket?.frequency || "";
          if (!frequency && b.itemDescription) {
            const m = b.itemDescription.match(/دورية\s*التوريد\s*:\s*([^\s,]+)/);
            if (m) frequency = m[1];
          }
          if (!frequency) frequency = "شهري";

          const totalQty = parseFloat(b.quantity || "1");
          let cycleQty = matchedBasket?.monthlyLimit || matchedBasket?.periodLimits?.[frequency];
          if (!cycleQty) {
            if (frequency.includes("شهر") || frequency === "شهري") {
              cycleQty = totalQty >= 5 ? 1 : totalQty;
            } else if (frequency.includes("ربع") || frequency === "ربع سنوي") {
              cycleQty = Math.ceil(totalQty / 4) || 1;
            } else if (frequency.includes("نصف") || frequency === "نصف سنوي") {
              cycleQty = totalQty >= 12 ? 6 : (totalQty >= 4 ? 2 : 1);
            } else {
              cycleQty = totalQty >= 4 ? Math.ceil(totalQty / 4) : 1;
            }
          }

          return {
            id: String(b.id),
            name: b.itemName,
            description: b.itemDescription || "",
            quantity: totalQty,
            unit: b.unit || "وحدة",
            category: b.category || matchedBasket?.category || "مواد وتجهيزات",
            frequency,
            period: frequency,
            cycleQuantity: Number(cycleQty),
            monthlyLimit: matchedBasket?.monthlyLimit || null,
            periodLimits: matchedBasket?.periodLimits || null,
            allocationMethod: allocations[String(b.id)] || "purchase_order",
          };
        });
      } else if (pData.evaluation?.items) {
        const evalItems = Array.isArray(pData.evaluation.items) ? pData.evaluation.items : [];
        baseItems = evalItems.map((it: any, idx: number) => {
          const matchedBasket = basketMap.get(String(it.key || it.id)) || (it.name ? basketMap.get(it.name.trim()) : null);
          const frequency = it.frequency || matchedBasket?.frequency || "شهري";
          const totalQty = parseFloat(it.approvedQty || it.requestedQty || "1");
          let cycleQty = it.cycleQuantity || matchedBasket?.monthlyLimit;
          if (!cycleQty) {
            if (frequency.includes("شهر") || frequency === "شهري") {
              cycleQty = totalQty >= 5 ? 1 : totalQty;
            } else if (frequency.includes("ربع") || frequency === "ربع سنوي") {
              cycleQty = Math.ceil(totalQty / 4) || 1;
            } else if (frequency.includes("نصف") || frequency === "نصف سنوي") {
              cycleQty = totalQty >= 12 ? 6 : (totalQty >= 4 ? 2 : 1);
            } else {
              cycleQty = totalQty >= 4 ? Math.ceil(totalQty / 4) : 1;
            }
          }

          return {
            id: String(it.key || it.id || idx + 1),
            name: it.name || it.itemName || `بند ${idx + 1}`,
            description: it.description || it.spec || "",
            quantity: totalQty,
            unit: it.unit || "وحدة",
            category: it.category || matchedBasket?.category || "مواد وتجهيزات",
            frequency,
            period: frequency,
            cycleQuantity: Number(cycleQty),
            monthlyLimit: matchedBasket?.monthlyLimit || null,
            periodLimits: matchedBasket?.periodLimits || null,
            allocationMethod: allocations[String(it.key || it.id)] || "purchase_order",
          };
        });
      } else if (pData.basketItems) {
        baseItems = basket.map((b: any, idx: number) => {
          const frequency = b.frequency || "شهري";
          const totalQty = parseFloat(b.quantity || "1");
          let cycleQty = b.monthlyLimit || b.periodLimits?.[frequency];
          if (!cycleQty) {
            if (frequency.includes("شهر") || frequency === "شهري") {
              cycleQty = totalQty >= 5 ? 1 : totalQty;
            } else if (frequency.includes("ربع") || frequency === "ربع سنوي") {
              cycleQty = Math.ceil(totalQty / 4) || 1;
            } else if (frequency.includes("نصف") || frequency === "نصف سنوي") {
              cycleQty = totalQty >= 12 ? 6 : (totalQty >= 4 ? 2 : 1);
            } else {
              cycleQty = totalQty >= 4 ? Math.ceil(totalQty / 4) : 1;
            }
          }

          return {
            id: String(b.id || idx + 1),
            name: b.name,
            description: b.description || b.category || "",
            quantity: totalQty,
            unit: b.unit || "وحدة",
            category: b.category || "مواد وتجهيزات",
            frequency,
            period: frequency,
            cycleQuantity: Number(cycleQty),
            monthlyLimit: b.monthlyLimit || null,
            periodLimits: b.periodLimits || null,
            allocationMethod: allocations[String(b.id)] || "purchase_order",
          };
        });
      }

      // حساب رصيد المخزون الافتراضي لكل صنف
      const inwardMap: Record<string, number> = {};
      const outboundMap: Record<string, number> = {};
      const pendingConfirmationMap: Record<string, number> = {};
      const pendingReceiptMap: Record<string, number> = {};
      const deliveredMap: Record<string, number> = {};

      // تتبع أول أمر إدخال وآخر تأكيد إخراج لكل صنف
      const firstInwardDateMap: Record<string, string> = {};
      const lastConfirmedOutboundDateMap: Record<string, string> = {};
      const confirmedOutboundCountMap: Record<string, number> = {};

      let globalFirstInwardDate: string | null = null;

      (executionData.inwardOrders || []).forEach((inOrder: any) => {
        const orderDate = inOrder.createdAt || inOrder.orderDate;
        if (orderDate && (!globalFirstInwardDate || orderDate < globalFirstInwardDate)) {
          globalFirstInwardDate = orderDate;
        }
        (inOrder.items || []).forEach((it: any) => {
          inwardMap[it.id] = (inwardMap[it.id] || 0) + Number(it.quantity || 0);
          if (orderDate && (!firstInwardDateMap[it.id] || orderDate < firstInwardDateMap[it.id])) {
            firstInwardDateMap[it.id] = orderDate;
          }
        });
      });

      (executionData.outboundOrders || []).forEach((outOrder: any) => {
        if (outOrder.status === "pending_confirmation") {
          // أوامر إخراج مجدولة بانتظار تأكيد المسؤول - لا تُخصم من الرصيد المتوفر رسمياً حتى يؤكدها المسؤول
          (outOrder.items || []).forEach((it: any) => {
            pendingConfirmationMap[it.id] = (pendingConfirmationMap[it.id] || 0) + Number(it.quantity || 0);
          });
        } else if (outOrder.status === "pending_receipt") {
          // أوامر إخراج خرجت من المستودع بانتظار تأكيد واستلام المستفيد
          (outOrder.items || []).forEach((it: any) => {
            outboundMap[it.id] = (outboundMap[it.id] || 0) + Number(it.quantity || 0);
            pendingReceiptMap[it.id] = (pendingReceiptMap[it.id] || 0) + Number(it.quantity || 0);
          });
        } else if (outOrder.status === "delivered") {
          // أوامر إخراج تم تأكيد استلامها نهائياً من قبل المستفيد
          (outOrder.items || []).forEach((it: any) => {
            outboundMap[it.id] = (outboundMap[it.id] || 0) + Number(it.quantity || 0);
            deliveredMap[it.id] = (deliveredMap[it.id] || 0) + Number(it.quantity || 0);
          });
          // تتبع تاريخ آخر إخراج مؤكد ومستلم لبدء العداد التنازلي للدفعة التالية
          const confirmedDate = outOrder.confirmation?.confirmedAt || outOrder.deliveredDate || outOrder.confirmedBySupervisorAt || outOrder.scheduledDate || outOrder.createdAt;
          if (confirmedDate) {
            (outOrder.items || []).forEach((it: any) => {
              if (!lastConfirmedOutboundDateMap[it.id] || confirmedDate > lastConfirmedOutboundDateMap[it.id]) {
                lastConfirmedOutboundDateMap[it.id] = confirmedDate;
              }
              confirmedOutboundCountMap[it.id] = (confirmedOutboundCountMap[it.id] || 0) + 1;
            });
          }
        }
      });

      // أي أمر تسليم مستقل مؤكد
      (executionData.deliveryOrders || []).forEach((delOrder: any) => {
        if (delOrder.status === "confirmed" && !delOrder.outboundOrderId) {
          (delOrder.items || []).forEach((it: any) => {
            deliveredMap[it.id] = (deliveredMap[it.id] || 0) + Number(it.quantity || 0);
          });
        }
      });

      // الحصول على تاريخ بدء مرحلة التنفيذ
      let executionStageStartDate: string | null = null;
      try {
        const stageRows = await db
          .select({ startedAt: requestStageTracking.startedAt })
          .from(requestStageTracking)
          .where(
            and(
              eq(requestStageTracking.requestId, req.id),
              eq(requestStageTracking.stageCode, "execution")
            )
          )
          .limit(1);
        if (stageRows.length > 0 && stageRows[0].startedAt) {
          executionStageStartDate = new Date(stageRows[0].startedAt).toISOString();
        }
      } catch {
        // تجاهل أخطاء stage tracking
      }

      // دالة حساب عدد الأيام لفترة الدورية
      const getFrequencyDays = (freq: string): number => {
        if (freq.includes("ربع") || freq === "ربع سنوي") return 90;
        if (freq.includes("نصف") || freq === "نصف سنوي") return 180;
        if (freq.includes("سنو") || freq === "سنوي") return 365;
        return 30; // شهري افتراضياً
      };

      const now = new Date();

      // حساب الجدولة الزمنية لكل بند
      const itemTimingMap: Record<string, {
        cycleStartDate: string | null;
        lastConfirmedOutboundDate: string | null;
        nextDueDate: string | null;
        daysUntilNextDue: number | null;
        currentCycleNumber: number;
        totalCycles: number;
        frequencyDays: number;
        isDue: boolean;
        isCompleted: boolean;
        hasStock: boolean;
      }> = {};

      baseItems.forEach((it) => {
        const totalIn = inwardMap[it.id] || 0;
        const totalOut = outboundMap[it.id] || 0;
        const pendingQty = pendingConfirmationMap[it.id] || 0;
        const avail = Math.max(0, totalIn - totalOut);
        const rem = Math.max(0, it.quantity - totalOut);
        const frequencyDays = getFrequencyDays(it.frequency);
        const totalCycles = Math.ceil(it.quantity / (it.cycleQuantity || 1));
        const confirmedCount = confirmedOutboundCountMap[it.id] || 0;
        const currentCycleNumber = confirmedCount;
        // تحديد تاريخ بدء الدورة: أول إدخال للصنف > أول إدخال عام > بدء مرحلة التنفيذ
        const cycleStartDate = firstInwardDateMap[it.id] || globalFirstInwardDate || executionStageStartDate;
        const lastConfirmedDate = lastConfirmedOutboundDateMap[it.id] || null;

        let nextDueDate: string | null = null;
        let daysUntilNextDue: number | null = null;
        let isDue = false;

        if (!cycleStartDate && !lastConfirmedDate) {
          // لا يوجد تاريخ بدء بعد (لم يُورّد أي شيء ولم تبدأ مرحلة التنفيذ)
          nextDueDate = null;
          daysUntilNextDue = null;
        } else {
          // حساب موعد الدفعة التالية: بعد آخر إخراج مؤكد + فترة الدورية، أو من تاريخ أول إدخال
          let refDate: Date;
          if (lastConfirmedDate) {
            // بعد آخر إخراج مؤكد + فترة الدورية
            refDate = new Date(lastConfirmedDate);
          } else {
            // أول دفعة: من تاريخ أول إدخال + فترة الدورية
            refDate = new Date(cycleStartDate || now);
          }
          const nextDue = new Date(refDate.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
          nextDueDate = nextDue.toISOString();
          const diffMs = nextDue.getTime() - now.getTime();
          daysUntilNextDue = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          isDue = diffMs <= 0;
        }

        const hasStock = avail > 0 && rem > 0;

        itemTimingMap[it.id] = {
          cycleStartDate,
          lastConfirmedOutboundDate: lastConfirmedDate,
          nextDueDate,
          daysUntilNextDue,
          currentCycleNumber: Math.min(currentCycleNumber, totalCycles),
          totalCycles,
          frequencyDays,
          isDue,
          isCompleted: false, // لا يُغلق المستودع ولا يُعتبر مكتمل الصرف لضمان استمرار عمل العداد التنازلي للدفعة التالية
          hasStock,
        };
      });

      const inventoryItems = baseItems.map((it) => {
        const approvedQty = it.quantity;
        const totalInward = inwardMap[it.id] || 0;
        const totalOutbound = outboundMap[it.id] || 0;
        const totalDelivered = deliveredMap[it.id] || 0;
        const pendingConfirmationQty = pendingConfirmationMap[it.id] || 0;
        const pendingReceiptQty = pendingReceiptMap[it.id] || 0;
        const availableStock = Math.max(0, totalInward - totalOutbound);
        const pendingInward = Math.max(0, approvedQty - totalInward);
        const remainingToDisburse = Math.max(0, approvedQty - totalOutbound);
        const timing = itemTimingMap[it.id];

        return {
          ...it,
          approvedQty,
          totalInward,
          totalOutbound,
          pendingConfirmationQty,
          pendingReceiptQty,
          totalDelivered,
          availableStock,
          pendingInward,
          remainingToDisburse,
          // حقول العداد التنازلي
          cycleStartDate: timing?.cycleStartDate || null,
          lastConfirmedOutboundDate: timing?.lastConfirmedOutboundDate || null,
          nextDueDate: timing?.nextDueDate || null,
          daysUntilNextDue: timing?.daysUntilNextDue ?? null,
          currentCycleNumber: timing?.currentCycleNumber ?? 0,
          totalCycles: timing?.totalCycles || 1,
          frequencyDays: timing?.frequencyDays || 30,
          isDue: timing?.isDue || false,
          isAllCompleted: timing?.isCompleted || false,
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

      // فحص جاهزية تسليم الطلب (مرحلة الاستلام - handover)
      const pProc = pData.sedanaProcurement || {};
      const supAlloc = pProc.suppliersAllocation || {};
      const itmAlloc = pProc.itemsAllocation || {};
      const itmSupMap = pProc.itemSupplierMap || {};

      // هل نوع التأمين معاه مورد؟
      const hasSupplierInsurance = 
        Object.values(supAlloc).some((m: any) => m === "contract" || m === "supplier_contract" || m === "purchase_order") ||
        Object.values(itmAlloc).some((m: any) => m === "contract" || m === "supplier_contract" || m === "purchase_order") ||
        Object.keys(itmSupMap).length > 0 ||
        (Array.isArray(pProc.purchaseOrders) && pProc.purchaseOrders.length > 0) ||
        !!pProc.activePurchaseOrder;

      // فحص الدفعات وأوامر الصرف المرتبطة
      // 1. أوامر الصرف للطلب
      const allDisbOrders = await db
        .select({
          id: disbursementOrders.id,
          orderNumber: disbursementOrders.orderNumber,
          status: disbursementOrders.status,
          amount: disbursementOrders.amount,
        })
        .from(disbursementOrders)
        .where(eq(disbursementOrders.requestId, req.id));

      // 2. الدفعات المالية للمشروع المرتبط إن وجد
      let allProjectPayments: any[] = [];
      const [linkedProj] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.requestId, req.id))
        .limit(1);

      if (linkedProj) {
        allProjectPayments = await db
          .select({
            id: payments.id,
            paymentNumber: payments.paymentNumber,
            status: payments.status,
            amount: payments.amount,
          })
          .from(payments)
          .where(eq(payments.projectId, linkedProj.id));
      }

      // حساب الدفعات غير المسددة
      const unpaidDisbOrders = allDisbOrders.filter(d => d.status !== "executed");
      const unpaidProjPayments = allProjectPayments.filter(p => p.status !== "paid" && p.status !== "executed");
      
      const totalPaymentsCount = allDisbOrders.length + allProjectPayments.length;
      const unpaidPaymentsCount = unpaidDisbOrders.length + unpaidProjPayments.length;
      const paidPaymentsCount = totalPaymentsCount - unpaidPaymentsCount;

      const isAlreadyHandoverOrClosed = ["handover", "closed"].includes(req.currentStage);

      let canHandover = true;
      let blockedReason: string | null = null;

      if (isAlreadyHandoverOrClosed) {
        canHandover = false;
        blockedReason = req.currentStage === "closed" ? "الطلب مكتمل ومغلق بالفعل" : "الطلب تم تحويله لمرحلة التسليم بالفعل";
      } else if (hasSupplierInsurance) {
        if (totalPaymentsCount === 0) {
          canHandover = false;
          blockedReason = "نوع التأمين يتضمن مورداً معتمداً، ولكن لم يتم إصدار أو سداد أي أوامر صرف للمورد بعد (يجب سداد جميع الدفعات أولاً).";
        } else if (unpaidPaymentsCount > 0) {
          canHandover = false;
          blockedReason = `لا يمكن تسليم الطلب لوجود ${unpaidPaymentsCount} دفعة/أمر صرف لم يتم سدادها بعد (حالتها غير مسددة). يجب سداد كافة الدفعات قبل تسليم الطلب.`;
        }
      }

      const handoverValidation = {
        hasSupplierInsurance,
        hasUnpaidPayments: unpaidPaymentsCount > 0 || (hasSupplierInsurance && totalPaymentsCount === 0),
        canHandover,
        blockedReason,
        totalPaymentsCount,
        unpaidPaymentsCount,
        paidPaymentsCount,
        isAlreadyHandoverOrClosed,
      };

      return {
        request: {
          id: req.id,
          requestNumber: req.requestNumber,
          descriptiveName: req.descriptiveName,
          currentStage: req.currentStage,
          status: req.status,
          requesterName: requester?.name || mosque?.imamName || "مقدم الطلب",
          requesterPhone: requester?.phone || mosque?.imamPhone || "",
          requesterEmail: requester?.email || "",
          createdAt: req.createdAt,
        },
        mosque,
        inventoryItems,
        availableReferences,
        disbursementOrders: enrichedDisbOrders,
        inwardOrders: executionData.inwardOrders || [],
        outboundOrders: executionData.outboundOrders || [],
        deliveryOrders: executionData.deliveryOrders || [],
        handoverValidation,
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

      // تتبع أول أمر إدخال وآخر إخراج مؤكد لكل صنف لحساب المؤقتات
      const firstInwardDateMap: Record<string, string> = {};
      const lastConfirmedOutboundDateMap: Record<string, string> = {};

      (pData.sedanaExecution.inwardOrders || []).forEach((inOrder: any) => {
        const orderDate = inOrder.createdAt || inOrder.orderDate;
        (inOrder.items || []).forEach((it: any) => {
          if (orderDate && (!firstInwardDateMap[it.id] || orderDate < firstInwardDateMap[it.id])) {
            firstInwardDateMap[it.id] = orderDate;
          }
        });
      });

      (pData.sedanaExecution.outboundOrders || []).forEach((outOrder: any) => {
        if (outOrder.status !== "cancelled" && outOrder.status !== "pending_confirmation") {
          const confirmedDate = outOrder.confirmedBySupervisorAt || outOrder.scheduledDate || outOrder.createdAt;
          if (confirmedDate) {
            (outOrder.items || []).forEach((it: any) => {
              if (!lastConfirmedOutboundDateMap[it.id] || confirmedDate > lastConfirmedOutboundDateMap[it.id]) {
                lastConfirmedOutboundDateMap[it.id] = confirmedDate;
              }
            });
          }
        }
      });

      const boqItems = await db
        .select()
        .from(quantitySchedules)
        .where(eq(quantitySchedules.requestId, req.id));

      const getFrequencyDays = (freq: string): number => {
        if (freq.includes("ربع") || freq === "ربع سنوي") return 90;
        if (freq.includes("نصف") || freq === "نصف سنوي") return 180;
        if (freq.includes("سنو") || freq === "سنوي") return 365;
        return 30; // شهري افتراضياً
      };

      for (const item of input.items) {
        const available = Math.max(0, (inwardMap[item.id] || 0) - (outboundMap[item.id] || 0));
        if (item.quantity > available + 0.0001) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `الكمية المدخلة للصنف (${item.itemName}) وقدرها ${item.quantity} تتجاوز الرصيد المتوفر حالياً في المستودع (${available} ${item.unit})`,
          });
        }

        // التحقق من حلول موعد الصرف الدوري (انتهاء المؤقت الزمني إلى الصفر)
        const boq = boqItems.find((b) => String(b.id) === String(item.id));
        let freq = "شهري";
        if (boq?.itemDescription) {
          const m = boq.itemDescription.match(/دورية\s*التوريد\s*:\s*([^\s,]+)/);
          if (m) freq = m[1];
        }
        const freqDays = getFrequencyDays(freq);
        const cycleStartDate = firstInwardDateMap[item.id];
        const lastConfirmed = lastConfirmedOutboundDateMap[item.id];

        if (cycleStartDate) {
          const refDate = lastConfirmed ? new Date(lastConfirmed) : new Date(cycleStartDate);
          const nextDueDate = new Date(refDate.getTime() + freqDays * 24 * 60 * 60 * 1000);
          const diffMs = nextDueDate.getTime() - Date.now();
          if (diffMs > 0) {
            const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `لا يمكن إصدار أمر إخراج للصنف (${item.itemName}) لعدم حلول موعد صرفه الدوري بعد (متبقي ${daysRemaining} يوم في العداد التنازلي).`,
            });
          }
        }
      }

      const count = pData.sedanaExecution.outboundOrders.length + 1;
      const orderNumber = input.orderNumber || `OUT-${req.id}-${String(count).padStart(2, "0")}`;
      const disbursementVoucherCode = `DV-SED-${req.id}-${String(count).padStart(2, "0")}`;

      const outboundId = `OUT-${req.id}-${Date.now()}`;
      const deliveryId = `DEL-${req.id}-${Date.now()}`;

      let requesterUser: any = null;
      if (req.userId) {
        const [u] = await db.select({ role: users.role, name: users.name }).from(users).where(eq(users.id, req.userId)).limit(1);
        requesterUser = u;
      }
      const isRequesterUser = requesterUser?.role === "service_requester";
      const nowIso = new Date().toISOString();

      const initialStatus = isRequesterUser ? ("pending_receipt" as const) : ("delivered" as const);
      const initialDeliveryStatus = isRequesterUser ? ("pending_delivery" as const) : ("confirmed" as const);

      const initialConfirmation = !isRequesterUser
        ? {
            confirmedAt: nowIso,
            confirmedBy: ctx.user.id,
            confirmedByName: input.recipientName || "إمام المسجد",
            signatureUrl: `auto_sig_${Date.now()}`,
            satisfactionRating: 5,
            notes: input.notes || "تم الاستلام والاعتماد مباشرة لكون الطلب منشأ من قبل مسؤول",
          }
        : null;

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
        status: initialStatus,
        deliveredDate: !isRequesterUser ? (input.scheduledDate || nowIso.split("T")[0]) : undefined,
        notes: input.notes || "",
        items: input.items,
        linkedDeliveryId: deliveryId,
        confirmation: initialConfirmation,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name,
        createdAt: nowIso,
        confirmedBySupervisorAt: nowIso,
        confirmedBySupervisorId: ctx.user.id,
        confirmedBySupervisorName: ctx.user.name,
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
        deliveredDate: !isRequesterUser ? (input.scheduledDate || nowIso.split("T")[0]) : undefined,
        status: initialDeliveryStatus,
        items: input.items,
        notes: input.notes || "",
        confirmation: initialConfirmation,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name,
        createdAt: nowIso,
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
  // 3.5 تأكيد واعتماد أمر الإخراج المجدول من قِبل المسؤول
  // ==========================================
  confirmSupervisorOutbound: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      outboundOrderId: z.string(),
      scheduledDate: z.string().optional(),
      outboundMethod: z.enum(["direct_imam", "courier_delivery", "warehouse_pickup", "scheduled_batch"]).optional(),
      recipientName: z.string().optional(),
      recipientRole: z.string().optional(),
      recipientPhone: z.string().optional(),
      deliveryLocation: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        id: z.string(),
        itemName: z.string(),
        quantity: z.number().min(0.01),
        unit: z.string(),
      })).optional(),
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
        try { pData = JSON.parse(pData); } catch { break; }
      }
      pData = pData && typeof pData === "object" ? pData : {};
      pData.sedanaExecution = pData.sedanaExecution || {};
      pData.sedanaExecution.outboundOrders = pData.sedanaExecution.outboundOrders || [];
      pData.sedanaExecution.deliveryOrders = pData.sedanaExecution.deliveryOrders || [];

      const targetIndex = pData.sedanaExecution.outboundOrders.findIndex((o: any) => o.id === input.outboundOrderId);
      if (targetIndex === -1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "أمر الإخراج غير موجود" });
      }

      const out = pData.sedanaExecution.outboundOrders[targetIndex];

      if (input.scheduledDate) out.scheduledDate = input.scheduledDate;
      if (input.outboundMethod) out.outboundMethod = input.outboundMethod;
      if (input.recipientName) out.recipientName = input.recipientName;
      if (input.recipientRole) out.recipientRole = input.recipientRole;
      if (input.recipientPhone !== undefined) out.recipientPhone = input.recipientPhone;
      if (input.deliveryLocation !== undefined) out.deliveryLocation = input.deliveryLocation;
      if (input.notes !== undefined) out.notes = input.notes;
      if (input.items && input.items.length > 0) out.items = input.items;

      out.status = "pending_receipt";
      out.confirmedBySupervisorAt = new Date().toISOString();
      out.confirmedBySupervisorId = ctx.user.id;
      out.confirmedBySupervisorName = ctx.user.name;

      const delCount = pData.sedanaExecution.deliveryOrders.length + 1;
      const deliveryId = out.linkedDeliveryId || `DEL-${req.id}-${Date.now()}`;
      out.linkedDeliveryId = deliveryId;

      const existingDelIndex = pData.sedanaExecution.deliveryOrders.findIndex(
        (d: any) => d.id === deliveryId || d.outboundOrderId === out.id
      );

      const deliveryPayload = {
        id: deliveryId,
        deliveryNumber: `DEL-${req.id}-${String(delCount).padStart(2, "0")}`,
        outboundOrderId: out.id,
        disbursementVoucherCode: out.disbursementVoucherCode,
        outboundMethod: out.outboundMethod || "direct_imam",
        recipientName: out.recipientName || "إمام المسجد",
        recipientRole: out.recipientRole || "إمام المسجد",
        recipientPhone: out.recipientPhone || "",
        scheduledDate: out.scheduledDate,
        status: "pending_delivery" as const,
        items: out.items,
        notes: out.notes || "",
        confirmation: null,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name,
        createdAt: new Date().toISOString(),
      };

      if (existingDelIndex >= 0) {
        pData.sedanaExecution.deliveryOrders[existingDelIndex] = {
          ...pData.sedanaExecution.deliveryOrders[existingDelIndex],
          ...deliveryPayload,
        };
      } else {
        pData.sedanaExecution.deliveryOrders.push(deliveryPayload);
      }

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
          action: "sedana_outbound_supervisor_confirmed",
          notes: `قام المسؤول (${ctx.user.name}) بتأكيد واعتماد أمر الإخراج رقم ${out.orderNumber} ومسوغ الصرف ${out.disbursementVoucherCode}`,
        });
      } catch (e) {
        console.error("Log error:", e);
      }

      return {
        success: true,
        order: out,
        delivery: deliveryPayload,
      };
    }),

  // ==========================================
  // 3.6 توليد يدوي لأوامر الإخراج المجدولة حسب فترات البنود
  // ==========================================
  triggerScheduledOutboundGeneration: protectedProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const [req] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });

      return { success: true, message: "تم تحديث وجدولة أوامر الإخراج تلقائياً بنجاح" };
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

      // تظل مرحلة الطلب في مرحلة التنفيذ (execution) لضمان استمرار عمل المستودع الافتراضي وجدولة الدفعات الدورية
      const allConfirmed = deliveries.length > 0 && deliveries.every((d: any) => d.status === "confirmed");

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
        currentStage: req.currentStage,
      };
    }),

  // ==========================================
  // 5.2 جلب أوامر الإخراج المعلقة بانتظار استلام وتأكيد المستفيد/الإمام
  // ==========================================
  getMyPendingOutbounds: protectedProcedure
    .query(async ({ ctx }) => {
      // يظهر هذا الإشعار حصراً لطالب الخدمة (إمام المسجد / المستفيد) وليس للمسؤولين
      if (ctx.user.role !== "service_requester") {
        return [];
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      const rows = await db
        .select({
          request: mosqueRequests,
          mosque: mosques,
        })
        .from(mosqueRequests)
        .leftJoin(mosques, eq(mosqueRequests.mosqueId, mosques.id))
        .where(
          and(
            isNotNull(mosqueRequests.programData),
            eq(mosqueRequests.userId, ctx.user.id)
          )
        );

      const pendingList: any[] = [];

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

        const outbounds = pData.sedanaExecution?.outboundOrders || [];
        outbounds.forEach((out: any) => {
          if (out.status === "pending_receipt") {
            pendingList.push({
              requestId: req.id,
              requestNumber: req.requestNumber || String(req.id),
              mosqueName: mosque?.name || "المسجد",
              mosqueCity: mosque?.city || "",
              imamName: mosque?.imamName || out.recipientName || "إمام المسجد",
              outbound: out,
            });
          }
        });
      }

      return pendingList;
    }),

  // ==========================================
  // 5.3 رفض استلام أمر الإخراج من قبل الإمام/المستفيد مع ذكر السبب
  // ==========================================
  rejectOutboundReceipt: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      outboundOrderId: z.string(),
      reason: z.string().min(3, "يرجى كتابة سبب الرفض بالتفصيل"),
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

      const rejectedAt = new Date().toISOString();
      outbounds[targetOutIndex].status = "rejected";
      outbounds[targetOutIndex].rejectionReason = input.reason;
      outbounds[targetOutIndex].rejectedAt = rejectedAt;
      outbounds[targetOutIndex].rejectedBy = ctx.user.id;
      outbounds[targetOutIndex].rejectedByName = ctx.user.name || "إمام المسجد";

      // تحديث سجل أمر التسليم المرتبط
      const targetDelIndex = deliveries.findIndex((d: any) => d.outboundOrderId === outbounds[targetOutIndex].id || d.id === outbounds[targetOutIndex].linkedDeliveryId);
      if (targetDelIndex !== -1) {
        deliveries[targetDelIndex].status = "rejected";
        deliveries[targetDelIndex].rejectionReason = input.reason;
        deliveries[targetDelIndex].rejectedAt = rejectedAt;
      }

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
          action: "sedana_outbound_receipt_rejected",
          notes: `تم رفض استلام أمر الإخراج ${outbounds[targetOutIndex].orderNumber} من قبل المستفيد. السبب: ${input.reason}`,
        });
      } catch (e) {
        console.error("Log error:", e);
      }

      return {
        success: true,
        message: "تم تسجيل رفض الاستلام وتوثيق السبب بنجاح",
        outbound: outbounds[targetOutIndex],
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

  // ==========================================
  // 6. تسليم طلب سدانة وتحويله لمرحلة الاستلام (Handover)
  // ==========================================
  handoverSedanaRequest: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      confirmationWord: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

      if (input.confirmationWord.trim() !== "تأكيد") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: 'يجب كتابة كلمة "تأكيد" باللغة العربية بدقة لإتمام تسليم الطلب.',
        });
      }

      const [req] = await db
        .select()
        .from(mosqueRequests)
        .where(eq(mosqueRequests.id, input.requestId))
        .limit(1);

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الطلب غير موجود" });
      }

      if (["handover", "closed"].includes(req.currentStage)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "الطلب في مرحلة التسليم بالفعل أو تم إغلاقه مسبقاً",
        });
      }

      // فحص نوع التأمين مع المورد وحالة الدفعات
      let pData: any = req.programData;
      while (typeof pData === "string") {
        try { pData = JSON.parse(pData); } catch { break; }
      }
      pData = pData && typeof pData === "object" ? pData : {};

      const pProc = pData.sedanaProcurement || {};
      const supAlloc = pProc.suppliersAllocation || {};
      const itmAlloc = pProc.itemsAllocation || {};
      const itmSupMap = pProc.itemSupplierMap || {};

      const hasSupplierInsurance = 
        Object.values(supAlloc).some((m: any) => m === "contract" || m === "supplier_contract" || m === "purchase_order") ||
        Object.values(itmAlloc).some((m: any) => m === "contract" || m === "supplier_contract" || m === "purchase_order") ||
        Object.keys(itmSupMap).length > 0 ||
        (Array.isArray(pProc.purchaseOrders) && pProc.purchaseOrders.length > 0) ||
        !!pProc.activePurchaseOrder;

      if (hasSupplierInsurance) {
        const allDisbOrders = await db
          .select({ id: disbursementOrders.id, status: disbursementOrders.status })
          .from(disbursementOrders)
          .where(eq(disbursementOrders.requestId, req.id));

        const [linkedProj] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.requestId, req.id))
          .limit(1);

        let allProjectPayments: any[] = [];
        if (linkedProj) {
          allProjectPayments = await db
            .select({ id: payments.id, status: payments.status })
            .from(payments)
            .where(eq(payments.projectId, linkedProj.id));
        }

        const totalPayments = allDisbOrders.length + allProjectPayments.length;
        const unpaidCount = allDisbOrders.filter(d => d.status !== "executed").length + 
                            allProjectPayments.filter(p => p.status !== "paid" && p.status !== "executed").length;

        if (totalPayments === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن تسليم الطلب: نوع التأمين يتضمن مورداً معتمداً ولكن لم يتم إصدار أو سداد أي أوامر صرف له بعد.",
          });
        }

        if (unpaidCount > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `لا يمكن تسليم الطلب: توجد ${unpaidCount} دفعة/أمر صرف بحالة غير مسددة. يجب سداد كافة المستحقات أولاً.`,
          });
        }
      }

      const oldStage = req.currentStage;
      const newStage = "handover";

      await db
        .update(mosqueRequests)
        .set({
          currentStage: newStage,
          updatedAt: new Date(),
        })
        .where(eq(mosqueRequests.id, input.requestId));

      try {
        await db.insert(requestHistory).values({
          requestId: input.requestId,
          userId: ctx.user.id,
          fromStage: oldStage,
          toStage: newStage,
          fromStatus: req.status,
          toStatus: req.status,
          action: "sedana_handover_submitted",
          notes: input.notes || `قام المستخدم (${ctx.user.name}) بتسليم طلب سدانة ونقله رسمياً إلى مرحلة التسليم (Handover) بعد كتابة كلمة التأكيد والتحقق من سداد المورد.`,
        });
      } catch (e) {
        console.error("History log error:", e);
      }

      try {
        await db.insert(requestStageTracking).values({
          requestId: input.requestId,
          stageCode: newStage,
          startedAt: new Date(),
          assignedTo: ctx.user.id,
        });
      } catch (e) {
        // ignore duplicate
      }

      return {
        success: true,
        message: "تم تسليم الطلب ونقله إلى مرحلة التسليم بنجاح",
        currentStage: newStage,
      };
    }),
});
