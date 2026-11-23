import { describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/mysql-proxy";
import { assertBoqAllocationsUnchanged, hasProjectPayment } from "./boqPayments";
import { boqAllocationsSchema, boqQuantityUnits, formatBoqQuantity, paidBoqAllocations } from "../shared/boqPayments";

const item = (quantity: string) => ({ quantityScheduleId: 7, quantity });
const payment = { amount: "100.00", status: "paid", boqAllocations: JSON.stringify([item("1.375")]) };

describe("BOQ installment allocations", () => {
  it("accepts whole and fractional quantities at BOQ precision", () => {
    for (const quantity of ["1", "1.25", 1.3, "1.375"]) {
      const rows = boqAllocationsSchema.parse([{ quantityScheduleId: 7, quantity }]);
      expect(rows[0].quantity).toBe(String(quantity));
    }
    expect(boqAllocationsSchema.safeParse([item("1.2345")]).success).toBe(false);
    expect(boqAllocationsSchema.safeParse([item("0")]).success).toBe(false);
    expect(boqAllocationsSchema.safeParse([item("1"), item("1.25")]).success).toBe(false);
    expect(formatBoqQuantity(boqQuantityUnits("1.375")! - boqQuantityUnits("1.3")!)).toBe("0.075");
  });

  it("credits only the recorded quantities for partially executed payments", () => {
    const pending = { status: "approved", amount: "20.00", boqSettlements: [item("0.6")] };
    const executed = { status: "executed", amount: "50.00", boqSettlements: JSON.stringify([item("0.625")]) };
    expect(paidBoqAllocations(payment, [{ status: "paid", amount: "50.00", orders: [pending, executed] }])).toEqual([item("0.625")]);
    expect(paidBoqAllocations(payment, [{ status: "paid", amount: "50.00", orders: [pending] }])).toEqual([]);
  });

  it("credits the full allocation once executed amounts meet the installment amount", () => {
    const orders = [
      { status: "executed", amount: "50.25" },
      { status: "executed", amount: "49.75" },
    ];
    expect(paidBoqAllocations(payment, [{ status: "paid", amount: "100.00", orders }])).toEqual([item("1.375")]);
  });

  it("reverses coverage for cancelled orders and supports manual payments without orders", () => {
    const cancelled = { status: "rejected", amount: "100.00", boqSettlements: [item("1.375")] };
    expect(paidBoqAllocations(payment, [{ status: "paid", amount: "100.00", orders: [cancelled] }])).toEqual([]);
    expect(paidBoqAllocations(payment, [])).toEqual([item("1.375")]);
  });
});

describe("project BOQ allocation lock", () => {
  function projectPayments(overrides: Record<string, unknown[][]> = {}) {
    const rows: Record<string, unknown[][]> = {
      projects: [[10, 50]],
      contracts_enhanced: [[20], [21]],
      contract_payments: [[101, "pending", "100.00"], [102, "pending", "200.00"]],
      disbursement_requests: [[201, "approved", "20.00"]],
      ...overrides,
    };
    const query = vi.fn(async (sql: string) => ({
      rows: rows[/from `([a-z_]+)`/i.exec(sql)?.[1] ?? ""] ?? [],
    }));
    return { db: drizzle(query), query };
  }

  it("keeps allocations editable before any actual payment", async () => {
    const { db } = projectPayments({ disbursement_orders: [["approved", "20.00", null]] });
    await expect(hasProjectPayment(db, { projectId: 10 })).resolves.toBe(false);
  });

  it("locks the whole project for a partial payment on another contract", async () => {
    const { db, query } = projectPayments({ disbursement_orders: [["executed", "20.00", null]] });
    await expect(hasProjectPayment(db, { requestId: 50 }, true)).resolves.toBe(true);
    const installmentSelect = query.mock.calls.find(([sql]) => sql.includes("from `contract_payments`"));
    expect(installmentSelect?.[0]).toContain("for update");
    const contractsSelect = query.mock.calls.find(([sql]) => sql.includes("from `contracts_enhanced`"));
    expect(contractsSelect?.[0]).toContain("`contracts_enhanced`.`projectId` in");
  });

  it("detects existing paid installments and older paid requests without orders", async () => {
    const paidInstallment = projectPayments({ contract_payments: [[101, "paid", "100.00"]] });
    await expect(hasProjectPayment(paidInstallment.db, { projectId: 10 })).resolves.toBe(true);
    const paidRequest = projectPayments({ disbursement_requests: [[201, "paid", "20.00"]] });
    await expect(hasProjectPayment(paidRequest.db, { projectId: 10 })).resolves.toBe(true);
  });

  it("keeps the lock if an executed order is later cancelled", async () => {
    const { db } = projectPayments({ disbursement_orders: [["rejected", "20.00", "2026-11-20 12:00:00"]] });
    await expect(hasProjectPayment(db, { projectId: 10 })).resolves.toBe(true);
  });

  it("detects a paid legacy project payment", async () => {
    const { db } = projectPayments({ payments: [[301, "paid", "25.00"]] });
    await expect(hasProjectPayment(db, { projectId: 10 })).resolves.toBe(true);
  });

  it("preserves existing allocations and rejects new links or changes once locked", () => {
    const saved = [item("1.375")];
    expect(() => assertBoqAllocationsUnchanged(saved, [item("1.375")])).not.toThrow();
    expect(() => assertBoqAllocationsUnchanged([], [])).not.toThrow();
    expect(() => assertBoqAllocationsUnchanged([], saved)).toThrow();
    expect(() => assertBoqAllocationsUnchanged(saved, [])).toThrow();
    expect(() => assertBoqAllocationsUnchanged(saved, [item("1.5")])).toThrow();
  });
});
