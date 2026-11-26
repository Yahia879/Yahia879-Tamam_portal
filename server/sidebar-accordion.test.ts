import { describe, expect, it } from "vitest";
import { resolveExpandedSidebarGroup, isItemActive, getMenuGroupsFromPermissions } from "@/components/DashboardLayout";
import { hasRouteAccess } from "@/lib/routePermissions";

const sampleGroups = [
  {
    label: "",
    items: [{ path: "/dashboard" }],
  },
  {
    label: "لوحات المعلومات",
    items: [
      { path: "/information-dashboard" },
      { path: "/board-analytics" },
    ],
  },
  {
    label: "المساجد والطلبات",
    items: [
      { path: "/mawasim" },
      { path: "/mosques" },
      { path: "/mosques/map" },
      { path: "/requests" },
    ],
  },
  {
    label: "الهندسة والمشاريع",
    items: [
      { path: "/projects" },
      { path: "/progress-reports" },
    ],
  },
  {
    label: "الإعدادات",
    items: [{ path: "/settings" }],
  },
];

describe("Sidebar accordion group resolution", () => {
  it("opens the group containing the active route instead of defaulting to the first group", () => {
    expect(resolveExpandedSidebarGroup(sampleGroups, "/requests", undefined)).toBe("المساجد والطلبات");
    expect(resolveExpandedSidebarGroup(sampleGroups, "/mawasim", undefined)).toBe("المساجد والطلبات");
    expect(resolveExpandedSidebarGroup(sampleGroups, "/projects", undefined)).toBe("الهندسة والمشاريع");
    expect(resolveExpandedSidebarGroup(sampleGroups, "/settings", undefined)).toBe("الإعدادات");
  });

  it("keeps the parent group open for nested sub-routes like /requests/seasonal", () => {
    const allItems = sampleGroups.flatMap(g => g.items);
    expect(isItemActive("/requests", "/requests/seasonal", allItems)).toBe(true);
    expect(resolveExpandedSidebarGroup(sampleGroups, "/requests/seasonal", undefined)).toBe("المساجد والطلبات");
    expect(resolveExpandedSidebarGroup(sampleGroups, "/projects/42", undefined)).toBe("الهندسة والمشاريع");
  });

  it("respects explicit manual collapse (null) and explicit manual toggle", () => {
    expect(resolveExpandedSidebarGroup(sampleGroups, "/requests", null)).toBeNull();
    expect(resolveExpandedSidebarGroup(sampleGroups, "/requests", "الهندسة والمشاريع")).toBe("الهندسة والمشاريع");
  });

  it("falls back to stored group for non-sidebar routes like /profile, then to first group", () => {
    expect(resolveExpandedSidebarGroup(sampleGroups, "/profile", undefined, "المساجد والطلبات")).toBe("المساجد والطلبات");
    expect(resolveExpandedSidebarGroup(sampleGroups, "/profile", undefined, null)).toBe("لوحات المعلومات");
    expect(resolveExpandedSidebarGroup(sampleGroups, "/dashboard", undefined, null)).toBe("لوحات المعلومات");
  });

  it("places standalone الرئيسية above لوحات المعلومات", () => {
    const groups = getMenuGroupsFromPermissions(["information_dashboard.digital_screen", "board_chairman"], "super_admin");
    expect(groups[0]?.label).toBe("");
    expect(groups[0]?.items.map(item => item.path)).toEqual(["/dashboard"]);
    expect(groups[1]?.label).toBe("لوحات المعلومات");
    expect(groups[1]?.items.map(item => item.path)).toContain("/information-dashboard");
    expect(groups[1]?.items.map(item => item.path)).toContain("/board-executive");
  });

  it("restricts Mawasim routes properly for staff vs service_requester", () => {
    expect(hasRouteAccess("/requester/mawasim", "service_requester", [], false)).toBe(true);
    expect(hasRouteAccess("/requester/mawasim", "projects_office", [], false)).toBe(false);
    expect(hasRouteAccess("/mawasim", "service_requester", [], false)).toBe(false);
    expect(hasRouteAccess("/requests/seasonal", "service_requester", [], false)).toBe(false);
    expect(hasRouteAccess("/requests/seasonal", "super_admin", [], false)).toBe(false);
    expect(hasRouteAccess("/requests/seasonal", "system_admin", ["*"], false)).toBe(false);
    expect(hasRouteAccess("/requests/seasonal", "super_admin", ["mawasim.view"], false)).toBe(true);
    expect(hasRouteAccess("/requests/seasonal", "projects_office", ["requests.view"], false)).toBe(false);
    expect(hasRouteAccess("/requests/seasonal", "projects_office", ["mawasim.view"], false)).toBe(true);
    expect(hasRouteAccess("/requests/seasonal", "field_team", ["requests.view"], false)).toBe(false);
  });
});
