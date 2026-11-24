import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import type { TrpcContext } from "./_core/context";
import { MAWASIM_PERMISSION_IDS as ids } from "../shared/mawasimPermissions";
import { defaultSeasonalSettings } from "../shared/mawasim";

const state = vi.hoisted(() => ({
  role: "super_admin",
  selected: [] as string[],
  legacy: [] as string[],
  direct: [] as { permissionId: string; granted: boolean }[],
}));

vi.mock("./db", () => ({
  getDb: async () => {
    const dialect = new MySqlDialect();
    function rows(table: any, condition?: any) {
      const query = condition ? dialect.sqlToQuery(condition) : { sql: "", params: [] };
      const id = query.params.find(param => typeof param === "number");
      switch (getTableName(table)) {
        case "users":
          return [{ id: 1, role: state.role, name: "Actor", status: "active", deletedAt: null }].filter(
            u => id === undefined || u.id === id,
          );
        case "roles":
          return [{ id: state.role, description: JSON.stringify(state.selected), isActive: true }].filter(
            r => query.params.length === 0 || query.params.includes(r.id),
          );
        case "permissions":
          return ids.map(pid => ({ id: pid }));
        case "role_permissions":
          return state.legacy.map(permissionId => ({ roleId: state.role, permissionId }));
        case "user_permissions":
          return state.direct;
        default:
          return [];
      }
    }
    function chain(table?: any): any {
      let condition: any;
      const obj: any = {
        from: (t: any) => { table = t; return obj; },
        where: (c: any) => { condition = c; return obj; },
        then: (res: any, rej: any) => Promise.resolve(rows(table, condition)).then(res, rej),
      };
      for (const m of ["limit", "offset", "orderBy", "leftJoin", "innerJoin", "groupBy"]) obj[m] = () => obj;
      return obj;
    }
    return {
      select: () => chain(),
      transaction: async () => ({ id: 99 }),
    };
  },
}));

import { calculateUserPermissions } from "./permissions";
import { mawasimRouter } from "./routers/mawasim";

const caller = () => mawasimRouter.createCaller({
  user: { id: 1, role: state.role, status: "active", deletedAt: null },
  req: {},
  res: {},
} as TrpcContext);

beforeEach(() => {
  state.role = "super_admin";
  state.selected = ["mawasim.view"];
  state.legacy = [];
  state.direct = [];
});

describe.each(["super_admin", "system_admin", "projects_office", "custom_role_test"])(
  "Mawasim server RBAC enforcement for %s",
  role => {
    beforeEach(() => {
      state.role = role;
    });

    it("view-only grant does not leak mawasim.create or mawasim.manage despite wildcard or legacy rows", async () => {
      state.selected = ["*", "mawasim", "mawasim.view"];
      state.legacy = ids;
      const perms = (await calculateUserPermissions(1)).filter(p => p.startsWith("mawasim"));
      expect(perms).toEqual(["mawasim.view"]);

      const baseInput = { hijriYear: 1448, title: "موسم جديد", isOpen: false, settings: defaultSeasonalSettings() };
      // Create season (no id) must be denied
      await expect(caller().saveSeason(baseInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
      // Edit season settings (with id) must also be denied
      await expect(caller().saveSeason({ ...baseInput, id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("keeps mawasim.create and mawasim.manage strictly independent", async () => {
      const baseInput = { hijriYear: 1448, title: "موسم جديد", isOpen: false, settings: defaultSeasonalSettings() };

      // Manage only: cannot create a new season
      state.selected = ["mawasim.view", "mawasim.manage"];
      await expect(caller().saveSeason(baseInput)).rejects.toMatchObject({ code: "FORBIDDEN" });

      // Create only: cannot modify existing season settings
      state.selected = ["mawasim.view", "mawasim.create"];
      await expect(caller().saveSeason({ ...baseInput, id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("honors explicit revocation even when wildcard and role grants are present", async () => {
      state.selected = ["*", ...ids];
      state.direct = [{ permissionId: "mawasim.view", granted: false }];
      const perms = (await calculateUserPermissions(1)).filter(p => p.startsWith("mawasim"));
      expect(perms).toEqual([]);
      await expect(caller().staff()).rejects.toMatchObject({ code: "FORBIDDEN" });

      // Revoking only mawasim.create keeps view/manage but removes create and blocks saveSeason create
      state.direct = [{ permissionId: "mawasim.create", granted: false }];
      const withoutCreate = (await calculateUserPermissions(1)).filter(p => p.startsWith("mawasim"));
      expect(withoutCreate).not.toContain("mawasim.create");
      expect(withoutCreate).toContain("mawasim.view");
      await expect(
        caller().saveSeason({ hijriYear: 1448, title: "موسم", isOpen: false, settings: defaultSeasonalSettings() }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  },
);
