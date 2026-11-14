import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { PROGRESS_REPORT_PERMISSION_IDS as ids } from "../shared/progressReportPermissions";
import { hasRouteAccess } from "../client/src/lib/routePermissions";

const state = vi.hoisted(() => ({ role: "super_admin", selected: [] as string[], legacy: [] as string[],
  direct: [] as { permissionId: string; granted: boolean }[], report: {} as any, managerId: 1,
  writes: [] as { table: string; values: any }[] }));
vi.mock("./db", () => ({ getDb: async () => {
  function rows(table: any) {
    switch (getTableName(table)) {
      case "users": return [{ id: 1, role: state.role, name: "User" }];
      case "roles": return [{ id: state.role, description: JSON.stringify(state.selected), isActive: true }];
      case "permissions": return ids.map(id => ({ id }));
      case "role_permissions": return state.legacy.map(permissionId => ({ roleId: state.role, permissionId }));
      case "user_permissions": return state.direct;
      case "progress_reports": return [{ ...state.report, projectManagerId: state.managerId }];
      case "projects": return [{ id: 17, managerId: state.managerId, budget: "1000" }];
      default: return [];
    }
  }
  function query(table?: any): any {
    const chain: any = { from: (value: any) => { table = value; return chain; },
      then: (resolve: any, reject: any) => Promise.resolve(rows(table)).then(resolve, reject) };
    for (const method of ["where", "limit", "offset", "orderBy", "leftJoin", "innerJoin", "groupBy"]) chain[method] = () => chain;
    return chain;
  }
  const write = (table: any) => (values: any) => {
    state.writes.push({ table: getTableName(table), values });
    if (getTableName(table) === "progress_reports") Object.assign(state.report, values);
    const result = Promise.resolve([{ insertId: 91 }]);
    return Object.assign(result, { where: () => result });
  };
  return { select: () => query(), insert: (table: any) => ({ values: write(table) }), update: (table: any) => ({ set: write(table) }) };
} }));
vi.mock("./routers/notifications", () => ({ notifyProgressReportCreation: vi.fn(), notifyProgressReportApproval: vi.fn(), createNotification: vi.fn() }));

import { calculateUserPermissions } from "./permissions";
import { progressReportsRouter } from "./routers/progressReports";
const caller = () => progressReportsRouter.createCaller({ user: { id: 1, role: state.role, name: "User" }, req: {}, res: {} } as TrpcContext);
const createInput = { projectId: 17, title: "تقرير إنجاز أول", reportDate: "2026-11-15", workSummary: "تفاصيل الأعمال" };
beforeEach(() => {
  state.role = "super_admin"; state.selected = ["progress_reports.view"]; state.direct = []; state.legacy = []; state.writes = []; state.managerId = 1;
  state.report = { id: 33, projectId: 17, reportNumber: "RPT-2026-001", title: "تقرير إنجاز أول", workSummary: "تفاصيل الأعمال", status: "pending", createdBy: 1 };
});

describe.each(["super_admin", "system_admin", "project_manager", "executive_director", "custom_role_test"])("report permission selection for %s", role => {
  beforeEach(() => { state.role = role; });
  it("preserves view-only selection despite wildcard, section summary and stale role rows", async () => {
    state.selected = ["*", "progress_reports", "progress_reports.view"]; state.legacy = ids;
    expect((await calculateUserPermissions(1)).filter(permission => permission.startsWith("progress_reports"))).toEqual(["progress_reports.view"]);
  });
  it.each(ids)("honors an explicit revocation of %s", async permission => {
    state.selected = ["*", ...ids]; state.direct = [{ permissionId: permission, granted: false }];
    expect(await calculateUserPermissions(1)).not.toContain(permission);
    if (permission === "progress_reports.view") expect(hasRouteAccess("/progress-reports", role, await calculateUserPermissions(1), false)).toBe(false);
  });
  it("does not infer report rights from wildcard or report permissions", async () => {
    state.selected = ["*", "reports.view", "analytics_hub.progress", "progress_invoices.view", "progress_invoices.approve"];
    expect((await calculateUserPermissions(1)).filter(permission => permission.startsWith("progress_reports"))).toEqual([]);
  });
});

