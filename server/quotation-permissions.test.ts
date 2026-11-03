import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { GENERAL_QUOTATION_PERMISSION_IDS, SEDANA_QUOTATION_ACTIONS, quotationPermissionOptions, quotationPermissionSelection } from "../shared/quotationPermissions";
import { hasRouteAccess } from "../client/src/lib/routePermissions";

const state = vi.hoisted(() => ({
  role: "super_admin", selected: [] as string[], direct: [] as { permissionId: string; granted: boolean }[],
  program: "enaya", writes: [] as { table: string; values: any }[],
  staleRolePermissions: [] as string[],
}));

vi.mock("./routers/notifications", () => ({
  notifyQuotationCreation: vi.fn(), notifyQuotationApproval: vi.fn(), notifyProjectManagerAssigned: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: async () => {
  function rows(table: any, fields: any) {
    const name = getTableName(table);
    if (name === "users") return [{ id: 0, role: state.role }];
    if (name === "roles") return [{ id: state.role, description: JSON.stringify(state.selected), isActive: true }];
    if (name === "role_permissions") return [...state.selected, ...state.staleRolePermissions].map(permissionId => ({ roleId: state.role, permissionId }));
    if (name === "user_permissions") return state.direct;
    if (name === "permissions") return [...GENERAL_QUOTATION_PERMISSION_IDS, ...SEDANA_QUOTATION_ACTIONS.map(p => `sedana_quotations.${p}`)].map(id => ({ id }));
    if (name === "mosque_requests") return [{ id: 17, programType: state.program, requestNumber: "REQ-17", currentStage: "financial_eval_and_approval", selectedQuotationId: null }];
    if (name === "quantity_schedules") return [{ id: 1, requestId: 17, quantity: "1", unitPrice: "10" }];
    if (name === "quotations") {
      // BOQ mutations check for an accepted quote; our fixture is still pending.
      if (fields && Object.keys(fields).length === 1 && fields.id) return [];
      return [{ id: 1, requestId: 17, projectId: null, quotationNumber: "Q-1", status: "pending", supplierId: 1, totalAmount: "100", finalAmount: "100" }];
    }
    return [];
  }
  function query(fields?: any): any {
    let table: any;
    const chain: any = { from: (t: any) => { table = t; return chain; }, then: (resolve: any, reject: any) => Promise.resolve(rows(table, fields)).then(resolve, reject) };
    for (const method of ["where", "limit", "orderBy", "leftJoin", "innerJoin", "groupBy", "offset"]) chain[method] = () => chain;
    return chain;
  }
  const write = (table: any) => (values: any) => {
    state.writes.push({ table: getTableName(table), values });
    const result = Promise.resolve([{ insertId: 99 }]);
    return Object.assign(result, { where: () => result });
  };
  return { select: query, update: (t: any) => ({ set: write(t) }), insert: (t: any) => ({ values: write(t) }), delete: (t: any) => ({ where: () => { state.writes.push({ table: getTableName(t), values: "deleted" }); return Promise.resolve(); } }) };
} }));

import { calculateUserPermissions, checkPermission } from "./permissions";
import { projectsRouter } from "./routers/projects";

const caller = () => projectsRouter.createCaller({ user: { id: 0, role: state.role }, req: {}, res: {} } as TrpcContext);
const manualQuote = { requestId: 17, supplierId: 1, totalAmount: 100, items: [{ boqItemId: 1, itemName: "Item", quantity: 1, unitPrice: 100, totalPrice: 100 }] };

beforeEach(() => {
  state.role = "super_admin";
  state.selected = ["quotations.view"];
  state.direct = [];
  state.program = "enaya";
  state.writes = [];
  state.staleRolePermissions = [];
});

describe("quotation permissions and roles", () => {
  it.each([...GENERAL_QUOTATION_PERMISSION_IDS, ...SEDANA_QUOTATION_ACTIONS.map(p => `sedana_quotations.${p}`)])("honors super_admin revocation of %s", async permission => {
    state.selected = [...GENERAL_QUOTATION_PERMISSION_IDS, ...SEDANA_QUOTATION_ACTIONS.map(p => `sedana_quotations.${p}`)];
    state.direct = [{ permissionId: permission, granted: false }];
    expect(await checkPermission(0, permission)).toBe(false);
  });
  it("does not restore unchecked actions through the navigation summary", async () => {
    state.selected = ["quotations", "quotations.view", "quotations.add"];
    const permissions = await calculateUserPermissions(0);
    expect(permissions).toContain("quotations.add");
    for (const p of ["quotations.approve", "quotations.template_upload", "quotations.link_add", "quotations.edit", "quotations.view_sedana"]) expect(permissions).not.toContain(p);
  });
  it("keeps legacy roles reviewable without silently restoring removed checkboxes", () => {
    expect(quotationPermissionOptions(["quotations"])).toEqual(GENERAL_QUOTATION_PERMISSION_IDS);
    expect(quotationPermissionSelection(["quotations", "quotations.view", "quotations.edit"])).toEqual(["quotations.view"]);
  });
  it("keeps general and Sedana view permissions independent", async () => {
    state.selected = ["sedana_quotations.view"];
    expect(await checkPermission(0, "quotations.view")).toBe(false);
    state.selected = ["quotations.view"];
    expect(await checkPermission(0, "sedana_quotations.view")).toBe(false);
  });
  it("does not restore withdrawn role permissions from stale default assignments", async () => {
    state.selected = ["quotations.view", "sedana_quotations.view"];
    state.staleRolePermissions = ["quotations.approve", "sedana_quotations.add", "sedana_quotations.approve"];
    const permissions = await calculateUserPermissions(0);
    expect(permissions).not.toContain("quotations.approve");
    expect(permissions).not.toContain("sedana_quotations.add");
    expect(permissions).not.toContain("sedana_quotations.approve");
  });
  it("respects customized procurement-role quotation permissions", async () => {
    state.role = "procurement_officer";
    state.selected = ["sedana_quotations.view"];
    expect(await checkPermission(0, "quotations.add")).toBe(false);
    expect(await checkPermission(0, "quotations.view")).toBe(false);
  });
  it.each(["super_admin", "system_admin", "custom_role_test"])("does not bypass quotation routes with wildcard for %s", role => {
    expect(hasRouteAccess("/quotations", role, ["*"], true)).toBe(false);
    expect(hasRouteAccess("/quotations", role, ["quotations.view"], true)).toBe(true);
    expect(hasRouteAccess("/quotations", role, ["sedana_quotations.view"], true)).toBe(true);
  });
});

