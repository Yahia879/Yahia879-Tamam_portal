import { z } from "zod";
import { and, asc, desc, eq, ne, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { checkPermission } from "../permissions";
import {
  disbursementRequests,
  mosqueRequests,
  projectChangeOrders,
  projectPhases,
  projects,
  fundMovements,
  quantitySchedules,
  users,
  payments,
  contractPayments,
  contractsEnhanced,
} from "../../drizzle/schema";
import {
  getFundAvailable,
  getProjectFundableAmounts,
  lockFund,
  money,
} from "../fund";
import { insertFundRequest } from "./fund";
import {
  notifyDisbursementRequestCreation,
  notifyUsersByRole,
} from "./notifications";
import {
  approveBoqChangeOrderSchema,
  changeOrderPercentage,
  createChangeOrderSchema,
  createDisbursementForChangeOrderSchema,
  priceChangeOrderItems,
  splitChangeOrderToPaymentsSchema,
  type PricedChangeOrderItem,
} from "../../shared/projectChangeOrders";

async function authorizeView(userId: number) {
  for (const permission of [
    "projects.view_details",
    "projects.financials",
    "projects.edit_support_and_fees",
    "projects.add_receipt_voucher",
    "boq.view",
    "disbursements.create_from_fund",
  ]) {
    if (await checkPermission(userId, permission)) return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "ليس لديك صلاحية عرض أوامر تغيير المشروع",
  });
}

function creationSurplus(
  projectSurplus: number,
  fundSpendable: number,
  unrequestedTotal: number
) {
  // Fund cash can cover existing orders, but cannot fund a new order's creation.
  const unfundedOrders = Math.max(
    0,
    unrequestedTotal - Math.max(0, fundSpendable)
  );
  return Math.max(0, money(projectSurplus - unfundedOrders));
}

function generatePaymentNumber(suffix?: string): string {
  const prefix = "PAY";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return suffix ? `${prefix}-${timestamp}-${random}-${suffix}` : `${prefix}-${timestamp}-${random}`;
}