describe("report mutations require their own permission", () => {
  it.each(["add", "edit", "approve", "revoke_approval", "exception_approve"])("does not replace %s with report permissions or administrator identity", async action => {
    state.selected = ["*", "progress_reports.view", "reports.create", "project_reports.create", "progress_invoices.add", "progress_invoices.edit", "progress_invoices.approve", "progress_invoices.revoke_approval", "progress_invoices.exception_approve"];
    const run = () => {
      if (action === "add") return caller().create(createInput);
      if (action === "edit") return caller().update({ id: 33, title: "تقرير إنجاز معدّل" });
      if (action === "approve") return caller().approve({ id: 33 });
      if (action === "exception_approve") { state.managerId = 2; return caller().exceptionApprove({ id: 33, notes: "مبرر الاستثناء" }); }
      state.report.status = "approved"; return caller().revokeApproval({ id: 33 });
    };
    await expect(run()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
    state.selected.push(`progress_reports.${action}`);
    await expect(run()).resolves.toBeDefined();
    expect(state.writes.some(write => write.table === "progress_reports")).toBe(true);
  });
  it("requires view permission for the report list even for administrators", async () => {
    await expect(caller().list({ kind: "report" })).resolves.toHaveLength(1);
    state.direct = [{ permissionId: "progress_reports.view", granted: false }];
    await expect(caller().list({ kind: "report" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().getById({ id: 33 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("report approval chain", () => {
  beforeEach(() => { state.selected = ["progress_reports.view", "progress_reports.approve"]; });
  it("moves from the assigned project manager to the executive director without skipping either stage", async () => {
    state.role = "project_manager";
    await expect(caller().approve({ id: 33 })).resolves.toMatchObject({ status: "pending_executive" });
    expect(state.report.managerApprovedBy).toBe(1);
    await expect(caller().approve({ id: 33 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    state.role = "executive_director";
    await expect(caller().approve({ id: 33 })).resolves.toMatchObject({ status: "approved" });
    expect(state.report.approvedBy).toBe(1);
  });
  it("does not allow an executive director or super admin to bypass the assigned project manager", async () => {
    state.managerId = 2;
    for (const role of ["super_admin", "executive_director"]) {
      state.role = role;
      await expect(caller().approve({ id: 33 })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller().reject({ id: 33, reason: "رفض" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(state.writes).toEqual([]);
  });
  it("requires approval permission at both stages, including rejection", async () => {
    for (const [role, status] of [["project_manager", "pending"], ["executive_director", "pending_executive"]]) {
      state.role = role; state.report.status = status;
      state.direct = [{ permissionId: "progress_reports.approve", granted: false }];
      await expect(caller().approve({ id: 33 })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller().reject({ id: 33, reason: "رفض" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(state.writes).toEqual([]);
  });
  it("lets the responsible approver reject at each stage", async () => {
    for (const [role, status] of [["project_manager", "pending"], ["executive_director", "pending_executive"]]) {
      state.role = role; state.report.status = status;
      await expect(caller().reject({ id: 33, reason: "رفض" })).resolves.toMatchObject({ success: true });
      expect(state.report.status).toBe("rejected");
    }
  });
  it("keeps an exception at pending executive approval and requires a reason", async () => {
    state.managerId = 2; state.selected.push("progress_reports.exception_approve");
    await expect(caller().exceptionApprove({ id: 33, notes: " " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().exceptionApprove({ id: 33, notes: "تعذر اعتماد مدير المشروع" })).resolves.toMatchObject({ success: true });
    expect(state.report.status).toBe("pending_executive");
    expect(state.report.isException).toBe(true);
    expect(state.report.approvedBy).toBeUndefined();
  });
  it("blocks compatibility endpoints from bypassing the chain or resetting a final approval", async () => {
    state.selected.push("*");
    await expect(caller().review({ id: 33, status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().updateStatus({ id: 33, status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    state.report.status = "approved"; state.selected.push("progress_reports.add");
    await expect(caller().submit({ id: 33 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.writes).toEqual([]);
  });
});

describe("revocation reasons and separate project reports", () => {
  it("returns a revoked report reason only while its dedicated permission is granted", async () => {
    state.report.status = "revoked"; state.report.rejectionReason = "سبب إلغاء خاص";
    expect((await caller().list({ kind: "report" }))[0].rejectionReason).toBeNull();
    expect((await caller().getById({ id: 33 }))?.rejectionReason).toBeNull();
    state.selected.push("progress_reports.view_revoke_reason");
    expect((await caller().list({ kind: "report" }))[0].rejectionReason).toBe("سبب إلغاء خاص");
    expect((await caller().getById({ id: 33 }))?.rejectionReason).toBe("سبب إلغاء خاص");
    state.direct = [{ permissionId: "progress_reports.view_revoke_reason", granted: false }];
    expect((await caller().getById({ id: 33 }))?.rejectionReason).toBeNull();
  });
  it.each(["تقرير نصف شهري", "التقرير الشهري", "التقرير الربعي", "تقرير زيارة"])("preserves the existing %s workflow", async title => {
    state.selected = ["project_reports.create"];
    await expect(caller().create({ ...createInput, title })).resolves.toHaveProperty("id");
    state.report.title = title;
    await expect(caller().updateStatus({ id: 33, status: "approved" })).resolves.toMatchObject({ success: true });
    expect(state.report.status).toBe("approved");
  });
  it("does not use an empty saved administrator role or direct analytics grant to restore report access", async () => {
    state.selected = []; state.legacy = ids;
    expect((await calculateUserPermissions(1)).filter(permission => permission.startsWith("progress_reports"))).toEqual([]);
    state.direct = [{ permissionId: "analytics_hub.progress", granted: true }];
    expect(await calculateUserPermissions(1)).not.toContain("progress_reports.view");
  });
});
