import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { TrpcContext } from "./_core/context";
import { PROJECT_PERMISSION_IDS as ids, projectAccess } from "../shared/projectPermissions";
import { hasRouteAccess } from "../client/src/lib/routePermissions";

const state = vi.hoisted(() => ({ role: "super_admin", selected: [] as string[], legacy: [] as string[],
  direct: [] as { permissionId: string; granted: boolean }[], candidatePermissions: [] as string[], candidateStatus: "active",
  candidateDirect: [] as { permissionId: string; granted: boolean }[], writes: [] as any[] }));
vi.mock("./db", () => ({ getDb: async () => {
  const dialect = new MySqlDialect();
  function rows(table: any, condition?: any) {
    const query = condition ? dialect.sqlToQuery(condition) : { sql: "", params: [] };
    const id = query.params.find(param => typeof param === "number");
    switch (getTableName(table)) {
      case "users": {
        const users = [{ id: 1, role: state.role, name: "Actor", status: "active", deletedAt: null },
          { id: 2, role: "project_manager", name: "Candidate", status: state.candidateStatus, deletedAt: null }];
        return users.filter(user => id === undefined ? !query.params.includes("active") || user.status === "active" : user.id === id);
      }
      case "roles": {
        const roles = [{ id: state.role, description: JSON.stringify(state.selected), isActive: true }];
        if (state.role !== "project_manager") roles.push({ id: "project_manager", description: JSON.stringify(state.candidatePermissions), isActive: true });
        return roles.filter(role => query.params.length === 0 || query.params.includes(role.id));
      }
      case "permissions": return ids.map(id => ({ id }));
      case "role_permissions": return state.legacy.map(permissionId => ({ roleId: state.role, permissionId }));
      case "user_permissions": return id === 2 ? state.candidateDirect : state.direct;
      case "projects": return [{ id: 323, projectNumber: "PRJ-2026-0323", name: "مشروع تجريبي", status: "in_progress", managerId: 1, requestId: null, budget: "1000" }];
      default: return [];
    }
  }
  function query(table?: any): any {
    let condition: any;
    const chain: any = { from: (value: any) => { table = value; return chain; },
      where: (value: any) => { condition = value; return chain; },
      then: (resolve: any, reject: any) => Promise.resolve(rows(table, condition)).then(resolve, reject) };
    for (const method of ["limit", "offset", "orderBy", "leftJoin", "innerJoin", "groupBy"]) chain[method] = () => chain;
    return chain;
  }
  const write = (table: any) => (values: any) => {
    state.writes.push({ table: getTableName(table), values });
    const result = Promise.resolve([{ insertId: 91 }]);
    return Object.assign(result, { where: () => result });
  };
  return { select: () => query(), insert: (table: any) => ({ values: write(table) }), update: (table: any) => ({ set: write(table) }) };
} }));
vi.mock("./routers/notifications", () => ({ notifyProjectManagerAssigned: vi.fn(), notifyQuotationCreation: vi.fn(), notifyQuotationApproval: vi.fn() }));
vi.mock("./fund", async original => ({
  ...await original<typeof import("./fund")>(),
  updateProjectAndSettleSurplus: async (_db: any, _id: number, values: any) => { state.writes.push({ table: "projects", values }); return 0; },
}));

import { calculateUserPermissions } from "./permissions";
import { projectsRouter } from "./routers/projects";
import { usersRouter } from "./routers/users";
const context = () => ({ user: { id: 1, role: state.role, name: "Actor" }, req: {}, res: {} } as TrpcContext);
const caller = () => projectsRouter.createCaller(context());
const createInput = { name: "مشروع عدة مساجد", managerId: 2, mosques: [{ mosqueId: 17 }] };
beforeEach(() => {
  state.role = "super_admin"; state.selected = ["projects.view"]; state.legacy = []; state.direct = [];
  state.candidatePermissions = ["projects.view", "projects.assign_as_manager"]; state.candidateDirect = [];
  state.candidateStatus = "active"; state.writes = [];
});