export const projectChangeOrdersRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await authorizeView(ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db
        .select({
          order: projectChangeOrders,
          requestStatus: disbursementRequests.status,
          requestNumber: disbursementRequests.requestNumber,
          paymentNumber: payments.paymentNumber,
          paymentStatus: payments.status,
          approverName: users.name,
        })
        .from(projectChangeOrders)
        .leftJoin(
          disbursementRequests,
          eq(projectChangeOrders.disbursementRequestId, disbursementRequests.id)
        )
        .leftJoin(
          payments,
          eq(projectChangeOrders.paymentId, payments.id)
        )
        .leftJoin(users, eq(projectChangeOrders.boqApprovedBy, users.id))
        .where(eq(projectChangeOrders.projectId, input.projectId))
        .orderBy(desc(projectChangeOrders.id));

      const rawProjectPayments = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.projectId, input.projectId),
            ne(payments.status, "rejected")
          )
        );
      const projectPayments = rawProjectPayments.filter(
        (p: any) =>
          (p.projectId === undefined || p.projectId === null || p.projectId === input.projectId) &&
          p.status !== "rejected"
      );

      const hasContractPaymentOrder = rows.some(({ order }) => Boolean(order.contractPaymentId));
      const projectContractPayments = hasContractPaymentOrder
        ? await db.select().from(contractPayments)
        : [];

      const orders = rows.map(
        ({ order, requestStatus, requestNumber, paymentNumber, paymentStatus, approverName }) => {
          const linkedPayments = projectPayments.filter(
            (p: any) =>
              p.changeOrderId === order.id ||
              (order.paymentId !== null &&
                order.paymentId !== undefined &&
                p.id === order.paymentId)
          );

          let allocatedPaymentAmount = money(
            linkedPayments.reduce(
              (sum: number, p: any) => sum + Number(p.amount || 0),
              0
            )
          );

          if (linkedPayments.length === 0 && order.contractPaymentId) {
            const matchedCp = projectContractPayments.find(
              (cp: any) => cp.id === order.contractPaymentId
            );
            if (matchedCp) {
              allocatedPaymentAmount = money(Number(matchedCp.amount || 0));
            }
          }

          const orderAmount = Number(order.amount || 0);
          const remainingPaymentAmount = order.disbursementRequestId
            ? 0
            : money(Math.max(0, orderAmount - allocatedPaymentAmount));

          let computedStatus = order.status || "pending_boq";
          if (order.disbursementRequestId && requestStatus) {
            if (requestStatus === "paid") computedStatus = "paid";
            else if (requestStatus === "approved") computedStatus = "approved";
            else if (requestStatus === "rejected") computedStatus = "rejected";
            else computedStatus = "disbursement_created";
          } else if (
            order.paymentId ||
            linkedPayments.length > 0 ||
            order.contractPaymentId
          ) {
            computedStatus = "linked_to_payment";
          }

          const primaryPayment = linkedPayments[0];

          return {
            ...order,
            status: computedStatus,
            requestStatus,
            requestNumber,
            paymentNumber: paymentNumber || primaryPayment?.paymentNumber || null,
            paymentStatus: paymentStatus || primaryPayment?.status || null,
            approverName,
            allocatedPaymentAmount,
            remainingPaymentAmount,
            paymentsCount: linkedPayments.length,
            linkedPayments: linkedPayments.map((p: any) => ({
              id: p.id,
              paymentNumber: p.paymentNumber,
              amount: Number(p.amount || 0),
              status: p.status,
              description: p.description,
            })),
            items: (order.itemsJson
              ? JSON.parse(order.itemsJson)
              : []) as PricedChangeOrderItem[],
          };
        }
      );

      const activeTotal = money(
        orders
          .filter(order => order.status !== "rejected")
          .reduce((sum, order) => sum + Number(order.amount), 0)
      );

      const unrequestedActiveTotal = money(
        orders
          .filter(
            order => order.status !== "rejected" && !order.disbursementRequestId
          )
          .reduce((sum, order) => sum + Number(order.amount), 0)
      );

      let funding = null;
      let fundingError: string | null = null;
      try {
        const available = await getProjectFundableAmounts(db, input.projectId);
        const fund = await getFundAvailable(db, {
          restrictionType: "project",
          restrictedProjectId: input.projectId,
        });
        funding = {
          pendingTransfer: available.changeOrderAvailable,
          projectSurplus: available.surplusAvailable,
          fundSurplus: Math.max(0, fund.spendable),
          available: creationSurplus(
            available.surplusAvailable,
            fund.spendable,
            unrequestedActiveTotal
          ),
          originalProjectCost: Number(
            orders.at(-1)?.originalProjectCost || available.projectCost
          ),
        };
      } catch (error) {
        if (!(error instanceof TRPCError) || error.code !== "BAD_REQUEST")
          throw error;
        fundingError = error.message;
      }

      if (!funding?.originalProjectCost) {
        const [projectRow] = await db
          .select({ budget: projects.budget, actualCost: projects.actualCost })
          .from(projects)
          .where(eq(projects.id, input.projectId))
          .limit(1);
        if (projectRow) {
          const fallbackCost = Number(
            projectRow.budget || projectRow.actualCost || 0
          );
          if (funding) {
            funding.originalProjectCost = fallbackCost;
          } else {
            funding = {
              pendingTransfer: 0,
              projectSurplus: 0,
              fundSurplus: 0,
              available: 0,
              originalProjectCost: fallbackCost,
            };
          }
        }
      }

      const [contract] = await db
        .select({
          id: contractsEnhanced.id,
          contractNumber: contractsEnhanced.contractNumber,
          supplierName: contractsEnhanced.secondPartyName,
          supplierBank: contractsEnhanced.secondPartyBankName,
          supplierIban: contractsEnhanced.secondPartyIban,
        })
        .from(contractsEnhanced)
        .where(eq(contractsEnhanced.projectId, input.projectId))
        .orderBy(desc(contractsEnhanced.createdAt))
        .limit(1);

      return {
        orders,
        funding,
        fundingError,
        contract: contract || null,
        activeTotal,
        percentage: changeOrderPercentage(
          activeTotal,
          funding?.originalProjectCost ||
            Number(orders.at(-1)?.originalProjectCost || 0)
        ),
      };
    }),

  // 1️⃣ إنشاء أمر التغيير المبدئي وتوجيهه آلياً لجدول الكميات (بدون الحاجة لمورد)
  create: protectedProcedure
    .input(createChangeOrderSchema)
    .mutation(async ({ input, ctx }) => {
      await authorizeView(ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const priced = priceChangeOrderItems(input.items);

      const result = await db.transaction(async tx => {
        await lockFund(tx);
        const [existing] = await tx
          .select()
          .from(projectChangeOrders)
          .where(eq(projectChangeOrders.submissionKey, input.submissionKey))
          .limit(1);

        if (existing) {
          return {
            id: existing.id,
            orderNumber: existing.orderNumber,
            created: false,
          };
        }

        const [project] = await tx
          .select()
          .from(projects)
          .where(eq(projects.id, input.projectId))
          .limit(1);

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المشروع غير موجود",
          });
        }

        if (project.programType === "sedana") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "أوامر التغيير غير متاحة لمشاريع سدانة",
          });
        }

        if (["completed", "cancelled"].includes(project.status || "")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن إضافة أمر تغيير لمشروع مكتمل أو ملغي",
          });
        }

        if (project.requestId) {
          const [request] = await tx
            .select()
            .from(mosqueRequests)
            .where(eq(mosqueRequests.id, project.requestId))
            .limit(1);

          if (request?.programType === "sedana") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "أوامر التغيير غير متاحة لمشاريع سدانة",
            });
          }

          if (
            request?.currentStage === "closed" ||
            request?.status === "completed" ||
            request?.closureStatus === "confirmed"
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "لا يمكن إضافة أمر تغيير بعد إغلاق الطلب المرتبط بالمشروع",
            });
          }
        }

        // التحقق من أن المشروع في المرحلة الخامسة : صرف المدفوعات
        const [phase5] = await tx
          .select({
            id: projectPhases.id,
            phaseOrder: projectPhases.phaseOrder,
            phaseName: projectPhases.phaseName,
            status: projectPhases.status,
          })
          .from(projectPhases)
          .where(
            and(
              eq(projectPhases.projectId, input.projectId),
              or(
                eq(projectPhases.phaseOrder, 5),
                sql`${projectPhases.phaseName} LIKE '%صرف المدفوعات%'`
              )
            )
          )
          .limit(1);

        if (!phase5 || phase5.status !== "in_progress") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "لا يمكن إضافة أمر تغيير إلا عندما يكون المشروع في المرحلة الخامسة : صرف المدفوعات",
          });
        }

        let available: any = null;
        try {
          available = await getProjectFundableAmounts(tx, input.projectId);
        } catch {
          available = null;
        }

        const existingOrders = await tx
          .select()
          .from(projectChangeOrders)
          .where(eq(projectChangeOrders.projectId, input.projectId))
          .orderBy(asc(projectChangeOrders.id));

        if (priced.total <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "يجب أن تكون قيمة أمر التغيير أكبر من صفر",
          });
        }

        const firstOrder = existingOrders[0];

        const originalProjectCost = Number(
          firstOrder?.originalProjectCost ||
            available?.projectCost ||
            project.budget ||
            project.actualCost ||
            0
        );

        const percentage = changeOrderPercentage(
          priced.total,
          originalProjectCost
        );

        // توليد رقم تسلسلي لأمر التغيير
        const orderSeq = (existingOrders.length + 1)
          .toString()
          .padStart(3, "0");
        const orderNumber = `CO-${project.projectNumber || "PRJ" + input.projectId}-${orderSeq}`;

        const [inserted] = await tx.insert(projectChangeOrders).values({
          orderNumber,
          submissionKey: input.submissionKey,
          projectId: input.projectId,
          title: input.title,
          reason: input.reason,
          itemsJson: JSON.stringify(priced.items),
          amount: priced.total.toFixed(2),
          originalProjectCost: originalProjectCost.toFixed(2),
          percentage: percentage.toFixed(6),
          status: "boq_approved",
          boqApprovedAt: new Date(),
          boqApprovedBy: ctx.user.id,
          createdById: ctx.user.id,
        });

        // إدراج بنود أمر التغيير مباشرة في جدول الكميات بشكل نهائي غير قابل للتعديل
        let idx = 1;
        for (const item of priced.items) {
          await tx.insert(quantitySchedules).values({
            projectId: input.projectId,
            requestId: project.requestId || null,
            mosqueId: item.mosqueId || null,
            boqCode: `${orderNumber}-${idx++}`,
            boqName: `أمر تغيير: ${input.title}`,
            itemName: item.name,
            itemDescription:
              item.description ||
              `بند مضاف بأمر التغيير ${orderNumber} (${input.title})`,
            unit: item.unit,
            quantity: item.quantity.toFixed(3),
            unitPrice: item.unitPrice.toFixed(2),
            totalPrice: item.total.toFixed(2),
            category: item.category || "بنود أوامر التغيير",
            changeOrderId: inserted.insertId,
            isChangeOrder: true,
          });
        }

        // تحديث ميزانية وتكلفة المشروع لتزداد بقيمة أمر التغيير
        const [boqSumRow] = await tx
          .select({
            total: sql<string>`COALESCE(SUM(CAST(${quantitySchedules.totalPrice} AS DECIMAL(15,2))), 0)`,
          })
          .from(quantitySchedules)
          .where(
            project.requestId
              ? or(
                  eq(quantitySchedules.projectId, input.projectId),
                  eq(quantitySchedules.requestId, project.requestId)
                )
              : eq(quantitySchedules.projectId, input.projectId)
          );

        const calculatedBoqTotal = boqSumRow?.total
          ? Number(boqSumRow.total)
          : 0;
        const currentBudget = Number(project.budget || 0);
        const updatedBudget =
          currentBudget > 0
            ? (currentBudget + priced.total).toFixed(2)
            : calculatedBoqTotal > 0
              ? calculatedBoqTotal.toFixed(2)
              : priced.total.toFixed(2);

        const currentActualCost = Number(project.actualCost || 0);
        const updatedActualCost =
          currentActualCost > 0
            ? (currentActualCost + priced.total).toFixed(2)
            : calculatedBoqTotal > 0
              ? calculatedBoqTotal.toFixed(2)
              : priced.total.toFixed(2);

        await tx
          .update(projects)
          .set({
            budget: updatedBudget,
            actualCost: updatedActualCost,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, input.projectId));

        // تحديث القسم المسؤول والميزانية المعتمدة في الطلب آلياً
        if (project.requestId) {
          const [currentReq] = await tx
            .select({ approvedBudget: mosqueRequests.approvedBudget })
            .from(mosqueRequests)
            .where(eq(mosqueRequests.id, project.requestId))
            .limit(1);

          const currentReqBudget = Number(currentReq?.approvedBudget || 0);
          await tx
            .update(mosqueRequests)
            .set({
              ...(currentReqBudget > 0
                ? {
                    approvedBudget: (currentReqBudget + priced.total).toFixed(
                      2
                    ),
                  }
                : {}),
              currentResponsibleDepartment: "الإدارة المالية والصندوق",
            })
            .where(eq(mosqueRequests.id, project.requestId));
        }

        // فحص الفائض المالي للمشروع
        const surplusAvailable = Number(available?.surplusAvailable || 0);
        const hasSurplus = surplusAvailable >= priced.total;

        // استعلام عن العقد المعتمد للمشروع إن وجد
        const [contract] = await tx
          .select()
          .from(contractsEnhanced)
          .where(eq(contractsEnhanced.projectId, input.projectId))
          .orderBy(desc(contractsEnhanced.createdAt))
          .limit(1);

        const workDescription = priced.items
          .map(
            item =>
              `${item.name} — ${item.quantity} ${item.unit} × ${Number(item.unitPrice).toFixed(2)} = ${Number(item.total).toFixed(2)} ريال`
          )
          .join("\n");

        let createdDisbursementRequestId: number | null = null;
        let createdDisbursementRequestNumber: string | null = null;
        let createdPaymentId: number | null = null;
        let createdPaymentNumber: string | null = null;

        if (hasSurplus) {
          // 🟢 الحالة 1: يوجد فائض للمشروع -> يحول المبلغ للصندوق بعدها ينشأ طلب صرف نفس الوضع الحالي
          await lockFund(tx);

          const beneficiaryName =
            input.beneficiaryName?.trim() ||
            contract?.secondPartyName ||
            project.name ||
            "مورد المشروع";
          const beneficiaryBank =
            input.beneficiaryBank?.trim() ||
            contract?.secondPartyBankName ||
            "";
          const beneficiaryIban =
            input.beneficiaryIban?.trim() ||
            contract?.secondPartyIban ||
            "";

          const bucket = {
            restrictionType: "project" as const,
            restrictedProjectId: input.projectId,
          };

          // إنشاء طلب الصرف من الصندوق
          const request = await insertFundRequest(
            tx,
            {
              projectId: input.projectId,
              amount: priced.total,
              title: `أمر تغيير: ${input.title}`,
              description: `${input.reason}\n\n${workDescription}\n\nالنسبة من قيمة المشروع الأصلية: ${percentage}%`,
              workDescription,
              beneficiaryName,
              beneficiaryBank,
              beneficiaryIban,
            },
            bucket,
            ctx.user.id
          );
          createdDisbursementRequestId = request.id;
          createdDisbursementRequestNumber = request.requestNumber;

          // تحويل وتخصيص المبلغ من فائض المشروع إلى الصندوق
          await tx.insert(fundMovements).values({
            eventKey: `change-order:${inserted.insertId}:surplus`,
            movementType: "surplus",
            amount: priced.total.toFixed(2),
            restrictionType: "project",
            restrictedProjectId: input.projectId,
            projectId: input.projectId,
            requestId: request.id,
            sourceDetailsJson: JSON.stringify({
              changeOrderId: inserted.insertId,
              vouchers: available?.vouchers || [],
            }),
            notes: `تخصيص فائض المشروع لأمر التغيير ${orderNumber}`,
            createdById: ctx.user.id,
          });

          // تحديث أمر التغيير
          await tx
            .update(projectChangeOrders)
            .set({
              disbursementRequestId: request.id,
              supplierName: beneficiaryName,
              supplierBank: beneficiaryBank,
              supplierIban: beneficiaryIban,
              status: "disbursement_created",
              fundingSource: "fund_surplus",
            })
            .where(eq(projectChangeOrders.id, inserted.insertId));
        } else {
          // 🔵 الحالة 2: لا يوجد فائض للمشروع -> لا تنشأ دفعة تلقائياً، وإنما تزداد التكلفة الفعلية والميزانية للمشروع (والعقد إن وجد)
          if (contract) {
            const currentContractAmt = Number(contract.contractAmount || 0);
            const updatedContractAmt = (currentContractAmt + priced.total).toFixed(2);
            await tx
              .update(contractsEnhanced)
              .set({
                contractAmount: updatedContractAmt,
                updatedAt: new Date(),
              })
              .where(eq(contractsEnhanced.id, contract.id));
          }

          // تحديث أمر التغيير
          await tx
            .update(projectChangeOrders)
            .set({
              status: "boq_approved",
              fundingSource: "project_cost",
            })
            .where(eq(projectChangeOrders.id, inserted.insertId));
        }

        return {
          id: inserted.insertId,
          orderNumber,
          created: true,
          projectName: project.name,
          hasSurplus,
          disbursementRequestId: createdDisbursementRequestId,
          disbursementRequestNumber: createdDisbursementRequestNumber,
          paymentId: null,
          paymentNumber: null,
        };
      });

      // إشعار بطلب الصرف الجديد إذا تم إنشاؤه
      if (
        result.hasSurplus &&
        result.disbursementRequestId &&
        result.disbursementRequestNumber
      ) {
        try {
          await notifyDisbursementRequestCreation(
            result.disbursementRequestId,
            result.disbursementRequestNumber,
            `أمر تغيير: ${input.title}`,
            priced.total.toFixed(2),
            input.projectId
          );
        } catch (err) {
          console.warn("Could not send disbursement notification:", err);
        }
      }

      // إشعار مسؤولي جداول الكميات وإدارة المشاريع
      try {
        await notifyUsersByRole(
          ["projects_office", "super_admin"],
          "system",
          "أمر تغيير جديد بحاجة لمراجعة جدول الكميات",
          `تم إنشاء أمر التغيير (${result.orderNumber}) لمشروع "${result.projectName}"، يرجى مراجعة البنود المقترحة وتسعيرها في جدول الكميات.`,
          "project",
          input.projectId
        );
      } catch (err) {
        console.warn("Could not send BOQ notification:", err);
      }

      return result;
    }),

  // 2️⃣ يمنع تعديل أمر التغيير بعد إضافته
  approveBoq: protectedProcedure
    .input(approveBoqChangeOrderSchema)
    .mutation(async () => {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "لا يمكن تعديل أمر التغيير بعد إضافته",
      });
    }),

  // 3️⃣ تحويل المبلغ للصندوق وتحديد المورد وإنشاء طلب/أمر الصرف
  createDisbursement: protectedProcedure
    .input(createDisbursementForChangeOrderSchema)
    .mutation(async ({ input, ctx }) => {
      await authorizeView(ctx.user.id);
      if (
        !(await checkPermission(ctx.user.id, "disbursements.create_from_fund"))
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "إنشاء طلب الصرف من الصندوق يتطلب صلاحية إنشاء طلب صرف من الصندوق",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db
        .select()
        .from(projectChangeOrders)
        .where(eq(projectChangeOrders.id, input.changeOrderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "أمر التغيير غير موجود",
        });
      }

      if (order.disbursementRequestId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تم إنشاء طلب صرف لأمر التغيير هذا مسبقاً",
        });
      }

      const orderAmount = Number(order.amount);
      if (orderAmount <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "يجب اعتماد وتسعير بنود أمر التغيير في جدول الكميات أولاً قبل الصرف",
        });
      }

      const pricedItems = JSON.parse(
        order.itemsJson || "[]"
      ) as PricedChangeOrderItem[];
      const workDescription = pricedItems
        .map(
          item =>
            `${item.name} — ${item.quantity} ${item.unit} × ${Number(item.unitPrice).toFixed(2)} = ${Number(item.total).toFixed(2)} ريال`
        )
        .join("\n");

      const result = await db.transaction(async tx => {
        // قفل الصندوق لمنع التضارب
        await lockFund(tx);

        const available = await getProjectFundableAmounts(tx, order.projectId);
        const bucket = {
          restrictionType: "project" as const,
          restrictedProjectId: order.projectId,
        };
        const fund = await getFundAvailable(tx, bucket);

        const transferableNeeded = money(
          Math.max(0, orderAmount - fund.spendable)
        );

        if (
          Math.round(transferableNeeded * 100) >
          Math.round(available.surplusAvailable * 100)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `قيمة أمر التغيير (${orderAmount.toFixed(2)} ريال) تتجاوز الفائض المتاح (${money(Math.max(0, available.surplusAvailable + fund.spendable)).toFixed(2)} ريال)`,
          });
        }

        // إنشاء طلب الصرف
        const request = await insertFundRequest(
          tx,
          {
            projectId: order.projectId,
            amount: orderAmount,
            title: `أمر تغيير: ${order.title}`,
            description: `${order.reason}\n\n${workDescription}\n\nالنسبة من قيمة المشروع الأصلية: ${order.percentage}%`,
            workDescription,
            beneficiaryName: input.beneficiaryName,
            beneficiaryBank: input.beneficiaryBank || "",
            beneficiaryIban: input.beneficiaryIban || "",
          },
          bucket,
          ctx.user.id
        );

        // تخصيص فائض المشروع إن وُجد
        if (transferableNeeded > 0) {
          await tx.insert(fundMovements).values({
            eventKey: `change-order:${order.id}:surplus`,
            movementType: "surplus",
            amount: transferableNeeded.toFixed(2),
            restrictionType: "project",
            restrictedProjectId: order.projectId,
            projectId: order.projectId,
            requestId: request.id,
            sourceDetailsJson: JSON.stringify({
              changeOrderId: order.id,
              vouchers: available.vouchers,
            }),
            notes: `تخصيص فائض المشروع لأمر التغيير ${order.orderNumber}`,
            createdById: ctx.user.id,
          });
        }

        // تحديث أمر التغيير ببيانات المورد وطلب الصرف
        await tx
          .update(projectChangeOrders)
          .set({
            disbursementRequestId: request.id,
            supplierName: input.beneficiaryName,
            supplierBank: input.beneficiaryBank,
            supplierIban: input.beneficiaryIban,
            status: "disbursement_created",
          })
          .where(eq(projectChangeOrders.id, order.id));

        return {
          requestId: request.id,
          requestNumber: request.requestNumber,
        };
      });

      // إشعار المدير التنفيذي والإدارة المالية بطلب الصرف الجديد
      try {
        await notifyDisbursementRequestCreation(
          result.requestId,
          result.requestNumber,
          `أمر تغيير: ${order.title}`,
          orderAmount.toFixed(2),
          order.projectId
        );
      } catch (err) {
        console.warn("Could not send disbursement notification:", err);
      }

      return {
        success: true,
        requestId: result.requestId,
        requestNumber: result.requestNumber,
      };
    }),

  // 4️⃣ ربط أمر تغيير قائم بدفعة جديدة للمشروع (في حال عدم وجود فائض)
  linkToPayment: protectedProcedure
    .input(z.object({ changeOrderId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await authorizeView(ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db
        .select()
        .from(projectChangeOrders)
        .where(eq(projectChangeOrders.id, input.changeOrderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "أمر التغيير غير موجود",
        });
      }

      if (order.disbursementRequestId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تم إنشاء طلب صرف لأمر التغيير هذا مسبقاً",
        });
      }

      if (order.paymentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "أمر التغيير مرتبط بدفعة مسبقاً",
        });
      }

      const result = await db.transaction(async tx => {
        const [project] = await tx
          .select()
          .from(projects)
          .where(eq(projects.id, order.projectId))
          .limit(1);

        const [contract] = await tx
          .select()
          .from(contractsEnhanced)
          .where(eq(contractsEnhanced.projectId, order.projectId))
          .orderBy(desc(contractsEnhanced.createdAt))
          .limit(1);

        const orderAmount = Number(order.amount);
        const paymentNumber = generatePaymentNumber();

        const [payment] = await tx.insert(payments).values({
          paymentNumber,
          projectId: order.projectId,
          contractId: contract?.id || null,
          changeOrderId: order.id,
          amount: orderAmount.toFixed(2),
          paymentType: "progress",
          description: `دفعة أمر التغيير: ${order.title} (${order.orderNumber})`,
          completionPercentage: 100,
          status: "pending",
        });

        let contractPaymentId: number | null = null;
        if (contract) {
          const existingCPs = await tx
            .select()
            .from(contractPayments)
            .where(eq(contractPayments.contractId, contract.id));

          const [cp] = await tx.insert(contractPayments).values({
            contractId: contract.id,
            phaseName: `دفعة أمر التغيير: ${order.title} (${order.orderNumber})`,
            amount: orderAmount.toFixed(2),
            phaseOrder: existingCPs.length,
            dueDate: new Date(),
            status: "pending",
            notes: `أمر تغيير ${order.orderNumber}: ${order.title} - ${order.reason}`,
            completionPercentage: 100,
          });
          contractPaymentId = cp.insertId;

          try {
            let schedObj: any = contract.paymentScheduleJson;
            while (typeof schedObj === "string") schedObj = JSON.parse(schedObj);
            const isWrapper = schedObj && typeof schedObj === "object" && !Array.isArray(schedObj);
            const list = Array.isArray(schedObj) ? schedObj : (schedObj?.schedule || []);
            const newItem = {
              id: `cp-${cp.insertId}`,
              paymentId: payment.insertId,
              name: `دفعة أمر التغيير: ${order.title} (${order.orderNumber})`,
              amount: orderAmount,
              completionPercentage: 100,
              dueDate: new Date().toISOString().split("T")[0],
              description: `أمر تغيير: ${order.title}`,
              isChangeOrder: true,
              changeOrderId: order.id,
              items: JSON.parse(order.itemsJson || "[]"),
            };
            const updatedList = [...list, newItem];
            const finalJson = isWrapper ? { ...schedObj, schedule: updatedList } : updatedList;
            await tx
              .update(contractsEnhanced)
              .set({ paymentScheduleJson: JSON.stringify(finalJson), updatedAt: new Date() })
              .where(eq(contractsEnhanced.id, contract.id));
          } catch (e) {
            console.warn("Could not sync contract paymentScheduleJson:", e);
          }
        }

        await tx
          .update(projectChangeOrders)
          .set({
            paymentId: payment.insertId,
            contractPaymentId,
            status: "linked_to_payment",
            fundingSource: "project_payment",
          })
          .where(eq(projectChangeOrders.id, order.id));

        return {
          paymentId: payment.insertId,
          paymentNumber,
        };
      });

      return {
        success: true,
        paymentId: result.paymentId,
        paymentNumber: result.paymentNumber,
      };
    }),

  // 5️⃣ تقسيم مبلغ أمر التغيير على أكثر من دفعة (للمشاريع التي لا تحوي على فائض)
  splitToPayments: protectedProcedure
    .input(splitChangeOrderToPaymentsSchema)
    .mutation(async ({ input, ctx }) => {
      await authorizeView(ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.transaction(async tx => {
        const [order] = await tx
          .select()
          .from(projectChangeOrders)
          .where(eq(projectChangeOrders.id, input.changeOrderId))
          .limit(1);

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "أمر التغيير غير موجود",
          });
        }

        if (order.status === "rejected") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "أمر التغيير مرفوض ولا يمكن إنشاء دفعات له",
          });
        }

        if (order.disbursementRequestId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "تم إنشاء طلب صرف من الفائض لأمر التغيير هذا مسبقاً",
          });
        }

        const [project] = await tx
          .select()
          .from(projects)
          .where(eq(projects.id, order.projectId))
          .limit(1);

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المشروع غير موجود",
          });
        }

        if (["completed", "cancelled"].includes(project.status || "")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن إضافة دفعات لمشروع مكتمل أو ملغي",
          });
        }

        if (project.requestId) {
          const [request] = await tx
            .select()
            .from(mosqueRequests)
            .where(eq(mosqueRequests.id, project.requestId))
            .limit(1);

          if (
            request?.currentStage === "closed" ||
            request?.status === "completed" ||
            request?.closureStatus === "confirmed"
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "لا يمكن إضافة دفعات بعد إغلاق الطلب المرتبط بالمشروع",
            });
          }
        }

        const existingProjectPayments = await tx
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.projectId, order.projectId),
              ne(payments.status, "rejected")
            )
          );

        const linkedPayments = existingProjectPayments.filter(
          (p: any) =>
            (p.projectId === undefined ||
              p.projectId === null ||
              p.projectId === order.projectId) &&
            p.status !== "rejected" &&
            (p.changeOrderId === order.id ||
              (order.paymentId !== null &&
                order.paymentId !== undefined &&
                p.id === order.paymentId))
        );

        let alreadyAllocated = money(
          linkedPayments.reduce(
            (sum: number, p: any) => sum + Number(p.amount || 0),
            0
          )
        );

        if (linkedPayments.length === 0 && order.contractPaymentId) {
          const cps = await tx
            .select()
            .from(contractPayments)
            .where(eq(contractPayments.id, order.contractPaymentId));
          const matchedCp = cps.find(
            (cp: any) => cp.id === order.contractPaymentId
          );
          if (matchedCp) {
            alreadyAllocated = money(Number(matchedCp.amount || 0));
          }
        }

        const orderAmount = Number(order.amount || 0);
        const remainingForCo = money(Math.max(0, orderAmount - alreadyAllocated));

        if (remainingForCo <= 0.05) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "تمت جدولة كامل مبلغ أمر التغيير مسبقاً",
          });
        }

        const requestedTotal = money(
          input.installments.reduce((sum, it) => sum + Number(it.amount || 0), 0)
        );

        if (requestedTotal > remainingForCo + 0.05) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `مجموع مبالغ الدفعات (${requestedTotal.toFixed(2)} ريال) يتجاوز المتبقي من أمر التغيير (${remainingForCo.toFixed(2)} ريال)`,
          });
        }

        let effectiveContractId: number | null = input.contractId ?? null;
        if (!effectiveContractId) {
          const [contract] = await tx
            .select({ id: contractsEnhanced.id })
            .from(contractsEnhanced)
            .where(eq(contractsEnhanced.projectId, order.projectId))
            .orderBy(desc(contractsEnhanced.createdAt))
            .limit(1);
          effectiveContractId = contract?.id ?? null;
        }

        const createdPayments: Array<{
          id: number;
          paymentNumber: string;
          amount: number;
          title: string;
        }> = [];

        for (let idx = 0; idx < input.installments.length; idx++) {
          const inst = input.installments[idx];
          const paymentNumber = generatePaymentNumber(String(idx + 1));
          const parsedDate = inst.dateMiladi.includes("T")
            ? new Date(inst.dateMiladi)
            : new Date(`${inst.dateMiladi}T12:00:00`);

          const [insertedPayment] = await tx.insert(payments).values({
            paymentNumber,
            projectId: order.projectId,
            contractId: effectiveContractId,
            changeOrderId: order.id,
            amount: inst.amount.toFixed(2),
            paymentType: "progress",
            description: inst.title,
            completionPercentage: null,
            status: "pending",
          });

          await tx.insert(disbursementRequests).values({
            requestNumber: `DISB-${paymentNumber}`,
            projectId: order.projectId,
            contractId: effectiveContractId,
            paymentId: insertedPayment.insertId,
            title: inst.title,
            description: inst.description || inst.title,
            amount: inst.amount.toFixed(2),
            paymentType: "progress",
            dateMiladi: parsedDate,
            completionPercentage: null,
            status: "pending",
          });

          createdPayments.push({
            id: insertedPayment.insertId,
            paymentNumber,
            amount: money(inst.amount),
            title: inst.title,
          });
        }

        await tx
          .update(projectChangeOrders)
          .set({
            paymentId: order.paymentId || createdPayments[0].id,
            status: "linked_to_payment",
            fundingSource: "project_payment",
          })
          .where(eq(projectChangeOrders.id, order.id));

        return {
          createdPayments,
          allocatedAfter: money(alreadyAllocated + requestedTotal),
          remainingAfter: money(Math.max(0, remainingForCo - requestedTotal)),
        };
      });

      return {
        success: true,
        count: result.createdPayments.length,
        payments: result.createdPayments,
        allocatedAfter: result.allocatedAfter,
        remainingAfter: result.remainingAfter,
      };
    }),
});
