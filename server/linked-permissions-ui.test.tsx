import React from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BENEFICIARY_MANAGEMENT_REQUIREMENT_IDS, REQUEST_MANAGEMENT_REQUIREMENTS } from "../shared/linkedPermissionDependencies";
import { REQUEST_REPORT_PERMISSION_IDS } from "../shared/requestReportPermissions";
import { CALENDAR_MANAGEMENT_PERMISSION_IDS } from "../shared/calendarPermissions";

// Exercise page handlers and confirmation dialogs without a browser or DOM.
const state = vi.hoisted(() => ({ slots: [] as any[], cursor: 0, effects: [] as (() => void)[], dirty: false, data: {} as Record<string, any> }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  const changed = (a: any[] | undefined, b: any[] | undefined) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
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
  };
});
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 0, role: "super_admin", permissions: ["*"] } }) }));
vi.mock("wouter", () => ({ useRoute: (path: string) => [true, { id: path.startsWith("/users") ? "1" : "super_admin" }], useLocation: () => ["/staff", vi.fn()] }));
vi.mock("@/lib/trpc", () => {
  function proxy(path: string[] = []): any {
    return new Proxy(() => undefined, { get: (_target, name: string) => {
      if (name === "useQuery") return () => ({ data: state.data[path.join(".")], isLoading: false });
      if (name === "useMutation") return () => ({ mutate: vi.fn(), isPending: false });
      if (name === "useUtils") return () => proxy();
      return proxy([...path, name]);
    } });
  }
  return { trpc: proxy() };
});

let pages: Record<string, () => React.ReactNode>;
beforeAll(async () => {
  vi.stubGlobal("React", React);
  pages = {
    RoleEdit: (await import("../client/src/pages/RoleEdit")).default,
    RolePermissions: (await import("../client/src/pages/RolePermissions")).default,
    UserPermissions: (await import("../client/src/pages/UserPermissions")).default,
  };
});
beforeEach(() => {
  state.slots = []; state.cursor = 0; state.effects = []; state.dirty = false;
  const permissions = ["pending_reports.view_field_visit"];
  const role = { id: "super_admin", roleId: "super_admin", nameAr: "المدير العام", roleName: "المدير العام", isSystem: true };
  state.data = {
    "permissions.getRole": role, "permissions.getRoles": [role], "permissions.getRolePermissions": permissions,
    "users.getById": { id: 1, role: "super_admin", name: "User" }, "permissions.getUserRoles": [role],
    "permissions.getUserRolePermissions": permissions, "permissions.getUserPermissions": permissions,
    "permissions.getUserDirectPermissions": [],
    "permissions.getStructure": [{ id: "all", permissions: [...REQUEST_REPORT_PERMISSION_IDS, ...REQUEST_MANAGEMENT_REQUIREMENTS, ...BENEFICIARY_MANAGEMENT_REQUIREMENT_IDS, "requester_accounts.create", "escalation.delayed_requests", "escalation.delayed_beneficiaries"].map(id => ({ id })) }],
  };
});
function render(page: string): React.ReactNode {
  for (let i = 0; i < 8; i++) {
    state.cursor = 0; state.effects = []; state.dirty = false;
    const tree = pages[page]();
    for (const effect of state.effects) effect();
    if (!state.dirty) return tree;
  }
  throw new Error("Page did not settle");
}
function elements(node: React.ReactNode): React.ReactElement<any>[] {
  const result: React.ReactElement<any>[] = [];
  React.Children.forEach(node, child => {
    if (React.isValidElement(child)) {
      const el = child as React.ReactElement<any>;
      result.push(el, ...elements(el.props.children));
    }
  });
  return result;
}
function text(node: React.ReactNode): string {
  return React.Children.toArray(node).map(child => typeof child === "string" || typeof child === "number" ? String(child) : React.isValidElement(child) ? text((child as any).props.children) : "").join("");
}
function row(tree: React.ReactNode, id: string) {
  const element = elements(tree).find(el => el.key === id && el.props.onClick);
  if (!element) throw new Error(`Missing permission row ${id}`);
  return element;
}
function checked(tree: React.ReactNode, id: string) {
  return elements(row(tree, id)).some(el => el.props.className?.includes("w-4.5") && el.props.className.includes("text-white"));
}
function dialog(tree: React.ReactNode) {
  return elements(tree).find(el => el.props.open === true && text(el).includes("تأكيد تفعيل الصلاحيات المرتبطة"));
}
function decide(tree: React.ReactNode, confirm: boolean) {
  const active = dialog(tree);
  expect(active).toBeDefined();
  const button = elements(active).find(el => el.props.onClick && text(el) === (confirm ? "تأكيد وتفعيل الصلاحيات" : "إلغاء"));
  button!.props.onClick();
}

