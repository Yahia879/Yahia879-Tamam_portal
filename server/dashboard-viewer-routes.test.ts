import { describe, expect, it } from "vitest";
import { getUserHomeRoute, hasRouteAccess, getInformationDashboardReturnRoute } from "../client/src/lib/routePermissions";
import { isDashboardViewerUser } from "../client/src/lib/dashboardViewer";

describe("dashboard viewer routes", () => {
  it("returns to an authorized sidebar section when the viewer has additional permissions", () => {
    const user = { role: "dashboard_viewer" };
    const permissions = ["information_dashboard.view", "requests.view"];
    expect(getInformationDashboardReturnRoute(user, permissions, ["/information-dashboard", "/requests"])).toBe("/requests");
  });

  it("hides the return button for a viewer with only information dashboard access", () => {
    expect(getInformationDashboardReturnRoute(
      { role: "dashboard_viewer" }, ["information_dashboard.view"], ["/information-dashboard"]
    )).toBeNull();
  });

  it("skips blocked pages, including the administrative dashboard and revoked sections", () => {
    const user = { role: "field_team", customRole: { id: "dashboard_viewer" } };
    expect(getInformationDashboardReturnRoute(
      user, ["information_dashboard.view", "mosques"], ["/dashboard", "/requests", "/information-dashboard", "/mosques"]
    )).toBe("/mosques");
    expect(getInformationDashboardReturnRoute(user, ["information_dashboard.view"], ["/requests"])).toBeNull();
  });

  it("preserves the administrative return destination for other roles", () => {
    expect(getInformationDashboardReturnRoute({ role: "system_admin" }, ["*"], [])).toBe("/dashboard");
  });
  it.each([
    { role: "dashboard_viewer" },
    { role: "service_requester", customRole: { id: "dashboard_viewer" } },
    { role: "field_team", customRole: { id: "custom-123", nameAr: "مستخدم لوحة المعلومات" } },
    { role: "field_team", customRole: { id: "custom-123", nameEn: "Dashboard Viewer" } },
  ])("restricts the viewer whether it is a base or assigned role: %j", (user) => {
    expect(isDashboardViewerUser(user)).toBe(true);
    expect(getUserHomeRoute(user)).toBe("/information-dashboard");
    const role = isDashboardViewerUser(user) ? "dashboard_viewer" : user.role;
    expect(hasRouteAccess("/dashboard", role, ["*"], true)).toBe(false);
  });

  it("does not classify staff with information dashboard permission as viewers", () => {
    expect(isDashboardViewerUser({ role: "system_admin" })).toBe(false);
    expect(isDashboardViewerUser({ role: "financial", customRole: { nameAr: "الإدارة المالية" } })).toBe(false);
  });
  it("uses the information dashboard as its home and blocks the administrative dashboard", () => {
    const permissions = ["information_dashboard.view", "dashboard", "*"];
    expect(getUserHomeRoute({ role: "dashboard_viewer", permissions })).toBe("/information-dashboard");
    expect(hasRouteAccess("/dashboard", "dashboard_viewer", permissions, false)).toBe(false);
    expect(hasRouteAccess("/dashboard/", "dashboard_viewer", permissions, false)).toBe(false);
    expect(hasRouteAccess("/information-dashboard", "dashboard_viewer", permissions, false)).toBe(true);
  });

  it("preserves administrative dashboard access for other staff", () => {
    expect(hasRouteAccess("/dashboard", "system_admin", ["*"], false)).toBe(true);
    expect(hasRouteAccess("/dashboard", "financial", [], false)).toBe(true);
  });
});
