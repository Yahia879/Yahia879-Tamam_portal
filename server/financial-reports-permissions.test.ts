import { describe, it, expect } from "vitest";
import { PERMISSION_EXPANSION } from "./permissions";
import { hasRouteAccess } from "../client/src/lib/routePermissions";

describe("Financial Reports Permissions Refactor", () => {
  it("should have correct PERMISSION_EXPANSION for financial_reports", () => {
    const expanded = PERMISSION_EXPANSION["financial_reports"];
    expect(expanded).toContain("financial_reports.projects");
    expect(expanded).toContain("financial_reports.disbursements");
    expect(expanded).toContain("financial_reports.contracts");
    expect(expanded).toContain("financial_reports.disbursement_orders");
    expect(expanded).toContain("financial_reports.receipt_vouchers");
    expect(expanded).toContain("financial_reports.export");

    expect(expanded).not.toContain("financial_reports.view");
    expect(expanded).not.toContain("financial_reports.analytics");
  });

  it("should allow /financial-report route when user has financial_reports.projects", () => {
    expect(hasRouteAccess("/financial-report", "custom", ["financial_reports.projects"], false)).toBe(true);
  });

  it("should allow /financial-report route when user has financial_reports.disbursements", () => {
    expect(hasRouteAccess("/financial-report", "custom", ["financial_reports.disbursements"], false)).toBe(true);
  });

  it("should allow /financial-report route when user has financial_reports.contracts", () => {
    expect(hasRouteAccess("/financial-report", "custom", ["financial_reports.contracts"], false)).toBe(true);
  });

  it("should allow /financial-report route when user has financial_reports.disbursement_orders", () => {
    expect(hasRouteAccess("/financial-report", "custom", ["financial_reports.disbursement_orders"], false)).toBe(true);
  });

  it("should allow /financial-report route when user has financial_reports.receipt_vouchers", () => {
    expect(hasRouteAccess("/financial-report", "custom", ["financial_reports.receipt_vouchers"], false)).toBe(true);
  });

  it("should allow /financial-report route when user has financial_reports.export", () => {
    expect(hasRouteAccess("/financial-report", "custom", ["financial_reports.export"], false)).toBe(true);
  });

  it("should block /financial-report route when user has none of the financial reports permissions", () => {
    expect(hasRouteAccess("/financial-report", "custom", ["projects.view", "requests.view"], false)).toBe(false);
  });

  it("should not allow access to super_admin via wildcard * if financial report permission is removed", () => {
    // For super_admin, strict procurement & finance rule requires explicit permission
    expect(hasRouteAccess("/financial-report", "super_admin", ["*"], false)).toBe(false);
    expect(hasRouteAccess("/financial-report", "super_admin", ["financial_reports.projects"], false)).toBe(true);
  });

  it("should block /financial-approval route when user has no approval category permissions", () => {
    expect(hasRouteAccess("/financial-approval", "custom", ["projects.view"], false)).toBe(false);
  });

  it("should allow /financial-approval route when user has any of the approval category permissions", () => {
    expect(hasRouteAccess("/financial-approval", "custom", ["financial_approval.disbursement_requests"], false)).toBe(true);
    expect(hasRouteAccess("/financial-approval", "custom", ["financial_approval.receipt_vouchers"], false)).toBe(true);
    expect(hasRouteAccess("/financial-approval", "custom", ["financial_approval.contracts"], false)).toBe(true);
  });
});
