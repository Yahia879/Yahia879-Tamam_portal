import React from "react";
import { Edit, Trash2 } from "lucide-react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ slots: [] as any[], cursor: 0, effects: [] as (() => void)[], dirty: false, data: {} as Record<string, any>, errors: [] as string[], navigation: [] as string[], mutations: [] as any[] }));
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
vi.mock("wouter", () => ({ useLocation: () => ["/projects/19", (url: string) => state.navigation.push(url)] }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 1, role: "projects_office" } }) }));
vi.mock("@/hooks/usePermission", () => ({ usePermission: () => true }));
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
let BoqTab: any, NewFundTransferPage: () => React.ReactNode;
beforeAll(async () => {
  vi.stubGlobal("React", React);
  BoqTab = (await import("../client/src/components/BoqTab")).default;
  NewFundTransferPage = (await import("../client/src/pages/NewFundTransferPage")).default;
});
beforeEach(() => {
  state.slots = []; state.cursor = 0; state.effects = []; state.dirty = false; state.errors = []; state.navigation = []; state.mutations = [];
  vi.stubGlobal("window", { location: { search: "?projectId=19&source=surplus&context=change_orders&amount=1500" } });
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
