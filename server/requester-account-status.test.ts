import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

const state = vi.hoisted(() => ({
  role: "projects_office",
  permissions: [] as string[],
  target: { id: 101, role: "service_requester", status: "pending" },
  writes: [] as { table: string; values: any }[],
}));

vi.mock("./db", () => ({
  getDb: async () => {
    function rows(table: any, fields: any) {
      switch (getTableName(table)) {
        case "users": return fields ? [{ role: state.role }] : [state.target];
        case "roles": return [{ id: state.role, description: JSON.stringify(state.permissions), isActive: true }];
        default: return [];
      }
    }
    function query(fields: any): any {
      let table: any;
      const chain: any = {
        from: (value: any) => { table = value; return chain; },
        then: (resolve: any, reject: any) => Promise.resolve(rows(table, fields)).then(resolve, reject),
      };
      for (const method of ["where", "limit", "leftJoin"]) chain[method] = () => chain;
      return chain;
    }
    return {
      select: (fields?: any) => query(fields),
      update: (table: any) => ({
        set: (values: any) => ({
          where: async () => { state.writes.push({ table: getTableName(table), values }); },
        }),
      }),
    };
  },
}));

vi.mock("./routers/notifications", () => ({ createNotification: vi.fn(async () => {}) }));

import { usersRouter } from "./routers/users";

function caller() {
  // An authenticated identity with id zero skips unrelated session role lookups.
  return usersRouter.createCaller({ user: { id: 0, role: state.role }, req: {}, res: {} } as TrpcContext);
}

beforeEach(() => {
  state.role = "projects_office";
  state.permissions = [];
  state.target = { id: 101, role: "service_requester", status: "pending" };
  state.writes = [];
});

describe("requester account status permissions", () => {
  it("lets the projects office approve a requester with only the dedicated approval permission", async () => {
    state.permissions = ["requester_accounts.approve"];
    await expect(caller().toggleStatus({ userId: 101, status: "active" })).resolves.toEqual({ success: true });
    expect(state.writes).toEqual([{ table: "users", values: { status: "active" } }]);
  });

  it.each(["suspended", "blocked"] as const)("allows the dedicated suspension permission to set %s", async status => {
    state.permissions = ["requester_accounts.suspend"];
    await expect(caller().toggleStatus({ userId: 101, status, notes: "Review needed" })).resolves.toEqual({ success: true });
    expect(state.writes).toEqual([{ table: "users", values: { status, adminNotes: "Review needed" } }]);
  });

  it.each(["suspended", "blocked", "pending"] as const)("does not let approval alone change status to %s", async status => {
    state.permissions = ["requester_accounts.approve"];
    await expect(caller().toggleStatus({ userId: 101, status })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });

  it.each(["requester_accounts.view", "requester_accounts.suspend"])("rejects approval with only %s", async permission => {
    state.permissions = [permission];
    await expect(caller().toggleStatus({ userId: 101, status: "active" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });

  it.each(["active", "suspended", "blocked", "pending"] as const)("does not let requester permissions set a staff account to %s", async status => {
    state.permissions = ["requester_accounts.approve", "requester_accounts.suspend"];
    state.target.role = "financial";
    await expect(caller().toggleStatus({ userId: 101, status })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });

  it("keeps executive director activation working", async () => {
    state.role = "general_manager";
    state.permissions = ["requester_accounts.approve", "staff_users.activate"];
    await expect(caller().toggleStatus({ userId: 101, status: "active" })).resolves.toEqual({ success: true });
    expect(state.writes).toHaveLength(1);
  });

  it.each(["active", "pending"] as const)("preserves staff activation rights for status %s", async status => {
    state.permissions = ["staff_users.activate"];
    state.target.role = "financial";
    await expect(caller().toggleStatus({ userId: 101, status })).resolves.toEqual({ success: true });
    expect(state.writes).toHaveLength(1);
  });

  it("does not let staff suspension rights activate an account", async () => {
    state.permissions = ["staff_users.suspend"];
    await expect(caller().toggleStatus({ userId: 101, status: "active" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.writes).toEqual([]);
  });
});
