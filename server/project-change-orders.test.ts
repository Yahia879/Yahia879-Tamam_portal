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
  boqItems: [] as any[],
  requests: [] as any[],
  movements: [] as any[],
  projectCost: 25000,
  projectBudget: "25000.00",
  projectActualCost: "25000.00",
  initialSurplus: 10000,
  initialFund: 0,
  projectStatus: "in_progress",
  projectProgram: "bunyan",
  requestProgram: "bunyan",
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
  notifyUsersByRole: vi.fn(),
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
        leftJoin: () => {
          joined = true;
          return query;
        },
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
                return [
                  {
                    id: 1,
                    name: "مشروع تجريبي",
                    projectNumber: "PRJ-2026-0001",
                    status: state.projectStatus,
                    programType: state.projectProgram,
                    requestId: 1,
                    budget: state.projectBudget,
                    actualCost: state.projectActualCost,
                  },
                ];
              if (table === schema.mosqueRequests)
                return [
                  {
                    id: 1,
                    currentStage: state.requestStage,
                    programType: state.requestProgram,
                    approvedBudget: state.projectBudget,
                  },
                ];
              let rows =
                table === schema.projectChangeOrders
                  ? state.orders
                  : table === schema.disbursementRequests
                    ? state.requests
                    : table === schema.quantitySchedules
                      ? state.boqItems
                      : [];
              if (condition) {
                const { sql, params } = dialect.sqlToQuery(condition);
                if (sql.includes("`submissionKey`"))
                  rows = rows.filter(row => row.submissionKey === params[0]);
                else if (sql.includes("`projectId`"))
                  rows = rows.filter(row => row.projectId === params[0]);
                else if (sql.includes("`id`"))
                  rows = rows.filter(row => row.id === params[0]);
              }
              if (fields?.count) {
                return [{ count: rows.length }];
              }
              if (fields?.total) {
                const total = rows.reduce(
                  (s: number, it: any) => s + Number(it.totalPrice || 0),
                  0
                );
                return [{ total: total.toFixed(2) }];
              }
              rows = [...rows].sort((a, b) =>
                descending ? b.id - a.id : a.id - b.id
              );
              if (joined && table === schema.projectChangeOrders)
                return rows.map(order => ({
                  order,
                  requestStatus: state.requests.find(
                    row => row.id === order.disbursementRequestId
                  )?.status,
                  requestNumber: "DR-2026-0001",
                  approverName: "مسؤول جداول الكميات",
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
            : table === schema.quantitySchedules
              ? state.boqItems
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
    update: (table: any) => ({
      set: (values: any) => ({
        where: async (condition: any) => {
          if (table === schema.projectChangeOrders && condition) {
            const { params } = dialect.sqlToQuery(condition);
            const target = state.orders.find(row => row.id === params[0]);
            if (target) Object.assign(target, values);
          }
          if (table === schema.projects) {
            if (values.budget !== undefined)
              state.projectBudget = values.budget;
            if (values.actualCost !== undefined)
              state.projectActualCost = values.actualCost;
          }
          return [{ affectedRows: 1 }];
        },
      }),
    }),
    delete: (table: any) => ({
      where: async (condition: any) => {
        if (table === schema.quantitySchedules && condition) {
          const { params } = dialect.sqlToQuery(condition);
          state.boqItems = state.boqItems.filter(
            row => row.changeOrderId !== params[0]
          );
        }
        return [{ affectedRows: 1 }];
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
        boqItems: state.boqItems,
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
  items: [
    {
      name: "بند إضافي",
      description: "توصيف البند الإضافي",
      unit: "بند",
      quantity: 1,
      unitPrice: amount,
      category: "construction",
    },
  ],
});

beforeEach(() => {
  Object.assign(state, {
    permissions: ["projects.view_details", "disbursements.create_from_fund"],
    orders: [],
    boqItems: [],
    requests: [],
    movements: [],
    projectCost: 25000,
    projectBudget: "25000.00",
    projectActualCost: "25000.00",
    initialSurplus: 10000,
    initialFund: 0,
    projectStatus: "in_progress",
    projectProgram: "bunyan",
    requestProgram: "bunyan",
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
  it("requires at least one named item and a reason and does not require a supplier", () => {
    expect(createChangeOrderSchema.safeParse(input(5000)).success).toBe(true);
    expect(
      createChangeOrderSchema.safeParse({ ...input(), items: [] }).success
    ).toBe(false);
    expect(
      createChangeOrderSchema.safeParse({ ...input(), reason: " " }).success
    ).toBe(false);
  });
});

describe("project change order rules & value increments", () => {
  it("allows creating change order even when project surplus is zero and increments project budget and actual cost", async () => {
    state.initialSurplus = 0;
    state.initialFund = 0;
    const result = await caller().create(input(5000));
    expect(result.created).toBe(true);
    expect(state.orders).toHaveLength(1);
    expect(state.boqItems).toHaveLength(1);
    expect(state.projectBudget).toBe("30000.00");
    expect(state.projectActualCost).toBe("30000.00");
  });
  it("allows creating change order after project surplus has been transferred to the fund", async () => {
    state.movements = [{ movementType: "surplus", amount: "10000" }];
    const result = await caller().create(input(500));
    expect(result.created).toBe(true);
    expect(state.orders).toHaveLength(1);
    expect(state.projectBudget).toBe("25500.00");
    expect(state.projectActualCost).toBe("25500.00");
  });
  it("allows creating an order that exceeds project surplus and adds to project value", async () => {
    state.movements = [{ movementType: "surplus", amount: "8000" }];
    const result = await caller().create(input(5000));
    expect(result.created).toBe(true);
    expect(state.projectBudget).toBe("30000.00");
    expect(state.projectActualCost).toBe("30000.00");
  });
  it("keeps room for multiple orders and accumulates project value increments", async () => {
    state.initialSurplus = 0;
    await caller().create(input(1000));
    expect(state.projectBudget).toBe("26000.00");
    await caller().create(input(500));
    expect(state.projectBudget).toBe("26500.00");
    expect(state.orders).toHaveLength(2);
  });
  it.each(["project", "request"])(
    "prevents creating an order when the %s identifies a Sedana project",
    async source => {
      if (source === "project") state.projectProgram = "sedana";
      else state.requestProgram = "sedana";
      await expect(caller().create(input(500))).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(state.orders).toEqual([]);
      expect(state.boqItems).toEqual([]);
    }
  );
  it("creates change order and inserts final items into BOQ", async () => {
    const result = await caller().create(input(5000));
    expect(result.orderNumber).toMatch(/^CO-/);
    expect(state.orders[0]).toMatchObject({
      amount: "5000.00",
      originalProjectCost: "25000.00",
      percentage: "20.000000",
      status: "boq_approved",
    });
    expect(state.boqItems).toHaveLength(1);
    expect(state.boqItems[0]).toMatchObject({
      projectId: 1,
      itemName: "بند إضافي",
      unit: "بند",
      quantity: "1.000",
      unitPrice: "5000.00",
      totalPrice: "5000.00",
      isChangeOrder: true,
      changeOrderId: result.id,
    });
  });

  it("prevents modifying a change order after it has been added", async () => {
    const created = await caller().create(input(5000));
    await expect(
      caller().approveBoq({
        changeOrderId: created.id,
        items: [
          { name: "بند معدل", unit: "بند", quantity: 1, unitPrice: 3000 },
        ],
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(state.orders[0].amount).toBe("5000.00");
  });

  it("keeps the original denominator for subsequent orders", async () => {
    await caller().create(input(5000));
    state.projectCost = 30000;
    await caller().create(input(2500));
    expect(state.orders[1]).toMatchObject({
      originalProjectCost: "25000.00",
      percentage: "10.000000",
    });
    const result = await caller().list({ projectId: 1 });
    expect(result).toMatchObject({ activeTotal: 7500, percentage: 30 });
  });

  it("deduplicates concurrent retries with the same submission key", async () => {
    const request = input(5000);
    const results = await Promise.all([
      caller().create(request),
      caller().create(request),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect(state.orders).toHaveLength(1);
    expect(state.boqItems).toHaveLength(1);
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

  it("requires project read permission and authentication", async () => {
    state.permissions = [];
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
