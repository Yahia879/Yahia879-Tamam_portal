import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, or } from "drizzle-orm";
import { contractPayments, contractsEnhanced, disbursementOrders, disbursementRequests, projects, quantitySchedules } from "../drizzle/schema";
import { boqAllocationsSchema, boqQuantityUnits, formatBoqQuantity, paidBoqAllocations, readBoqAllocations, type BoqAllocation } from "../shared/boqPayments";
import type { getDb } from "./db";

type ReadDb = Pick<NonNullable<Awaited<ReturnType<typeof getDb>>>, "select">;
type BoqScope = { projectId?: number | null; requestId?: number | null };
type BoqItem = Pick<typeof quantitySchedules.$inferSelect, "id" | "itemName" | "quantity" | "projectId" | "requestId">;

export function parseBoqAllocationInput(value: unknown): BoqAllocation[] | undefined {
  if (value === undefined) return undefined;
  const result = boqAllocationsSchema.safeParse(value);
  if (!result.success) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "اختر بنوداً مختلفة وأدخل كمية موجبة بما لا يتجاوز ثلاث منازل عشرية." });
  }
  return result.data;
}

export async function lockBoqItems(db: ReadDb, scope: BoqScope, entries: BoqAllocation[]) {
  const ids = Array.from(new Set(entries.map(row => row.quantityScheduleId)));
  if (!ids.length) return [];

  const [project] = scope.projectId
    ? await db.select({ requestId: projects.requestId }).from(projects).where(eq(projects.id, scope.projectId))
    : [];
  const requestId = scope.projectId ? project?.requestId ?? scope.requestId : scope.requestId;
  const items = await db.select({
    id: quantitySchedules.id,
    itemName: quantitySchedules.itemName,
    quantity: quantitySchedules.quantity,
    projectId: quantitySchedules.projectId,
    requestId: quantitySchedules.requestId,
  }).from(quantitySchedules)
    .where(inArray(quantitySchedules.id, ids))
    .orderBy(quantitySchedules.id)
    .for("update");
  const outsideScope = items.some(item =>
    scope.projectId && item.projectId ? item.projectId !== scope.projectId : !requestId || item.requestId !== requestId
  );
  if (items.length !== ids.length || outsideScope) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "اختر البنود من جدول كميات المشروع المرتبط بالعقد." });
  }
  return items;
}

function paymentsForItems(db: ReadDb, items: BoqItem[], scope: BoqScope) {
  const projectIds = Array.from(new Set([scope.projectId, ...items.map(item => item.projectId)].filter((id): id is number => Boolean(id))));
  const requestIds = Array.from(new Set([scope.requestId, ...items.map(item => item.requestId)].filter((id): id is number => Boolean(id))));
  return db.select({
    id: contractPayments.id,
    amount: contractPayments.amount,
    status: contractPayments.status,
    boqAllocations: contractPayments.boqAllocations,
  }).from(contractPayments)
    .innerJoin(contractsEnhanced, eq(contractPayments.contractId, contractsEnhanced.id))
    .leftJoin(projects, eq(contractsEnhanced.projectId, projects.id))
    .where(and(
      isNotNull(contractPayments.boqAllocations),
      or(
        projectIds.length ? inArray(contractsEnhanced.projectId, projectIds) : undefined,
        requestIds.length ? inArray(contractsEnhanced.requestId, requestIds) : undefined,
        requestIds.length ? inArray(projects.requestId, requestIds) : undefined,
      ),
    ));
}

function addQuantities(totals: Map<number, number>, rows: BoqAllocation[]) {
  for (const row of rows) {
    totals.set(row.quantityScheduleId, (totals.get(row.quantityScheduleId) ?? 0) + boqQuantityUnits(row.quantity)!);
  }
}

