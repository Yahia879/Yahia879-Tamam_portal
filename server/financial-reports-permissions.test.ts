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

  it("should block /receipt-vouchers/new when user only has receipt_vouchers.view", () => {
    expect(hasRouteAccess("/receipt-vouchers/new", "custom", ["receipt_vouchers.view"], false)).toBe(false);
  });

  it("should allow /receipt-vouchers/new when user has any of the 3 create permissions", () => {
    expect(hasRouteAccess("/receipt-vouchers/new", "custom", ["receipt_vouchers.create_unrestricted"], false)).toBe(true);
    expect(hasRouteAccess("/receipt-vouchers/new", "custom", ["receipt_vouchers.create_restricted"], false)).toBe(true);
    expect(hasRouteAccess("/receipt-vouchers/new", "custom", ["receipt_vouchers.create_project"], false)).toBe(true);
  });

  it("should have correct PERMISSION_EXPANSION for disbursement_orders", () => {
    const expanded = PERMISSION_EXPANSION["disbursement_orders"];
    expect(expanded).toContain("disbursement_orders.view");
    expect(expanded).toContain("disbursement_orders.create_direct");
    expect(expanded).toContain("disbursement_orders.exception_approve");
    expect(expanded).toContain("disbursement_orders.remind");
    expect(expanded).toContain("disbursement_orders.cancel_executed");
    expect(expanded).toContain("disbursement_orders.export");

    expect(expanded).not.toContain("disbursement_orders.approve");
    expect(expanded).not.toContain("disbursement_orders.reject");
  });

  it("should block /disbursement-orders/new-direct when user only has disbursement_orders.view", () => {
    expect(hasRouteAccess("/disbursement-orders/new-direct", "custom", ["disbursement_orders.view"], false)).toBe(false);
  });

  it("should allow /disbursement-orders/new-direct when user has disbursement_orders.create_direct", () => {
    expect(hasRouteAccess("/disbursement-orders/new-direct", "custom", ["disbursement_orders.create_direct"], false)).toBe(true);
  });

  it("should have correct PERMISSION_EXPANSION for contracts with 15 sub-permissions and no delete", () => {
    const expanded = PERMISSION_EXPANSION["contracts"];
    expect(expanded).toContain("contracts.view");
    expect(expanded).toContain("contracts.create");
    expect(expanded).toContain("contracts.edit");
    expect(expanded).toContain("contracts.approve");
    expect(expanded).toContain("contracts.edit_approved");
    expect(expanded).toContain("contracts.export");
    expect(expanded).toContain("contracts.template_view");
    expect(expanded).toContain("contracts.template_add");
    expect(expanded).toContain("contracts.template_edit");
    expect(expanded).toContain("contracts.template_delete");
    expect(expanded).toContain("contracts.preamble_add");
    expect(expanded).toContain("contracts.preamble_edit");
    expect(expanded).toContain("contracts.clause_add");
    expect(expanded).toContain("contracts.clause_edit");
    expect(expanded).toContain("contracts.clause_delete");

    expect(expanded).not.toContain("contracts.delete");
  });

  it("should allow /contracts route when user has contracts.view or contracts.template_view", () => {
    expect(hasRouteAccess("/contracts", "custom", ["contracts.view"], false)).toBe(true);
    expect(hasRouteAccess("/contracts", "custom", ["contracts.template_view"], false)).toBe(true);
    expect(hasRouteAccess("/contracts", "custom", ["projects.view"], false)).toBe(false);
  });

  it("should block /contracts/new when user only has contracts.view and allow when user has contracts.create", () => {
    expect(hasRouteAccess("/contracts/new", "custom", ["contracts.view"], false)).toBe(false);
    expect(hasRouteAccess("/contracts/new", "custom", ["contracts.create"], false)).toBe(true);
  });

  it("should not allow access to contracts for super_admin via wildcard * if contracts permissions are removed", () => {
    expect(hasRouteAccess("/contracts", "super_admin", ["*"], false)).toBe(false);
    expect(hasRouteAccess("/contracts", "super_admin", ["contracts.view"], false)).toBe(true);
    expect(hasRouteAccess("/contracts", "super_admin", ["contracts.template_view"], false)).toBe(true);
  });
});
