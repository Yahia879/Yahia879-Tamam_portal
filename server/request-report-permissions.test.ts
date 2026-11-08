import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { REQUEST_REPORT_PERMISSION_IDS, REQUEST_REPORT_TYPES, requestReportAccess, isQuickRequestReport, requestReportPermissionSelection, requestReportInterventionPrerequisite, requestReportDependentIntervention } from "../shared/requestReportPermissions";
import { hasRouteAccess } from "../client/src/lib/routePermissions";
import { REQUEST_MANAGEMENT_REQUIREMENTS } from "../shared/requestPermissions";

const state = vi.hoisted(() => ({
  role: "super_admin", selected: [] as string[], legacy: [] as string[],
  direct: [] as { permissionId: string; granted: boolean }[],
  requests: [] as any[], records: {} as Record<string, any[]>, writes: [] as string[],
}));
vi.mock("./db", () => ({ getDb: async () => {
  function rows(table: any, selection?: any) {
    const name = getTableName(table);
    if (name === "users") return [{ id: 0, role: state.role, name: "User" }];
    if (name === "roles") return [{ id: state.role, description: JSON.stringify(state.selected), isActive: true }];
    if (name === "role_permissions") return state.legacy.map(permissionId => ({ roleId: state.role, permissionId }));
    if (name === "user_permissions") return state.direct;
    if (name === "permissions") return ["field_visit", "quick_response", "quick_request", "final_report"].flatMap(t => [{ id: `pending_reports.view_${t}` }, { id: `pending_reports.intervene_${t}` }]);
    if (name === "mosque_requests") return selection?.request ? state.requests.map(request => ({ request, mosque: { name: "Mosque", city: "City" } })) : state.requests;
    return state.records[name] ?? [];
  }
  function query(selection?: any): any {
    let table: any;
    const chain: any = {
      from: (value: any) => { table = value; return chain; },
      then: (resolve: any, reject: any) => Promise.resolve(rows(table, selection)).then(resolve, reject),
    };
    for (const method of ["where", "limit", "orderBy", "leftJoin", "innerJoin", "groupBy", "offset"]) chain[method] = () => chain;
    return chain;
  }
  const write = (table: any) => () => {
    state.writes.push(getTableName(table));
    const result = Promise.resolve([{ insertId: 99 }]);
    return Object.assign(result, { where: () => result });
  };
  return { select: (selection?: any) => query(selection), insert: (table: any) => ({ values: write(table) }), update: (table: any) => ({ set: write(table) }) };
} }));
vi.mock("./routers/notifications", () => ({
  notifyUsersByRole: vi.fn(), createNotification: vi.fn(), notifyRequestCreation: vi.fn(),
  notifyRequestStageChangeToOfficers: vi.fn(), notifyQuotationApproval: vi.fn(), sendEmailNotification: vi.fn(), notifySedanaEvent: vi.fn(),
}));
vi.mock("./routers/projects", () => ({ generateProjectNumber: vi.fn(), createProjectForSedanaRequest: vi.fn() }));

import { calculateUserPermissions } from "./permissions";
import { requestsRouter } from "./routers/requests";
import { finalReportsRouter } from "./routers/finalReports";
import { fieldVisitReports, quickResponseReports, finalReports } from "../drizzle/schema";
const ctx = () => ({ user: { id: 0, role: state.role }, req: {}, res: {} } as TrpcContext);
const caller = () => requestsRouter.createCaller(ctx());

beforeEach(() => {
  state.role = "super_admin";
  state.selected = [...REQUEST_REPORT_PERMISSION_IDS, ...REQUEST_MANAGEMENT_REQUIREMENTS];
  state.legacy = [];
  state.direct = [];
  state.writes = [];
  state.requests = REQUEST_REPORT_TYPES.map((type, index) => ({
    id: index + 1, requestNumber: `REQ-${type}`, userId: 99, programType: "test", status: "approved",
    currentStage: type === "quick_request" ? "closed" : type === "field_visit" ? "field_visit" : "execution",
    requestTrack: type === "quick_response" || type === "quick_request" ? "quick_response" : "normal",
    programData: type === "quick_request" ? { source: "quick_create" } : {},
    fieldVisitAssignedTo: type === "field_visit" ? 9 : null,
    assignedTo: type === "quick_response" || type === "quick_request" ? 9 : null,
    finalReportAssignedTo: type === "final_report" ? 9 : null,
  }));
  state.records = {
    [getTableName(fieldVisitReports)]: [{ id: 10, requestId: 1 }],
    [getTableName(quickResponseReports)]: [{ id: 20, requestId: 2 }, { id: 30, requestId: 3 }],
    [getTableName(finalReports)]: [{ id: 40, requestId: 4 }],
  };
});

