import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GENERAL_QUOTATION_PERMISSION_IDS } from "../shared/quotationPermissions";

const state = vi.hoisted(() => ({
  permissions: [] as string[], program: "enaya", search: "?requestId=17",
  queries: [] as { path: string; input: any; enabled: boolean }[],
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "super_admin" } }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/quotations", vi.fn()] }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/BoqFormDialog", () => ({ default: () => null }));
vi.mock("@/components/sedana/SedanaExportPdfModal", () => ({ SedanaExportPdfModal: () => null }));
vi.mock("jspdf", () => ({ jsPDF: vi.fn() }));
vi.mock("jspdf-autotable", () => ({}));
vi.mock("exceljs", () => ({ default: {} }));
vi.mock("xlsx", () => ({}));
vi.mock("@/lib/trpc", () => {
  const selectedRequest = () => ({ id: 17, requestNumber: "REQ-17", mosqueName: "Selected fixture", programType: state.program, currentStage: "financial_eval_and_approval", createdAt: "2026-11-03" });
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, { get: (_target, name: string) => {
      if (name === "useQuery") return (input: any, options: any = {}) => {
        const key = path.join(".");
        const enabled = options.enabled !== false;
        state.queries.push({ path: key, input, enabled });
        const fixture: Record<string, any> = {
          "permissions.getUserPermissions": state.permissions,
          "requests.search": { requests: [selectedRequest(), { id: 19, programType: state.program === "sedana" ? "enaya" : "sedana", requestNumber: "REQ-19", mosqueName: "Other program fixture", currentStage: "financial_eval_and_approval", createdAt: "2026-11-03" }] },
          "requests.getById": selectedRequest(),
          "suppliers.getActiveSuppliers": [{ id: 1, name: "Supplier" }],
          "projects.getBOQ": { items: [{ id: 1, itemName: "Fixture item", unit: "m", quantity: "1", unitPrice: "100", totalPrice: "100" }] },
          "projects.getQuotationsByRequest": { quotations: [{ id: 1, supplierId: 1, supplierName: "Supplier", quotationNumber: "Q-1", status: "pending", totalAmount: "100", finalAmount: "100", validUntil: "2099-01-01", createdAt: "2026-11-03", items: [{ boqItemId: 1, itemName: "Fixture item", quantity: 1, unit: "m", unitPrice: 100, totalPrice: 100 }] }] },
        };
        return { data: enabled ? fixture[key] : undefined, isLoading: false, refetch: vi.fn() };
      };
      if (name === "useMutation") return () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
      if (name === "useUtils") return () => proxy();
      return proxy([...path, name]);
    } });
  }
  return { trpc: proxy() };
});

import Quotations from "../client/src/pages/Quotations";

function visibleControls(html: string): string[] {
  return Array.from(html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g))
    .filter(match => !/\bhidden(?:=|\s|$)/.test(match[1]))
    .map(match => (match[1].match(/title="([^"]+)"/)?.[1] ?? match[2].replace(/<[^>]*>/g, "")).trim());
}

const actions = ["إضافة عرض سعر للطلب المحدد", "اعتماد", "رفض", "تحميل قالب عروض الأسعار", "رفع قالب عروض الاسعار", "إضافة رابط", "إضافة بند جديد", "تعديل البند", "حذف البند"];

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.permissions = ["quotations.view"];
  state.program = "enaya";
  state.search = "?requestId=17";
  state.queries = [];
  vi.stubGlobal("window", { location: { search: state.search, pathname: "/quotations" } });
});

describe("quotation page permissions", () => {
  it("keeps general view-only access read-only, including for super_admin", () => {
    const html = renderToStaticMarkup(<Quotations />);
    expect(html).toContain("Q-1");
    for (const action of actions) expect(visibleControls(html)).not.toContain(action);
    expect(html).not.toContain("Other program fixture");
    expect(state.queries.find(q => q.path === "requests.search")?.input.quotationsView).toBe(true);
    expect(state.queries.find(q => q.path === "projects.getQuotationsByRequest")?.input.permissionScope).toBe("quotations");
  });

  it.each([
    ["quotations.add", ["إضافة عرض سعر للطلب المحدد"]],
    ["quotations.approve", ["اعتماد", "رفض"]],
    ["quotations.template_download", ["تحميل قالب عروض الأسعار"]],
    ["quotations.template_upload", ["رفع قالب عروض الاسعار"]],
    ["quotations.link_add", ["إضافة رابط"]],
    ["quotations.boq_add", ["إضافة بند جديد"]],
    ["quotations.boq_edit", ["تعديل البند"]],
    ["quotations.boq_delete", ["حذف البند"]],
  ] as const)("shows only its associated controls when granting %s", (permission, grantedActions) => {
    state.permissions.push(permission);
    const controls = visibleControls(renderToStaticMarkup(<Quotations />));
    for (const action of grantedActions) expect(controls).toContain(action);
    for (const action of actions.filter(a => !grantedActions.some(granted => granted === a))) expect(controls).not.toContain(action);
  });

  it.each(GENERAL_QUOTATION_PERMISSION_IDS.filter(p => p !== "quotations.view"))("removes an action when %s is revoked from super_admin", permission => {
    state.permissions = GENERAL_QUOTATION_PERMISSION_IDS.filter(p => p !== permission);
    const controls = visibleControls(renderToStaticMarkup(<Quotations />));
    const action: Record<string, string> = {
      "quotations.add": actions[0], "quotations.approve": actions[1], "quotations.template_download": actions[3],
      "quotations.template_upload": actions[4], "quotations.link_add": actions[5], "quotations.boq_add": actions[6],
      "quotations.boq_edit": actions[7], "quotations.boq_delete": actions[8],
    };
    expect(controls).not.toContain(action[permission]);
  });

  it("hides the page after removing both view permissions", () => {
    state.permissions = ["*"];
    const html = renderToStaticMarkup(<Quotations />);
    expect(html).not.toContain("Q-1");
    expect(state.queries.find(q => q.path === "requests.search")?.enabled).toBe(false);
  });

  it("opens Sedana offers with the existing Sedana permissions alone", () => {
    state.program = "sedana";
    state.permissions = ["sedana_quotations.view"];
    const html = renderToStaticMarkup(<Quotations />);
    expect(html).toContain("Selected fixture");
    expect(html).not.toContain("Other program fixture");
    expect(visibleControls(html)).not.toContain("إضافة عرض سعر للطلب المحدد");
  });

  it.each([
    ["sedana_quotations.export_pdf", "تصدير ملف PDF للبنود"],
    ["sedana_quotations.add", "إضافة عرض سعر"],
    ["sedana_quotations.approve", "اعتماد وترسية عروض الأسعار"],
  ])("uses the same Sedana action %s on the combined page", (permission, label) => {
    state.program = "sedana";
    state.permissions = ["sedana_quotations.view", permission];
    const controls = visibleControls(renderToStaticMarkup(<Quotations />));
    expect(controls.some(text => text.includes(label))).toBe(true);
    state.permissions = ["sedana_quotations.view"];
    expect(visibleControls(renderToStaticMarkup(<Quotations />)).some(text => text.includes(label))).toBe(false);
  });

  it("blocks a Sedana request opened by URL with general-only permissions", () => {
    state.program = "sedana";
    const html = renderToStaticMarkup(<Quotations />);
    expect(html).not.toContain("Q-1");
    expect(state.queries.find(q => q.path === "projects.getQuotationsByRequest")?.enabled).toBe(false);
  });
});
