import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { CONTRACT_PERMISSION_IDS, contractPermissionSelection } from "../shared/contractPermissions";
import { getRequiredPermission, hasRouteAccess } from "../client/src/lib/routePermissions";

const state = vi.hoisted(() => ({
  role: "super_admin",
  selected: [] as string[],
  direct: [] as { permissionId: string; granted: boolean }[],
  records: {} as Record<string, any[]>,
  writes: [] as { table: string; values: any }[],
}));

vi.mock("./db", () => ({
  getDb: async () => {
    function rows(table: any) {
      const name = getTableName(table);
      if (name === "users") return [{ id: 0, role: state.role }];
      if (name === "roles") return [{ id: state.role, description: JSON.stringify(state.selected), isActive: true }];
      if (name === "role_permissions") return state.selected.map(permissionId => ({ permissionId }));
      if (name === "user_permissions") return state.direct;
      if (name === "permissions") return CONTRACT_PERMISSION_IDS.map(id => ({ id }));
      return state.records[name] ?? [];
    }
    function query(table?: any): any {
      const chain: any = {
        from: (value: any) => { table = value; return chain; },
        then: (resolve: any, reject: any) => Promise.resolve(rows(table)).then(resolve, reject),
      };
      for (const method of ["where", "limit", "orderBy", "leftJoin", "innerJoin", "groupBy", "offset"]) {
        chain[method] = () => chain;
      }
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

import { calculateUserPermissions, checkPermission, permissionsRouter } from "./permissions";
import { contractsRouter } from "./routers/contracts";
import { contractTemplates, contractsEnhanced } from "../drizzle/schema";

const ctx = () => ({ user: { id: 0, role: state.role }, req: {}, res: {} }) as TrpcContext;
const caller = () => contractsRouter.createCaller(ctx());

beforeEach(() => {
  state.role = "super_admin";
  state.selected = ["contracts.view", "contracts.template_view"];
  state.direct = [];
  state.writes = [];
  state.records = {
    [getTableName(contractTemplates)]: [{ id: 1, name: "Template", introTemplate: "" }],
    [getTableName(contractsEnhanced)]: [{ id: 17, status: "draft", approvedAt: null, contractAmount: "100", duration: 1 }],
  };
});

describe("contract permission calculation", () => {
  it.each(CONTRACT_PERMISSION_IDS)("honors an explicit super_admin revocation of %s", async permission => {
    state.selected = [...CONTRACT_PERMISSION_IDS];
    state.direct = [{ permissionId: permission, granted: false }];
    expect(await checkPermission(0, permission)).toBe(false);
  });

  it("does not restore an unchecked role action through the contracts navigation summary", async () => {
    state.selected = ["contracts", "contracts.view", "contracts.template_view", "contracts.edit_approved"];
    const permissions = await calculateUserPermissions(0);
    expect(permissions).toContain("contracts.edit_approved");
    expect(permissions).not.toContain("contracts.edit");
    expect(permissions).not.toContain("contracts.create");
    expect(permissions).not.toContain("contracts.approve");
    expect(contractPermissionSelection(["contracts", "contracts.view", "contracts.delete"])).toEqual(["contracts.view"]);
  });

  it("respects an empty customized super_admin role", async () => {
    state.selected = [];
    expect((await calculateUserPermissions(0)).filter(p => p.startsWith("contracts."))).toEqual([]);
  });

  it("keeps the two view permissions independent", async () => {
    state.selected = ["contracts.template_view"];
    expect(await checkPermission(0, "contracts.view")).toBe(false);
    expect(await checkPermission(0, "contracts.template_view")).toBe(true);
  });

  it("reports customized inherited permissions without applying personal overrides", async () => {
    state.selected = ["contracts.view", "contracts.export"];
    state.direct = [{ permissionId: "contracts.export", granted: false }];
    const inherited = await permissionsRouter.createCaller(ctx()).getUserRolePermissions({ userId: 0 });
    expect(inherited).toContain("contracts.export");
    expect(inherited).not.toContain("contracts.approve");
    expect(await checkPermission(0, "contracts.export")).toBe(false);
  });
});

describe("contract server action boundaries", () => {
  it("requires approval permission even when the user can edit", async () => {
    state.selected.push("contracts.edit");
    await expect(caller().approve({ id: 17 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });

  it("does not allow a creator to create templates or clauses", async () => {
    state.selected.push("contracts.create");
    await expect(caller().createTemplate({ name: "T", nameAr: "T", type: "supply" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().createClause({ title: "C", titleAr: "C", content: "text", templateId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });

  it("does not allow contract editors to edit template clauses", async () => {
    state.selected.push("contracts.edit");
    await expect(caller().updateClause({ id: 1, content: "changed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().reorderClauses({ templateId: 1, clauseIds: [2, 1] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows adding a preamble without granting template editing", async () => {
    state.selected.push("contracts.preamble_add");
    await expect(caller().updateTemplate({ id: 1, introTemplate: "New preamble" })).resolves.toEqual({ success: true });
    expect(state.writes).toEqual([{ table: getTableName(contractTemplates), values: { introTemplate: "New preamble" } }]);
  });

  it("does not let a preamble permission change template metadata", async () => {
    state.selected.push("contracts.preamble_add");
    await expect(caller().updateTemplate({ id: 1, introTemplate: "New", nameAr: "Changed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });

  it("does not let template editing or adding a preamble overwrite an existing preamble", async () => {
    state.records[getTableName(contractTemplates)][0].introTemplate = "Existing";
    state.selected.push("contracts.template_edit", "contracts.preamble_add");
    await expect(caller().updateTemplate({ id: 1, introTemplate: "Changed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    state.selected.push("contracts.preamble_edit");
    await expect(caller().updateTemplate({ id: 1, introTemplate: "Changed" })).resolves.toEqual({ success: true });
  });

  it.each(["approved", "active", "completed"])("requires approved-edit permission for %s contracts, including super_admin", async status => {
    state.selected.push("contracts.edit");
    state.records[getTableName(contractsEnhanced)][0].status = status;
    await expect(caller().update({ id: 17, contractTitle: "Changed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });

  it("does not let approved-edit permission edit unapproved contracts", async () => {
    state.selected.push("contracts.edit_approved");
    await expect(caller().update({ id: 17, contractTitle: "Changed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it.each(["draft", "pending_approval"])("allows ordinary editors to edit a %s contract", async status => {
    state.selected.push("contracts.edit");
    state.records[getTableName(contractsEnhanced)][0].status = status;
    await expect(caller().update({ id: 17, contractTitle: "Changed" })).resolves.toEqual({ success: true });
    expect(state.writes[0].values.contractTitle).toBe("Changed");
  });

  it("allows approved edits independently of ordinary edits and preserves approval", async () => {
    state.selected.push("contracts.edit_approved");
    Object.assign(state.records[getTableName(contractsEnhanced)][0], { status: "approved", approvedAt: "2026-11-03" });
    await expect(caller().update({ id: 17, contractTitle: "Changed", status: "pending_approval" })).resolves.toEqual({ success: true });
    expect(state.writes[0].values).toMatchObject({ contractTitle: "Changed", status: "approved" });
  });

  it("does not self-approve by changing a draft status in update", async () => {
    state.selected.push("contracts.edit");
    await expect(caller().update({ id: 17, status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });

  it("does not self-approve during creation", async () => {
    state.selected.push("contracts.create");
    await expect(caller().create({ contractType: "supply", contractTitle: "T", secondPartyName: "S", contractAmount: 100, duration: 1, status: "approved" as any })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.writes).toEqual([]);
  });
});

describe("contract route permissions", () => {
  it.each(["super_admin", "system_admin", "custom_role_test"])("requires explicit permissions for %s", role => {
    for (const route of ["/contracts", "/contracts/17/preview", "/contracts/17/print", "/contract-templates", "/contract-templates/1/preview"]) {
      expect(hasRouteAccess(route, role, ["*"], true)).toBe(false);
    }
  });

  it("keeps template access separate from contract preview and printing", () => {
    expect(hasRouteAccess("/contracts", "super_admin", ["contracts.template_view"], false)).toBe(true);
    expect(hasRouteAccess("/contracts/17/preview", "super_admin", ["contracts.template_view", "contracts"], false)).toBe(false);
    expect(hasRouteAccess("/contract-templates/1/preview", "super_admin", ["contracts.view"], false)).toBe(false);
    expect(hasRouteAccess("/contracts/17/print", "super_admin", ["contracts.view"], false)).toBe(false);
    expect(getRequiredPermission("/contract-templates/1/preview")).toEqual(["contracts.template_view"]);
  });
});
