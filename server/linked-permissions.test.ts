import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { BENEFICIARY_MANAGEMENT_REQUIREMENT_IDS, LINKED_PERMISSION_TARGETS, linkedPermissionGrantPlan, linkedPermissionPrerequisites, REQUEST_MANAGEMENT_REQUIREMENTS } from "../shared/linkedPermissionDependencies";
import { REQUEST_REPORT_INTERVENTION_PERMISSIONS, requestReportInterventionPrerequisite, requestReportAccess } from "../shared/requestReportPermissions";
import { sectionPermissionSelection, sectionPermissionDependents } from "../shared/sectionPermissions";
import type { TrpcContext } from "./_core/context";

const state = vi.hoisted(() => ({ role: "super_admin", grants: [] as string[], direct: [] as { permissionId: string; granted: boolean }[], roleWrites: [] as any[], userWrites: [] as any[], stale: [] as string[] }));
const catalog = [...new Set(["permissions.create", "permissions.edit", "users.customize", "staff_users.customize", ...LINKED_PERMISSION_TARGETS, ...REQUEST_MANAGEMENT_REQUIREMENTS, ...BENEFICIARY_MANAGEMENT_REQUIREMENT_IDS, "requester_accounts.create", ...REQUEST_REPORT_INTERVENTION_PERMISSIONS.map(id => requestReportInterventionPrerequisite(id)!)])];
vi.mock("./db", () => ({ getDb: async () => {
  const db: any = {};
  db.select = () => {
    let table: any;
    const chain: any = {
      from: (value: any) => { table = value; return chain; },
      then: (resolve: any, reject: any) => Promise.resolve().then(() => {
        const name = getTableName(table);
        if (name === "users") return [{ id: 0, role: state.role }];
        if (name === "roles") return [{ id: state.role, description: JSON.stringify(state.grants), isActive: true }];
        if (name === "permissions") return catalog.map(id => ({ id }));
        if (name === "modules") return [{ id: "requests" }];
        if (name === "role_permissions") return state.stale.map(permissionId => ({ roleId: state.role, permissionId }));
        if (name === "user_permissions") return state.direct;
        return [];
      }).then(resolve, reject),
    };
    for (const name of ["where", "leftJoin", "innerJoin", "limit", "orderBy"]) chain[name] = () => chain;
    return chain;
  };
  const result = () => Object.assign(Promise.resolve([{ insertId: 99 }]), { onConflictDoNothing: async () => [], onDuplicateKeyUpdate: async () => [] });
  db.insert = (table: any) => ({ values: (values: any) => {
    if (getTableName(table) === "roles") state.roleWrites.push(values);
    if (getTableName(table) === "user_permissions") state.userWrites.push(...values);
    return result();
  } });
  db.update = (table: any) => ({ set: (values: any) => ({ where: async () => { if (getTableName(table) === "roles") state.roleWrites.push(values); return []; } }) });
  db.delete = () => ({ where: async () => [] });
  db.transaction = async (operation: any) => operation(db);
  db.execute = async () => [];
  return db;
} }));
import { calculateUserPermissions, permissionsRouter } from "./permissions";
const caller = () => permissionsRouter.createCaller({ user: { id: 0, role: state.role }, req: {}, res: {} } as TrpcContext);
beforeEach(() => {
  state.role = "super_admin"; state.grants = ["permissions.create", "permissions.edit", "users.customize"];
  state.direct = []; state.roleWrites = []; state.userWrites = []; state.stale = [];
  vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {});
});

