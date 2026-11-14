import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BOARD_ANALYTICS_PERMISSIONS as permissions } from "../shared/boardAnalyticsPermissions";

const state = vi.hoisted(() => ({ permissions: [] as string[], role: "super_admin", location: "/board-analytics", queries: [] as any[] }));
vi.mock("wouter", () => ({ useLocation: () => [state.location, vi.fn()] }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/EnhancedPagination", () => ({ default: () => null, usePersistedPage: () => [1, vi.fn(), vi.fn()] }));
vi.mock("@/components/DisbursementOrderNotesDialog", () => ({ DisbursementOrderNotesDialog: () => null }));
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ value, children }: any) => <div data-active-tab={value}>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ value, children }: any) => <button data-tab={value}>{children}</button>,
  TabsContent: ({ value, children }: any) => <section data-tab-content={value}>{children}</section>,
}));
vi.mock("@/lib/trpc", () => {
  const section = new Proxy({}, { get: (_target, name: string) => /^(by|top)|Timeline|Flow/.test(name) ? [] : 0 });
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, { get: (_target, name: string) => {
      if (name === "useQuery") return (_input: any, options: any = {}) => {
        const key = path.join("."); state.queries.push({ key, enabled: options.enabled !== false });
        return { data: key === "auth.me" ? { id: 1, role: state.role }
          : key === "permissions.getUserPermissions" ? state.permissions
          : key === "board.getExecutiveStats" ? { isChairman: false, mosques: section, requests: section, procurement: section, financials: section } : undefined,
          isLoading: false, refetch: vi.fn() };
      };
      if (name === "useMutation") return () => ({ mutate: vi.fn(), isPending: false });
      if (name === "useUtils") return () => proxy();
      return proxy([...path, name]);
    } });
  }
  return { trpc: proxy() };
});

import BoardDashboard from "../client/src/pages/BoardDashboard";
beforeEach(() => { vi.stubGlobal("React", React); state.permissions = []; state.role = "super_admin"; state.location = "/board-analytics"; state.queries = []; });

describe.each(["super_admin", "system_admin", "board_member", "custom_role_test"])("board analytics tab controls for %s", role => {
  beforeEach(() => { state.role = role; });
  it.each(permissions)("renders only $nameAr and selects it when the default tab is unauthorized", permission => {
    state.permissions = ["*", "board_member", permission.id];
    const html = renderToStaticMarkup(<BoardDashboard />);
    expect(html).toContain(`data-active-tab="${permission.action}"`);
    for (const candidate of permissions) {
      expect(html.includes(`data-tab="${candidate.action}"`)).toBe(candidate.id === permission.id);
      expect(html.includes(`data-tab-content="${candidate.action}"`)).toBe(candidate.id === permission.id);
    }
  });
  it("hides revoked tabs and denies access when no tab is assigned", () => {
    state.permissions = ["*", "board_member"];
    const html = renderToStaticMarkup(<BoardDashboard />);
    expect(html).toContain("غير مصرح لك بالوصول");
    expect(html).not.toContain("data-tab-content");
    expect(state.queries.find(query => query.key === "board.getExecutiveStats").enabled).toBe(false);
  });
});

it("preserves embedded information dashboard charts under their own section permissions", () => {
  state.permissions = ["information_dashboard.procurement"];
  const html = renderToStaticMarkup(<BoardDashboard embedded forceAnalytics initialTab="procurement" hideTabs hideCards />);
  expect(html).toContain('data-active-tab="procurement"');
  expect(html).toContain('data-tab-content="procurement"');
  expect(html).not.toContain("غير مصرح لك بالوصول");
});
