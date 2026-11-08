import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { hasRouteAccess } from "../client/src/lib/routePermissions";

const permissionIds = ["view", "create", "view_details", "edit", "delete", "reject", "approve"].map(p => `mosques.${p}`);
const mapPermissions = ["mosque_map.view", "mosque_map.view_details"];
const state = vi.hoisted(() => ({
  role: "super_admin",
  selected: [] as string[],
  direct: [] as { permissionId: string; granted: boolean }[],
  legacy: [] as string[],
  records: {} as Record<string, any[]>,
  writes: [] as { table: string; values: any }[],
}));

vi.mock("./db", () => ({
  getDb: async () => {
    function rows(table: any) {
      const name = getTableName(table);
      if (name === "users") return [{ id: 0, role: state.role }];
      if (name === "roles") return [{ id: state.role, description: JSON.stringify(state.selected), isActive: true }];
      if (name === "role_permissions") return state.legacy.map(permissionId => ({ roleId: state.role, permissionId }));
      if (name === "user_permissions") return state.direct;
      if (name === "permissions") return [...["view", "create", "view_details", "edit", "delete", "reject", "approve"].map(p => `mosques.${p}`), "mosque_map.view", "mosque_map.view_details"].map(id => ({ id }));
      return state.records[name] ?? [];
    }
    function query(table?: any): any {
      const chain: any = {
        from: (value: any) => { table = value; return chain; },
        then: (resolve: any, reject: any) => Promise.resolve(rows(table)).then(resolve, reject),
      };
      for (const method of ["where", "limit", "orderBy", "leftJoin", "innerJoin", "groupBy", "offset"]) chain[method] = () => chain;
      return chain;
    }
    const write = (table: any) => (values: any) => {
      state.writes.push({ table: getTableName(table), values });
      const result = Promise.resolve([{ insertId: 99 }]);
      return Object.assign(result, { where: () => result });
    };
    return {
      select: () => query(),
      update: (table: any) => ({ set: write(table) }),
      insert: (table: any) => ({ values: write(table) }),
      delete: (table: any) => ({ where: () => { state.writes.push({ table: getTableName(table), values: "deleted" }); return Promise.resolve(); } }),
    };
  },
}));
vi.mock("./routers/notifications", () => ({ notifyNewMosque: vi.fn(), notifyMosqueApproval: vi.fn(), createNotification: vi.fn() }));

import { calculateUserPermissions, checkPermission } from "./permissions";
import { mosquesRouter } from "./routers/mosques";

const caller = () => mosquesRouter.createCaller({ user: { id: 0, role: state.role }, req: {}, res: {} } as TrpcContext);

beforeEach(() => {
  state.role = "super_admin";
  state.selected = ["mosques.view"];
  state.direct = [];
  state.legacy = [];
  state.writes = [];
  state.records = { mosques: [{ id: 17, name: "مسجد", registeredBy: 0, approvalStatus: "pending" }] };
});

describe("mosque permissions remain independent", () => {
  it("returns canonical approval states from search and mosque details when stored states contain null characters", async () => {
    state.selected = ["mosques.view", "mosques.view_details"];
    const encodedStatus = "\0a\0p\0p\0r\0o\0v\0e\0d";
    state.records.mosques[0].approvalStatus = encodedStatus;
    expect((await caller().search({})).mosques[0].approvalStatus).toBe("approved");
    state.records.mosques = [{ mosque: { id: 17, name: "مسجد", approvalStatus: encodedStatus } }];
    expect((await caller().getById({ id: 17 })).approvalStatus).toBe("approved");
  });
  it.each(permissionIds)("honors an administrator's explicit revocation of %s", async permission => {
    state.selected = ["*", "mosques", ...permissionIds];
    state.direct = [{ permissionId: permission, granted: false }];
    expect(await checkPermission(0, permission)).toBe(false);
  });

  it("does not restore unchecked actions through the navigation summary or stale role rows", async () => {
    state.selected = ["mosques", "mosques.view"];
    state.legacy = permissionIds;
    const permissions = await calculateUserPermissions(0);
    expect(permissions.filter(p => p.startsWith("mosques."))).toEqual(["mosques.view"]);
  });

  it("respects an empty customized administrator role", async () => {
    state.selected = [];
    expect((await calculateUserPermissions(0)).filter(p => p.startsWith("mosques"))).toEqual([]);
  });

  it("requires explicit mosque permissions instead of inheriting the wildcard", async () => {
    state.selected = ["*"];
    expect((await calculateUserPermissions(0)).filter(p => p.startsWith("mosques"))).toEqual([]);
    expect((await calculateUserPermissions(0)).filter(p => p.startsWith("mosque_map"))).toEqual([]);
  });

  it.each(["view_details", "approve", "reject"])("does not infer list access from %s", async action => {
    state.selected = [`mosques.${action}`];
    expect(await checkPermission(0, "mosques.view")).toBe(false);
  });
});

