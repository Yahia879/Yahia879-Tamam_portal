import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const state = vi.hoisted(() => ({
  role: "dashboard_viewer",
  grants: [] as string[],
  revocations: [] as string[],
}));

// Keep the real authentication and permission middleware; replace database I/O only.
vi.mock("../db", async () => {
  const schema = await import("../../drizzle/schema");
  return {
    getDb: async () => ({
      select: () => {
        let table: unknown;
        const rows = () => {
          if (table === schema.users) return [{ role: state.role }];
          if (table === schema.roles) {
            return [{ id: state.role, isActive: true, description: null }];
          }
          if (table === schema.userPermissions) {
            return [
              ...state.grants.map(permissionId => ({ permissionId, granted: true })),
              ...state.revocations.map(permissionId => ({ permissionId, granted: false })),
            ];
          }
          return [];
        };
        const query: any = {
          from: (value: unknown) => { table = value; return query; },
          where: () => query,
          limit: () => query,
          leftJoin: () => query,
          innerJoin: () => query,
          groupBy: () => query,
          orderBy: () => query,
          then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows()).then(resolve),
        };
        return query;
      },
    }),
  };
});

import { analyticsRouter } from "./analytics";

const caller = (authenticated = true) => analyticsRouter.createCaller({
  user: authenticated ? { id: 42, role: state.role } : null,
  req: {},
  res: {},
} as TrpcContext);

describe("information dashboard analytics access", () => {
  beforeEach(() => {
    state.role = "dashboard_viewer";
    state.grants = [];
    state.revocations = [];
  });

  async function expectMetrics() {
    await expect(caller().getKPIs({ programType: "all", status: "all" }))
      .resolves.toMatchObject({ summary: { totalRequests: 0 }, byProgram: [], monthlyTrend: [] });
    await expect(caller().getMonthlyGrowth())
      .resolves.toMatchObject({ totalRequests: { current: 0, previous: 0, percentage: 0 } });
  }

  it("loads KPIs and monthly growth for the dashboard viewer without reports.view", async () => {
    await expectMetrics();
  });

  it.each(["information_dashboard.view", "information_dashboard"])(
    "allows users granted %s individually", async permission => {
      state.role = "field_team";
      state.grants = [permission];
      await expectMetrics();
    },
  );

  it("preserves access for report viewers", async () => {
    state.role = "projects_office";
    state.grants = ["reports.view"];
    await expectMetrics();
  });

  it("rejects users without either permission", async () => {
    state.role = "field_team";
    await expect(caller().getKPIs()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().getMonthlyGrowth()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("honors an explicit revocation of dashboard access", async () => {
    state.revocations = ["information_dashboard.view"];
    await expect(caller().getKPIs()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().getMonthlyGrowth()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unauthenticated callers", async () => {
    await expect(caller(false).getKPIs()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller(false).getMonthlyGrowth()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
