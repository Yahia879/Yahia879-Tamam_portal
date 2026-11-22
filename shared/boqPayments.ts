import { z } from "zod";

const quantityScale = 1000;

export function boqQuantityUnits(value: string | number | null | undefined): number | null {
  const match = /^(\d{1,12})(?:\.(\d{1,3}))?$/.exec(String(value ?? "").trim());
  return match ? Number(match[1]) * quantityScale + Number((match[2] ?? "").padEnd(3, "0")) : null;
}

export function formatBoqQuantity(units: number): string {
  return (units / quantityScale).toFixed(3).replace(/\.?0+$/, "");
}

export const boqAllocationsSchema = z.array(z.object({
  quantityScheduleId: z.number().int().positive(),
  quantity: z.union([z.string(), z.number()])
    .refine(value => (boqQuantityUnits(value) ?? 0) > 0, "أدخل كمية أكبر من صفر بما لا يتجاوز ثلاث منازل عشرية.")
    .transform(value => formatBoqQuantity(boqQuantityUnits(value)!)),
})).refine(rows => new Set(rows.map(row => row.quantityScheduleId)).size === rows.length, "لا يمكن تكرار نفس البند في الدفعة.");

export type BoqAllocation = z.infer<typeof boqAllocationsSchema>[number];

export function readBoqAllocations(value: unknown): BoqAllocation[] {
  try {
    const parsed = boqAllocationsSchema.safeParse(typeof value === "string" ? JSON.parse(value) : value);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

type Payment = { amount: string | number; status: string | null; boqAllocations?: unknown };
type Order = { status: string | null; amount: string | number; boqSettlements?: unknown };
type Request = { status: string | null; amount: string | number; orders: Order[] };

function amountCents(value: string | number) {
  return Math.round(Number(value) * 100);
}

export function paidBoqAllocations(payment: Payment, requests: Request[]): BoqAllocation[] {
  const allocations = readBoqAllocations(payment.boqAllocations);
  if (allocations.length === 0) return [];

  const executedOrders = requests.flatMap(request => request.orders.filter(order => order.status === "executed"));
  const paidCents = executedOrders.reduce((sum, order) => sum + amountCents(order.amount), 0) +
    requests.reduce((sum, request) => sum + (request.status === "paid" && !request.orders.length ? amountCents(request.amount) : 0), 0);
  const due = amountCents(payment.amount);
  if ((due > 0 && paidCents >= due) || (requests.length === 0 && payment.status === "paid")) return allocations;

  const settledUnits = new Map<number, number>();
  for (const order of executedOrders) {
    for (const row of readBoqAllocations(order.boqSettlements)) {
      settledUnits.set(row.quantityScheduleId, (settledUnits.get(row.quantityScheduleId) ?? 0) + boqQuantityUnits(row.quantity)!);
    }
  }

  return allocations.flatMap(row => {
    const units = Math.min(settledUnits.get(row.quantityScheduleId) ?? 0, boqQuantityUnits(row.quantity)!);
    return units > 0 ? [{ ...row, quantity: formatBoqQuantity(units) }] : [];
  });
}
