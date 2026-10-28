import { describe, expect, it } from "vitest";
import { getRequiredPermission, hasRouteAccess } from "../client/src/lib/routePermissions";

describe("receipt voucher creation route", () => {
  it("defines the new voucher page explicitly", () => {
    expect(getRequiredPermission("/receipt-vouchers/new")).not.toBe("__unknown_route__");
  });

  it.each(["receipt_vouchers.add", "receipt_vouchers.edit", "receipt_vouchers"])(
    "allows the same creation permission as the voucher button: %s",
    permission => {
      expect(hasRouteAccess("/receipt-vouchers/new", "financial", [permission], false)).toBe(true);
      expect(hasRouteAccess("/receipt-vouchers/new", "custom_role_finance", [permission], true)).toBe(true);
    },
  );

  it("allows user 3's configured receipt voucher permissions", () => {
    expect(hasRouteAccess("/receipt-vouchers/new", "financial", [
      "receipt_vouchers.view", "receipt_vouchers.edit", "receipt_vouchers",
    ], false)).toBe(true);
  });

  it.each([
    { permissions: [] },
    { permissions: ["receipt_vouchers.view"] },
    { permissions: ["receipt_vouchers.exception_approve"] },
    { permissions: ["projects.view"] },
  ])(
    "blocks creation without a creation permission: $permissions",
    ({ permissions }) => {
      expect(hasRouteAccess("/receipt-vouchers/new", "financial", permissions, false)).toBe(false);
    },
  );
});
