import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ role: "field_team", permissions: [] as string[], activeCustody: false, queries: [] as { path: string; input: any; enabled: boolean }[] }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, name: "Tester", role: state.role } }) }));
vi.mock("@/hooks/usePermission", () => ({ usePermission: (p: string) => state.permissions.includes(p) }));
vi.mock("wouter", () => ({ useLocation: () => ["/custody-requests", vi.fn()], Link: ({ children }: any) => children }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/EnhancedPagination", () => ({ default: () => null, usePersistedPage: () => [1, vi.fn(), vi.fn()] }));
vi.mock("@/components/ui/dialog", async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  const wrapper = ({ children }: any) => children;
  return { ...actual, Dialog: ({ open, children }: any) => open ? children : null, DialogContent: wrapper, DialogDescription: wrapper, DialogFooter: wrapper, DialogHeader: wrapper, DialogTitle: wrapper };
});
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, { get: (_target, name: string) => {
      if (name === "useQuery") return (input: any, options: any = {}) => {
        const key = path.join(".");
        const enabled = options.enabled !== false;
        state.queries.push({ path: key, input, enabled });
        const fixture: Record<string, any> = {
          "custody.getAll": { items: [], total: 0, totalPages: 1 },
          "custody.getStats": {},
          "custody.getPendingActionCounts": {},
          "custody.getExceptions": { items: [], total: 0, counts: {}, totalPages: 1 },
          "custody.checkActiveCustody": { hasActiveCustody: state.activeCustody, activeCustody: state.activeCustody ? { id: 1, requestNumber: "CR-1", title: "Existing custody", amount: "100" } : null, hasPendingException: false, hasApprovedException: false, hasRejectedException: false },
        };
        return { data: enabled ? fixture[key] : undefined, isLoading: false, isFetching: false, refetch: vi.fn() };
      };
      if (name === "useMutation") return () => ({ mutate: vi.fn(), isPending: false });
      if (name === "useUtils") return () => proxy();
      return proxy([...path, name]);
    } });
  }
  return { trpc: proxy() };
});

import CustodyRequests from "../client/src/pages/CustodyRequests";
import NewCustodyRequest from "../client/src/pages/NewCustodyRequest";
import CustodyExceptionRequestDialog from "../client/src/components/CustodyExceptionRequestDialog";

function buttons(html: string): string[] {
  return Array.from(html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)).map(match => match[1].replace(/<[^>]*>/g, "").trim());
}
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.role = "field_team";
  state.permissions = [];
  state.activeCustody = false;
  state.queries = [];
});

describe("custody permission controls", () => {
  it.each(["super_admin", "system_admin", "executive_director", "general_manager"])("shows staff requests and exceptions without personal controls for %s", role => {
    state.role = role;
    const controls = buttons(renderToStaticMarkup(<CustodyRequests />));
    expect(controls.some(t => t.startsWith("طلبات الموظفين"))).toBe(true);
    expect(controls.some(t => t.startsWith("طلبات الاستثناء"))).toBe(true);
    expect(controls.some(t => t.startsWith("طلباتي"))).toBe(false);
    expect(controls).not.toContain("طلب صرف عهدة مالية جديدة");
    expect(controls).not.toContain("طلب استثناء");
    expect(state.queries.find(q => q.path === "custody.getAll")).toMatchObject({ enabled: true, input: { scope: "staff" } });
    expect(state.queries.find(q => q.path === "custody.getExceptions")).toMatchObject({ enabled: true, input: { scope: "staff" } });
  });
  it("shows My requests and the new request button with create alone", () => {
    state.permissions = ["custody_requests.create"];
    const controls = buttons(renderToStaticMarkup(<CustodyRequests />));
    expect(controls.some(t => t.startsWith("طلباتي"))).toBe(true);
    expect(controls).toContain("طلب صرف عهدة مالية جديدة");
    expect(controls.some(t => t.startsWith("طلبات الموظفين"))).toBe(false);
    expect(controls.some(t => t.startsWith("طلبات الاستثناء"))).toBe(false);
  });
  it("shows exceptions and their request action without create or view", () => {
    state.permissions = ["custody_requests.request_exception"];
    const controls = buttons(renderToStaticMarkup(<CustodyRequests />));
    expect(controls.some(t => t.startsWith("طلبات الاستثناء"))).toBe(true);
    expect(controls).toContain("طلب استثناء");
    expect(controls.some(t => t.startsWith("طلباتي"))).toBe(false);
    expect(controls).not.toContain("طلب صرف عهدة مالية جديدة");
    expect(state.queries.find(q => q.path === "custody.getAll")?.enabled).toBe(false);
    expect(state.queries.find(q => q.path === "custody.getExceptions")?.input.scope).toBe("my");
  });
  it.each(["super_admin", "executive_director"])("adds personal requests only after assigning create to %s", role => {
    state.role = role;
    state.permissions = ["custody_requests.create"];
    const controls = buttons(renderToStaticMarkup(<CustodyRequests />));
    expect(controls.some(t => t.startsWith("طلبات الموظفين"))).toBe(true);
    expect(controls.some(t => t.startsWith("طلباتي"))).toBe(true);
    expect(controls).toContain("طلب صرف عهدة مالية جديدة");
    expect(controls).not.toContain("طلب استثناء");
  });
  it.each(["super_admin", "executive_director"])("blocks direct access to the creation form without create for %s", role => {
    state.role = role;
    const html = renderToStaticMarkup(<NewCustodyRequest />);
    expect(html).toContain("ليس لديك");
    expect(state.queries.find(q => q.path === "custody.checkActiveCustody")?.enabled).toBe(false);
  });
  it("gates the existing form exception action independently", () => {
    state.permissions = ["custody_requests.create"];
    state.activeCustody = true;
    expect(buttons(renderToStaticMarkup(<NewCustodyRequest />))).not.toContain("طلب استثناء");
    state.permissions.push("custody_requests.request_exception");
    expect(buttons(renderToStaticMarkup(<NewCustodyRequest />))).toContain("طلب استثناء");
  });
  it("allows the standalone exception dialog without custody creation", () => {
    state.permissions = ["custody_requests.request_exception"];
    state.activeCustody = true;
    const html = renderToStaticMarkup(<CustodyExceptionRequestDialog open onOpenChange={vi.fn()} />);
    expect(html).toContain("Existing custody");
    expect(buttons(html)).toContain("إرسال طلب الاستثناء");
    state.permissions = [];
    expect(renderToStaticMarkup(<CustodyExceptionRequestDialog open onOpenChange={vi.fn()} />)).toBe("");
  });
});
