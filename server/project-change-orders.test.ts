import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import {
  changeOrderPercentage,
  createChangeOrderSchema,
  priceChangeOrderItems,
} from "../shared/projectChangeOrders";

const state = vi.hoisted(() => ({
  permissions: ["projects.view_details", "disbursements.create_from_fund"],
  orders: [] as any[],
  requests: [] as any[],
  movements: [] as any[],
  projectCost: 25000,
  initialSurplus: 10000,
  initialFund: 0,
  projectStatus: "in_progress",
  requestStage: "execution",
  failOrderInsert: false,
  locks: 0,
}));

vi.mock("./permissions", () => ({
  checkPermission: async (_id: number, permission: string) =>
    state.permissions.includes(permission),
}));
vi.mock("./routers/notifications", () => ({
  notifyDisbursementRequestCreation: vi.fn(),
}));
vi.mock("./fund", async importOriginal => {
  const original = await importOriginal<typeof import("./fund")>();
  return {
    ...original,
    lockFund: async () => {
      state.locks++;
    },
    getProjectFundableAmounts: async () => ({
      projectCost: state.projectCost,
      surplusAvailable:
        state.initialSurplus -
        state.movements.reduce((sum, row) => sum + Number(row.amount), 0),
      vouchers: [],
    }),
    getFundAvailable: async () => {
      const posted =
        state.initialFund +
        state.movements.reduce((sum, row) => sum + Number(row.amount), 0);
      const reserved = state.requests
        .filter(row => !["rejected", "paid"].includes(row.status))
        .reduce((sum, row) => sum + Number(row.amount), 0);
      return {
        posted,
        reserved,
        available: posted,
        spendable: posted - reserved,
      };
    },
  };
});

vi.mock("./db", async () => {
  const schema = await import("../drizzle/schema");
  const dialect = new MySqlDialect();
  let previousTransaction = Promise.resolve();
  const db: any = {
    select: (fields?: any) => {
      let table: any;
      let condition: any;
      let joined = false;
      let descending = false;
      const query: any = {
        from: (value: any) => {
          table = value;
          return query;
        },
        where: (value: any) => {
          condition = value;
          return query;
        },
        leftJoin: () => query,
        innerJoin: () => {
          joined = true;
          return query;
        },
        limit: () => query,
        orderBy: (value: any) => {
          descending = dialect.sqlToQuery(value).sql.includes("desc");
          return query;
        },
        then: (resolve: any, reject: any) =>
          Promise.resolve()
            .then(() => {
              if (table === schema.roles) return [];
              if (table === schema.projects)
                return [{ id: 1, status: state.projectStatus, requestId: 1 }];
              if (table === schema.mosqueRequests)
                return [{ id: 1, currentStage: state.requestStage }];
              let rows =
                table === schema.projectChangeOrders
                  ? state.orders
                  : table === schema.disbursementRequests
                    ? state.requests
                    : [];
              if (condition) {
                const { sql, params } = dialect.sqlToQuery(condition);
                if (sql.includes("`submissionKey`"))
                  rows = rows.filter(row => row.submissionKey === params[0]);
                else if (sql.includes("`projectId`"))
                  rows = rows.filter(row => row.projectId === params[0]);
              }
              rows = [...rows].sort((a, b) =>
                descending ? b.id - a.id : a.id - b.id
              );
              if (joined)
                return rows.map(order => ({
                  order,
                  status: state.requests.find(
                    row => row.id === order.disbursementRequestId
                  )?.status,
                  requestNumber: "DR-2026-0001",
                }));
              if (fields?.requestNumber) return rows.slice(-1);
              return rows;
            })
            .then(resolve, reject),
      };
      return query;
    },
    insert: (table: any) => ({
      values: async (value: any) => {
        if (table === schema.projectChangeOrders && state.failOrderInsert)
          throw new Error("insert failed");
        const rows =
          table === schema.projectChangeOrders
            ? state.orders
            : table === schema.disbursementRequests
              ? state.requests
              : state.movements;
        const id = rows.length + 1;
        rows.push({
          ...value,
          id,
          createdAt: new Date("2026-11-03T00:00:00Z"),
        });
        return [{ insertId: id }];
      },
    }),
    transaction: async (callback: any) => {
      const previous = previousTransaction;
      let release!: () => void;
      previousTransaction = new Promise<void>(resolve => {
        release = resolve;
      });
      await previous;
      const snapshot = structuredClone({
        orders: state.orders,
        requests: state.requests,
        movements: state.movements,
      });
      try {
        return await callback(db);
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      } finally {
        release();
      }
    },
  };
  return { getDb: async () => db };
});

import { projectChangeOrdersRouter } from "./routers/projectChangeOrders";

const caller = (authenticated = true) =>
  projectChangeOrdersRouter.createCaller({
    user: authenticated ? { id: 1, role: "projects_office" } : null,
    req: {} as any,
    res: { clearCookie: vi.fn() } as any,
  } as any);

const input = (amount = 5000, key = crypto.randomUUID()) => ({
  projectId: 1,
  submissionKey: key,
  title: "أعمال إضافية",
  reason: "إضافة أعمال للمشروع",
  beneficiaryName: "المقاول",
  items: [{ name: "بند إضافي", unit: "بند", quantity: 1, unitPrice: amount }],
});

beforeEach(() => {
  Object.assign(state, {
    permissions: ["projects.view_details", "disbursements.create_from_fund"],
    orders: [],
    requests: [],
    movements: [],
    projectCost: 25000,
    initialSurplus: 10000,
    initialFund: 0,
    projectStatus: "in_progress",
    requestStage: "execution",
    failOrderInsert: false,
    locks: 0,
  });
});

