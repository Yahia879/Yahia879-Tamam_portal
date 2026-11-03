import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
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
} from "../../drizzle/schema";
import {
  getFundAvailable,
  getProjectFundableAmounts,
  lockFund,
  money,
} from "../fund";
import { insertFundRequest } from "./fund";
import { notifyDisbursementRequestCreation } from "./notifications";
import {
  changeOrderPercentage,
  createChangeOrderSchema,
  priceChangeOrderItems,
  type PricedChangeOrderItem,
} from "../../shared/projectChangeOrders";

async function authorizeView(userId: number) {
  for (const permission of [
    "projects.view_details",
    "projects.financials",
    "projects.edit_support_and_fees",
    "projects.add_receipt_voucher",
  ]) {
    if (await checkPermission(userId, permission)) return;
  }
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "ليس لديك صلاحية عرض أوامر تغيير المشروع",
  });
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
          status: disbursementRequests.status,
          requestNumber: disbursementRequests.requestNumber,
        })
        .from(projectChangeOrders)
        .innerJoin(
          disbursementRequests,
          eq(projectChangeOrders.disbursementRequestId, disbursementRequests.id)
        )
        .where(eq(projectChangeOrders.projectId, input.projectId))
        .orderBy(desc(projectChangeOrders.id));
      const orders = rows.map(({ order, ...request }) => ({
        ...order,
        ...request,
        items: JSON.parse(order.itemsJson) as PricedChangeOrderItem[],
      }));
      let funding = null;
      let fundingError: string | null = null;
      try {
        const available = await getProjectFundableAmounts(db, input.projectId);
        const fund = await getFundAvailable(db, {
          restrictionType: "project",
          restrictedProjectId: input.projectId,
        });
        funding = {
          projectSurplus: available.surplusAvailable,
          fundSurplus: Math.max(0, fund.spendable),
          available: money(
            Math.max(0, available.surplusAvailable + fund.spendable)
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
      const activeTotal = money(
        orders
          .filter(order => order.status !== "rejected")
          .reduce((sum, order) => sum + Number(order.amount), 0)
      );
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

  create: protectedProcedure
    .input(createChangeOrderSchema)
    .mutation(async ({ input, ctx }) => {
      await authorizeView(ctx.user.id);
      if (
        !(await checkPermission(ctx.user.id, "disbursements.create_from_fund"))
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "إنشاء أمر تغيير يتطلب صلاحية إنشاء طلب صرف من الصندوق",
        });
      }
      const priced = priceChangeOrderItems(input.items);
      if (
        priced.items.some(item => item.total <= 0) ||
        !Number.isSafeInteger(Math.round(priced.total * 100)) ||
        priced.total > 999_999_999_999.99
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "قيمة البنود يجب أن تكون موجبة وضمن الحد المالي المسموح",
        });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.transaction(async tx => {
        // Shares the lock used by fund transfers and disbursements: concurrent orders cannot reuse the same surplus.
        await lockFund(tx);
        const [existing] = await tx
          .select()
          .from(projectChangeOrders)
          .where(eq(projectChangeOrders.submissionKey, input.submissionKey))
          .limit(1);
        if (existing) {
          if (
            existing.projectId !== input.projectId ||
            existing.createdById !== ctx.user.id
          )
            throw new TRPCError({
              code: "CONFLICT",
              message: "معرف الإرسال مستخدم مسبقاً",
            });
          return {
            id: existing.id,
            requestId: existing.disbursementRequestId,
            orderNumber: existing.orderNumber,
            created: false,
          };
        }
        const [project] = await tx
          .select()
          .from(projects)
          .where(eq(projects.id, input.projectId))
          .limit(1);
        if (!project)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المشروع غير موجود",
          });
        if (["completed", "cancelled"].includes(project.status || ""))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "لا يمكن إضافة أمر تغيير لمشروع مكتمل أو ملغي",
          });
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
              message:
                "لا يمكن إضافة أمر تغيير بعد إغلاق الطلب المرتبط بالمشروع",
            });
          }
        }
        const available = await getProjectFundableAmounts(tx, input.projectId);
        const bucket = {
          restrictionType: "project" as const,
          restrictedProjectId: input.projectId,
        };
        const fund = await getFundAvailable(tx, bucket);
        // A negative spendable balance must be covered before reserving another request.
        const transferableNeeded = money(
          Math.max(0, priced.total - fund.spendable)
        );
        if (
          Math.round(transferableNeeded * 100) >
          Math.round(available.surplusAvailable * 100)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `قيمة أمر التغيير تتجاوز الفائض المتاح (${money(Math.max(0, available.surplusAvailable + fund.spendable)).toFixed(2)} ريال)`,
          });
        }
        const [firstOrder] = await tx
          .select()
          .from(projectChangeOrders)
          .where(eq(projectChangeOrders.projectId, input.projectId))
          .orderBy(asc(projectChangeOrders.id))
          .limit(1);
        const originalProjectCost = Number(
          firstOrder?.originalProjectCost || available.projectCost
        );
        const percentage = changeOrderPercentage(
          priced.total,
          originalProjectCost
        );
        const workDescription = priced.items
          .map(
            item =>
              `${item.name} — ${item.quantity} ${item.unit} × ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)} ريال`
          )
          .join("\n");
        const request = await insertFundRequest(
          tx,
          {
            ...input,
            amount: priced.total,
            title: `أمر تغيير: ${input.title}`,
            description: `${input.reason}\n\n${workDescription}\n\nالنسبة من قيمة المشروع الأصلية: ${percentage}%`,
            workDescription,
          },
          bucket,
          ctx.user.id
        );
        const orderNumber = `CO-${request.requestNumber.replace(/^DR-/, "")}`;
        const [inserted] = await tx.insert(projectChangeOrders).values({
          orderNumber,
          submissionKey: input.submissionKey,
          projectId: input.projectId,
          disbursementRequestId: request.id,
          title: input.title,
          reason: input.reason,
          itemsJson: JSON.stringify(priced.items),
          amount: priced.total.toFixed(2),
          originalProjectCost: originalProjectCost.toFixed(2),
          percentage: percentage.toFixed(6),
          createdById: ctx.user.id,
        });
        if (transferableNeeded > 0)
          await tx.insert(fundMovements).values({
            eventKey: `change-order:${inserted.insertId}:surplus`,
            movementType: "surplus",
            amount: transferableNeeded.toFixed(2),
            restrictionType: "project",
            restrictedProjectId: input.projectId,
            projectId: input.projectId,
            requestId: request.id,
            sourceDetailsJson: JSON.stringify({
              changeOrderId: inserted.insertId,
              vouchers: available.vouchers,
            }),
            notes: `تخصيص فائض المشروع لأمر التغيير ${orderNumber}`,
            createdById: ctx.user.id,
          });
        return {
          id: inserted.insertId,
          requestId: request.id,
          orderNumber,
          created: true,
          requestNumber: request.requestNumber,
        };
      });
      if (result.created && result.requestNumber) {
        try {
          await notifyDisbursementRequestCreation(
            result.requestId,
            result.requestNumber,
            `أمر تغيير: ${input.title}`,
            priced.total.toFixed(2),
            input.projectId
          );
        } catch (error) {
          console.error("Change order notification failed:", error);
        }
      }
      return result;
    }),
});