export async function validateBoqAllocationTotals(db: ReadDb, items: BoqItem[], scope: BoqScope) {
  if (!items.length) return;
  const payments = await paymentsForItems(db, items, scope).for("update");
  const totals = new Map<number, number>();
  for (const payment of payments) addQuantities(totals, readBoqAllocations(payment.boqAllocations));
  for (const item of items) {
    if ((totals.get(item.id) ?? 0) > (boqQuantityUnits(item.quantity) ?? 0)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `مجموع الكميات المرتبطة بالدفعات يتجاوز الكمية المعتمدة للبند «${item.itemName}».` });
    }
  }
}

export async function getBoqPaymentRequests(db: ReadDb, paymentIds: number[]) {
  if (!paymentIds.length) return [];
  const requests = await db.select({
    id: disbursementRequests.id,
    contractPaymentId: disbursementRequests.contractPaymentId,
    amount: disbursementRequests.amount,
    status: disbursementRequests.status,
  }).from(disbursementRequests).where(inArray(disbursementRequests.contractPaymentId, paymentIds));
  if (!requests.length) return [];
  const orders = await db.select({
    id: disbursementOrders.id,
    requestId: disbursementOrders.disbursementRequestId,
    amount: disbursementOrders.amount,
    status: disbursementOrders.status,
    boqSettlements: disbursementOrders.boqSettlements,
  }).from(disbursementOrders).where(inArray(disbursementOrders.disbursementRequestId, requests.map(request => request.id)));
  return requests.map(request => ({
    ...request,
    orders: orders.filter(order => order.requestId === request.id),
  }));
}

export async function getBoqPaymentCoverage(db: ReadDb, items: BoqItem[], scope: BoqScope) {
  const planned = new Map<number, number>();
  const paid = new Map<number, number>();
  if (!items.length) return { planned, paid };
  const payments = await paymentsForItems(db, items, scope);
  const requests = await getBoqPaymentRequests(db, payments.map(payment => payment.id));
  for (const payment of payments) {
    addQuantities(planned, readBoqAllocations(payment.boqAllocations));
    addQuantities(paid, paidBoqAllocations(payment, requests.filter(request => request.contractPaymentId === payment.id)));
  }
  return { planned, paid };
}

export async function getOrderBoqAllocations(db: ReadDb, orderId: number, lock = false) {
  const query = db.select({
    paymentId: contractPayments.id,
    orderStatus: disbursementOrders.status,
    allocations: contractPayments.boqAllocations,
    recorded: disbursementOrders.boqSettlements,
  }).from(disbursementOrders)
    .innerJoin(disbursementRequests, eq(disbursementOrders.disbursementRequestId, disbursementRequests.id))
    .innerJoin(contractPayments, eq(disbursementRequests.contractPaymentId, contractPayments.id))
    .where(eq(disbursementOrders.id, orderId));
  const [linked] = await (lock ? query.for("update") : query);
  const allocations = readBoqAllocations(linked?.allocations);
  if (!linked || linked.orderStatus !== "executed" || !allocations.length) return null;
  const items = await db.select({
    id: quantitySchedules.id, itemName: quantitySchedules.itemName, unit: quantitySchedules.unit,
  }).from(quantitySchedules).where(inArray(quantitySchedules.id, allocations.map(row => row.quantityScheduleId)));
  const requests = await getBoqPaymentRequests(db, [linked.paymentId]);
  const elsewhere = new Map<number, number>();
  for (const request of requests) {
    for (const order of request.orders) {
      if (order.status === "executed" && order.id !== orderId) {
        addQuantities(elsewhere, readBoqAllocations(order.boqSettlements));
      }
    }
  }
  const recorded = readBoqAllocations(linked.recorded);
  return allocations.map(row => ({
    ...row,
    itemName: items.find(item => item.id === row.quantityScheduleId)?.itemName ?? `#${row.quantityScheduleId}`,
    unit: items.find(item => item.id === row.quantityScheduleId)?.unit ?? "",
    limit: formatBoqQuantity(Math.max(0, boqQuantityUnits(row.quantity)! - (elsewhere.get(row.quantityScheduleId) ?? 0))),
    settled: recorded.find(item => item.quantityScheduleId === row.quantityScheduleId)?.quantity ?? "",
  }));
}