describe("quotation entry methods", () => {
  it("blocks all creation methods for view-only users", async () => {
    for (const entryMethod of ["manual", "template", "link"] as const) {
      const payload = entryMethod === "link" ? { ...manualQuote, totalAmount: 0, items: [], documentUrl: "https://example.com/quote" } : manualQuote;
      await expect(caller().createQuotation({ ...payload, entryMethod })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(state.writes).toEqual([]);
  });
  it("grants manual creation without granting template upload or links", async () => {
    state.selected.push("quotations.add");
    await expect(caller().createQuotation(manualQuote)).resolves.toMatchObject({ id: 99 });
    await expect(caller().createQuotation({ ...manualQuote, entryMethod: "template" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().createQuotation({ ...manualQuote, totalAmount: 0, items: [], documentUrl: "https://example.com" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("allows template upload without manual-add permission", async () => {
    state.selected.push("quotations.template_upload");
    await expect(caller().createQuotation({ ...manualQuote, entryMethod: "template" })).resolves.toMatchObject({ id: 99 });
    await expect(caller().createQuotation(manualQuote)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("allows links independently and rejects using a link permission to create financial offers", async () => {
    state.selected.push("quotations.link_add");
    await expect(caller().createQuotation({ ...manualQuote, entryMethod: "link", totalAmount: 0, items: [], documentUrl: "https://example.com" })).resolves.toMatchObject({ id: 99 });
    await expect(caller().createQuotation({ ...manualQuote, entryMethod: "link", documentUrl: "https://example.com" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("does not let general quotation permissions create or read Sedana offers", async () => {
    state.program = "sedana";
    state.selected = [...GENERAL_QUOTATION_PERMISSION_IDS];
    await expect(caller().createQuotation(manualQuote)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().getQuotationsByRequest({ requestId: 17, permissionScope: "quotations" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("keeps the existing Sedana add permission effective on Sedana offers", async () => {
    state.program = "sedana";
    state.selected = ["sedana_quotations.view", "sedana_quotations.add"];
    await expect(caller().createQuotation(manualQuote)).resolves.toMatchObject({ id: 99 });
    await expect(caller().getQuotationsByRequest({ requestId: 17, permissionScope: "quotations" })).resolves.toHaveProperty("quotations");
  });
  it("preserves related contract reads without granting the quotation page", async () => {
    state.selected = ["contracts.view"];
    await expect(caller().getQuotationsByRequest({ requestId: 17 })).resolves.toHaveProperty("quotations");
    await expect(caller().getQuotationsByRequest({ requestId: 17, permissionScope: "quotations" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("quotation approval and BOQ boundaries", () => {
  it("blocks approval, rejection, and restoring review without approval permission, even for super_admin", async () => {
    state.selected.push("*");
    for (const status of ["accepted", "rejected", "pending"] as const) await expect(caller().updateQuotationStatus({ id: 1, status })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().approveQuotationAfterNegotiation({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });
  it.each(["accepted", "rejected", "pending"] as const)("allows %s with the independent approval permission", async status => {
    state.selected.push("quotations.approve");
    await expect(caller().updateQuotationStatus({ id: 1, status })).resolves.toEqual({ success: true });
    expect(state.writes[0].values.status).toBe(status);
  });
  it("does not let a Sedana approver approve general requests or the reverse", async () => {
    state.selected = ["sedana_quotations.view", "sedana_quotations.approve"];
    await expect(caller().approveSedanaMultiVendorQuotations({ requestId: 17, itemVendorSelections: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    state.program = "sedana";
    state.selected = ["quotations.view", "quotations.approve"];
    await expect(caller().updateQuotationStatus({ id: 1, status: "accepted" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("does not substitute BOQ module permissions for quotation BOQ permissions", async () => {
    state.selected.push("boq.add", "boq.edit", "boq.delete");
    await expect(caller().addBOQItem({ requestId: 17, permissionScope: "quotations", itemName: "New", unit: "m", quantity: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().updateBOQItem({ id: 1, permissionScope: "quotations", itemName: "Changed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().deleteBOQItem({ id: 1, permissionScope: "quotations" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });
  it("allows the three quotation BOQ operations independently of BOQ module permissions", async () => {
    state.selected.push("quotations.boq_add", "quotations.boq_edit", "quotations.boq_delete");
    await expect(caller().addBOQItem({ requestId: 17, permissionScope: "quotations", itemName: "New", unit: "m", quantity: 1 })).resolves.toMatchObject({ id: 99 });
    await expect(caller().updateBOQItem({ id: 1, permissionScope: "quotations", itemName: "Changed" })).resolves.toEqual({ success: true });
    await expect(caller().deleteBOQItem({ id: 1, permissionScope: "quotations" })).resolves.toEqual({ success: true });
  });
});
