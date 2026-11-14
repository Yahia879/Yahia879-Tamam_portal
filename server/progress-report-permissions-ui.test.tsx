import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ permissions: [] as string[], role: "super_admin", managerId: 1, status: "pending", search: "", queries: [] as any[] }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: state.role, permissions: ["*"] } }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/progress-reports", vi.fn()] }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/EnhancedPagination", () => ({ default: () => null, usePersistedPage: () => [1, vi.fn(), vi.fn()] }));
vi.mock("@/components/ProjectSearchSelect", () => ({ ProjectSearchSelect: () => null }));
vi.mock("@/components/ui/dropdown-menu", () => {
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return { DropdownMenu: Wrapper, DropdownMenuTrigger: Wrapper, DropdownMenuContent: Wrapper, DropdownMenuItem: Wrapper };
});
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, { get: (_target, name: string) => {
      if (name === "useQuery") return (_input: any, options: any = {}) => {
        const key = path.join("."); state.queries.push({ key, enabled: options.enabled !== false });
        return { data: key === "permissions.getUserPermissions" ? state.permissions : key === "progressReports.list"
          ? [{ id: 33, projectId: 17, reportNumber: "RPT-2026-001", title: "تقرير إنجاز أول", workSummary: "تفاصيل الأعمال", reportDate: "2026-11-15", status: state.status, projectManagerId: state.managerId, overallProgress: 25 }]
          : undefined, isLoading: false, refetch: vi.fn() };
      };
      if (name === "useMutation") return () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
      if (name === "useUtils") return () => proxy();
      return proxy([...path, name]);
    } });
  }
  return { trpc: proxy() };
});

let ProgressReports: React.ComponentType;
beforeAll(async () => {
  vi.stubGlobal("React", React);
  ProgressReports = (await import("../client/src/pages/ProgressReports")).default;
});
const render = () => renderToStaticMarkup(<ProgressReports />);
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.permissions = ["progress_reports.view"]; state.role = "super_admin"; state.managerId = 1; state.status = "pending"; state.search = ""; state.queries = [];
  vi.stubGlobal("window", { location: { pathname: "/progress-reports", search: state.search } });
});

describe.each(["super_admin", "system_admin", "project_manager", "custom_role_test"])("report page controls for %s", role => {
  beforeEach(() => { state.role = role; });
  it("shows reports without the actions column or any modification buttons for view-only access", () => {
    const html = render();
    expect(html).toContain("RPT-2026-001");
    for (const label of ["الإجراءات", "إضافة تقرير إنجاز", "تعديل تقرير الإنجاز", "<span>اعتماد تقرير الإنجاز</span>", "<span>رفض تقرير الإنجاز</span>", "<span>إلغاء الاعتماد</span>"]) expect(html).not.toContain(label);
  });
  it("offers the add button independently of the actions column", () => {
    state.permissions.push("progress_reports.add");
    expect(render()).toContain("إضافة تقرير إنجاز");
    expect(render()).not.toContain("الإجراءات");
  });
  it("offers only editing when editing is assigned and hides it after revocation", () => {
    state.permissions.push("progress_reports.edit");
    expect(render()).toContain("الإجراءات");
    expect(render()).toContain("<span>تعديل تقرير الإنجاز</span>");
    expect(render()).not.toContain("<span>اعتماد تقرير الإنجاز</span>");
    state.permissions = ["progress_reports.view", "*"];
    expect(render()).not.toContain("الإجراءات");
  });
  it("offers approve and reject only to the assigned project manager", () => {
    state.permissions.push("progress_reports.approve");
    expect(render()).toContain("<span>اعتماد تقرير الإنجاز</span>");
    expect(render()).toContain("<span>رفض تقرير الإنجاز</span>");
    state.managerId = 2;
    expect(render()).not.toContain("<span>اعتماد تقرير الإنجاز</span>");
    expect(render()).not.toContain("<span>رفض تقرير الإنجاز</span>");
  });
  it("offers revocation only on an approved report with its dedicated permission", () => {
    state.status = "approved";
    expect(render()).not.toContain("الإجراءات");
    state.permissions.push("progress_reports.revoke_approval");
    expect(render()).toContain("الإجراءات");
    expect(render()).toContain("<span>إلغاء الاعتماد</span>");
    expect(render()).not.toContain("تحويل إلى طلب صرف");
  });
  it("offers an exception only with its own grant, before executive approval and for a different manager", () => {
    state.managerId = 2; state.permissions.push("progress_reports.exception_approve");
    expect(render()).toContain("<span>استثناء اعتماد مدير المشروع</span>");
    state.status = "pending_executive";
    expect(render()).not.toContain("<span>استثناء اعتماد مدير المشروع</span>");
    state.status = "pending"; state.managerId = 1;
    expect(render()).not.toContain("<span>استثناء اعتماد مدير المشروع</span>");
  });
  it("offers the revoked reason action independently and hides it again after revocation", () => {
    state.status = "revoked";
    expect(render()).not.toContain("الإجراءات");
    state.permissions.push("progress_reports.view_revoke_reason");
    expect(render()).toContain("الإجراءات");
    expect(render()).toContain("<span>عرض سبب إلغاء الاعتماد</span>");
    expect(render()).not.toContain("<span>إلغاء الاعتماد</span>");
    state.permissions = ["*", "progress_reports.view"];
    expect(render()).not.toContain("الإجراءات");
    expect(render()).not.toContain("<span>عرض سبب إلغاء الاعتماد</span>");
  });
});

it("keeps final approval with the executive director and removes its controls when approval permission is revoked", () => {
  state.role = "executive_director"; state.managerId = 2; state.status = "pending_executive";
  state.permissions.push("progress_reports.approve");
  expect(render()).toContain("<span>اعتماد تقرير الإنجاز</span>");
  expect(render()).toContain("<span>رفض تقرير الإنجاز</span>");
  state.permissions = ["progress_reports.view", "progress_invoices.approve", "*"];
  expect(render()).not.toContain("الإجراءات");
});
it("does not substitute report permissions for report actions", () => {
  state.permissions.push("*", "progress_invoices.add", "progress_invoices.edit", "progress_invoices.approve", "progress_invoices.exception_approve", "progress_invoices.revoke_approval");
  expect(render()).not.toContain("الإجراءات");
  expect(render()).not.toContain("إضافة تقرير إنجاز");
});
it("denies report access when view is removed even for super admin", () => {
  state.permissions = ["*", "progress_invoices.view"];
  expect(render()).not.toContain("RPT-2026-001");
  expect(render()).toContain("غير مصرح لك بالوصول");
  expect(state.queries.filter(query => query.key === "progressReports.list").every(query => !query.enabled)).toBe(true);
});
