import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { INFORMATION_DASHBOARD_PERMISSION_IDS as ids, informationDashboardTabs } from "../shared/informationDashboardPermissions";
import { hasRouteAccess } from "../client/src/lib/routePermissions";

const state = vi.hoisted(() => ({
  role: "super_admin", selected: [] as string[] | null,
  legacy: [] as string[], direct: [] as { userId: number; permissionId: string; granted: boolean }[],
  settings: [] as any[], writes: [] as any[],
}));
vi.mock("./db", () => ({ getDb: async () => {
  function rows(table: any) {
    switch (getTableName(table)) {
      case "users": return [{ id: 1, name: "Test", role: state.role }];
      case "roles": return [{ id: state.role, description: state.selected === null ? null : JSON.stringify(state.selected), isActive: true }];
      case "permissions": return ids.map(id => ({ id }));
      case "role_permissions": return state.legacy.map(permissionId => ({ roleId: state.role, permissionId }));
      case "user_permissions": return state.direct;
      case "brand_settings": return state.settings;
      default: return [];
    }
  }
  function query(table?: any): any {
    const chain: any = { from: (value: any) => { table = value; return chain; },
      then: (resolve: any, reject: any) => Promise.resolve(rows(table)).then(resolve, reject) };
    for (const method of ["where", "limit", "orderBy", "leftJoin", "innerJoin", "groupBy", "offset"]) chain[method] = () => chain;
    return chain;
  }
  const write = (table: any) => (values: any) => {
    state.writes.push({ table: getTableName(table), values });
    const result = Promise.resolve([{ insertId: 99 }]);
    return Object.assign(result, { where: () => result });
  };
  return { select: () => query(), insert: (table: any) => ({ values: write(table) }), update: (table: any) => ({ set: write(table) }) };
} }));

import { calculateUserPermissions, getRoleInformationDashboardPermissions } from "./permissions";
import { formsRouter, DEFAULT_ENABLED_DETAILED_DASHBOARD_IDS } from "./routers/forms";

const caller = () => formsRouter.createCaller({ user: { id: 1, role: state.role }, req: {}, res: {} } as TrpcContext);
beforeEach(() => {
  state.role = "super_admin"; state.selected = ["*", ids[0]];
  state.legacy = []; state.direct = []; state.settings = []; state.writes = [];
});

describe.each(["super_admin", "system_admin", "board_chairman", "custom_role_1781420621086", "dashboard_viewer"])("information dashboard grants for %s", role => {
  beforeEach(() => { state.role = role; });
  it.each(ids)("maps %s to exactly one tab despite wildcard, section summary and stale rows", async permission => {
    state.selected = ["*", "information_dashboard", permission]; state.legacy = ids;
    const permissions = await calculateUserPermissions(1);
    expect(informationDashboardTabs(permissions)).toEqual([permission.split(".")[1]]);
    expect(await getRoleInformationDashboardPermissions(role)).toEqual([permission]);
    expect(hasRouteAccess("/information-dashboard", role, permissions, true)).toBe(true);
  });
  it.each(ids)("honors the direct revocation of %s", async permission => {
    state.selected = ["*", "information_dashboard", ...ids];
    state.direct = [{ userId: 1, permissionId: permission, granted: false }];
    const permissions = await calculateUserPermissions(1);
    expect(permissions).not.toContain(permission);
    expect(informationDashboardTabs(permissions)).toHaveLength(4);
  });
  it("grants no tabs through wildcard, role identity or the section summary", async () => {
    state.selected = ["*", "information_dashboard", "information_dashboard.view"];
    state.legacy = ids;
    const permissions = await calculateUserPermissions(1);
    expect(informationDashboardTabs(permissions)).toEqual([]);
    expect(hasRouteAccess("/information-dashboard", role, permissions, false)).toBe(false);
    state.selected = [];
    expect(informationDashboardTabs(await calculateUserPermissions(1))).toEqual([]);
  });
});