describe.each(["RoleEdit", "RolePermissions", "UserPermissions"])("linked permission confirmation on %s", page => {
  it("does not offer the retired manual fund-transfer permission", () => {
    const tree = render(page);
    expect(elements(tree).some(el => el.key === "fund.view")).toBe(true);
    expect(elements(tree).some(el => el.key === "fund.transfer")).toBe(false);
  });
  it.each(CALENDAR_MANAGEMENT_PERMISSION_IDS)("confirms request access for %s and preserves personal mode on cancellation", target => {
    let tree = render(page);
    row(tree, "appointments.view_own").props.onClick(); tree = render(page);
    expect(checked(tree, "appointments.view_own")).toBe(true);
    expect(dialog(tree)).toBeUndefined();
    row(tree, target).props.onClick(); tree = render(page);
    expect(dialog(tree)).toBeDefined();
    expect(checked(tree, "appointments.view_own")).toBe(true);
    for (const id of [target, ...REQUEST_MANAGEMENT_REQUIREMENTS]) expect(checked(tree, id)).toBe(false);
    decide(tree, false); tree = render(page);
    expect(checked(tree, "appointments.view_own")).toBe(true);
    row(tree, target).props.onClick(); tree = render(page); decide(tree, true); tree = render(page);
    expect(checked(tree, "appointments.view_own")).toBe(false);
    for (const id of [target, ...REQUEST_MANAGEMENT_REQUIREMENTS]) expect(checked(tree, id)).toBe(true);
    row(tree, "requests.view_details").props.onClick(); tree = render(page);
    expect(checked(tree, target)).toBe(false);
  });
  it("confirms selecting all standard calendar rights and excludes the personal option", () => {
    let tree = render(page);
    const module = elements(tree).find(el => el.key === "appointments");
    const selectAll = elements(module).find(el => el.props.onClick && text(el) === "تحديد الكل");
    expect(selectAll).toBeDefined(); selectAll!.props.onClick({ stopPropagation: vi.fn() }); tree = render(page);
    expect(dialog(tree)).toBeDefined();
    decide(tree, true); tree = render(page);
    for (const id of [...CALENDAR_MANAGEMENT_PERMISSION_IDS, ...REQUEST_MANAGEMENT_REQUIREMENTS]) expect(checked(tree, id)).toBe(true);
    expect(checked(tree, "appointments.view_own")).toBe(false);
  });
  it("offers an independent add-imam permission in the mosque section", () => {
    const initial = ["mosques.view", "mosques.view_details"];
    for (const key of ["permissions.getRolePermissions", "permissions.getUserRolePermissions", "permissions.getUserPermissions"]) state.data[key] = initial;
    let tree = render(page);
    expect(text(row(tree, "mosques.add_imam"))).toContain("إضافة إمام للمسجد");
    expect(checked(tree, "mosques.add_imam")).toBe(false);
    row(tree, "mosques.add_imam").props.onClick(); tree = render(page);
    expect(checked(tree, "mosques.add_imam")).toBe(true);
    expect(checked(tree, "mosques.edit")).toBe(false);
    row(tree, "mosques.add_imam").props.onClick(); tree = render(page);
    expect(checked(tree, "mosques.add_imam")).toBe(false);
  });
  it.each(["pending_reports.intervene_field_visit", "escalation.delayed_requests"])("does not grant %s or its prerequisites until confirmation, and supports cancellation", target => {
    let tree = render(page);
    row(tree, target).props.onClick(); tree = render(page);
    expect(dialog(tree)).toBeDefined();
    expect(text(dialog(tree))).toContain("عرض كافة الطلبات");
    expect(text(dialog(tree))).toContain("عرض تفاصيل الطلب وإدارته");
    for (const id of [target, ...REQUEST_MANAGEMENT_REQUIREMENTS]) expect(checked(tree, id)).toBe(false);
    decide(tree, false); tree = render(page);
    expect(dialog(tree)).toBeUndefined();
    for (const id of [target, ...REQUEST_MANAGEMENT_REQUIREMENTS]) expect(checked(tree, id)).toBe(false);
    row(tree, target).props.onClick(); tree = render(page); decide(tree, true); tree = render(page);
    for (const id of [target, ...REQUEST_MANAGEMENT_REQUIREMENTS]) expect(checked(tree, id)).toBe(true);
    expect(checked(tree, "requests.create")).toBe(false);
    row(tree, "requests.view_details").props.onClick(); tree = render(page);
    expect(checked(tree, target)).toBe(false);
  });
  it("confirms beneficiary management rights, excludes creation, and revokes escalation when a prerequisite is removed", () => {
    let tree = render(page);
    row(tree, "escalation.delayed_beneficiaries").props.onClick(); tree = render(page);
    expect(dialog(tree)).toBeDefined();
    expect(elements(dialog(tree)).filter(el => el.type === "li")).toHaveLength(21);
    expect(checked(tree, "requester_accounts.create")).toBe(false);
    decide(tree, true); tree = render(page);
    for (const id of ["escalation.delayed_beneficiaries", ...BENEFICIARY_MANAGEMENT_REQUIREMENT_IDS]) expect(checked(tree, id)).toBe(true);
    expect(checked(tree, "requester_accounts.create")).toBe(false);
    row(tree, "requester_inquiries.send_whatsapp").props.onClick(); tree = render(page);
    expect(checked(tree, "escalation.delayed_beneficiaries")).toBe(false);
  });
  it("requires confirmation for selecting every report permission together", () => {
    let tree = render(page);
    const module = elements(tree).find(el => el.key === "pending_reports");
    const selectAll = elements(module).find(el => el.props.onClick && text(el) === "تحديد الكل");
    expect(selectAll).toBeDefined(); selectAll!.props.onClick({ stopPropagation: vi.fn() }); tree = render(page);
    expect(dialog(tree)).toBeDefined();
    expect(checked(tree, "pending_reports.intervene_field_visit")).toBe(false);
    decide(tree, true); tree = render(page);
    for (const id of [...REQUEST_REPORT_PERMISSION_IDS, ...REQUEST_MANAGEMENT_REQUIREMENTS]) expect(checked(tree, id)).toBe(true);
  });
});
