import { beforeEach, describe, expect, it, vi } from "vitest";
import { pbkdf2Sync } from "node:crypto";
import type { TrpcContext } from "./_core/context";

const state = vi.hoisted(() => ({
  allowed: new Set<string>(),
  limit: vi.fn(),
  values: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: vi.fn(async () => {
    const db: any = {
      select: () => ({ from: () => ({ where: () => ({ limit: state.limit }) }) }),
      insert: state.insert,
      transaction: (callback: (tx: any) => unknown) => callback(db),
    };
    return db;
  }),
}));

vi.mock("./permissions", async () => {
  const { protectedProcedure } = await import("./_core/trpc");
  const { TRPCError } = await import("@trpc/server");
  return {
    permissionProcedure: (permission: string) => protectedProcedure.use(({ next }) => {
      if (!state.allowed.has(permission)) throw new TRPCError({ code: "FORBIDDEN" });
      return next();
    }),
  };
});

import { usersRouter } from "./routers/users";
import { auditLogs, users } from "../drizzle/schema";

const input = {
  name: "مستفيد تجريبي", email: "beneficiary@example.test", phone: "0512345678",
  password: "TemporaryPassword123", requesterType: "imam" as const,
};

function caller() {
  // A mocked authenticated identity; id zero skips unrelated role lookups.
  return usersRouter.createCaller({ user: { id: 0 }, req: {}, res: {} } as TrpcContext);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.allowed.clear();
  state.limit.mockReset().mockResolvedValue([]);
  state.values.mockReset().mockResolvedValue([{ insertId: 101 }]);
  state.insert.mockImplementation(() => ({ values: state.values }));
});

describe("beneficiary creation", () => {
  it("requires the dedicated permission even with user creation and approval rights", async () => {
    state.allowed.add("users.create");
    state.allowed.add("requesters.approve");
    await expect(caller().createRequester(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.insert).not.toHaveBeenCalled();
  });

  it("creates a pending beneficiary with a login-compatible hash and no password in audit or response", async () => {
    state.allowed.add("requesters.create");
    const result = await caller().createRequester(input);
    const saved = state.values.mock.calls[0][0];
    expect(saved).toMatchObject({ role: "service_requester", status: "pending", loginMethod: "local" });
    const [salt, hash] = saved.passwordHash.split(":");
    expect(hash).toBe(pbkdf2Sync(input.password, salt, 1000, 64, "sha512").toString("hex"));
    expect(state.insert.mock.calls.map(([table]) => table)).toEqual([users, auditLogs]);
    expect(JSON.stringify(state.values.mock.calls[1][0])).not.toContain(input.password);
    expect(result).toEqual({ id: 101, success: true });
  });

  it("rejects an email already registered", async () => {
    state.allowed.add("requesters.create");
    state.limit.mockResolvedValueOnce([{ id: 7 }]);
    await expect(caller().createRequester(input)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.insert).not.toHaveBeenCalled();
  });

  it("rejects a duplicate beneficiary phone or national identity", async () => {
    state.allowed.add("requesters.create");
    state.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 8 }]);
    await expect(caller().createRequester(input)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(state.insert).not.toHaveBeenCalled();
  });

  it.each([{ password: "short" }, { phone: "123" }, { email: "invalid" }])("rejects invalid account data: %o", async (invalid) => {
    state.allowed.add("requesters.create");
    await expect(caller().createRequester({ ...input, ...invalid })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.insert).not.toHaveBeenCalled();
  });
});