describe.each(["super_admin", "system_admin", "custom_role_reports"])("request report permissions for %s", role => {
  beforeEach(() => { state.role = role; });
  it.each(REQUEST_REPORT_TYPES)("returns only %s rows, totals and statistics", async type => {
    state.selected = [`pending_reports.view_${type}`];
    const result = await caller().getPendingReports({});
    expect(result.reports.map(r => r.reportType)).toEqual([type]);
    expect(result.total).toBe(1);
    expect(result.stats.totalCount).toBe(1);
    expect(result.stats.quickRequestsCount).toBe(type === "quick_request" ? 1 : 0);
    const other = REQUEST_REPORT_TYPES.find(t => t !== type)!;
    expect((await caller().getPendingReports({ typeFilter: other })).reports).toEqual([]);
    expect((await caller().getPendingReports({ types: [other] })).total).toBe(0);
    expect(hasRouteAccess("/pending-reports", role, await calculateUserPermissions(0), false)).toBe(true);
  });
  it.each(REQUEST_REPORT_PERMISSION_IDS)("honors revocation of %s", async permission => {
    state.direct = [{ permissionId: permission, granted: false }];
    const effective = await calculateUserPermissions(0);
    expect(effective).not.toContain(permission);
    if (permission.includes(".view_")) {
      const result = await caller().getPendingReports({});
      expect(result.reports.some(r => `pending_reports.view_${r.reportType}` === permission)).toBe(false);
      expect(result.total).toBe(3);
    }
  });
  it.each(["pending_reports", "pending_reports.view", "pending_reports.intervene", "*"])("does not accept retired permissions or wildcard: %s", async permission => {
    state.selected = [permission];
    await expect(caller().getPendingReports({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(hasRouteAccess("/pending-reports", role, await calculateUserPermissions(0), false)).toBe(false);
  });
  it("does not restore unchecked report types through stale role rows", async () => {
    state.selected = ["pending_reports", "pending_reports.view_field_visit"];
    state.legacy = [...REQUEST_REPORT_PERMISSION_IDS];
    expect((await calculateUserPermissions(0)).filter(p => p.startsWith("pending_reports"))).toEqual(["pending_reports.view_field_visit"]);
  });
});

describe("report access and intervention boundaries", () => {
  it("returns only field reports in a scoped preview, including for a custom role", async () => {
    state.role = "custom_role_reports";
    state.selected = ["pending_reports.view_field_visit"];
    state.requests = [state.requests[0]];
    const result = await caller().getById({ id: 1, reportType: "field_visit" });
    expect(result.fieldReports).toHaveLength(1);
    expect(result.quickReports).toEqual([]);
  });

  it.each(REQUEST_REPORT_TYPES)("allows intervention for %s only with its own permission", async type => {
    state.role = "custom_role_reports";
    state.selected = [`pending_reports.view_${type}`, `pending_reports.intervene_${type}`, ...REQUEST_MANAGEMENT_REQUIREMENTS];
    const request = state.requests[REQUEST_REPORT_TYPES.indexOf(type)];
    state.requests = [request];
    if (type === "final_report") {
      request.currentStage = "handover";
      await expect(finalReportsRouter.createCaller(ctx()).create({ requestId: request.id, intervention: true, summary: "Report" })).resolves.toMatchObject({ success: true });
    } else if (type === "field_visit") {
      await expect(caller().addFieldVisitReport({ requestId: request.id, intervention: true, visitDate: "2026-11-08" })).resolves.toMatchObject({ success: true });
    } else {
      await expect(caller().addQuickResponseReport({ requestId: request.id, intervention: true, responseDate: "2026-11-08", issueDescription: "Issue", actionsTaken: "Actions" })).resolves.toMatchObject({ success: true });
    }
    expect(state.writes.length).toBeGreaterThan(0);
  });

  it("keeps completed quick responses in their own category and retains unassigned field reports", async () => {
    state.requests[1].currentStage = "closed";
    state.requests[0].fieldVisitAssignedTo = null;
    const result = await caller().getPendingReports({});
    expect(result.reports.map(r => r.reportType).sort()).toEqual([...REQUEST_REPORT_TYPES].sort());
  });
  it.each(REQUEST_REPORT_TYPES)("viewing %s does not permit intervening", async type => {
    state.selected = [`pending_reports.view_${type}`];
    expect(requestReportAccess(await calculateUserPermissions(0)).canIntervene(type)).toBe(false);
    await expect(caller().getById({ id: 1, reportType: type, reportAccess: "intervene" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it.each(REQUEST_REPORT_TYPES)("requires the matching view permission to activate %s intervention", async type => {
    const view = `pending_reports.view_${type}`;
    const intervention = `pending_reports.intervene_${type}`;
    const other = REQUEST_REPORT_TYPES.find(t => t !== type)!;
    state.selected = [intervention, `pending_reports.view_${other}`, ...REQUEST_MANAGEMENT_REQUIREMENTS];
    expect(requestReportInterventionPrerequisite(intervention)).toBe(view);
    expect(requestReportDependentIntervention(view)).toBe(intervention);
    expect(requestReportPermissionSelection(state.selected)).not.toContain(intervention);
    expect(requestReportAccess(state.selected).canIntervene(type)).toBe(false);
    expect(await calculateUserPermissions(0)).not.toContain(intervention);
    await expect(caller().getById({ id: 1, reportType: type, reportAccess: "intervene" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    state.selected.push(view);
    expect(await calculateUserPermissions(0)).toContain(intervention);
    state.direct = [{ permissionId: view, granted: false }];
    expect(await calculateUserPermissions(0)).not.toContain(intervention);
  });
  it("combines report view and intervention grants from roles and individual permissions", async () => {
    state.selected = ["pending_reports.intervene_field_visit", ...REQUEST_MANAGEMENT_REQUIREMENTS];
    state.direct = [{ permissionId: "pending_reports.view_field_visit", granted: true }];
    expect(await calculateUserPermissions(0)).toContain("pending_reports.intervene_field_visit");
    state.selected = ["pending_reports.view_field_visit", ...REQUEST_MANAGEMENT_REQUIREMENTS];
    state.direct = [{ permissionId: "pending_reports.intervene_field_visit", granted: true }];
    expect(await calculateUserPermissions(0)).toContain("pending_reports.intervene_field_visit");
  });
  it("rejects a scoped preview of a report type that was not granted", async () => {
    state.selected = ["pending_reports.view_field_visit"];
    await expect(caller().getById({ id: 2, reportType: "quick_response" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(finalReportsRouter.createCaller(ctx()).getWithDetails({ reportId: 40, reportSource: "pending_reports" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("does not allow other report viewers to bypass final-report permission through older read endpoints", async () => {
    state.role = "custom_role_reports";
    state.selected = ["pending_reports.view_field_visit"];
    const finalCaller = finalReportsRouter.createCaller(ctx());
    await expect(finalCaller.getWithDetails({ reportId: 40 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(finalCaller.getByRequestId({ requestId: 4 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(finalCaller.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("does not let a quick-response permission read or modify quick-request reports", async () => {
    state.selected = ["pending_reports.view_quick_response", "pending_reports.intervene_quick_response", ...REQUEST_MANAGEMENT_REQUIREMENTS];
    state.requests = [state.requests[2]];
    await expect(caller().getById({ id: 3, reportType: "quick_response" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().addQuickResponseReport({ requestId: 3, intervention: true, responseDate: "2026-11-08", issueDescription: "issue", actionsTaken: "actions" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });
  it("does not let other interventions upload field or final reports, even for administrators", async () => {
    state.selected = ["pending_reports.intervene_quick_request"];
    await expect(caller().addFieldVisitReport({ requestId: 1, intervention: true, visitDate: "2026-11-08" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(finalReportsRouter.createCaller(ctx()).create({ requestId: 4, intervention: true, summary: "Report" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });
  it("uses the source of a quick request instead of treating all closed quick responses as quick requests", () => {
    expect(isQuickRequestReport({ requestTrack: "quick_response", programData: {} })).toBe(false);
    expect(isQuickRequestReport({ requestTrack: "quick_response", programData: '{"source":"quick_create"}' })).toBe(true);
  });
});
