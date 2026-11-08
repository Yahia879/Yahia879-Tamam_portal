import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

const state = vi.hoisted(() => ({ orders: [] as any[], movements: [] as any[], received: 110000, completionPercentage: 67, projectStatus: "in_progress", budget: "100000", failInsert: false, requests: [] as any[], phases: [] as any[] }));
vi.mock("./permissions", () => ({ checkPermission: async (_id: number, permission: string) => ["projects.financials", "boq.view", "disbursements.create_from_fund", "fund.view"].includes(permission) }));
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
          if (name === "projects") return [{ id: 19, name: "Project", projectNumber: "PRJ-19", requestId: null, budget: state.budget, status: state.projectStatus, completionPercentage: state.completionPercentage }];
          if (name === "project_phases") return fields?.projectId ? [state.phases[state.phases.length - 1]] : state.phases;
          if (name === "receipt_vouchers") return [{ id: 1, projectId: 19, status: "approved", amount: String(state.received) }];
          if (name === "contracts_enhanced") return [{ contractAmount: state.budget }];
          if (name === "project_change_orders") {
            if (fields?.order) return state.orders.map(order => ({ order }));
            if (fields?.requestStatus) return state.orders.filter(order => order.projectId === 19).map(order => {
              const request = state.requests.find(request => request.id === order.disbursementRequestId);
              return { amount: order.amount, status: order.status, requestId: request?.id, requestAmount: request?.amount,
                requestStatus: request?.status, requestRestrictionType: request?.fundRestrictionType, requestProjectId: request?.fundRestrictedProjectId };
            });
            return state.orders;
          }
          if (name === "fund_movements") return fields?.movementType ? state.movements : [{ amount: String(state.movements.reduce((sum, row) => sum + Number(row.amount), 0)) }];
          if (name === "disbursement_requests") return fields?.amount ? [{ amount: String(state.requests.filter(request => !["paid", "rejected"].includes(request.status)).reduce((sum, request) => sum + Number(request.amount) + Number(request.adminFees || 0), 0)) }] : [];
          return [];
        }).then(resolve, reject),
      };
      for (const method of ["where", "leftJoin", "innerJoin", "groupBy", "orderBy", "limit"]) query[method] = () => query;
      return query;
    },
    insert: (table: any) => ({ values: async (value: any) => {
      if (state.failInsert) throw new Error("Insert failed");
      if (getTableName(table) === "fund_movements") state.movements.push({ ...value, id: state.movements.length + 1 });
      if (getTableName(table) === "disbursement_requests") state.requests.push({ ...value, id: 42 + state.requests.length });
      return [{ insertId: getTableName(table) === "disbursement_requests" ? 41 + state.requests.length : 42 }];
    } }),
    update: (table: any) => ({ set: (changes: any) => ({ where: async () => {
      if (getTableName(table) === "projects") {
        if (changes.completionPercentage !== undefined) state.completionPercentage = changes.completionPercentage;
        if (changes.status) state.projectStatus = changes.status;
      }
      if (getTableName(table) === "project_change_orders") Object.assign(state.orders[0], changes);
      if (getTableName(table) === "project_phases") Object.assign(state.phases[state.phases.length - 1], changes);
    } }) }),
    execute: async () => [],
    transaction: async (operation: any) => {
      const wait = previous;
      let release!: () => void;
      previous = new Promise<void>(resolve => { release = resolve; });
      await wait;
      const snapshot = { movements: [...state.movements], orders: structuredClone(state.orders), requests: [...state.requests], phases: structuredClone(state.phases), completionPercentage: state.completionPercentage, projectStatus: state.projectStatus };
      try { return await operation(db); }
      catch (error) { Object.assign(state, snapshot); throw error; }
      finally { release(); }
    },
  };
  return { getDb: async () => db };
});
import { getDb } from "./db";
import { getProjectFundableAmounts, getFundRequestAvailability, updateProjectAndSettleSurplus, postVoucherDeposit } from "./fund";
import { fundRouter } from "./routers/fund";
import { projectChangeOrdersRouter } from "./routers/projectChangeOrders";
import { projectsRouter } from "./routers/projects";
import { reconcileCompletedProjectSurpluses } from "./completed-project-surplus";
const context = { user: { id: 0, role: "projects_office" }, req: {}, res: {} } as TrpcContext;
const fund = () => fundRouter.createCaller(context);
const order = (id: number, amount: number) => ({ id, projectId: 19, orderNumber: `CO-${id}`, title: `Order ${id}`, reason: "Additional work", originalProjectCost: "100000", percentage: "1", amount: String(amount), status: "boq_approved", itemsJson: "[]" });
const transfer = (amount: number, changeOrdersOnly = true) => fund().transferFromProject({ projectId: 19, source: "surplus", amount, changeOrdersOnly, destination: { restrictionType: "project", restrictedProjectId: 19 } });
beforeEach(() => { state.orders = [order(1, 1000)]; state.movements = []; state.received = 110000; state.completionPercentage = 67; state.projectStatus = "in_progress"; state.budget = "100000"; state.failInsert = false; state.requests = []; state.phases = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, projectId: 19, phaseOrder: i + 1, status: i === 5 ? "in_progress" : "completed", completionPercentage: i === 5 ? 0 : 100 })); });

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

