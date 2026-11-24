import { describe, expect, it } from "vitest";
import { getMenuGroupsFromPermissions } from "../client/src/components/DashboardLayout";
import { hasRouteAccess } from "../client/src/lib/routePermissions";
import {
  canCreateMawasim,
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
  it("defines dedicated permissions under mawasim module including create and settings", () => {
    expect(MAWASIM_PERMISSION_IDS).toEqual(["mawasim.view", "mawasim.create", "mawasim.manage"]);
    expect(MAWASIM_PERMISSIONS.find(p => p.action === "view")?.nameAr).toBe("عرض مواسم");
    expect(MAWASIM_PERMISSIONS.find(p => p.action === "create")?.nameAr).toBe("إضافة موسم");
    expect(MAWASIM_PERMISSIONS.find(p => p.action === "manage")?.nameAr).toBe("إعدادات الموسم");
    expect(isMawasimPermission("mawasim")).toBe(true);
    expect(isMawasimPermission("mawasim.view")).toBe(true);
    expect(isMawasimPermission("mawasim.create")).toBe(true);
    expect(isMawasimPermission("mawasim.manage")).toBe(true);
    expect(isMawasimPermission("mosques.view")).toBe(false);
  });

  it("treats mawasim permissions as strict (cannot be bypassed by wildcard)", () => {
    expect(isStrictPermission("mawasim.view")).toBe(true);
    expect(isStrictPermission("mawasim.create")).toBe(true);
    expect(isStrictPermission("mawasim.manage")).toBe(true);
  });

  it("links mawasim.create and mawasim.manage with mawasim.view as prerequisite and dependent", () => {
    expect(sectionPermissionPrerequisite("mawasim.create")).toBe("mawasim.view");
    expect(sectionPermissionPrerequisite("mawasim.manage")).toBe("mawasim.view");
    expect(sectionPermissionDependents("mawasim.view")).toContain("mawasim.create");
    expect(sectionPermissionDependents("mawasim.view")).toContain("mawasim.manage");

    // sectionPermissionSelection filters out dependent perms if mawasim.view is missing
    expect(sectionPermissionSelection(["mawasim.create"])).not.toContain("mawasim.create");
    expect(sectionPermissionSelection(["mawasim.manage"])).not.toContain("mawasim.manage");
    expect(sectionPermissionSelection(["mawasim.view", "mawasim.create", "mawasim.manage"])).toEqual(
      expect.arrayContaining(["mawasim.view", "mawasim.create", "mawasim.manage"])
    );
  });

  it("hides Mawasim from admin users when permissions are revoked or unchecked", () => {
    for (const adminRole of ["system_admin", "super_admin"]) {
      // When permission is revoked / unchecked for admin (permissions array is empty or lacks mawasim)
      expect(canViewMawasim(adminRole, [])).toBe(false);
      expect(canCreateMawasim(adminRole, [])).toBe(false);
      expect(canManageMawasim(adminRole, [])).toBe(false);

      const menu = getMenuGroupsFromPermissions([], adminRole);
      const mawasimItem = menu.flatMap(g => g.items).find(i => i.path === "/mawasim");
      expect(mawasimItem).toBeUndefined();

      expect(hasRouteAccess("/mawasim", adminRole, [], false)).toBe(false);
      expect(hasRouteAccess("/requests/seasonal", adminRole, [], false)).toBe(false);
    }
  });

  it("grants access to admin users when permission is present", () => {
    for (const adminRole of ["system_admin", "super_admin"]) {
      expect(canViewMawasim(adminRole, ["mawasim.view"])).toBe(true);
      expect(canCreateMawasim(adminRole, ["mawasim.create"])).toBe(true);
      expect(canManageMawasim(adminRole, ["mawasim.manage"])).toBe(true);

      const menu = getMenuGroupsFromPermissions(["mawasim.view"], adminRole);
      const mawasimItem = menu.flatMap(g => g.items).find(i => i.path === "/mawasim");
      expect(mawasimItem).toBeDefined();

      expect(hasRouteAccess("/mawasim", adminRole, ["mawasim.view"], false)).toBe(true);
      expect(hasRouteAccess("/requests/seasonal", adminRole, ["mawasim.view"], false)).toBe(true);
    }
  });

  it("hides Mawasim from non-admin roles and staff by default", () => {
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
      expect(canCreateMawasim(role, [])).toBe(false);
      expect(canManageMawasim(role, [])).toBe(false);
      expect(canViewMawasim(role, ["*"])).toBe(false);
      expect(canCreateMawasim(role, ["*"])).toBe(false);
      expect(canManageMawasim(role, ["*"])).toBe(false);

      const menu = getMenuGroupsFromPermissions([], role);
      const mawasimItem = menu.flatMap(g => g.items).find(i => i.path === "/mawasim");
      expect(mawasimItem).toBeUndefined();

      expect(hasRouteAccess("/mawasim", role, [], false)).toBe(false);
      expect(hasRouteAccess("/requests/seasonal", role, [], false)).toBe(false);
    }
  });

  it("shows Mawasim and enables fine-grained capabilities once permissions are granted", () => {
    const role = "projects_office";
    const grantedMenu = getMenuGroupsFromPermissions(["mawasim.view"], role);
    const mosquesGroup = grantedMenu.find(g => g.label === "المساجد والطلبات");
    expect(mosquesGroup).toBeDefined();

    const mawasimItem = mosquesGroup?.items.find(i => i.path === "/mawasim");
    expect(mawasimItem).toBeDefined();
    expect(mawasimItem?.label).toBe("مواسم");

    expect(hasRouteAccess("/mawasim", role, ["mawasim.view"], false)).toBe(true);
    expect(hasRouteAccess("/requests/seasonal", role, ["mawasim.view"], false)).toBe(true);

    // View only
    expect(canViewMawasim(role, ["mawasim.view"])).toBe(true);
    expect(canCreateMawasim(role, ["mawasim.view"])).toBe(false);
    expect(canManageMawasim(role, ["mawasim.view"])).toBe(false);

    // View + Create (إضافة موسم)
    expect(canCreateMawasim(role, ["mawasim.view", "mawasim.create"])).toBe(true);
    expect(canManageMawasim(role, ["mawasim.view", "mawasim.create"])).toBe(false);

    // View + Settings (إعدادات الموسم) - create must still be false!
    expect(canManageMawasim(role, ["mawasim.view", "mawasim.manage"])).toBe(true);
    expect(canCreateMawasim(role, ["mawasim.view", "mawasim.manage"])).toBe(false);

    // All permissions
    expect(canCreateMawasim(role, ["mawasim.view", "mawasim.create", "mawasim.manage"])).toBe(true);
    expect(canManageMawasim(role, ["mawasim.view", "mawasim.create", "mawasim.manage"])).toBe(true);
  });
});
