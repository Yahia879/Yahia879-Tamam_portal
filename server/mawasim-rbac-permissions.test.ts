import { describe, expect, it } from "vitest";
import { getMenuGroupsFromPermissions } from "../client/src/components/DashboardLayout";
import { hasRouteAccess } from "../client/src/lib/routePermissions";
import {
  canManageMawasim,
  canViewMawasim,
  isMawasimPermission,
  MAWASIM_PERMISSIONS,
  MAWASIM_PERMISSION_IDS,
} from "../shared/mawasimPermissions";
import {
  sectionPermissionDependents,
  sectionPermissionPrerequisite,
  sectionPermissionSelection,
} from "../shared/sectionPermissions";
import { isStrictPermission } from "../client/src/hooks/usePermission";

describe("Mawasim RBAC Permissions", () => {
  it("defines dedicated permissions under mawasim module", () => {
    expect(MAWASIM_PERMISSION_IDS).toEqual(["mawasim.view", "mawasim.manage"]);
    expect(MAWASIM_PERMISSIONS.find(p => p.action === "view")?.nameAr).toBe("عرض مواسم");
    expect(MAWASIM_PERMISSIONS.find(p => p.action === "manage")?.nameAr).toBe("إدارة إعدادات المواسم");
    expect(isMawasimPermission("mawasim")).toBe(true);
    expect(isMawasimPermission("mawasim.view")).toBe(true);
    expect(isMawasimPermission("mawasim.manage")).toBe(true);
    expect(isMawasimPermission("mosques.view")).toBe(false);
  });

  it("treats mawasim permissions as strict (cannot be bypassed by wildcard for non-admins)", () => {
    expect(isStrictPermission("mawasim.view")).toBe(true);
    expect(isStrictPermission("mawasim.manage")).toBe(true);
  });

  it("links mawasim.manage with mawasim.view as prerequisite and dependent", () => {
    expect(sectionPermissionPrerequisite("mawasim.manage")).toBe("mawasim.view");
    expect(sectionPermissionDependents("mawasim.view")).toContain("mawasim.manage");

    // sectionPermissionSelection filters out mawasim.manage if mawasim.view is missing
    expect(sectionPermissionSelection(["mawasim.manage"])).not.toContain("mawasim.manage");
    expect(sectionPermissionSelection(["mawasim.view", "mawasim.manage"])).toContain("mawasim.manage");
    expect(sectionPermissionSelection(["mawasim.view", "mawasim.manage"])).toContain("mawasim.view");
  });

  it("enables permission by default only for system_admin and super_admin, not for other roles", () => {
    // Admin roles ("مدير النظام" / "المدير العام")
    expect(canViewMawasim("system_admin")).toBe(true);
    expect(canManageMawasim("system_admin")).toBe(true);
    expect(canViewMawasim("super_admin")).toBe(true);
    expect(canManageMawasim("super_admin")).toBe(true);

    // Non-admin roles by default
    const nonAdminRoles = [
      "projects_office",
      "project_manager",
      "field_team",
      "quick_response",
      "financial",
      "financial_manager",
      "general_manager",
      "executive_director",
      "corporate_comm",
      "board_chairman",
      "board_member",
      "service_requester",
      "custom_role_12345",
    ];

    for (const role of nonAdminRoles) {
      expect(canViewMawasim(role, [])).toBe(false);
      expect(canManageMawasim(role, [])).toBe(false);
      expect(canViewMawasim(role, ["*"])).toBe(false);
      expect(canManageMawasim(role, ["*"])).toBe(false);
    }
  });

  it("hides Mawasim from sidebar and blocks direct route access for non-admin users without permission", () => {
    const roles = ["projects_office", "financial", "project_manager", "custom_role_1"];
    for (const role of roles) {
      const menu = getMenuGroupsFromPermissions([], role);
      const mawasimItem = menu.flatMap(g => g.items).find(i => i.path === "/mawasim");
      expect(mawasimItem).toBeUndefined();

      expect(hasRouteAccess("/mawasim", role, [], false)).toBe(false);
      expect(hasRouteAccess("/requests/seasonal", role, [], false)).toBe(false);
    }
  });

  it("shows Mawasim in sidebar under 'المساجد والطلبات' and allows access once granted", () => {
    const role = "projects_office";
    const grantedMenu = getMenuGroupsFromPermissions(["mawasim.view"], role);
    const mosquesGroup = grantedMenu.find(g => g.label === "المساجد والطلبات");
    expect(mosquesGroup).toBeDefined();

    const mawasimItem = mosquesGroup?.items.find(i => i.path === "/mawasim");
    expect(mawasimItem).toBeDefined();
    expect(mawasimItem?.label).toBe("مواسم");

    expect(hasRouteAccess("/mawasim", role, ["mawasim.view"], false)).toBe(true);
    expect(hasRouteAccess("/requests/seasonal", role, ["mawasim.view"], false)).toBe(true);
    expect(canViewMawasim(role, ["mawasim.view"])).toBe(true);
    expect(canManageMawasim(role, ["mawasim.view"])).toBe(false);

    expect(canManageMawasim(role, ["mawasim.view", "mawasim.manage"])).toBe(true);
  });
});
