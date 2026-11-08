import { z } from "zod";
import { asc, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { checkPermission } from "../permissions";
import {
  disbursementRequests,
  mosqueRequests,
  projectChangeOrders,
  projects,
  fundMovements,
  quantitySchedules,
  users,
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

function creationSurplus(projectSurplus: number, fundSpendable: number, unrequestedTotal: number) {
  // Fund cash can cover existing orders, but cannot fund a new order's creation.
  const unfundedOrders = Math.max(0, unrequestedTotal - Math.max(0, fundSpendable));
  return Math.max(0, money(projectSurplus - unfundedOrders));
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
          approverName: users.name,
        })
        .from(projectChangeOrders)
        .leftJoin(
          disbursementRequests,
          eq(projectChangeOrders.disbursementRequestId, disbursementRequests.id)
        )
        .leftJoin(users, eq(projectChangeOrders.boqApprovedBy, users.id))
        .where(eq(projectChangeOrders.projectId, input.projectId))
        .orderBy(desc(projectChangeOrders.id));

      const orders = rows.map(({ order, requestStatus, requestNumber, approverName }) => {
        let computedStatus = order.status || "pending_boq";
        if (order.disbursementRequestId && requestStatus) {
          if (requestStatus === "paid") computedStatus = "paid";
          else if (requestStatus === "approved") computedStatus = "approved";
          else if (requestStatus === "rejected") computedStatus = "rejected";
          else computedStatus = "disbursement_created";
        }

        return {
          ...order,
          status: computedStatus,
          requestStatus,
          requestNumber,
          approverName,
          items: (order.itemsJson ? JSON.parse(order.itemsJson) : []) as PricedChangeOrderItem[],
        };
      });

      const activeTotal = money(
        orders
          .filter(order => order.status !== "rejected")
          .reduce((sum, order) => sum + Number(order.amount), 0)
      );

      const unrequestedActiveTotal = money(
        orders
          .filter(order => order.status !== "rejected" && !order.disbursementRequestId)
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
          available: creationSurplus(available.surplusAvailable, fund.spendable, unrequestedActiveTotal),
          originalProjectCost: Number(
            orders.at(-1)?.originalProjectCost || available.projectCost
          ),
        };
      } catch (error) {
        if (!(error instanceof TRPCError) || error.code !== "BAD_REQUEST")
          throw error;
        fundingError = error.message;
      }

      return {
        orders,
        funding,
        fundingError,
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
          throw new TRPCError({ code: "NOT_FOUND", message: "المشروع غير موجود" });
        }

        if (project.programType === "sedana") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "أوامر التغيير غير متاحة لمشاريع سدانة" });
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
            throw new TRPCError({ code: "BAD_REQUEST", message: "أوامر التغيير غير متاحة لمشاريع سدانة" });
          }

          if (
            request?.currentStage === "closed" ||
            request?.status === "completed" ||
            request?.closureStatus === "confirmed"
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "لا يمكن إضافة أمر تغيير بعد إغلاق الطلب المرتبط بالمشروع",
            });
          }
        }

        const available = await getProjectFundableAmounts(tx, input.projectId);
        const fund = await getFundAvailable(tx, {
          restrictionType: "project",
          restrictedProjectId: input.projectId,
        });

        const existingOrders = await tx
          .select()
          .from(projectChangeOrders)
          .where(eq(projectChangeOrders.projectId, input.projectId))
          .orderBy(asc(projectChangeOrders.id));

        const unrequestedActiveTotal = money(
          existingOrders
            .filter(
              (order: any) =>
                order.status !== "rejected" && !order.disbursementRequestId
            )
            .reduce((sum: number, order: any) => sum + Number(order.amount || 0), 0)
        );

        const availableSurplus = creationSurplus(available.surplusAvailable, fund.spendable, unrequestedActiveTotal);

        if (
          priced.total <= 0 ||
          Math.round(priced.total * 100) > Math.round(availableSurplus * 100)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `لا يمكن إضافة أمر تغيير بقيمة (${priced.total.toFixed(2)} ريال) تتجاوز الفائض المتاح للمشروع (${availableSurplus.toFixed(2)} ريال)`,
          });
        }

        const firstOrder = existingOrders[0];

        const originalProjectCost = Number(
          firstOrder?.originalProjectCost || available.projectCost
        );

        const percentage = changeOrderPercentage(
          priced.total,
          originalProjectCost
        );

        // توليد رقم تسلسلي لأمر التغيير
        const orderSeq = (existingOrders.length + 1).toString().padStart(3, "0");
        const orderNumber = `CO-${project.projectNumber || 'PRJ' + input.projectId}-${orderSeq}`;

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

        // تحديث القسم المسؤول في الطلب آلياً
        if (project.requestId) {
          await tx
            .update(mosqueRequests)
            .set({
              currentResponsibleDepartment: "الإدارة المالية والصندوق",
            })
            .where(eq(mosqueRequests.id, project.requestId));
        }

        return {
          id: inserted.insertId,
          orderNumber,
          created: true,
          projectName: project.name,
        };
      });

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
          message: "إنشاء طلب الصرف من الصندوق يتطلب صلاحية إنشاء طلب صرف من الصندوق",
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
        throw new TRPCError({ code: "NOT_FOUND", message: "أمر التغيير غير موجود" });
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
          message: "يجب اعتماد وتسعير بنود أمر التغيير في جدول الكميات أولاً قبل الصرف",
        });
      }

      const pricedItems = JSON.parse(order.itemsJson || "[]") as PricedChangeOrderItem[];
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
});
