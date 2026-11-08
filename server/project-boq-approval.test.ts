import { describe, expect, it } from "vitest";
import { isProjectBoqApproved } from "../shared/projectBoq";
import { RETIRED_SECTION_PERMISSIONS, sectionPermissionSelection } from "../shared/sectionPermissions";

describe("approved project BOQ controls", () => {
  it("remains editable during BOQ preparation", () => {
    expect(isProjectBoqApproved({ phases: [{ phaseOrder: 2, status: "in_progress", completionPercentage: 50 }] })).toBe(false);
  });
  it("locks immediately after BOQ approval before quotation approval", () => {
    expect(isProjectBoqApproved({ phases: [{ phaseOrder: 2, status: "completed", completionPercentage: 100 }] })).toBe(true);
    expect(isProjectBoqApproved({ request: { currentStage: "financial_eval_and_approval" } })).toBe(true);
  });
  it("recognizes the first BOQ phase in multi-mosque projects", () => {
    expect(isProjectBoqApproved({ isMultiMosque: true, phases: [{ phaseOrder: 1, status: "completed" }] })).toBe(true);
    expect(isProjectBoqApproved({ phases: [{ phaseOrder: 1, status: "completed" }] })).toBe(false);
  });
  it("ignores stale assignments of the retired manual transfer permission", () => {
    expect(RETIRED_SECTION_PERMISSIONS).toContain("fund.transfer");
    expect(sectionPermissionSelection(["fund.view", "fund.transfer", "fund.export"])).toEqual(["fund.view", "fund.export"]);
  });
});
