import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { custodyAccess } from "../shared/custodyPermissions";
import { hasRouteAccess } from "../client/src/lib/routePermissions";

const state = vi.hoisted(() => ({
  role: "field_team", selected: [] as string[], stale: [] as string[],
  direct: [] as { permissionId: string; granted: boolean }[],
  requests: [] as any[], exceptions: [] as any[], writes: [] as { table: string; values: any }[],
}));
vi.mock("./routers/notifications", () => ({ createNotification: vi.fn() }));
vi.mock("./db", () => ({ getDb: async () => {
  function rows(table: any) {
    const name = getTableName(table);
    if (name === "users") return [{ id: 0, role: state.role, name: "Tester" }];
    if (name === "roles") return [{ id: state.role, description: JSON.stringify(state.selected), isActive: true }];
    if (name === "role_permissions") return [...state.selected, ...state.stale].map(permissionId => ({ roleId: state.role, permissionId }));
    if (name === "user_permissions") return state.direct;
    if (name === "custody_requests") return state.requests;
    if (name === "custody_exceptions") return state.exceptions;
    return [];
  }
  function query(): any {
    let table: any;
    const chain: any = { from: (t: any) => { table = t; return chain; }, then: (resolve: any, reject: any) => Promise.resolve(rows(table)).then(resolve, reject) };
    for (const method of ["where", "limit", "orderBy", "leftJoin", "innerJoin", "offset"]) chain[method] = () => chain;
    return chain;
  }
  const write = (table: any) => (values: any) => {
    state.writes.push({ table: getTableName(table), values });
    const result = Promise.resolve([{ insertId: 21 }]);
    return Object.assign(result, { where: () => result });
  };
  return { select: query, insert: (t: any) => ({ values: write(t) }), update: (t: any) => ({ set: write(t) }) };
} }));

import { calculateUserPermissions, checkPermission } from "./permissions";
import { custodyRouter } from "./routers/custody";
const caller = () => custodyRouter.createCaller({ user: { id: 0, role: state.role, name: "Tester" }, req: {}, res: {} } as TrpcContext);
const request = { title: "Operating expenses", amount: 100, description: "New operating expense", bankName: "Bank", bankAccountName: "Tester", bankIban: "SA0000000000000000000000" };

beforeEach(() => {
  state.role = "field_team";
  state.selected = [];
  state.stale = [];
  state.direct = [];
  state.requests = [];
  state.exceptions = [];
  state.writes = [];
});

describe("custody access and routes", () => {
  it.each(["super_admin", "system_admin", "executive_director", "general_manager"])("keeps staff custody and exception review available without permissions for %s", async role => {
    state.role = role;
    expect(custodyAccess({ role }, [])).toMatchObject({ canSeeStaff: true, canSeeExceptions: true, canCreate: false, canSeeMy: false, canRequestException: false });
    expect(hasRouteAccess("/custody-requests", role, [], false)).toBe(true);
    expect(hasRouteAccess("/custody-requests/new", role, [], false)).toBe(false);
    await expect(caller().getAll({ scope: "staff" })).resolves.toHaveProperty("items");
    await expect(caller().getExceptions({ scope: "staff" })).resolves.toHaveProperty("items");
    await expect(caller().create(request)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().requestException({ activeCustodyId: 1, reason: "Additional operating needs" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });
  it("recognizes the assigned executive role in the route guard", () => {
    const user = { role: "custom_role_1", customRole: { nameAr: "المدير التنفيذي" } };
    expect(hasRouteAccess("/custody-requests", user.role, [], true, user)).toBe(true);
    expect(hasRouteAccess("/custody-requests/new", user.role, [], true, user)).toBe(false);
  });
  it("keeps the two personal permissions independent", () => {
    expect(custodyAccess({ role: "field_team" }, ["custody_requests.create"])).toMatchObject({ canCreate: true, canSeeMy: true, canRequestException: false, canSeeExceptions: false, canEnter: true });
    expect(custodyAccess({ role: "field_team" }, ["custody_requests.request_exception"])).toMatchObject({ canCreate: false, canSeeMy: false, canRequestException: true, canSeeExceptions: true, canEnter: true });
    expect(hasRouteAccess("/custody-requests", "field_team", ["custody_requests.request_exception"], false)).toBe(true);
    expect(hasRouteAccess("/custody-requests/new", "field_team", ["custody_requests.request_exception"], false)).toBe(false);
  });
  it("does not substitute a wildcard for either personal permission", async () => {
    state.role = "super_admin";
    state.selected = ["*"];
    expect(await checkPermission(0, "custody_requests.create")).toBe(false);
    expect(await checkPermission(0, "custody_requests.request_exception")).toBe(false);
    expect(hasRouteAccess("/custody-requests/new", "super_admin", ["*"], false)).toBe(false);
  });
  it("does not restore removed personal actions through navigation or stale role rows", async () => {
    state.role = "super_admin";
    state.selected = ["custody_requests", "custody_requests.view"];
    state.stale = ["custody_requests.create", "custody_requests.request_exception"];
    const permissions = await calculateUserPermissions(0);
    expect(permissions).not.toContain("custody_requests.create");
    expect(permissions).not.toContain("custody_requests.request_exception");
  });
  it("allows personal actions without a separate view grant", async () => {
    state.selected = ["custody_requests.create", "custody_requests.request_exception"];
    state.direct = [{ permissionId: "custody_requests.view", granted: false }];
    expect(await checkPermission(0, "custody_requests.create")).toBe(true);
    expect(await checkPermission(0, "custody_requests.request_exception")).toBe(true);
  });
});

describe("custody personal actions", () => {
  it.each(["field_team", "super_admin", "executive_director"])("permits creating personal custody only when assigned for %s", async role => {
    state.role = role;
    state.selected = ["custody_requests.create"];
    await expect(caller().create(request)).resolves.toHaveProperty("id", 21);
    expect(state.writes.find(w => w.table === "custody_requests")?.values.userId).toBe(0);
  });
  it("does not give exception requests to a custody creator", async () => {
    state.selected = ["custody_requests.create"];
    await expect(caller().requestException({ activeCustodyId: 1, reason: "Additional operating needs" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("permits an exception for the user's own active custody independently of create", async () => {
    state.selected = ["custody_requests.request_exception"];
    state.requests = [{ id: 1, userId: 0, requestNumber: "CR-1", status: "pending_executive", isSettled: false }];
    await expect(caller().requestException({ activeCustodyId: 1, reason: "Additional operating needs" })).resolves.toHaveProperty("id", 21);
    expect(state.writes.find(w => w.table === "custody_exceptions")?.values.userId).toBe(0);
  });
  it("does not allow an exception for another employee's custody", async () => {
    state.selected = ["custody_requests.request_exception"];
    state.requests = [{ id: 1, userId: 2, status: "pending_executive", isSettled: false }];
    await expect(caller().requestException({ activeCustodyId: 1, reason: "Additional operating needs" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });
  it("keeps personal exception history hidden from a default staff reviewer without its personal permission", async () => {
    state.role = "super_admin";
    await expect(caller().getExceptions({ scope: "my" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("honors individual revocations of both personal actions", async () => {
    state.role = "super_admin";
    state.selected = ["custody_requests.create", "custody_requests.request_exception"];
    state.direct = state.selected.map(permissionId => ({ permissionId, granted: false }));
    await expect(caller().create(request)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().requestException({ activeCustodyId: 1, reason: "Additional operating needs" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().getAll({ scope: "staff" })).resolves.toHaveProperty("items");
  });
});