describe.each(["super_admin", "system_admin", "general_manager", "projects_office", "custom_role_test"])("mosque boundaries for %s", role => {
  beforeEach(() => { state.role = role; });

  it("allows the list and blocks details, creation and editing for view-only users", async () => {
    const permissions = await calculateUserPermissions(0);
    expect(hasRouteAccess("/mosques", role, permissions, false)).toBe(true);
    for (const path of ["/mosques/new", "/mosques/17", "/mosques/17/edit", "/mosques/17/edit-imam"]) {
      expect(hasRouteAccess(path, role, permissions, false)).toBe(false);
    }
    await expect(caller().getById({ id: 17 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().create({ name: "مسجد", city: "أبها" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().update({ id: 17, name: "تعديل" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().updateImam({ id: 17, imamName: "إمام", imamPhone: "0500000000" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().delete({ id: 17 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().approve({ id: 17 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().reject({ id: 17 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });

  it.each(["create", "edit", "delete", "approve", "reject"])("allows %s only while its permission is granted", async action => {
    const permission = `mosques.${action}`;
    state.selected = ["mosques", "mosques.view", permission];
    const run = () => {
      const api = caller();
      if (action === "create") return api.create({ name: "مسجد", city: "أبها" });
      if (action === "edit") return api.update({ id: 17, name: "تعديل" });
      return api[action as "delete" | "approve" | "reject"]({ id: 17 });
    };
    await expect(run()).resolves.toMatchObject({ success: true });
    state.writes = [];
    state.direct = [{ permissionId: permission, granted: false }];
    await expect(run()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });

  it("opens details only with details permission and blocks them after revocation", async () => {
    state.selected.push("mosques.view_details");
    state.records.mosques = [{ mosque: { id: 17, name: "مسجد", registeredBy: 99 } }];
    let permissions = await calculateUserPermissions(0);
    expect(hasRouteAccess("/mosques/17", role, permissions, false)).toBe(true);
    await expect(caller().getById({ id: 17 })).resolves.toMatchObject({ id: 17, name: "مسجد" });
    state.direct = [{ permissionId: "mosques.view_details", granted: false }];
    permissions = await calculateUserPermissions(0);
    expect(hasRouteAccess("/mosques/17", role, permissions, false)).toBe(false);
    await expect(caller().getById({ id: 17 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not grant mosque access through an empty role, wildcard or section summary", () => {
    for (const permissions of [[], ["*"], ["mosques"]]) expect(hasRouteAccess("/mosques", role, permissions, false)).toBe(false);
  });

  it("keeps map-only access independent of details, legacy summaries and stale role rows", async () => {
    state.selected = ["mosques_map", "mosque_map", "mosque_map.view"];
    state.legacy = [...mapPermissions];
    const permissions = await calculateUserPermissions(0);
    expect(permissions).toContain("mosque_map.view");
    expect(permissions).not.toContain("mosque_map.view_details");
    expect(hasRouteAccess("/mosques/map", role, permissions, false)).toBe(true);
    expect(hasRouteAccess("/mosques/17", role, permissions, false)).toBe(false);
    await expect(caller().getById({ id: 17 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.each(mapPermissions)("honors revocation of %s including map routes and data", async permission => {
    state.selected = ["mosques_map", "mosque_map", ...mapPermissions];
    state.direct = [{ permissionId: permission, granted: false }];
    const permissions = await calculateUserPermissions(0);
    expect(permissions).not.toContain(permission);
    expect(hasRouteAccess("/mosques/map", role, permissions, false)).toBe(permission !== "mosque_map.view");
    expect(hasRouteAccess("/mosques/17", role, permissions, false)).toBe(permission !== "mosque_map.view_details");
    if (permission === "mosque_map.view_details") {
      await expect(caller().getById({ id: 17 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("allows map details independently of list details and editing", async () => {
    state.selected = [...mapPermissions];
    state.records.mosques = [{ mosque: { id: 17, name: "مسجد", registeredBy: 99 } }];
    const permissions = await calculateUserPermissions(0);
    expect(hasRouteAccess("/mosques/17", role, permissions, false)).toBe(true);
    expect(hasRouteAccess("/mosques/17/edit", role, permissions, false)).toBe(false);
    await expect(caller().getById({ id: 17 })).resolves.toMatchObject({ id: 17 });
  });

  it("does not allow the administrator role or wildcard to bypass map permissions", () => {
    for (const permissions of [[], ["*"], ["mosques_map"], ["mosque_map"]]) {
      expect(hasRouteAccess("/mosques/map", role, permissions, false)).toBe(false);
    }
  });
});

it("keeps requester ownership checks for mosque editing", async () => {
  state.role = "service_requester";
  await expect(caller().update({ id: 17, name: "تعديل" })).resolves.toMatchObject({ success: true });
  state.records.mosques[0].registeredBy = 99;
  await expect(caller().update({ id: 17, name: "تعديل" })).rejects.toMatchObject({ code: "FORBIDDEN" });
});
