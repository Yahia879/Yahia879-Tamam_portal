import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

const state = vi.hoisted(() => ({ orders: [] as any[], movements: [] as any[], received: 110000 }));
vi.mock("./permissions", () => ({ checkPermission: async (_id: number, permission: string) => ["fund.transfer", "boq.view"].includes(permission) }));
vi.mock("./routers/notifications", () => ({ notifyDisbursementRequestCreation: vi.fn(), notifyUsersByRole: vi.fn() }));
vi.mock("./db", () => {
  let previous = Promise.resolve();
  const db: any = {
    select: (fields?: any) => {
      let table: any;
      const query: any = {
        from: (value: any) => { table = value; return query; },
        then: (resolve: any, reject: any) => Promise.resolve().then(() => {
          const name = getTableName(table);
          if (name === "projects") return [{ id: 19, name: "Project", projectNumber: "PRJ-19", requestId: null, budget: "100000", status: "in_progress" }];
          if (name === "receipt_vouchers") return [{ id: 1, projectId: 19, status: "approved", amount: String(state.received) }];
          if (name === "contracts_enhanced") return [{ contractAmount: "100000" }];
          if (name === "project_change_orders") return fields?.order ? state.orders.map(order => ({ order })) : state.orders;
          if (name === "fund_movements") return fields?.movementType ? state.movements : [{ amount: String(state.movements.reduce((sum, row) => sum + Number(row.amount), 0)) }];
          if (name === "disbursement_requests") return fields?.amount ? [{ amount: "0" }] : [];
          return [];
        }).then(resolve, reject),
      };
      for (const method of ["where", "leftJoin", "innerJoin", "groupBy", "orderBy", "limit"]) query[method] = () => query;
      return query;
    },
    insert: (table: any) => ({ values: async (value: any) => {
      if (getTableName(table) === "fund_movements") state.movements.push({ ...value, id: state.movements.length + 1 });
      return [{ insertId: state.movements.length }];
    } }),
    execute: async () => [],
    transaction: async (operation: any) => {
      const wait = previous;
      let release!: () => void;
      previous = new Promise<void>(resolve => { release = resolve; });
      await wait;
      const snapshot = [...state.movements];
      try { return await operation(db); }
      catch (error) { state.movements = snapshot; throw error; }
      finally { release(); }
    },
  };
  return { getDb: async () => db };
});
import { getDb } from "./db";
import { getProjectFundableAmounts } from "./fund";
import { fundRouter } from "./routers/fund";
import { projectChangeOrdersRouter } from "./routers/projectChangeOrders";
const context = { user: { id: 0, role: "projects_office" }, req: {}, res: {} } as TrpcContext;
const fund = () => fundRouter.createCaller(context);
const order = (id: number, amount: number) => ({ id, projectId: 19, orderNumber: `CO-${id}`, title: `Order ${id}`, reason: "Additional work", originalProjectCost: "100000", percentage: "1", amount: String(amount), status: "boq_approved", itemsJson: "[]" });
const transfer = (amount: number, changeOrdersOnly = true) => fund().transferFromProject({ projectId: 19, source: "surplus", amount, changeOrdersOnly, destination: { restrictionType: "project", restrictedProjectId: 19 } });
beforeEach(() => { state.orders = [order(1, 1000)]; state.movements = []; state.received = 110000; });

describe("remaining change-order transfers", () => {
  it("offers 500, not 1500, after transferring the first 1000 and adding a new 500 order", async () => {
    await transfer(1000);
    state.orders.push(order(2, 500));
    const available = await getProjectFundableAmounts(await getDb(), 19);
    expect(available).toMatchObject({ changeOrderTotal: 1500, surplusTransferred: 1000, changeOrderAvailable: 500, surplusAvailable: 9000 });
    expect((await projectChangeOrdersRouter.createCaller(context).list({ projectId: 19 })).funding?.pendingTransfer).toBe(500);
    await expect(transfer(1500)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.movements).toHaveLength(1);
    await expect(transfer(500)).resolves.toMatchObject({ success: true, remaining: 0 });
    expect((await getProjectFundableAmounts(await getDb(), 19)).changeOrderAvailable).toBe(0);
    await expect(transfer(500)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.movements.map(row => Number(row.amount))).toEqual([1000, 500]);
  });
  it("subtracts partial transfers from the next permitted amount", async () => {
    await transfer(700);
    expect((await getProjectFundableAmounts(await getDb(), 19)).changeOrderAvailable).toBe(300);
    await expect(transfer(301)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(transfer(300)).resolves.toMatchObject({ remaining: 0 });
  });
  it("rechecks the remaining amount inside the transaction for concurrent requests", async () => {
    const results = await Promise.allSettled([transfer(1000), transfer(1000)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(state.movements).toHaveLength(1);
  });
  it("caps change-order transfers by actual remaining surplus", async () => {
    state.received = 100500;
    expect((await getProjectFundableAmounts(await getDb(), 19)).changeOrderAvailable).toBe(500);
    await expect(transfer(1000)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("preserves regular project-surplus transfers independently of the change-order workflow", async () => {
    state.orders = [];
    await expect(transfer(1500, false)).resolves.toMatchObject({ success: true, remaining: 8500 });
  });
});
