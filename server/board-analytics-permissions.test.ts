import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { BOARD_ANALYTICS_PERMISSION_IDS as ids, boardAnalyticsTabs } from "../shared/boardAnalyticsPermissions";
import { hasRouteAccess } from "../client/src/lib/routePermissions";

const state = vi.hoisted(() => ({ role: "super_admin", selected: [] as string[] | null,
  legacy: [] as string[], direct: [] as { permissionId: string; granted: boolean }[] }));
vi.mock("./db", () => ({ getDb: async () => {
  function rows(table: any) {
    switch (getTableName(table)) {
      case "users": return [{ id: 0, role: state.role }];
      case "roles": return [{ id: state.role, description: state.selected === null ? null : JSON.stringify(state.selected), isActive: true }];
      case "permissions": return ids.map(id => ({ id }));
      case "role_permissions": return state.legacy.map(permissionId => ({ roleId: state.role, permissionId }));
      case "user_permissions": return state.direct;
      default: return [];
    }
  }
  function query(table?: any): any {
    const chain: any = { from: (value: any) => { table = value; return chain; },
      then: (resolve: any, reject: any) => Promise.resolve(rows(table)).then(resolve, reject) };
    for (const method of ["where", "limit", "orderBy", "leftJoin", "innerJoin", "groupBy", "offset"]) chain[method] = () => chain;
    return chain;
  }
  return { select: () => query() };
} }));

import { calculateUserPermissions, checkPermission } from "./permissions";
import { boardRouter } from "./routers/board";

beforeEach(() => { state.role = "super_admin"; state.selected = []; state.legacy = []; state.direct = []; });

describe.each(["super_admin", "system_admin", "board_member", "board_chairman", "custom_role_test"])("board analytics grants for %s", role => {
  beforeEach(() => { state.role = role; });
  it.each(ids)("shows exactly the tab granted by %s despite wildcard and stale role rows", async permission => {
    state.selected = ["*", "board_analytics", "board_member", permission]; state.legacy = ids;
    expect(boardAnalyticsTabs(await calculateUserPermissions(0))).toEqual([permission.split(".")[1]]);
    expect(hasRouteAccess("/board-analytics", role, await calculateUserPermissions(0), true)).toBe(true);
  });
  it.each(ids)("honors a direct revocation of %s", async permission => {
    state.selected = ["*", "board_analytics", ...ids];
    state.direct = [{ permissionId: permission, granted: false }];
    expect(await checkPermission(0, permission)).toBe(false);
    expect(boardAnalyticsTabs(await calculateUserPermissions(0))).toHaveLength(3);
  });
  it("does not grant tabs via the role, wildcard, section summary or legacy board access", async () => {
    state.selected = ["*", "board_analytics", "board_member"];
    state.legacy = ids;
    expect(boardAnalyticsTabs(await calculateUserPermissions(0))).toEqual([]);
    expect(hasRouteAccess("/board-analytics", role, await calculateUserPermissions(0), false)).toBe(false);
  });
});

describe("board statistics access", () => {
  it.each(ids)("accepts an independently assigned %s without board membership", async permission => {
    state.role = "custom_role_test"; state.selected = [permission];
    const caller = boardRouter.createCaller({ user: { id: 0, role: state.role }, req: {}, res: {} } as TrpcContext);
    await expect(caller.getExecutiveStats()).resolves.toHaveProperty("mosques");
    state.direct = [{ permissionId: permission, granted: false }];
    await expect(caller.getExecutiveStats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it.each(["super_admin", "system_admin", "board_member"])("preserves the initial defaults of uncustomized %s", async role => {
    state.role = role; state.selected = null;
    expect(boardAnalyticsTabs(await calculateUserPermissions(0))).toHaveLength(4);
  });
});
