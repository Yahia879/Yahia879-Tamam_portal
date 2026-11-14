import { describe, expect, it } from "vitest";

describe("Project Financials with Change Orders", () => {
  it("calculates active change orders total excluding rejected", () => {
    const orders = [
      { id: 1, amount: "5000.00", status: "boq_approved", disbursementStatus: null },
      { id: 2, amount: "3500.50", status: "pending_boq", disbursementStatus: null },
      { id: 3, amount: "2000.00", status: "rejected", disbursementStatus: null },
      { id: 4, amount: "1500.00", status: "disbursement_created", disbursementStatus: "rejected" },
      { id: 5, amount: "4000.00", status: "disbursement_created", disbursementStatus: "paid" },
    ];

    const activeOrders = orders.filter(
      o => o.status !== "rejected" && o.disbursementStatus !== "rejected"
    );

    const changeOrdersTotal = activeOrders.reduce(
      (sum, o) => sum + (parseFloat(o.amount?.toString() || "0") || 0),
      0
    );

    expect(activeOrders).toHaveLength(3);
    expect(changeOrdersTotal).toBe(12500.5);
  });

  it("calculates total required cost including supplier amount and change orders", () => {
    const supplierBaseAmount = 100000;
    const adminFeeValue = 10; // 10%
    const calculatedAdminFeeAmount = (supplierBaseAmount * adminFeeValue) / 100; // 10,000
    const supplierNetShare = supplierBaseAmount - calculatedAdminFeeAmount; // 90,000
    const changeOrdersTotal = 15000;

    const totalRequiredCost = supplierBaseAmount + changeOrdersTotal; // 115,000
    expect(supplierNetShare + calculatedAdminFeeAmount + changeOrdersTotal).toBe(totalRequiredCost);
    expect(totalRequiredCost).toBe(115000);

    const committedSupport = 100000;
    const coverageDifference = committedSupport - totalRequiredCost;
    expect(coverageDifference).toBe(-15000); // 15,000 deficit because of change order

    const receivedVouchers = 100000;
    const vouchersCoverageDifference = receivedVouchers - totalRequiredCost;
    expect(vouchersCoverageDifference).toBe(-15000);

    // After additional support is received for change order
    const totalReceivedWithCO = 115000;
    const targetRequiredAmount = totalRequiredCost;
    const remainingToCollect = Math.max(0, targetRequiredAmount - totalReceivedWithCO);
    expect(remainingToCollect).toBe(0);
  });
});
