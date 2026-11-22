import { describe, expect, it } from "vitest";
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
