import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { TrpcContext } from "./_core/context";
import { CALENDAR_EVENT_TYPES, CALENDAR_PERMISSION_IDS, CALENDAR_MANAGEMENT_PERMISSION_IDS, calendarAccess, calendarPermissionSelection, toggleCalendarPermission, calendarPermissionOverrides } from "../shared/calendarPermissions";
import { REQUEST_MANAGEMENT_REQUIREMENTS } from "../shared/requestPermissions";
import { BENEFICIARY_PERMISSION_IDS, BENEFICIARY_LOG_ACTIONS } from "../shared/beneficiaryPermissions";
import { RETIRED_SECTION_PERMISSIONS, sectionPermissionSelection, sectionPermissionPrerequisite, sectionPermissionDependents } from "../shared/sectionPermissions";
import { hasRouteAccess } from "../client/src/lib/routePermissions";

const state = vi.hoisted(() => ({
  role: "super_admin", permissions: [] as string[], legacy: [] as string[],
  overrides: [] as { permissionId: string; granted: boolean }[],
  writes: [] as string[], queries: [] as string[], evaluations: [] as any[],
}));
vi.mock("./db", () => ({ getDb: async () => {
  const dialect = new MySqlDialect();
  function query(selection?: any): any {
    let table: any, condition: any;
    const chain: any = {
      from: (value: any) => { table = value; return chain; },
      where: (value: any) => { condition = value; return chain; },
      then: (resolve: any, reject: any) => Promise.resolve().then(() => {
        const name = getTableName(table);
        if (name === "users") return [{ id: 0, role: state.role }];
        if (name === "roles") return [{ id: state.role, isActive: true, description: JSON.stringify(state.permissions) }];
        if (name === "role_permissions") return state.legacy.map(permissionId => ({ roleId: state.role, permissionId }));
        if (name === "user_permissions") return state.overrides;
        if (name === "permissions") return [...CALENDAR_PERMISSION_IDS, ...BENEFICIARY_PERMISSION_IDS].map(id => ({ id }));
        const compiled = condition ? dialect.sqlToQuery(condition) : { sql: "", params: [] };
        const own = compiled.params.includes(0);
        state.queries.push(`${name}:${compiled.sql}`);
        const today = new Date().toISOString().slice(0, 10);
        const event = (id: number, assignedToId: number) => ({
          id, requestId: id, scheduledDate: today, scheduledTime: "09:00", assignedToId,
          assignedToName: `Staff ${assignedToId}`, requestNumber: `R-${id}`, mosqueName: "Mosque", status: "scheduled",
          eventDate: today, title: `Custom ${id}`, createdById: assignedToId, createdBy: assignedToId,
        });
        if (name === "field_visits") {
          const rows = [event(1, 0), event(2, 9)].filter(row => !own || row.assignedToId === 0);
          return selection?.count ? [{ count: rows.length }] : rows;
        }
        if (name === "mosque_requests") {
          const quick = selection?.scheduledTime === mosqueRequests.quickResponseScheduledTime || compiled.sql.includes(mosqueRequests.quickResponseScheduledDate.name);
          const final = selection?.scheduledTime === mosqueRequests.finalReportScheduledTime || compiled.sql.includes(mosqueRequests.finalReportScheduledDate.name);
          const rows = (quick ? [event(3, 0), event(4, 9)] : final ? [event(5, 9)] : []).filter(row => !own || row.assignedToId === 0);
          return selection?.count ? [{ count: rows.length }] : rows;
        }
        if (name === "custom_calendar_events") {
          const rows = [event(6, 0), event(7, 9)];
          if (!selection) return rows.filter(row => compiled.params.includes(row.id));
          const visibleRows = rows.filter(row => !own || row.assignedToId === 0);
          return selection.count ? [{ count: visibleRows.length }] : visibleRows;
        }
        if (name === "request_evaluations") return state.evaluations;
        return [];
      }).then(resolve, reject),
    };
    for (const method of ["leftJoin", "innerJoin", "limit", "orderBy", "groupBy", "offset"]) chain[method] = () => chain;
    return chain;
  }
  const write = (table: any) => () => {
    state.writes.push(getTableName(table));
    const result = Promise.resolve([{ insertId: 99 }]);
    return Object.assign(result, { where: () => result });
  };
  return { select: query, insert: (table: any) => ({ values: write(table) }), update: (table: any) => ({ set: write(table) }), delete: (table: any) => ({ where: write(table) }) };
} }));
vi.mock("./routers/notifications", () => ({ createNotification: vi.fn(), notifyUsersByRole: vi.fn(), notifyRequestCreation: vi.fn(), notifyRequestStageChangeToOfficers: vi.fn(), notifyQuotationApproval: vi.fn(), sendEmailNotification: vi.fn(), notifySedanaEvent: vi.fn() }));
vi.mock("./routers/projects", () => ({ generateProjectNumber: vi.fn(), createProjectForSedanaRequest: vi.fn() }));
import { mosqueRequests } from "../drizzle/schema";
import { calculateUserPermissions } from "./permissions";
import { calendarRouter } from "./routers/calendar";
import { requestsRouter } from "./routers/requests";

