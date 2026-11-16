import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ permissions: [] as string[], role: "super_admin", data: {} as Record<string, any>, queries: [] as any[] }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: state.role, permissions: ["*"] } }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/projects/323", vi.fn()], useParams: () => ({ id: "323" }), Link: ({ href, children }: any) => <a href={href}>{children}</a> }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/EnhancedPagination", () => ({ default: () => null, usePersistedPage: () => [1, vi.fn(), vi.fn()] }));
vi.mock("@/components/BoqTab", () => ({ default: () => null }));
vi.mock("@/components/ProjectProgressMilestonesTab", () => ({ default: () => null }));
vi.mock("@/components/ProjectFinancialsTab", () => ({ default: () => <div data-project-financials="" /> }));
vi.mock("@/components/ProjectChangeOrdersTab", () => ({ default: () => null }));
vi.mock("@/pages/PurchaseOrdersList", () => ({ PurchaseOrdersView: () => null }));
vi.mock("@/pages/CsrLettersList", () => ({ CsrLettersView: () => null }));
vi.mock("@/components/ProjectSearchSelect", () => ({ normalizeArabic: (value: string) => value, ProjectSearchSelect: () => null }));
vi.mock("@/components/ui/tabs", () => {
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return { Tabs: Wrapper, TabsList: Wrapper, TabsTrigger: ({ value, children }: any) => <button data-tab={value}>{children}</button>, TabsContent: Wrapper };
});
vi.mock("@/components/ui/dropdown-menu", () => {
  const Wrapper = ({ children }: any) => <div>{children}</div>;
  return { DropdownMenu: Wrapper, DropdownMenuTrigger: Wrapper, DropdownMenuContent: Wrapper, DropdownMenuItem: Wrapper };
});
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, { get: (_target, name: string) => {
      if (name === "useQuery") return (_input: any, options: any = {}) => {
        const key = path.join("."); state.queries.push({ key, enabled: options.enabled !== false });
        return { data: key === "permissions.getUserPermissions" ? state.permissions : state.data[key], isLoading: false, refetch: vi.fn() };
      };
      if (name === "useMutation") return () => ({ mutate: vi.fn(), isPending: false });
      if (name === "useUtils") return () => proxy();
      return proxy([...path, name]);
    } });
  }
  return { trpc: proxy() };
});

let Projects: React.ComponentType;
let Details: React.ComponentType;
let NewProject: React.ComponentType;
let Financials: React.ComponentType<{ projectId: number }>;
beforeAll(async () => {
  vi.stubGlobal("React", React);
  Projects = (await import("../client/src/pages/Projects")).default;
  Details = (await import("../client/src/pages/ProjectDetailsPage")).default;
  NewProject = (await import("../client/src/pages/NewMultiMosqueProjectPage")).default;
  Financials = (await vi.importActual<typeof import("../client/src/components/ProjectFinancialsTab")>("../client/src/components/ProjectFinancialsTab")).default;
});
beforeEach(() => {
  state.permissions = ["projects.view"]; state.role = "super_admin"; state.queries = [];
  const project = { id: 323, name: "مشروع تجريبي", projectNumber: "PRJ-323", status: "in_progress", budget: "1000", actualCost: "0", createdAt: "2026-11-15",
    completionPercentage: 20, requestId: null, programType: "bunyan", phases: [], contracts: [], payments: [], quotations: [{ status: "approved" }], linkedMosques: [] };
  state.data = {
    "projects.search": { projects: [project], total: 1 }, "projects.getById": project,
    "projects.getBOQ": { items: [] }, "projects.getFinancialData": { financialDetail: null, allQuotations: [], receiptVouchers: [], changeOrders: [], project },
  };
});

