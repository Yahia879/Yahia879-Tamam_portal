import { describe, expect, it } from "vitest";
import { computeProjectFundable } from "./fund";

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