describe("change order calculations", () => {
  it("calculates the user's 5000 riyal example as 20 percent of 25000", () => {
    expect(changeOrderPercentage(5000, 25000)).toBe(20);
  });
  it("rounds fractional quantities to halalas per line, including half-halalas", () => {
    const result = priceChangeOrderItems([
      { name: "أ", unit: "م", quantity: 0.015, unitPrice: 67 },
      { name: "ب", unit: "م", quantity: 0.015, unitPrice: 67 },
    ]);
    expect(result.items.map(row => row.total)).toEqual([1.01, 1.01]);
    expect(result.total).toBe(2.02);
  });
  it.each([0, -5, Infinity, NaN, 1.001])(
    "rejects invalid unit prices: %s",
    amount => {
      expect(createChangeOrderSchema.safeParse(input(amount)).success).toBe(
        false
      );
    }
  );
  it("requires at least one named item and a reason", () => {
    expect(
      createChangeOrderSchema.safeParse({ ...input(), items: [] }).success
    ).toBe(false);
    expect(
      createChangeOrderSchema.safeParse({ ...input(), reason: " " }).success
    ).toBe(false);
  });
});

describe("project change order funding", () => {
  it("stores items and creates exactly one pending request and surplus allocation", async () => {
    const result = await caller().create(input());
    expect(result.orderNumber).toMatch(/^CO-/);
    expect(state.orders[0]).toMatchObject({
      amount: "5000.00",
      originalProjectCost: "25000.00",
      percentage: "20.000000",
    });
    expect(JSON.parse(state.orders[0].itemsJson)[0].total).toBe(5000);
    expect(state.requests[0]).toMatchObject({
      amount: "5000.00",
      status: "pending",
      fundRestrictionType: "project",
      fundRestrictedProjectId: 1,
    });
    expect(state.movements[0]).toMatchObject({
      amount: "5000.00",
      movementType: "surplus",
      requestId: result.requestId,
    });
    expect((await caller().list({ projectId: 1 })).funding?.available).toBe(
      5000
    );
    expect(state.locks).toBe(1);
  });
  it("uses previously transferred project surplus before allocating additional surplus", async () => {
    state.initialFund = 3000;
    await caller().create(input());
    expect(state.movements[0].amount).toBe("2000.00");
    expect((await caller().list({ projectId: 1 })).funding?.available).toBe(
      8000
    );
  });
  it("supports funding an order entirely from project surplus already in the fund", async () => {
    state.initialSurplus = 0;
    state.initialFund = 5000;
    await caller().create(input());
    expect(state.movements).toHaveLength(0);
    expect((await caller().list({ projectId: 1 })).funding?.available).toBe(0);
  });
  it("rejects overspending without persisting requests, orders, or transfers", async () => {
    await expect(caller().create(input(10000.01))).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect([
      state.requests.length,
      state.orders.length,
      state.movements.length,
    ]).toEqual([0, 0, 0]);
  });
  it("keeps the original denominator for subsequent orders", async () => {
    await caller().create(input());
    state.projectCost = 30000;
    await caller().create(input(2500));
    expect(state.orders[1]).toMatchObject({
      originalProjectCost: "25000.00",
      percentage: "10.000000",
    });
    const result = await caller().list({ projectId: 1 });
    expect(result).toMatchObject({ activeTotal: 7500, percentage: 30 });
  });
  it("releases a rejected request's reservation for reuse by another change order", async () => {
    await caller().create(input());
    state.requests[0].status = "rejected";
    const before = await caller().list({ projectId: 1 });
    expect(before).toMatchObject({
      activeTotal: 0,
      funding: { available: 10000, fundSurplus: 5000 },
    });
    await caller().create(input());
    expect(state.movements).toHaveLength(1);
    expect((await caller().list({ projectId: 1 })).activeTotal).toBe(5000);
  });
  it("deduplicates concurrent retries with the same submission key", async () => {
    const request = input();
    const results = await Promise.all([
      caller().create(request),
      caller().create(request),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect([
      state.orders.length,
      state.requests.length,
      state.movements.length,
    ]).toEqual([1, 1, 1]);
  });
  it("does not let concurrent orders spend the same surplus", async () => {
    const results = await Promise.allSettled([
      caller().create(input(7000)),
      caller().create(input(7000)),
    ]);
    expect(
      results.filter(result => result.status === "fulfilled")
    ).toHaveLength(1);
    expect(state.requests).toHaveLength(1);
    expect((await caller().list({ projectId: 1 })).funding?.available).toBe(
      3000
    );
  });
  it("rolls back the request when the order cannot be saved", async () => {
    state.failOrderInsert = true;
    await expect(caller().create(input())).rejects.toThrow("insert failed");
    expect([
      state.requests.length,
      state.orders.length,
      state.movements.length,
    ]).toEqual([0, 0, 0]);
  });
  it.each(["completed", "cancelled"])(
    "prevents orders on %s projects",
    async status => {
      state.projectStatus = status;
      await expect(caller().create(input())).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    }
  );
  it("prevents orders on closed linked requests", async () => {
    state.requestStage = "closed";
    await expect(caller().create(input())).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
  it("requires fund request creation permission even for project viewers", async () => {
    state.permissions = ["projects.view_details"];
    await expect(caller().create(input())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("requires project read permission and authentication", async () => {
    state.permissions = ["disbursements.create_from_fund"];
    await expect(caller().list({ projectId: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller().create(input())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller(false).create(input())).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