describe.each(["super_admin", "system_admin", "projects_office", "custom_role_test"])("project page controls for %s", role => {
  beforeEach(() => { state.role = role; });
  it("shows projects without the actions column, details link or create button with view alone", () => {
    const html = renderToStaticMarkup(<Projects />);
    expect(html).toContain("مشروع تجريبي");
    expect(html).not.toContain("الإجراءات");
    expect(html).not.toContain('href="/projects/323"');
    expect(html).not.toContain("إضافة مشروع متعدد المساجد");
  });
  it("shows the details action without exposing the financial section", () => {
    state.permissions.push("projects.view_details");
    expect(renderToStaticMarkup(<Projects />)).toContain("عرض تفاصيل المشروع");
    const html = renderToStaticMarkup(<Details />);
    expect(html).toContain("PRJ-323");
    expect(html).not.toContain('data-tab="financials"');
    expect(html).not.toContain("data-project-financials");
  });
  it("shows finances only with its explicit grant and removes the section after revocation", () => {
    state.permissions.push("projects.view_details", "projects.financials");
    expect(renderToStaticMarkup(<Details />)).toContain("data-project-financials");
    state.permissions = ["*", "projects.view", "projects.view_details", "projects.edit_support_and_fees", "projects.add_receipt_voucher"];
    expect(renderToStaticMarkup(<Details />)).not.toContain("data-project-financials");
  });
  it("shows creation only with its own grant and protects the bookmarked creation page", () => {
    expect(renderToStaticMarkup(<NewProject />)).toContain("غير مصرح لك");
    state.permissions.push("projects.create_multi_mosque");
    expect(renderToStaticMarkup(<Projects />)).toContain("إضافة مشروع متعدد المساجد");
    expect(renderToStaticMarkup(<NewProject />)).not.toContain("غير مصرح لك");
  });
  it("denies details after revocation even when the session contains a wildcard", () => {
    state.permissions.push("*");
    expect(renderToStaticMarkup(<Details />)).toContain("غير مصرح لك بعرض تفاصيل المشروع");
    expect(state.queries.find(query => query.key === "projects.getById").enabled).toBe(false);
  });
});

it("keeps financial viewing read-only without support editing and voucher creation grants", () => {
  state.permissions.push("projects.financials");
  const html = renderToStaticMarkup(<Financials projectId={323} />);
  expect(html).toContain("جهة الدعم والأجور الإدارية");
  expect(html).not.toContain("تعديل البيانات");
  expect(html).not.toContain("تسجيل سند قبض جديد");
});
it("grants support editing and voucher creation independently", () => {
  state.permissions.push("projects.financials", "projects.edit_support_and_fees");
  expect(renderToStaticMarkup(<Financials projectId={323} />)).toContain("تعديل البيانات");
  expect(renderToStaticMarkup(<Financials projectId={323} />)).not.toContain("تسجيل سند قبض جديد");
  state.permissions = ["projects.view", "projects.financials", "projects.add_receipt_voucher"];
  expect(renderToStaticMarkup(<Financials projectId={323} />)).toContain("تسجيل سند قبض جديد");
  expect(renderToStaticMarkup(<Financials projectId={323} />)).not.toContain("تعديل البيانات");
});

describe("clickable project name in projects list based on permissions", () => {
  it.each([
    ["view_details", "projects.view_details"],
    ["financials", "projects.financials"],
    ["edit_support_and_fees", "projects.edit_support_and_fees"],
    ["add_receipt_voucher", "projects.add_receipt_voucher"],
  ])("makes project name clickable when user has %s permission", (_label, permission) => {
    state.permissions = ["projects.view", permission];
    const html = renderToStaticMarkup(<Projects />);
    expect(html).toContain('href="/projects/323"');
    expect(html).toContain(">مشروع تجريبي</a>");
  });

  it("keeps project name as plain non-clickable text when user has view-only permission", () => {
    state.permissions = ["projects.view"];
    const html = renderToStaticMarkup(<Projects />);
    expect(html).not.toContain('href="/projects/323"');
    expect(html).toContain("مشروع تجريبي");
    expect(html).not.toContain(">مشروع تجريبي</a>");
  });

  it("displays clarification message for clicking on donor name in project financials", () => {
    state.permissions = ["projects.view", "projects.financials"];
    state.data["projects.getFinancialData"] = {
      financialDetail: {
        supportSourcesJson: JSON.stringify([{ entity: "داعم أول", amount: 1000 }]),
        supportAmount: 1000,
      },
      allQuotations: [],
      receiptVouchers: [],
      changeOrders: [],
      project: { id: 323, name: "مشروع تجريبي" },
    };
    const html = renderToStaticMarkup(<Financials projectId={323} />);
    expect(html).toContain("يجب الضغط على اسم الداعم لعرض كروت الدعم وسندات القبض الخاصة به فقط");
    expect(html).toContain("داعم أول");
    expect(html).toContain("إجمالي مبلغ الدعم المطلوب");
    expect(html).toContain("إجمالي المقبوض فعلياً (سندات القبض)");
    expect(html).toContain("المبلغ المتبقي للقبض");
    expect(html).toContain("لم يتم تحديد أي داعم حالياً. انقر على اسم الداعم المطلوب");
    // Ensure no cards or voucher tables are rendered by default before selecting a donor
    expect(html).not.toContain("كروت الدعم وسندات القبض للداعم:");
    expect(html).not.toContain("المقبوض فعلياً (المدفوع)");
  });
});
