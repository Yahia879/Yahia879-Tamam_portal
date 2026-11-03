import { describe, expect, it, vi } from "vitest";
import { computeProjectFundable, postFundDisbursement } from "./fund";

describe("project fund allocations", () => {
  it("keeps the administrative share inside project cost and exposes only excess cash as surplus", () => {
    expect(computeProjectFundable({
      received: 120_000, projectCost: 100_000, adminFee: 10_000, operationalFee: 0,
      surplusTransferred: 0, adminTransferred: 0, operationalTransferred: 0,
    })).toEqual({
      surplusAvailable: 20_000,
      administrativeAvailable: 10_000,
      operationalAvailable: 0,
    });
  });

  it("does not expose fees until cash has covered the supplier share", () => {
    expect(computeProjectFundable({
      received: 95_000, projectCost: 100_000, adminFee: 10_000, operationalFee: 0,
      surplusTransferred: 0, adminTransferred: 0, operationalTransferred: 0,
    })).toEqual({
      surplusAvailable: 0,
      administrativeAvailable: 5_000,
      operationalAvailable: 0,
    });
  });

  it("reserves the operational portion before offering the remaining surplus", () => {
    expect(computeProjectFundable({
      received: 120_000, projectCost: 100_000, adminFee: 10_000, operationalFee: 10_000,
      surplusTransferred: 4_000, adminTransferred: 3_000, operationalTransferred: 2_000,
    })).toEqual({
      surplusAvailable: 6_000,
      administrativeAvailable: 7_000,
      operationalAvailable: 8_000,
    });
  });
});

describe("change order fund disbursement", () => {
  const request = { id: 1, amount: "5000.00", status: "approved", projectId: 1, fundRestrictionType: "project", fundRestrictedProjectId: 1 } as any;
  const order = { id: 7, amount: "5000.00", orderNumber: "DO-7" } as any;
  function database() {
    const responses = [[{ amount: "5000.00" }], [{ amount: "0.00" }], [{ amount: "5000.00" }], [{ amount: "5000.00" }]];
    const values = vi.fn(async () => undefined);
    return { values, db: {
      select: () => {
        const rows = responses.shift();
        const query: any = { from: () => query, where: () => query, limit: () => query, then: (resolve: any) => Promise.resolve(rows).then(resolve) };
        return query;
      },
      insert: () => ({ values }),
    } };
  }
  it("rejects a payout that differs from the change order items", async () => {
    const { db, values } = database();
    await expect(postFundDisbursement(db, { ...order, amount: "4000.00" }, request, 1)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(values).not.toHaveBeenCalled();
  });
  it("records the actual payout once against the project fund bucket", async () => {
    const { db, values } = database();
    await postFundDisbursement(db, order, request, 1);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ movementType: "disbursement", amount: "-5000.00", restrictedProjectId: 1, disbursementOrderId: 7 }));
    expect(values).toHaveBeenCalledTimes(1);
  });
  it("rejects a paid request without recording another debit", async () => {
    const { db, values } = database();
    await expect(postFundDisbursement(db, order, { ...request, status: "paid" }, 1)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(values).not.toHaveBeenCalled();
  });
});