const ctx = () => ({ user: { id: 0, role: state.role }, req: {}, res: {} } as TrpcContext);
const calendar = () => calendarRouter.createCaller(ctx());
const requests = () => requestsRouter.createCaller(ctx());
const range = { startDate: "2000-01-01", endDate: "2100-01-01" };
beforeEach(() => {
  state.role = "super_admin";
  state.permissions = []; state.legacy = []; state.overrides = []; state.writes = []; state.queries = [];
  state.evaluations = [{ evalId: 1, id: 1, requestId: null, programType: "test", rating: 4, notes: JSON.stringify({ comments: "Feedback", reply: { text: "Private reply" } }) }];
});

describe.each(["super_admin", "system_admin", "custom_role_calendar"])("calendar permissions for %s", role => {
  beforeEach(() => { state.role = role; });
  it.each(REQUEST_MANAGEMENT_REQUIREMENTS)("blocks standard calendar reads and writes after revoking %s", async required => {
    state.permissions = [...CALENDAR_MANAGEMENT_PERMISSION_IDS, ...REQUEST_MANAGEMENT_REQUIREMENTS];
    state.overrides = [{ permissionId: required, granted: false }];
    const effective = await calculateUserPermissions(0);
    expect(hasRouteAccess("/field-visits/calendar", role, effective, false)).toBe(false);
    await expect(calendar().getUnifiedEvents({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(calendar().getCalendarSummaryStats(range)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(calendar().createCustomEvent({ title: "Custom event", eventDate: "2026-11-08" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
    state.permissions = ["appointments.view_own"];
    expect(hasRouteAccess("/field-visits/calendar", role, await calculateUserPermissions(0), false)).toBe(true);
    expect((await calendar().getUnifiedEvents({})).every(event => event.assignedToId === 0)).toBe(true);
  });
  it.each(CALENDAR_EVENT_TYPES)("returns only %s events and statistics", async type => {
    state.permissions = [`appointments.view_${type}`, ...REQUEST_MANAGEMENT_REQUIREMENTS];
    const events = await calendar().getUnifiedEvents({});
    expect(events.length).toBeGreaterThan(0);
    expect(events.every(event => event.type === type)).toBe(true);
    const stats = await calendar().getCalendarSummaryStats(range);
    const keys = { field_visit: "fieldVisits", quick_response: "quickResponse", final_report: "finalReports", custom: "customEvents" } as const;
    for (const other of CALENDAR_EVENT_TYPES) expect(stats[keys[other]]).toBe(other === type ? events.length : 0);
    expect(stats.total).toBe(events.length);
    expect(stats.todayCount).toBe(events.length);
    expect(hasRouteAccess("/field-visits/calendar", role, await calculateUserPermissions(0), false)).toBe(true);
    const other = CALENDAR_EVENT_TYPES.find(t => t !== type)!;
    expect(await calendar().getUnifiedEvents({ eventType: other })).toEqual([]);
    state.overrides = [{ permissionId: `appointments.view_${type}`, granted: false }];
    await expect(calendar().getUnifiedEvents({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("shows only the actor's assigned appointments, including when other calendar rights are present", async () => {
    state.permissions = [...CALENDAR_PERMISSION_IDS];
    expect((await calculateUserPermissions(0)).filter(p => p.startsWith("appointments."))).toEqual(["appointments.view_own"]);
    const events = await calendar().getUnifiedEvents({ assignedTo: 9, ownFieldVisitsOnly: false });
    expect(events).toHaveLength(3);
    expect(events.every(event => event.assignedToId === 0)).toBe(true);
    expect(events.map(event => event.type).sort()).toEqual(["custom", "field_visit", "quick_response"]);
    expect(await calendar().getCalendarSummaryStats(range)).toMatchObject({ fieldVisits: 1, quickResponse: 1, finalReports: 0, customEvents: 1, total: 3, todayCount: 3 });
    await expect(calendar().createCustomEvent({ title: "Custom event", eventDate: "2026-11-08" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("requires a separate custom-event creation permission", async () => {
    state.permissions = ["appointments.view_custom", ...REQUEST_MANAGEMENT_REQUIREMENTS];
    await expect(calendar().createCustomEvent({ title: "Custom event", eventDate: "2026-11-08" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
    state.permissions = ["appointments.create_custom", ...REQUEST_MANAGEMENT_REQUIREMENTS];
    expect(hasRouteAccess("/field-visits/calendar", role, await calculateUserPermissions(0), false)).toBe(true);
    await expect(calendar().createCustomEvent({ title: "Custom event", eventDate: "2026-11-08" })).resolves.toMatchObject({ success: true });
    await expect(calendar().getUnifiedEvents({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("does not allow retired all-calendar access, a wildcard or stale role rows to restore calendar permissions", async () => {
    for (const permission of ["appointments.view_all", "appointments_calendar", "*"]) {
      state.permissions = [permission];
      await expect(calendar().getCalendarSummaryStats(range)).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    state.permissions = ["appointments.view_final_report", ...REQUEST_MANAGEMENT_REQUIREMENTS];
    state.legacy = [...CALENDAR_PERMISSION_IDS];
    expect((await calculateUserPermissions(0)).filter(p => p.startsWith("appointments."))).toEqual(["appointments.view_final_report"]);
  });
});

describe("exclusive personal calendar permission selection", () => {
  it("clears all other calendar rights and preserves unrelated rights", () => {
    const selected = toggleCalendarPermission(["requests.view", ...CALENDAR_PERMISSION_IDS], "appointments.view_own", true);
    expect(selected).toEqual(["requests.view", "appointments.view_own"]);
    expect(calendarPermissionSelection(["requests.view", ...CALENDAR_PERMISSION_IDS])).toEqual(selected);
    expect(calendarAccess([...CALENDAR_PERMISSION_IDS]).canCreateCustom).toBe(false);
    expect(calendarAccess([...CALENDAR_PERMISSION_IDS]).ownOnly).toBe(true);
  });
  it("can switch back to a normal calendar grant without retaining the personal restriction", () => {
    expect(toggleCalendarPermission(["appointments.view_own"], "appointments.view_custom", true)).toEqual(["appointments.view_custom"]);
    expect(calendarPermissionOverrides({}, CALENDAR_PERMISSION_IDS, "appointments.view_own", true)).toMatchObject({
      "appointments.view_custom": false, "appointments.view_field_visit": false, "appointments.create_custom": false,
    });
    expect(calendarPermissionOverrides({}, ["appointments.view_own"], "appointments.create_custom", true)).toEqual({ "appointments.view_own": false, "appointments.create_custom": true });
  });
});

describe("beneficiary survey log prerequisites", () => {
  it.each(BENEFICIARY_LOG_ACTIONS)("requires the evaluations log for %s", async action => {
    state.permissions = ["beneficiary_evaluations.view", action];
    expect(sectionPermissionPrerequisite(action)).toBe("beneficiary_evaluations.evaluations_log");
    expect(sectionPermissionDependents("beneficiary_evaluations.evaluations_log")).toContain(action);
    expect(sectionPermissionSelection(state.permissions)).not.toContain(action);
    expect(await calculateUserPermissions(0)).not.toContain(action);
    state.permissions.push("beneficiary_evaluations.evaluations_log");
    expect(await calculateUserPermissions(0)).toContain(action);
    state.overrides = [{ permissionId: "beneficiary_evaluations.evaluations_log", granted: false }];
    expect(await calculateUserPermissions(0)).not.toContain(action);
    expect(await calculateUserPermissions(0)).toContain("beneficiary_evaluations.view");
  });
  it("does not reveal reply text through rows, raw notes or answers without reply-view permission", async () => {
    state.permissions = ["beneficiary_evaluations.evaluations_log"];
    expect(JSON.stringify(await requests().getAllBeneficiaryEvaluations({}))).not.toContain("Private reply");
    state.permissions.push("beneficiary_evaluations.view_reply");
    expect(JSON.stringify(await requests().getAllBeneficiaryEvaluations({}))).toContain("Private reply");
  });
  it("rejects reply and visibility changes without their parent log permission", async () => {
    state.permissions = ["beneficiary_evaluations.reply", "beneficiary_evaluations.hide"];
    await expect(requests().saveBeneficiaryEvaluationReply({ evalId: 1, replyText: "Reply" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requests().toggleBeneficiaryEvaluationVisibility({ evalId: 1, isHidden: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });
  it("never restores removed permissions or lets retired log permissions open the page", async () => {
    state.permissions = [...RETIRED_SECTION_PERMISSIONS];
    const effective = await calculateUserPermissions(0);
    for (const retired of RETIRED_SECTION_PERMISSIONS) expect(effective).not.toContain(retired);
    expect(hasRouteAccess("/beneficiary-satisfaction", "super_admin", effective, false)).toBe(false);
    await expect(requests().getAllBeneficiaryEvaluations({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

it("allows custom-event creators to edit their own events without granting management of other users' events", async () => {
  state.permissions = ["appointments.view_custom", "appointments.create_custom", ...REQUEST_MANAGEMENT_REQUIREMENTS];
  await expect(calendar().updateCustomEvent({ id: 6, title: "Updated event", eventDate: "2026-11-08" })).resolves.toMatchObject({ success: true });
  state.writes = [];
  await expect(calendar().deleteCustomEvent({ id: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(state.writes).toEqual([]);
});