describe("dashboard customization target boundaries", () => {
  it.each(["global", "role", "user"] as const)("offers only assigned tab elements for %s customization", async targetType => {
    const config = await caller().getDetailedDashboardCustomizationConfig({ targetType, targetId: targetType === "role" ? state.role : "1" });
    expect(config.allowedTabIds).toEqual(["digital_screen"]);
    expect(config.elements.filter(element => element.id.startsWith("section_")).map(element => element.id)).toEqual(["section_digital_screen"]);
    expect(config.elements.some(element => element.id.endsWith("_charts"))).toBe(false);
    expect(config.enabledElementIds).toContain("section_digital_screen");
    expect(config.enabledElementIds).not.toContain("section_financial");
    expect(config.enabledElementIds).toContain("mosque_total");
  });
  it("filters existing customizations after revocation", async () => {
    state.settings = [{ settingValue: JSON.stringify({ enabledElementIds: DEFAULT_ENABLED_DETAILED_DASHBOARD_IDS }) }];
    const config = await caller().getDetailedDashboardCustomizationConfig({ userId: 1 });
    expect(config.isCustomized).toBe(true);
    expect(config.enabledElementIds.every(id => config.elements.some(element => element.id === id))).toBe(true);
    expect(config.enabledElementIds).not.toContain("section_mosques");
  });
  it.each(["global", "role", "user"] as const)("rejects saving unassigned elements for %s even for administrators", async targetType => {
    const targetId = targetType === "role" ? state.role : "1";
    for (const elementId of ["section_financial", "financial_charts", "unknown_element"]) {
      await expect(caller().saveDetailedDashboardCustomizationConfig({ targetType, targetId, enabledElementIds: [elementId] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(state.writes).toEqual([]);
    await expect(caller().saveDetailedDashboardCustomizationConfig({ targetType, targetId, enabledElementIds: ["section_digital_screen"] })).resolves.toMatchObject({ success: true });
  });
  it("requires a target before saving a role or user customization", async () => {
    await expect(caller().saveDetailedDashboardCustomizationConfig({ targetType: "role", enabledElementIds: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.writes).toEqual([]);
  });
  it("blocks customization and resetting when no tabs are assigned", async () => {
    state.selected = ["*"];
    expect((await caller().getDetailedDashboardCustomizationConfig({ targetType: "global" })).elements).toEqual([]);
    await expect(caller().saveDetailedDashboardCustomizationConfig({ targetType: "global", enabledElementIds: [] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().resetDetailedDashboardCustomizationConfig({ targetType: "global" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });
  it("preserves other viewers' global tab settings while saving a restricted customization", async () => {
    state.selected = ["*", ids[4]];
    state.settings = [{ settingValue: JSON.stringify({ enabledElementIds: ["section_mosques", "mosque_total"] }) }];
    await caller().saveDetailedDashboardCustomizationConfig({ targetType: "global", enabledElementIds: ["section_financial"] });
    expect(JSON.parse(state.writes[0].values.settingValue).enabledElementIds)
      .toEqual(["section_financial", "section_mosques", "mosque_total"]);
  });
  it("resets only assigned tabs in the global layout and requires a target for role resets", async () => {
    state.settings = [{ settingValue: JSON.stringify({ enabledElementIds: ["section_mosques", "mosque_total"] }) }];
    await caller().resetDetailedDashboardCustomizationConfig({ targetType: "global" });
    const enabled = JSON.parse(state.writes[0].values.settingValue).enabledElementIds;
    expect(enabled).toContain("section_digital_screen");
    expect(enabled).toContain("section_mosques");
    expect(enabled).not.toContain("section_financial");
    state.writes = [];
    await expect(caller().resetDetailedDashboardCustomizationConfig({ targetType: "role" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.writes).toEqual([]);
  });
  it("lists users with individual tab grants and keeps users eligible after a partial revocation", async () => {
    state.selected = [ids[0], ids[1]];
    state.direct = [{ userId: 1, permissionId: ids[0], granted: false }];
    expect((await caller().getEligibleDashboardTargets()).users).toHaveLength(1);
    state.selected = [];
    state.direct = [{ userId: 1, permissionId: ids[4], granted: true }];
    expect((await caller().getEligibleDashboardTargets()).users).toHaveLength(1);
    state.direct = [];
    expect((await caller().getEligibleDashboardTargets()).users).toEqual([]);
  });
  it.each(["super_admin", "system_admin", "dashboard_viewer"])("preserves initial defaults for uncustomized %s roles", async role => {
    state.role = role; state.selected = null;
    expect(informationDashboardTabs(await calculateUserPermissions(1))).toHaveLength(5);
    expect(await getRoleInformationDashboardPermissions(role)).toEqual(ids);
  });
});
