import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { contractPayments, contractsEnhanced, disbursementOrders, disbursementRequests, payments, projects, quantitySchedules } from "../drizzle/schema";
import { boqAllocationsSchema, boqQuantityUnits, formatBoqQuantity, paidBoqAllocations, readBoqAllocations, type BoqAllocation } from "../shared/boqPayments";
import type { getDb } from "./db";

type ReadDb = Pick<NonNullable<Awaited<ReturnType<typeof getDb>>>, "select">;
type BoqScope = { projectId?: number | null; requestId?: number | null };
type BoqItem = Pick<typeof quantitySchedules.$inferSelect, "id" | "itemName" | "quantity" | "projectId" | "requestId">;

export const boqAllocationLockMessage = "لا يمكن تغيير ربط بنود جدول الكميات بعد سداد أي دفعة في المشروع كليًا أو جزئيًا.";

export async function hasProjectPayment(db: ReadDb, scope: BoqScope, lock = false) {
  if (!scope.projectId && !scope.requestId) return false;

  const projectRows = await db.select({ id: projects.id, requestId: projects.requestId }).from(projects)
    .where(scope.projectId ? eq(projects.id, scope.projectId) : eq(projects.requestId, scope.requestId!));
  const projectIds = scope.projectId ? [scope.projectId] : projectRows.map(project => project.id);
  const requestId = projectRows[0]?.requestId ?? scope.requestId;

  const read = <T>(query: PromiseLike<T> & { for(strength: "update"): PromiseLike<T> }) =>
    lock ? query.for("update") : query;
  const contracts = await read(db.select({ id: contractsEnhanced.id }).from(contractsEnhanced)
    .where(or(
      projectIds.length ? inArray(contractsEnhanced.projectId, projectIds) : undefined,
      requestId ? and(isNull(contractsEnhanced.projectId), eq(contractsEnhanced.requestId, requestId)) : undefined,
    )).orderBy(contractsEnhanced.id));
  const contractIds = contracts.map(contract => contract.id);
  const installments = contractIds.length ? await read(db.select({
    id: contractPayments.id, status: contractPayments.status, amount: contractPayments.amount,
  }).from(contractPayments).where(inArray(contractPayments.contractId, contractIds)).orderBy(contractPayments.id)) : [];
  if (installments.some(payment => payment.status === "paid" && Number(payment.amount) > 0)) return true;

  const manual = projectIds.length || contractIds.length ? await read(db.select({
    id: payments.id, status: payments.status, amount: payments.amount,
  }).from(payments).where(or(
    projectIds.length ? inArray(payments.projectId, projectIds) : undefined,
    contractIds.length ? inArray(payments.contractId, contractIds) : undefined,
  )).orderBy(payments.id)) : [];
  if (manual.some(payment => payment.status === "paid" && Number(payment.amount) > 0)) return true;
  if (!installments.length && !manual.length) return false;

  const requests = await read(db.select({
    id: disbursementRequests.id, status: disbursementRequests.status, amount: disbursementRequests.amount,
  }).from(disbursementRequests).where(or(
    installments.length ? inArray(disbursementRequests.contractPaymentId, installments.map(payment => payment.id)) : undefined,
    // Older requests may store the installment ID in paymentId.
    installments.length ? and(
      isNull(disbursementRequests.contractPaymentId),
      inArray(disbursementRequests.paymentId, installments.map(payment => payment.id)),
      or(
        inArray(disbursementRequests.contractId, contractIds),
        projectIds.length ? inArray(disbursementRequests.projectId, projectIds) : undefined,
      ),
    ) : undefined,
    manual.length ? inArray(disbursementRequests.paymentId, manual.map(payment => payment.id)) : undefined,
  )).orderBy(disbursementRequests.id));
  if (requests.some(request => request.status === "paid" && Number(request.amount) > 0)) return true;
  if (!requests.length) return false;

  const orders = await read(db.select({
    status: disbursementOrders.status, amount: disbursementOrders.amount, executedAt: disbursementOrders.executedAt,
  }).from(disbursementOrders).where(inArray(disbursementOrders.disbursementRequestId, requests.map(request => request.id)))
    .orderBy(disbursementOrders.id));
  // An execution timestamp preserves the first-payment lock even if that order is later cancelled.
  return orders.some(order => (order.status === "executed" || order.executedAt) && Number(order.amount) > 0);
}

export function assertBoqAllocationsUnchanged(saved: BoqAllocation[], proposed: BoqAllocation[]) {
  const quantities = new Map(saved.map(row => [row.quantityScheduleId, row.quantity]));
  if (saved.length !== proposed.length || proposed.some(row => quantities.get(row.quantityScheduleId) !== row.quantity)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: boqAllocationLockMessage });
  }
}

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
