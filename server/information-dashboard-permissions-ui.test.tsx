import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { INFORMATION_DASHBOARD_PERMISSION_IDS as ids, informationDashboardTabs } from "../shared/informationDashboardPermissions";

const state = vi.hoisted(() => ({ permissions: [] as string[], search: "", role: "super_admin" }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: state.role, permissions: ["*"] }, logout: vi.fn() }) }));
vi.mock("wouter", () => ({ Link: ({ children }: any) => children, useLocation: () => ["/information-dashboard", vi.fn()] }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children, getMenuGroupsFromPermissions: () => [] }));
vi.mock("@/pages/Reports", () => ({ default: () => <div data-report="requests" /> }));
vi.mock("@/pages/FinancialReport", () => ({ default: () => <div data-report="financial" /> }));
vi.mock("@/pages/BoardDashboard", () => ({ default: ({ initialTab }: any) => <div data-report={initialTab} /> }));
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, { get: (_target, name: string) => {
      if (name === "useQuery") return () => ({ data: path.join(".") === "permissions.getUserPermissions"
        ? state.permissions : path.join(".") === "forms.getDetailedDashboardCustomizationConfig"
        ? { allowedTabIds: informationDashboardTabs(state.permissions), elements: [], enabledElementIds: [], isCustomized: false } : undefined, isLoading: false });
      if (name === "useMutation") return () => ({ mutate: vi.fn(), isPending: false });
      if (name === "useUtils") return () => proxy();
      return proxy([...path, name]);
    } });
  }
  return { trpc: proxy() };
});

import InformationDashboard from "../client/src/pages/InformationDashboard";
import FormsCustomizationDashboard from "../client/src/pages/FormsCustomizationDashboard";

const tabs = ["الشاشة الرقمية", "المساجد والتغطية", "الطلبات والبرامج", "المشاريع والعقود", "المالية والصرف"];
function tabLabels(html: string) {
  return Array.from(html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g))
    .flatMap(match => [...tabs, "عرض شامل"].filter(label => match[1].includes(`<span>${label}</span>`)));
}
beforeEach(() => {
  state.permissions = ["*", ids[0]]; state.search = ""; state.role = "super_admin";
  vi.stubGlobal("window", { location: { search: state.search } });
});

describe.each([InformationDashboard, FormsCustomizationDashboard])("dashboard tab controls in $name", Component => {
  it.each(ids)("shows only the tab assigned by %s", permission => {
    state.permissions = ["*", "information_dashboard", permission];
    expect(tabLabels(renderToStaticMarkup(<Component />))).toEqual([tabs[ids.indexOf(permission)]]);
  });
  it("withholds comprehensive view with two or four grants and shows it with all five", () => {
    for (const count of [2, 4, 5]) {
      state.permissions = ["*", ...ids.slice(0, count)];
      expect(tabLabels(renderToStaticMarkup(<Component />)).includes("عرض شامل")).toBe(count === 5);
    }
  });
});

describe("dashboard content boundaries", () => {
  it("does not render an unassigned URL tab or a comprehensive view before effects run", () => {
    vi.stubGlobal("window", { location: { search: "?tab=financial" } });
    state.permissions = [ids[1]];
    const html = renderToStaticMarkup(<InformationDashboard />);
    expect(html).toContain('id="section-mosques"');
    for (const id of ["section-financial", "section-requests", "section-procurement", "section-digital-screen"]) expect(html).not.toContain(`id="${id}"`);
  });
  it("denies access after every tab is removed from super admin", () => {
    state.permissions = ["*"];
    expect(renderToStaticMarkup(<InformationDashboard />)).toContain("غير مصرح لك بالوصول");
  });
});