describe.each(["super_admin", "system_admin", "custom_role_dependencies"])("linked dependency enforcement for %s", role => {
  beforeEach(() => { state.role = role; });
  it.each(LINKED_PERMISSION_TARGETS)("requires every linked grant for %s", async target => {
    const view = requestReportInterventionPrerequisite(target);
    const requirements = linkedPermissionPrerequisites(target);
    const selected = [...state.grants, target, ...requirements, ...(view ? [view] : [])];
    state.grants = selected;
    expect(await calculateUserPermissions(0)).toContain(target);
    for (const required of requirements) {
      state.direct = [{ permissionId: required, granted: false }];
      expect(await calculateUserPermissions(0)).not.toContain(target);
      expect(sectionPermissionDependents(required)).toContain(target);
      expect(sectionPermissionSelection(selected.filter(id => id !== required))).not.toContain(target);
    }
  });
  it("does not restore a missing beneficiary prerequisite through stale role rows or a wildcard", async () => {
    const missing = "requester_inquiries.send_whatsapp";
    state.grants.push("*", "escalation.delayed_beneficiaries", ...BENEFICIARY_MANAGEMENT_REQUIREMENT_IDS.filter(id => id !== missing));
    state.stale = BENEFICIARY_MANAGEMENT_REQUIREMENT_IDS;
    const effective = await calculateUserPermissions(0);
    expect(effective).not.toContain(missing);
    expect(effective).not.toContain("escalation.delayed_beneficiaries");
  });
  it("does not restore unchecked intervention or escalation rights when their prerequisites are granted", async () => {
    state.grants.push("*", ...REQUEST_MANAGEMENT_REQUIREMENTS, ...BENEFICIARY_MANAGEMENT_REQUIREMENT_IDS);
    state.stale = [...LINKED_PERMISSION_TARGETS];
    const effective = await calculateUserPermissions(0);
    for (const target of LINKED_PERMISSION_TARGETS) expect(effective).not.toContain(target);
  });
});

describe("saving linked grants", () => {
  it.each(LINKED_PERMISSION_TARGETS)("rejects incomplete role creation, role edits, and user overrides for %s", async target => {
    const ownView = requestReportInterventionPrerequisite(target);
    const incomplete = [target, ...(ownView ? [ownView] : [])];
    await expect(caller().createRole({ id: "custom_test", nameAr: "Test", nameEn: "Test", permissions: incomplete })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().updateRole({ roleId: "custom_test", permissions: incomplete })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller().setUserDirectPermissions({ userId: 0, permissions: incomplete.map(permissionId => ({ permissionId, granted: true })) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.userWrites).toEqual([]);
    expect(state.roleWrites.filter(value => value.description !== undefined)).toEqual([]);
  });
  it.each(LINKED_PERMISSION_TARGETS)("saves a confirmed complete role grant for %s", async target => {
    const ownView = requestReportInterventionPrerequisite(target);
    const plan = linkedPermissionGrantPlan([target, ...(ownView ? [ownView] : [])], () => false);
    await expect(caller().updateRole({ roleId: "custom_test", permissions: plan.permissions })).resolves.toMatchObject({ success: true });
    const saved = state.roleWrites.find(value => value.description);
    expect(JSON.parse(saved.description)).toContain(target);
    expect(JSON.parse(saved.description)).not.toContain("requester_accounts.create");
  });
  it("combines inherited prerequisites with individual grants, and cascades a revoked parent", async () => {
    state.grants.push(...REQUEST_MANAGEMENT_REQUIREMENTS, "pending_reports.view_field_visit");
    await expect(caller().setUserDirectPermissions({ userId: 0, permissions: [{ permissionId: "pending_reports.intervene_field_visit", granted: true }] })).resolves.toMatchObject({ success: true });
    expect(state.userWrites).toContainEqual(expect.objectContaining({ permissionId: "pending_reports.intervene_field_visit", granted: true }));
    state.grants.push("pending_reports.intervene_field_visit", "escalation.delayed_requests"); state.userWrites = [];
    await expect(caller().setUserDirectPermissions({ userId: 0, permissions: [{ permissionId: "requests.view_details", granted: false }] })).resolves.toMatchObject({ success: true });
    for (const target of ["pending_reports.intervene_field_visit", "escalation.delayed_requests"]) expect(state.userWrites).toContainEqual(expect.objectContaining({ permissionId: target, granted: false }));
  });
  it("includes the two request rights for interventions and delayed requests without adding other request rights", () => {
    for (const target of [...REQUEST_REPORT_INTERVENTION_PERMISSIONS, "escalation.delayed_requests"]) {
      const plan = linkedPermissionGrantPlan([target], () => false);
      expect(plan.missing).toEqual(REQUEST_MANAGEMENT_REQUIREMENTS);
      expect(plan.permissions).not.toContain("requests.create");
    }
    expect(requestReportAccess(["pending_reports.view_field_visit", "pending_reports.intervene_field_visit"]).canIntervene("field_visit")).toBe(false);
  });
});
