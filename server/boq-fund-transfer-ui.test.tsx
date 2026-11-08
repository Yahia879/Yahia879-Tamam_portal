import React from "react";
import { Edit, Trash2 } from "lucide-react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ slots: [] as any[], cursor: 0, effects: [] as (() => void)[], dirty: false, data: {} as Record<string, any>, errors: [] as string[], navigation: [] as string[], mutations: [] as any[], userPermissions: ["projects.view_details", "projects.financials"] }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  const changed = (a?: any[], b?: any[]) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
  return { ...actual,
    useState: (initial: any) => {
      const index = state.cursor++;
      if (!state.slots[index]) state.slots[index] = { value: typeof initial === "function" ? initial() : initial };
      return [state.slots[index].value, (next: any) => {
        const value = typeof next === "function" ? next(state.slots[index].value) : next;
        if (!Object.is(value, state.slots[index].value)) state.dirty = true;
        state.slots[index].value = value;
      }];
    },
    useEffect: (effect: () => void, deps: any[]) => {
      const index = state.cursor++;
      if (changed(state.slots[index]?.deps, deps)) { state.slots[index] = { deps }; state.effects.push(effect); }
    },
    useMemo: (factory: () => any, deps: any[]) => {
      const index = state.cursor++;
      if (changed(state.slots[index]?.deps, deps)) state.slots[index] = { deps, value: factory() };
      return state.slots[index].value;
    },
    useRef: (initial: any) => {
      const index = state.cursor++;
      if (!state.slots[index]) state.slots[index] = { current: initial };
      return state.slots[index];
    },
    useImperativeHandle: () => {},
  };
});
vi.mock("wouter", () => ({ useLocation: () => ["/projects/19", (url: string) => state.navigation.push(url)], useParams: () => ({ id: "19" }), Link: ({ children }: any) => children }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "projects_office" } }) }));
vi.mock("@/hooks/usePermission", () => ({ usePermission: () => true, useUserPermissions: () => state.userPermissions }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: any) => children }));
vi.mock("@/components/BoqFormDialog", () => ({ default: () => null }));
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, { get: (_target, name: string) => {
      if (name === "useQuery") return (_input: any, options: any = {}) => ({ data: options.enabled === false ? undefined : state.data[path.join(".")], isLoading: false, isError: state.errors.includes(path.join(".")), refetch: vi.fn() });
      if (name === "useMutation") return () => ({ mutate: (input: any) => state.mutations.push({ path: path.join("."), input }), isPending: false });
      if (name === "useUtils") return () => proxy();
      return proxy([...path, name]);
    } });
  }
  return { trpc: proxy() };
});
let BoqTab: any, NewFundTransferPage: () => React.ReactNode, FundPage: () => React.ReactNode, NewLinkedRequest: () => React.ReactNode, ProjectDetailsPage: () => React.ReactNode;
beforeAll(async () => {
  vi.stubGlobal("React", React);
  BoqTab = (await import("../client/src/components/BoqTab")).default;
  NewFundTransferPage = (await import("../client/src/pages/NewFundTransferPage")).default;
  FundPage = (await import("../client/src/pages/FundPage")).default;
  NewLinkedRequest = (await import("../client/src/pages/NewLinkedDisbursementRequest")).default;
  ProjectDetailsPage = (await import("../client/src/pages/ProjectDetailsPage")).default;
});
beforeEach(() => {
  state.slots = []; state.cursor = 0; state.effects = []; state.dirty = false; state.errors = []; state.navigation = []; state.mutations = [];
  state.userPermissions = ["projects.view_details", "projects.financials"];
  vi.stubGlobal("window", { location: { search: "?projectId=19&source=surplus&context=change_orders&amount=1500" } });
  vi.stubGlobal("sessionStorage", { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
  state.data = {
    "projects.getById": { project: { id: 19 } },
    "categories.getAllCategories": [],
    "projects.getBOQ": { items: [
      { id: 1, projectId: 19, itemName: "Original item", quantity: "1", unitPrice: "100", totalPrice: "100", category: "other" },
      { id: 2, projectId: 19, itemName: "First change order", quantity: "1", totalPrice: "1000", isChangeOrder: true, changeOrderId: 1 },
      { id: 3, projectId: 19, itemName: "Second change order", quantity: "1", totalPrice: "500", isChangeOrder: true, changeOrderId: 2 },
    ], total: 1600 },
    "projectChangeOrders.list": { funding: { pendingTransfer: 500 } },
    "fund.transferableProjects": [{ id: 19, projectNumber: "PRJ-19", name: "Project", available: 9000, changeOrderAvailable: 500 }],
  };
});

describe("fund request controls", () => {
  function fundRequestStepTwo(unlinkedSpendable = 3500) {
    (window.location as any).search = "";
    state.data["permissions.getUserPermissions"] = ["disbursements.create_from_fund"];
    state.data["projects.getAll"] = [{ id: 19, name: "Project", projectNumber: "PRJ-19" }];
    state.data["fund.summary"] = { buckets: [{ restrictionType: "project", restrictedProjectId: 19, spendable: 5000, unlinkedSpendable, changeOrderReserved: 1500 }] };
    state.data["projectChangeOrders.list"] = { orders: [{ id: 1, projectId: 19, amount: "1500", orderNumber: "CO-1", title: "Extra work", status: "boq_approved", items: [] }] };
    let tree = render(NewLinkedRequest);
    elements(tree).find(el => el.props.onClick && text(el).includes("التالي"))!.props.onClick(); tree = render(NewLinkedRequest);
    elements(tree).find(el => el.props.onValueChange && text(el).includes("PRJ-19"))!.props.onValueChange("19");
    return render(NewLinkedRequest);
  }
  it("prefills the unallocated 3500 instead of the full 5000 and blocks a higher amount", () => {
    let tree = fundRequestStepTwo();
    expect(text(tree)).toContain("المخصص لأوامر التغيير غير المصروفة: 1,500.00");
    expect(text(tree)).toContain("المبلغ غير المخصص لأوامر التغيير: 3,500.00");
    const amount = elements(tree).find(el => el.props.type === "number" && el.props.value === 3500 && el.props.onChange)!;
    expect(amount).toBeDefined(); amount.props.onChange({ target: { value: "3500.01" } }); tree = render(NewLinkedRequest);
    expect(text(tree)).toContain("أكبر من المبلغ غير المخصص لأوامر التغيير");
    const next = elements(tree).find(el => el.props.onClick && text(el).includes("التالي"))!;
    next.props.onClick(); tree = render(NewLinkedRequest);
    expect(elements(tree).some(el => el.props.id === "link-fund-change-order")).toBe(true);
    expect(state.mutations).toEqual([]);
  });
  it("rechecks the unlinked limit after switching back from a selected change order", () => {
    let tree = fundRequestStepTwo(1000);
    elements(tree).find(el => el.props.id === "link-fund-change-order")!.props.onCheckedChange(true); tree = render(NewLinkedRequest);
    elements(tree).find(el => el.props.onValueChange && text(el).includes("CO-1"))!.props.onValueChange("1"); tree = render(NewLinkedRequest);
    expect(text(tree)).toContain("الرصيد المتاح في الصندوق: 5,000.00");
    expect(text(tree)).not.toContain("أكبر من المبلغ غير المخصص");
    elements(tree).find(el => el.props.id === "link-fund-change-order")!.props.onCheckedChange(false); tree = render(NewLinkedRequest);
    expect(text(tree)).toContain("المبلغ غير المخصص لأوامر التغيير: 1,000.00");
    expect(text(tree)).toContain("أكبر من المبلغ غير المخصص لأوامر التغيير");
  });
  it("fails closed if allocation data is unavailable instead of offering the full balance", () => {
    let tree = fundRequestStepTwo();
    state.data["fund.summary"] = structuredClone(state.data["fund.summary"]);
    delete state.data["fund.summary"].buckets[0].unlinkedSpendable;
    tree = render(NewLinkedRequest);
    expect(text(tree)).toContain("المبلغ غير المخصص لأوامر التغيير: 0.00");
    expect(text(tree)).toContain("أكبر من المبلغ غير المخصص لأوامر التغيير");
  });
  it("removes the manual surplus section and transfer button from the fund page", () => {
    const tree = render(FundPage);
    expect(text(tree)).not.toContain("تحويل من مشروع");
    expect(text(tree)).not.toContain("مشاريع الجمعية التي بها فائض مالي متاح للتحويل");
    expect(elements(tree).some(el => el.props.onClick && text(el).includes("تحويل المبلغ للصندوق"))).toBe(false);
  });
  it("shows change orders only after explicitly checking the link option, and clears it when unchecked", () => {
    (window.location as any).search = "";
    state.data["permissions.getUserPermissions"] = ["disbursements.create_from_fund"];
    state.data["projects.getAll"] = [{ id: 19, name: "Completed project", projectNumber: "PRJ-19", requestStage: "closed", requestStatus: "completed" }];
    state.data["fund.summary"] = { buckets: [{ restrictionType: "project", restrictedProjectId: 19, spendable: 1000, unlinkedSpendable: 0, changeOrderReserved: 1000 }] };
    state.data["projectChangeOrders.list"] = { orders: [{ id: 1, projectId: 19, amount: "1000", orderNumber: "CO-1", title: "Extra work", status: "boq_approved", items: [] }] };
    let tree = render(NewLinkedRequest);
    const next = elements(tree).find(el => el.props.onClick && text(el).includes("التالي"));
    expect(next).toBeDefined(); next!.props.onClick(); tree = render(NewLinkedRequest);
    const checkbox = elements(tree).find(el => el.props.id === "link-fund-change-order");
    expect(checkbox).toBeDefined();
    expect(checkbox!.props.checked).toBe(false);
    expect(text(tree)).toContain("طلب صرف غير مرتبط بأمر تغيير");
    // The completed project's retained fund balance is still selectable.
    const projectSelect = elements(tree).find(el => el.props.onValueChange && text(el).includes("PRJ-19"));
    expect(projectSelect).toBeDefined(); projectSelect!.props.onValueChange("19"); tree = render(NewLinkedRequest);
    elements(tree).find(el => el.props.id === "link-fund-change-order")!.props.onCheckedChange(true); tree = render(NewLinkedRequest);
    expect(text(tree)).toContain("أمر التغيير المرتبط بطلب الصرف");
    const orderSelect = elements(tree).find(el => el.props.onValueChange && text(el).includes("CO-1"));
    expect(orderSelect).toBeDefined(); orderSelect!.props.onValueChange("1"); tree = render(NewLinkedRequest);
    expect(elements(tree).find(el => el.props.onValueChange && text(el).includes("CO-1"))!.props.value).toBe("1");
    elements(tree).find(el => el.props.id === "link-fund-change-order")!.props.onCheckedChange(false); tree = render(NewLinkedRequest);
    expect(text(tree)).toContain("طلب صرف غير مرتبط بأمر تغيير");
    expect(elements(tree).some(el => el.props.onValueChange && text(el).includes("CO-1"))).toBe(false);
  });
});
function render(page: () => React.ReactNode) {
  for (let i = 0; i < 8; i++) {
    state.cursor = 0; state.effects = []; state.dirty = false;
    const tree = page();
    for (const effect of state.effects) effect();
    if (!state.dirty) return tree;
  }
  throw new Error("Page did not settle");
}
function elements(node: React.ReactNode): React.ReactElement<any>[] {
  const result: React.ReactElement<any>[] = [];
  React.Children.forEach(node, child => { if (React.isValidElement(child)) { const el = child as React.ReactElement<any>; result.push(el, ...elements(el.props.children)); } });
  return result;
}
function text(node: React.ReactNode): string {
  return React.Children.toArray(node).map(child => typeof child === "string" || typeof child === "number" ? String(child) : React.isValidElement(child) ? text((child as any).props.children) : "").join("");
}
const renderBoq = (props = {}) => render(() => BoqTab.render({ projectId: 19, isLocked: false, ...props }, null));
const transferButton = (tree: React.ReactNode) => elements(tree).find(el => el.props.onClick && text(el).includes("تحويل المتبقي إلى الصندوق"));

describe("project change-order tab visibility", () => {
  it.each([
    ["bunyan", "bunyan", true], ["sedana", "bunyan", false], ["bunyan", "sedana", false],
  ])("handles project program %s and request program %s", (programType, requestProgram, visible) => {
    state.data["projects.getById"] = {
      id: 19, projectNumber: "PRJ-19", name: "Project", status: "in_progress", programType,
      request: { id: 19, requestNumber: "REQ-19", programType: requestProgram, currentStage: "execution" },
      phases: [], payments: [], contracts: [], quotations: [], linkedMosques: [],
    };
    const tree = render(ProjectDetailsPage);
    expect(text(tree).includes("أوامر التغيير")).toBe(visible);
    expect(elements(tree).some(el => el.props.value === "change_orders")).toBe(visible);
  });
  it("hides the financial-only change-order shortcut for Sedana projects", () => {
    state.userPermissions = ["projects.financials"];
    state.data["projects.getById"] = { id: 19, name: "Sedana", programType: "sedana", phases: [], payments: [], contracts: [], quotations: [] };
    const tree = render(ProjectDetailsPage);
    expect(text(tree)).not.toContain("أوامر التغيير");
    expect(elements(tree).some(el => el.props.value === "change_orders")).toBe(false);
  });
});

describe("project BOQ transfer and item controls", () => {
  it("keeps historical totals separate and sends only the remaining 500 to the transfer page", () => {
    const tree = renderBoq({ readOnlyItems: true });
    expect(text(tree)).toContain("إجمالي قيمة البنود: 1,500.00");
    expect(text(tree)).toContain("المتبقي للتحويل إلى الصندوق: 500.00");
    transferButton(tree)!.props.onClick();
    expect(state.navigation).toEqual(["/fund/transfers/new?projectId=19&source=surplus&context=change_orders&amount=500"]);
  });
  it("hides the transfer control when all orders have already been funded", () => {
    state.data["projectChangeOrders.list"].funding.pendingTransfer = 0;
    const tree = renderBoq();
    expect(transferButton(tree)).toBeUndefined();
    expect(text(tree)).toContain("المتبقي للتحويل إلى الصندوق: 0.00");
  });
  it("does not fall back to the historical total if the authoritative balance fails", () => {
    state.errors = ["projectChangeOrders.list"];
    const tree = renderBoq();
    expect(transferButton(tree)).toBeUndefined();
    expect(text(tree)).toContain("تعذر حساب المبلغ المتبقي");
  });
  it.each([{}, { isLocked: true }, { readOnlyItems: true }])("hides editing and deletion whenever the item table is locked: %j", props => {
    const tree = renderBoq(props);
    const controls = elements(tree).filter(el => el.props.onClick && elements(el.props.children).some(child => child.type === Edit || child.type === Trash2));
    expect(controls).toHaveLength(Object.keys(props).length ? 0 : 2);
    if (Object.keys(props).length) expect(text(tree)).not.toContain("الإجراءات");
  });
});

describe("change-order transfer form", () => {
  it("caps an outdated 1500 prefill to 500 and submits a transfer scoped to change orders", () => {
    let tree = render(NewFundTransferPage);
    const amount = elements(tree).find(el => el.props.id === "transfer-amount")!;
    expect(amount.props.value).toBe("500.00"); expect(amount.props.max).toBe(500);
    const button = elements(tree).find(el => el.props.onClick && text(el) === "تحويل إلى الصندوق")!;
    expect(button.props.disabled).toBe(false); button.props.onClick();
    expect(state.mutations).toContainEqual(expect.objectContaining({ path: "fund.transferFromProject", input: expect.objectContaining({ projectId: 19, amount: 500, changeOrdersOnly: true }) }));
    amount.props.onChange({ target: { value: "1500" } }); tree = render(NewFundTransferPage);
    expect(elements(tree).find(el => el.props.onClick && text(el) === "تحويل إلى الصندوق")!.props.disabled).toBe(true);
  });
  it("keeps a regular surplus transfer independent of change-order amounts", () => {
    (window.location as any).search = "?projectId=19&source=surplus&amount=1500";
    const tree = render(NewFundTransferPage);
    const amount = elements(tree).find(el => el.props.id === "transfer-amount")!;
    expect(amount.props.value).toBe("1500"); expect(amount.props.max).toBe(9000);
    elements(tree).find(el => el.props.onClick && text(el) === "تحويل إلى الصندوق")!.props.onClick();
    expect(state.mutations[0].input).toMatchObject({ amount: 1500, changeOrdersOnly: false });
  });
});
