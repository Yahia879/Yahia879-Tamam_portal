import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ permissions: [] as string[], role: "super_admin", queries: [] as { path: string; enabled: boolean }[] }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: state.role, permissions: ["*", "requests.view_details", "requests.create_quick_request", "sedana_requests.manage"] } }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/EnhancedPagination", () => ({ default: () => null, usePersistedPage: () => [1, vi.fn(), vi.fn()] }));
vi.mock("@/components/FileUpload", () => ({ FileUpload: () => null }));
vi.mock("wouter", () => ({ Link: ({ href, children }: any) => <a href={href}>{children}</a>, useLocation: () => ["/requests", vi.fn()], useSearch: () => "" }));
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, { get: (_target, name: string) => {
      if (name === "useQuery") return (_input: any, options: any = {}) => {
        const key = path.join("."); const enabled = options.enabled !== false;
        state.queries.push({ path: key, enabled });
        const data = key === "permissions.getUserPermissions" ? state.permissions : key === "requests.search" ? {
          requests: [
            { id: 1, programType: "bunyan", requestNumber: "GENERAL_ROW", descriptiveName: "General", status: "pending" },
            { id: 2, programType: "sedana", requestNumber: "SEDANA_ROW", descriptiveName: "Sedana", status: "pending" },
          ], total: 2,
        } : undefined;
        return { data: enabled ? data : undefined, isLoading: false, refetch: vi.fn() };
      };
      if (name === "useMutation") return () => ({ mutate: vi.fn(), isPending: false });
      if (name === "useUtils") return () => proxy();
      return proxy([...path, name]);
    } });
  }
  return { trpc: proxy() };
});
let Requests: typeof import("../client/src/pages/Requests").default;
beforeAll(async () => {
  vi.stubGlobal("React", React);
  Requests = (await import("../client/src/pages/Requests")).default;
});
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", { getItem: () => null });
  state.role = "super_admin"; state.permissions = []; state.queries = [];
});

describe.each(["super_admin", "system_admin", "quick_response", "custom_role_requests"])("request page controls for %s", role => {
  beforeEach(() => { state.role = role; });
  it.each([["requests.view", "GENERAL_ROW", "SEDANA_ROW"], ["sedana_requests.view", "SEDANA_ROW", "GENERAL_ROW"]])("only renders the list granted by %s without detail navigation", (permission, visible, hidden) => {
    state.permissions = [permission];
    const html = renderToStaticMarkup(<Requests />);
    expect(html).toContain(visible);
    expect(html).not.toContain(hidden);
    expect(html).not.toMatch(/href="\/requests\/[12]"/);
    expect(html).not.toContain("/requests/quick-create");
    expect(html).not.toContain("/service-request");
  });
  it.each([
    ["requests.create", "/service-request"], ["requests.create_quick_request", "/requests/quick-create"],
    ["sedana_requests.manage", "/service-request?service=sedana"],
  ])("removes the %s button immediately when its live right is revoked", (permission, href) => {
    state.permissions = ["requests.view", "sedana_requests.view", permission];
    expect(renderToStaticMarkup(<Requests />)).toContain(`href="${href}"`);
    state.permissions = ["requests.view", "sedana_requests.view"];
    expect(renderToStaticMarkup(<Requests />)).not.toContain(`href="${href}"`);
  });
  it("keeps general and Sedana detail permissions separate", () => {
    state.permissions = ["requests.view", "sedana_requests.view", "requests.view_details"];
    let html = renderToStaticMarkup(<Requests />);
    expect(html).toContain('href="/requests/1"');
    expect(html).not.toContain('href="/requests/2"');
    state.permissions = ["requests.view", "sedana_requests.view", "sedana_requests.desk_review"];
    html = renderToStaticMarkup(<Requests />);
    expect(html).not.toContain('href="/requests/1"');
    expect(html).toContain('href="/requests/2"');
  });
  it("ignores stale session rights and wildcard after the current rights are removed", () => {
    state.permissions = ["*"];
    const html = renderToStaticMarkup(<Requests />);
    expect(html).not.toContain("GENERAL_ROW");
    expect(html).not.toContain("SEDANA_ROW");
    expect(html).not.toContain("/service-request");
    expect(html).not.toContain("/requests/quick-create");
    expect(state.queries.find(q => q.path === "requests.search")?.enabled).toBe(false);
  });
});
