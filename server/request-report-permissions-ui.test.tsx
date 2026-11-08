import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REQUEST_REPORT_TYPES, REQUEST_REPORT_VIEW_PERMISSIONS } from "../shared/requestReportPermissions";
import { REQUEST_MANAGEMENT_REQUIREMENTS } from "../shared/requestPermissions";

const state = vi.hoisted(() => ({
  permissions: [] as string[], reports: [] as any[],
  queries: [] as { path: string; input: any; enabled: boolean }[],
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "super_admin", permissions: ["*"] } }) }));
vi.mock("wouter", () => ({ Link: ({ href, children }: any) => <a href={href}>{children}</a>, useLocation: () => ["/pending-reports", vi.fn()] }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/EnhancedPagination", () => ({ default: () => null, usePersistedPage: () => [1, vi.fn(), vi.fn()] }));
vi.mock("@/components/ColoredDialog", () => ({ ColoredDialog: () => null }));
vi.mock("@/components/ui/dropdown-menu", () => {
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return { DropdownMenu: Wrapper, DropdownMenuContent: Wrapper, DropdownMenuItem: Wrapper, DropdownMenuTrigger: Wrapper };
});
vi.mock("@/components/ui/select", () => {
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return { Select: Wrapper, SelectContent: Wrapper, SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>, SelectTrigger: Wrapper, SelectValue: () => null };
});
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, { get: (_target, name: string) => {
      if (name === "useQuery") return (input: any, options: any = {}) => {
        const key = path.join(".");
        const enabled = options.enabled !== false;
        state.queries.push({ path: key, input, enabled });
        const data = key === "permissions.getUserPermissions" ? state.permissions : key === "requests.getPendingReports" ? { reports: state.reports, total: state.reports.length, stats: { totalCount: state.reports.length } } : undefined;
        return { data: enabled ? data : undefined, isLoading: false };
      };
      return proxy([...path, name]);
    } });
  }
  return { trpc: proxy() };
});
import PendingReports from "../client/src/pages/PendingReports";

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.permissions = ["pending_reports.view_field_visit"];
  state.queries = [];
  state.reports = REQUEST_REPORT_TYPES.map((reportType, index) => ({
    id: index + 1, requestNumber: `ROW-${reportType}`, mosqueName: `Mosque-${reportType}`, mosqueCity: "City",
    reportType, reportId: index + 10, isCompleted: true, isLate: false,
    dueDate: "2026-11-08", actionUrl: reportType === "final_report" ? `/final-report/new?requestId=${index + 1}` : `/requests/${index + 1}/${reportType === "field_visit" ? "field-inspection" : "quick-response"}`,
  }));
});

describe("request report page permissions", () => {
  it.each(REQUEST_REPORT_TYPES)("shows only %s with report-view actions in desktop and mobile layouts", type => {
    state.permissions = [`pending_reports.view_${type}`];
    const html = renderToStaticMarkup(<PendingReports />);
    expect(html).toContain("الإجراءات");
    expect(html.match(/عرض التقرير/g)).toHaveLength(2);
    expect(html).toContain(`ROW-${type}`);
    for (const other of REQUEST_REPORT_TYPES.filter(t => t !== type)) {
      expect(html).not.toContain(`ROW-${other}`);
      expect(html).not.toContain(`value="${other}"`);
    }
    expect(html).not.toContain("التدخل ورفع التقرير");
    expect(html).not.toContain("التدخل وتعديل التقرير");
    expect(state.queries.find(q => q.path === "requests.getPendingReports")?.input.types).toEqual([type]);
  });

  it("combines only the report types granted to the user", () => {
    state.permissions = ["pending_reports.view_field_visit", "pending_reports.view_final_report"];
    const html = renderToStaticMarkup(<PendingReports />);
    expect(html).toContain("ROW-field_visit");
    expect(html).toContain("ROW-final_report");
    expect(html).not.toContain("ROW-quick_request");
    expect(html).not.toContain("ROW-quick_response");
    expect(html.match(/عرض التقرير/g)).toHaveLength(4);
  });

  it.each(REQUEST_REPORT_TYPES)("shows intervention only for the granted %s type", type => {
    state.permissions = [...REQUEST_REPORT_VIEW_PERMISSIONS, `pending_reports.intervene_${type}`, ...REQUEST_MANAGEMENT_REQUIREMENTS];
    state.reports.forEach(report => {
      report.isCompleted = report.reportType === "quick_request";
      report.isLate = !report.isCompleted;
    });
    const html = renderToStaticMarkup(<PendingReports />);
    expect(html.match(/التدخل و(رفع|تعديل) التقرير/g)).toHaveLength(2);
    expect(html.match(new RegExp(`intervene=${type}`, "g"))).toHaveLength(2);
    for (const other of REQUEST_REPORT_TYPES.filter(t => t !== type)) expect(html).not.toContain(`intervene=${other}`);
    state.permissions = [...REQUEST_REPORT_VIEW_PERMISSIONS];
    expect(renderToStaticMarkup(<PendingReports />)).not.toContain("intervene=");
  });

  it.each(["*", "pending_reports", "pending_reports.view", "pending_reports.intervene", "pending_reports.intervene_field_visit"])("does not grant list access through %s, including for super_admin", permission => {
    state.permissions = [permission];
    const html = renderToStaticMarkup(<PendingReports />);
    expect(html).toContain("غير مصرح بالدخول");
    expect(html).not.toContain("ROW-");
    expect(state.queries.find(q => q.path === "requests.getPendingReports")?.enabled).toBe(false);
  });
});