describe("automatic surplus settlement at 100%", () => {
  const progress = async (completionPercentage: number) => updateProjectAndSettleSurplus(await getDb(), 19, { completionPercentage }, 7);
  it("does not transfer before project operations reach 100%", async () => {
    await progress(99);
    expect(state.movements).toEqual([]);
  });
  it("transfers only the remainder after earlier change-order transfers and never repeats it", async () => {
    await transfer(1000);
    expect(await progress(100)).toBe(9000);
    expect(state.movements.map(row => Number(row.amount))).toEqual([1000, 9000]);
    expect(state.movements[1]).toMatchObject({ movementType: "surplus", restrictionType: "project", restrictedProjectId: 19, createdById: 7 });
    expect(await progress(100)).toBe(0);
    expect(await getProjectFundableAmounts(await getDb(), 19)).toMatchObject({ surplusAvailable: 0, administrativeAvailable: 0 });
  });
  it("serializes concurrent completion updates into one transfer", async () => {
    await Promise.all([progress(100), progress(100)]);
    expect(state.movements).toHaveLength(1);
    expect(state.movements[0].amount).toBe("10000.00");
  });
  it("reconciles projects already completed before deployment without repeating their transfers", async () => {
    state.completionPercentage = 100;
    await transfer(1000);
    await reconcileCompletedProjectSurpluses(await getDb());
    await reconcileCompletedProjectSurpluses(await getDb());
    expect(state.movements.map(row => Number(row.amount))).toEqual([1000, 9000]);
    expect(state.movements[1].createdById).toBeNull();
  });
  it("does not transfer when there is no surplus or the project is cancelled", async () => {
    state.received = 99999;
    await progress(100);
    expect(state.movements).toEqual([]);
    state.received = 110000;
    state.projectStatus = "cancelled";
    await progress(100);
    expect(state.movements).toEqual([]);
  });
  it("settles newly approved receipts after completion without duplicating the earlier surplus", async () => {
    await progress(100);
    state.received = 110500;
    const db = await getDb();
    await db!.transaction(async tx => {
      await postVoucherDeposit(tx, { id: 2, projectId: 19, status: "approved", createdById: 7 } as any, 7);
    });
    expect(state.movements.map(row => Number(row.amount))).toEqual([10000, 500]);
  });
  it("rolls back project progress when recording the automatic transfer fails", async () => {
    state.failInsert = true;
    await expect(progress(100)).rejects.toThrow("Insert failed");
    expect(state.completionPercentage).toBe(67);
    expect(state.movements).toEqual([]);
  });
  it("allows unfunded projects to finish without creating an unsupported movement", async () => {
    state.budget = "0";
    await progress(100);
    expect(state.completionPercentage).toBe(100);
    expect(state.movements).toEqual([]);
  });
});

describe("explicit linking of fund requests", () => {
  const request = (extra = {}) => fund().createDisbursementRequest({
    projectId: 19, title: "Fund request", amount: 1000, beneficiaryName: "Supplier",
    source: { restrictionType: "project", restrictedProjectId: 19 }, ...extra,
  });
  beforeEach(async () => { await transfer(1000); });
  it("keeps an unchecked request unlinked even if its amount matches a change order", async () => {
    await updateProjectAndSettleSurplus(await getDb(), 19, { completionPercentage: 100 }, 7);
    await request();
    expect(state.requests).toHaveLength(1);
    expect(state.orders[0].disbursementRequestId).toBeUndefined();
  });
  it("links only an explicitly selected change order", async () => {
    await request({ changeOrderId: 1 });
    expect(state.orders[0]).toMatchObject({ disbursementRequestId: 42, status: "disbursement_created" });
  });
  it.each([
    ["a different project", { projectId: 20 }],
    ["a rejected order", { status: "rejected" }],
    ["an already linked order", { disbursementRequestId: 17 }],
    ["an incorrect amount", { amount: "900" }],
  ])("rejects linking %s before creating a request", async (_name, changes) => {
    Object.assign(state.orders[0], changes);
    await expect(request({ changeOrderId: 1 })).rejects.toBeDefined();
    expect(state.requests).toEqual([]);
  });
});

describe("project progress mutation integration", () => {
  const caller = () => projectsRouter.createCaller(context);
  it("settles the surplus when editing project completion", async () => {
    await caller().update({ id: 19, completionPercentage: 100 });
    expect(state.movements.map(row => Number(row.amount))).toEqual([10000]);
  });
  it("settles the surplus when editing actual progress in milestones", async () => {
    await caller().updateProgressAndMilestones({ id: 19, completionPercentage: 100 });
    expect(state.movements.map(row => Number(row.amount))).toEqual([10000]);
  });
  it("settles after the final project phase reaches 100%", async () => {
    await caller().updatePhase({ id: 6, status: "completed", completionPercentage: 100 });
    expect(state.completionPercentage).toBe(100);
    expect(state.movements.map(row => Number(row.amount))).toEqual([10000]);
  });
  it("rolls back both the phase and aggregate progress if the financial posting fails", async () => {
    state.failInsert = true;
    await expect(caller().updatePhase({ id: 6, status: "completed", completionPercentage: 100 })).rejects.toThrow("Insert failed");
    expect(state.phases[5].completionPercentage).toBe(0);
    expect(state.completionPercentage).toBe(67);
    expect(state.movements).toEqual([]);
  });
});

