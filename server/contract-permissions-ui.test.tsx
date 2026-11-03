import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  permissions: [] as string[],
  search: "",
  data: {} as Record<string, any>,
  queries: [] as { path: string; enabled: boolean }[],
}));

vi.mock("@/hooks/usePermission", () => ({ usePermission: (p: string) => state.permissions.includes(p) }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "super_admin" } }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/contracts", vi.fn()], useSearch: () => state.search, useParams: () => ({ id: "17" }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/EnhancedPagination", () => ({ default: () => null, usePersistedPage: () => [1, vi.fn(), vi.fn()] }));
vi.mock("@/components/ProjectSearchSelect", () => ({ normalizeArabic: (text: string) => text.toLowerCase() }));
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, {
      get: (_target, name: string) => {
        if (name === "useQuery") return (_input: any, options: any = {}) => {
          const key = path.join(".");
          const enabled = options.enabled !== false;
          state.queries.push({ path: key, enabled });
          return { data: enabled ? state.data[key] : undefined, isLoading: false, refetch: vi.fn() };
        };
        if (name === "useMutation") return () => ({ mutate: vi.fn(), isPending: false });
        if (name === "useUtils") return () => proxy();
        return proxy([...path, name]);
      },
    });
  }
  return { trpc: proxy() };
});

import ContractsList from "../client/src/pages/ContractsList";
import ContractPreview from "../client/src/pages/ContractPreview";
import ContractPrint from "../client/src/pages/ContractPrint";

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.permissions = ["contracts.view"];
  state.search = "";
  state.queries = [];
  const contracts = ["draft", "pending_approval", "approved"].map((status, index) => ({
    id: index + 1, status, contractTitle: `Contract ${status}`, contractNumber: `C-${index}`,
    contractType: "supply", secondPartyName: "Supplier", contractAmount: "100", duration: 1,
    contractDate: "2026-11-03", approvedAt: status === "approved" ? "2026-11-03" : null,
  }));
  state.data = {
    "contracts.list": { contracts, total: 3 },
    "contracts.getTemplates": [{ id: 1, nameAr: "Test template", type: "supply" }],
    "contracts.getById": { contract: contracts[0], payments: [], clauseValues: [], organizationSettings: {} },
  };
});

describe("contract page controls", () => {
  it("shows every contract with a view button and hides create/edit/template controls for view-only access", () => {
    const html = renderToStaticMarkup(<ContractsList />);
    expect(html).toContain("العقود المبرمة");
    expect(html).not.toContain("قوالب العقود</button>");
    expect(html.match(/>عرض<\/button>/g)).toHaveLength(3);
    expect(html).not.toContain("إنشاء عقد جديد");
    expect(html).not.toContain("تعديل العقد المعتمد");
    expect(state.queries.find(q => q.path === "contracts.getTemplates")?.enabled).toBe(false);
  });

  it("opens only the templates tab for template-only access", () => {
    state.permissions = ["contracts.template_view"];
    const html = renderToStaticMarkup(<ContractsList />);
    expect(html).toContain("Test template");
    expect(html).not.toContain("العقود المبرمة</button>");
    expect(html).not.toContain("إضافة قالب جديد");
    expect(state.queries.filter(q => q.path === "contracts.list").every(q => !q.enabled)).toBe(true);
  });

  it("does not expose edit buttons merely because approval is granted", () => {
    state.permissions.push("contracts.approve");
    const html = renderToStaticMarkup(<ContractsList />);
    expect(html).not.toContain("تعديل العقد المعتمد");
    expect(html.match(/>تعديل<\/button>/g) ?? []).toHaveLength(0);
  });

  it("edits only unapproved contracts with the ordinary edit permission", () => {
    state.permissions.push("contracts.edit");
    const html = renderToStaticMarkup(<ContractsList />);
    expect(html.match(/>تعديل<\/button>/g)).toHaveLength(2);
    expect(html).not.toContain("تعديل العقد المعتمد");
  });

  it("edits only approved contracts with the approved-edit permission", () => {
    state.permissions.push("contracts.edit_approved");
    const html = renderToStaticMarkup(<ContractsList />);
    expect(html).toContain("تعديل العقد المعتمد");
    expect(html.match(/>تعديل<\/button>/g) ?? []).toHaveLength(0);
  });

  it("shows the create button only with create permission", () => {
    state.permissions.push("contracts.create");
    expect(renderToStaticMarkup(<ContractsList />)).toContain("إنشاء عقد جديد");
  });

  it("keeps preview read-only until approval, editing, or printing is granted", () => {
    let html = renderToStaticMarkup(<ContractPreview />);
    expect(html).not.toContain("اعتماد العقد</button>");
    expect(html).not.toContain("طباعة العقد</button>");
    expect(html).not.toContain("تعديل بيانات العقد</button>");
    state.permissions.push("contracts.approve", "contracts.export");
    html = renderToStaticMarkup(<ContractPreview />);
    expect(html).toContain("اعتماد العقد</button>");
    expect(html).toContain("طباعة العقد</button>");
  });

  it("blocks the print page without export permission", () => {
    expect(renderToStaticMarkup(<ContractPrint />)).not.toContain("رجوع للمعاينة");
    state.permissions.push("contracts.export");
    expect(renderToStaticMarkup(<ContractPrint />)).toContain("رجوع للمعاينة");
  });
});