describe.each(["super_admin", "system_admin", "projects_office", "project_manager", "custom_role_test"])("project permissions for %s", role => {
  beforeEach(() => { state.role = role; });
  it("keeps view-only grants despite wildcard, summary and stale role rows", async () => {
    state.selected = ["*", "projects", "projects.view"]; state.legacy = ids;
    expect((await calculateUserPermissions(1)).filter(permission => permission.startsWith("projects"))).toEqual(["projects.view"]);
    expect(hasRouteAccess("/projects", role, await calculateUserPermissions(1), false)).toBe(true);
    expect(hasRouteAccess("/projects/323", role, await calculateUserPermissions(1), false)).toBe(false);
  });
  it.each(ids)("honors an explicit revocation of %s", async permission => {
    state.selected = ["*", ...ids]; state.direct = [{ permissionId: permission, granted: false }];
    expect(await calculateUserPermissions(1)).not.toContain(permission);
    if (permission === "projects.financials") {
      const access = projectAccess(await calculateUserPermissions(1));
      expect(access.canViewFinancials).toBe(false); expect(access.canEditSupportAndFees).toBe(false); expect(access.canAddReceiptVoucher).toBe(false);
    }
  });
  it("does not grant project rights from wildcard or an empty administrator selection", async () => {
    state.selected = ["*"];
    expect((await calculateUserPermissions(1)).filter(permission => permission.startsWith("projects"))).toEqual([]);
    state.selected = []; state.legacy = ids;
    expect((await calculateUserPermissions(1)).filter(permission => permission.startsWith("projects"))).toEqual([]);
  });
});

describe("project routes and server boundaries", () => {
  it("protects the list, details alias and creation route with their own grants", async () => {
    for (const path of ["/projects/323", "/project/323", "/projects/new"]) expect(hasRouteAccess(path, state.role, state.selected, false)).toBe(false);
    state.selected.push("projects.view_details");
    for (const path of ["/projects/323", "/project/323"]) expect(hasRouteAccess(path, state.role, state.selected, false)).toBe(true);
    await expect(caller().getById({ id: 323, scope: "project_page", lightweight: true })).resolves.toHaveProperty("id", 323);
    state.direct = [{ permissionId: "projects.view_details", granted: false }];
    await expect(caller().getById({ id: 323, scope: "project_page" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("blocks the project list when viewing is revoked even for super admin", async () => {
    state.selected = ["*"];
    await expect(caller().search({ page: 1, limit: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("requires the financial view grant and the independent support editing grant", async () => {
    state.selected.push("*");
    await expect(caller().getFinancialData({ projectId: 323, scope: "project" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    state.selected.push("projects.financials");
    await expect(caller().getFinancialData({ projectId: 323, scope: "project" })).resolves.toHaveProperty("receiptVouchers");
    await expect(caller().upsertFinancialDetails({ projectId: 323, supportAmount: 1000 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
    state.selected.push("projects.edit_support_and_fees");
    await expect(caller().upsertFinancialDetails({ projectId: 323, supportAmount: 1000 })).resolves.toMatchObject({ success: true });
    state.writes = []; state.direct = [{ permissionId: "projects.edit_support_and_fees", granted: false }];
    await expect(caller().upsertFinancialDetails({ projectId: 323, supportAmount: 1000 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });
  it("does not let other receipt permissions replace the project voucher grant inside project finances", async () => {
    state.selected.push("projects.financials", "receipt_vouchers.create_project", "*");
    const input = { projectId: 323, source: "project_financials" as const, amount: 100, receiptDate: "2026-11-15" };
    await expect(caller().createReceiptVoucher(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
    state.selected.push("projects.add_receipt_voucher");
    await expect(caller().createReceiptVoucher(input)).resolves.toMatchObject({ success: true });
    state.direct = [{ permissionId: "projects.add_receipt_voucher", granted: false }];
    await expect(caller().createReceiptVoucher(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("project manager eligibility", () => {
  it("uses actual eligibility instead of the project_manager role fallback", async () => {
    const users = () => usersRouter.createCaller(context()).getAll({ permission: "projects.assign_as_manager", roles: ["project_manager"], includeAll: true, limit: 100, page: 1 });
    expect((await users()).items.some(user => user.id === 2)).toBe(true);
    state.candidateDirect = [{ permissionId: "projects.assign_as_manager", granted: false }];
    expect((await users()).items.some(user => user.id === 2)).toBe(false);
  });
  it("requires creation permission and rejects an ineligible manager before writing anything", async () => {
    await expect(caller().createMultiMosqueProject(createInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    state.selected.push("projects.create_multi_mosque"); state.candidatePermissions = ["projects.view"];
    await expect(caller().createMultiMosqueProject(createInput)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.writes).toEqual([]);
    state.candidatePermissions.push("projects.assign_as_manager");
    await expect(caller().createMultiMosqueProject(createInput)).resolves.toMatchObject({ success: true });
  });
  it("checks eligibility on reassignment and honors actor detail revocation", async () => {
    state.selected.push("projects.view_details"); state.candidatePermissions = ["projects.view"];
    await expect(caller().update({ id: 323, managerId: 2 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.writes).toEqual([]);
    state.candidatePermissions.push("projects.assign_as_manager");
    await expect(caller().update({ id: 323, managerId: 2 })).resolves.toMatchObject({ success: true });
    state.direct = [{ permissionId: "projects.view_details", granted: false }];
    await expect(caller().update({ id: 323, managerId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