describe("unlinked fund requests protect change-order allocations", () => {
  const bucket = { restrictionType: "project" as const, restrictedProjectId: 19 };
  const availability = async () => getFundRequestAvailability(await getDb(), bucket);
  const request = (amount: number, extra = {}) => fund().createDisbursementRequest({
    projectId: 19, title: "Unlinked request", amount, beneficiaryName: "Supplier", source: bucket, ...extra,
  });
  const pending = (amount: number, extra = {}) => ({ id: 77, projectId: 19, amount: String(amount), adminFees: "0", status: "pending", fundRestrictionType: "project", fundRestrictedProjectId: 19, ...extra });
  beforeEach(() => {
    state.orders = [order(1, 1500)];
    state.movements = [{ projectId: 19, movementType: "surplus", restrictionType: "project", restrictedProjectId: 19, amount: "5000" }];
  });
  it("exposes only 3500 of a 5000 balance with 1500 allocated to change orders", async () => {
    expect(await availability()).toMatchObject({ spendable: 5000, changeOrderReserved: 1500, unlinkedSpendable: 3500 });
    await expect(request(3500.01)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.requests).toEqual([]);
    await expect(request(3500)).resolves.toMatchObject({ success: true });
  });
  it("includes administrative fees in the unlinked limit", async () => {
    await expect(request(3400, { adminFees: 100.01 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(request(3400, { adminFees: 100 })).resolves.toMatchObject({ success: true });
  });
  it("cannot spend any unlinked amount if the entire balance is allocated, while linked requests still work", async () => {
    state.movements[0].amount = "1500";
    expect((await availability()).unlinkedSpendable).toBe(0);
    await expect(request(0.01)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(request(1500, { changeOrderId: 1 })).resolves.toMatchObject({ success: true });
  });
  it("does not deduct an existing linked request twice and keeps its administrative fees reserved", async () => {
    state.orders[0].disbursementRequestId = 77;
    state.requests = [pending(1500, { adminFees: "100" })];
    expect(await availability()).toMatchObject({ spendable: 3400, changeOrderReserved: 1500, unlinkedSpendable: 3400 });
    await expect(request(3400.01)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(request(3400)).resolves.toMatchObject({ success: true });
  });
  it("subtracts existing unlinked reservations in addition to the change orders", async () => {
    state.requests = [pending(700, { adminFees: "50" })];
    expect(await availability()).toMatchObject({ spendable: 4250, unlinkedSpendable: 2750 });
    await expect(request(2750.01)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(request(2750)).resolves.toMatchObject({ success: true });
  });
  it("keeps the remainder of a historical partially covered change order reserved", async () => {
    state.orders[0].disbursementRequestId = 77;
    state.requests = [pending(1000)];
    expect(await availability()).toMatchObject({ spendable: 4000, unlinkedSpendable: 3500 });
  });
  it("does not release an allocation merely because its linked request was rejected", async () => {
    state.orders[0].disbursementRequestId = 77;
    state.requests = [pending(1500, { status: "rejected" })];
    expect((await availability()).unlinkedSpendable).toBe(3500);
  });
  it.each(["rejected", "paid"])("does not reserve a change order that is %s", async status => {
    if (status === "paid") {
      state.orders[0].disbursementRequestId = 77;
      state.requests = [pending(1500, { status: "paid" })];
    } else state.orders[0].status = status;
    expect(await availability()).toMatchObject({ unlinkedSpendable: 5000, changeOrderReserved: 0 });
    await expect(request(5000)).resolves.toMatchObject({ success: true });
  });
  it("never covers several historical change orders twice with the same request", async () => {
    state.orders = [{ ...order(1, 1500), disbursementRequestId: 77 }, { ...order(2, 1500), disbursementRequestId: 77 }];
    state.requests = [pending(1500)];
    expect(await availability()).toMatchObject({ spendable: 3500, changeOrderReserved: 3000, unlinkedSpendable: 2000 });
  });
  it("serializes concurrent unlinked requests so they cannot use the same free balance", async () => {
    const results = await Promise.allSettled([request(2000), request(2000)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(state.requests).toHaveLength(1);
    expect((await availability()).unlinkedSpendable).toBe(1500);
  });
  it("keeps general fund requests independent of project change-order allocations", async () => {
    await expect(fund().createDisbursementRequest({ title: "General request", amount: 5000, beneficiaryName: "Supplier", source: { restrictionType: "general" } })).resolves.toMatchObject({ success: true });
  });
});
