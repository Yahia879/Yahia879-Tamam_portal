import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { REQUEST_SECTION_PERMISSION_IDS, requestListAccess } from "../shared/requestPermissions";
import { hasRouteAccess } from "../client/src/lib/routePermissions";
import type { TrpcContext } from "./_core/context";

const state = vi.hoisted(() => ({ role: "super_admin", customized: true, grants: [] as string[], stale: [] as string[], overrides: [] as { permissionId: string; granted: boolean }[], writes: [] as string[] }));
vi.mock("./db", () => ({ getDb: async () => {
  function select(selection?: any): any {
    let table: any, condition: any;
    const chain: any = {
      from: (value: any) => { table = value; return chain; },
      where: (value: any) => { condition = value; return chain; },
      then: (resolve: any, reject: any) => Promise.resolve().then(() => {
        const name = getTableName(table);
        if (name === "users") return [{ id: 0, role: state.role }];
        if (name === "roles") return [{ id: state.role, description: state.customized ? JSON.stringify(state.grants) : null, isActive: true }];
        if (name === "role_permissions") return state.stale.map(permissionId => ({ roleId: state.role, permissionId }));
        if (name === "user_permissions") return state.overrides;
        if (name === "permissions") return REQUEST_SECTION_PERMISSION_IDS.map(id => ({ id }));
        if (name !== "mosque_requests") return [];
        const compiled = condition ? new MySqlDialect().sqlToQuery(condition) : { sql: "", params: [] };
        let rows = [
          { id: 1, programType: "bunyan", requestNumber: "GENERAL_ROW", status: "pending", currentStage: "submitted", assignedTo: 0 },
          { id: 2, programType: "sedana", requestNumber: "SEDANA_ROW", status: "pending", currentStage: "submitted", assignedTo: 0 },
        ];
        if (compiled.sql.includes("!= 'sedana'")) rows = rows.filter(row => row.programType !== "sedana");
        if (/`programType` = \?/.test(compiled.sql) && compiled.params.includes("sedana")) rows = rows.filter(row => row.programType === "sedana");
        if (selection?.request) return rows.map(request => ({ request, mosqueName: "Mosque" }));
        if (selection?.status) return rows.map(row => ({ status: row.status, currentStage: row.currentStage, count: 1 }));
        return selection?.count ? [{ count: rows.length }] : rows;
      }).then(resolve, reject),
    };
    for (const name of ["leftJoin", "innerJoin", "limit", "offset", "orderBy", "groupBy"]) chain[name] = () => chain;
    return chain;
  }
  return { select, insert: (table: any) => ({ values: async () => { state.writes.push(getTableName(table)); return [{ insertId: 99 }]; } }) };
} }));
vi.mock("./routers/notifications", () => ({ createNotification: vi.fn(), notifyUsersByRole: vi.fn(), notifyRequestCreation: vi.fn(), notifyRequestStageChangeToOfficers: vi.fn(), notifyQuotationApproval: vi.fn(), sendEmailNotification: vi.fn(), notifySedanaEvent: vi.fn() }));
vi.mock("./routers/projects", () => ({ generateProjectNumber: vi.fn(), createProjectForSedanaRequest: vi.fn() }));
import { calculateUserPermissions } from "./permissions";
import { requestsRouter } from "./routers/requests";
const caller = () => requestsRouter.createCaller({ user: { id: 0, role: state.role }, req: {}, res: {} } as TrpcContext);
beforeEach(() => {
  state.role = "super_admin"; state.customized = true; state.grants = []; state.stale = []; state.overrides = []; state.writes = [];
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe.each(["super_admin", "system_admin", "field_team", "custom_role_requests"])("request list rights for %s", role => {
  beforeEach(() => { state.role = role; });
  it.each([["requests.view", "GENERAL_ROW"], ["sedana_requests.view", "SEDANA_ROW"]])("scopes rows and statistics to %s", async (permission, row) => {
    state.grants = [permission];
    const result = await caller().search({});
    expect(result.requests.map(r => r.requestNumber)).toEqual([row]);
    expect(result.total).toBe(1);
    expect(result.stats?.pending).toBe(1);
    state.overrides = [{ permissionId: permission, granted: false }];
    await expect(caller().search({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(hasRouteAccess("/requests", role, await calculateUserPermissions(0), false)).toBe(false);
  });
  it("never restores unchecked rights from stale rows, wildcard or management grants", async () => {
    state.stale = [...REQUEST_SECTION_PERMISSION_IDS];
    state.grants = ["requests.view", "requests.manage_as_quick_response", "*"];
    const effective = await calculateUserPermissions(0);
    expect(effective.filter(p => REQUEST_SECTION_PERMISSION_IDS.includes(p)).sort()).toEqual(["requests.manage_as_quick_response", "requests.view"]);
    expect(requestListAccess(effective).canViewDetails("bunyan")).toBe(false);
    expect(requestListAccess(effective).canViewSedana).toBe(false);
  });
  it("requires explicit quick-request creation and review-note rights", async () => {
    state.grants = ["requests.view", "requests.manage_as_quick_response", "*"];
    await expect(caller().createQuickRequest({ programType: "bunyan", technicalEvaluation: "Evaluation", actionsTaken: "Actions", status: "fully_solved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().addReviewNote({ requestId: 1, note: "Review note" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });
});

it("does not let a wildcard open the request list or bypass the query through another section's flag", async () => {
  state.grants = ["*"];
  expect(hasRouteAccess("/requests", state.role, await calculateUserPermissions(0), false)).toBe(false);
  await expect(caller().search({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller().search({ boqPreparationsView: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller().search({ quotationsView: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
});

it.each(["super_admin", "system_admin"])("honors every direct revocation on the default %s role", async role => {
  state.role = role; state.customized = false;
  for (const permission of REQUEST_SECTION_PERMISSION_IDS) {
    state.overrides = [{ permissionId: permission, granted: false }];
    expect(await calculateUserPermissions(0)).not.toContain(permission);
  }
  state.overrides = REQUEST_SECTION_PERMISSION_IDS.map(permissionId => ({ permissionId, granted: false }));
  await expect(caller().search({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(hasRouteAccess("/requests", role, await calculateUserPermissions(0), false)).toBe(false);
  expect(hasRouteAccess("/requests/1", role, await calculateUserPermissions(0), false)).toBe(false);
  expect(hasRouteAccess("/requests/quick-create", role, await calculateUserPermissions(0), false)).toBe(false);
});
