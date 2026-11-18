import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import { CONTRACT_PERMISSION_IDS } from "../shared/contractPermissions";

const state = vi.hoisted(() => ({
  records: {} as Record<string, any[]>,
  writes: [] as { table: string; op: string; values: any }[],
}));

vi.mock("./db", () => ({
  getDb: async () => {
    function rows(table: any) {
      const name = getTableName(table);
      if (name === "users") return [{ id: 1, role: "super_admin" }];
      if (name === "roles")
        return [
          {
            id: "super_admin",
            description: JSON.stringify(CONTRACT_PERMISSION_IDS),
            isActive: true,
          },
        ];
      if (name === "role_permissions")
        return CONTRACT_PERMISSION_IDS.map(permissionId => ({ permissionId }));
      if (name === "user_permissions") return [];
      if (name === "permissions")
        return CONTRACT_PERMISSION_IDS.map(id => ({ id }));
      return state.records[name] ?? [];
    }
    function query(fields?: any, table?: any): any {
      const chain: any = {
        from: (value: any) => {
          table = value;
          return chain;
        },
        then: (resolve: any, reject: any) => {
          const rawRows = rows(table);
          if (fields?.contract && getTableName(table) === "contracts_enhanced") {
            return Promise.resolve(
              rawRows.map(r => ({
                contract: r,
                signatory: null,
                projectName: "مشروع اختباري",
                introTemplate: null,
                projectRequestId: null,
              }))
            ).then(resolve, reject);
          }
          if (fields?.total && getTableName(table) === "contracts_enhanced") {
            const total = rawRows.reduce(
              (s, r) => s + Number(r.contractAmount || 0),
              0
            );
            return Promise.resolve([{ total: String(total) }]).then(
              resolve,
              reject
            );
          }
          if (fields?.total && getTableName(table) === "project_change_orders") {
            const total = rawRows.reduce(
              (s, r) => s + Number(r.amount || 0),
              0
            );
            return Promise.resolve([{ total: String(total) }]).then(
              resolve,
              reject
            );
          }
          return Promise.resolve(rawRows).then(resolve, reject);
        },
      };
      for (const method of [
        "where",
        "limit",
        "orderBy",
        "leftJoin",
        "innerJoin",
        "groupBy",
        "offset",
      ]) {
        chain[method] = () => chain;
      }
      return chain;
    }
    const write = (table: any, op: string) => (values: any) => {
      const name = getTableName(table);
      state.writes.push({ table: name, op, values });
      const result = Promise.resolve([{ insertId: 500 }]);
      return Object.assign(result, { where: () => result });
    };
    return {
      select: (fields?: any) => query(fields),
      update: (table: any) => ({ set: write(table, "update") }),
      insert: (table: any) => ({ values: write(table, "insert") }),
      delete: (table: any) => ({
        where: () => Promise.resolve([{ affectedRows: 1 }]),
      }),
    };
  },
}));

import { contractsRouter } from "./routers/contracts";
import { projectsRouter } from "./routers/projects";
import {
  contractPayments,
  contractsEnhanced,
  disbursementRequests,
  payments,
  projectChangeOrders,
  projects,
} from "../drizzle/schema";

const ctx = () =>
  ({
    user: { id: 1, role: "super_admin" },
    req: {},
    res: {},
  }) as TrpcContext;

describe("change order payments isolation from contract preview & edit", () => {
  beforeEach(() => {
    state.writes = [];
    state.records = {
      [getTableName(projects)]: [
        {
          id: 10,
          name: "مشروع اختباري",
          budget: "120000.00",
          actualCost: "120000.00",
        },
      ],
      [getTableName(contractsEnhanced)]: [
        {
          id: 20,
          projectId: 10,
          contractNumber: "CNT-2026-0020",
          contractTitle: "عقد مقاولة",
          contractAmount: "100000.00",
          contractAmountText: "مائة ألف ريال سعودي",
          secondPartyName: "مقاول الاختبار",
          status: "approved",
          paymentScheduleJson: JSON.stringify({
            paymentSystem: "installments",
            schedule: [
              { id: "payment-1", name: "الدفعة الأولى المعدلة", amount: 35000 },
              { id: "payment-2", name: "الدفعة الثانية", amount: 55000 },
            ],
          }),
        },
      ],
      [getTableName(contractPayments)]: [
        {
          id: 1,
          contractId: 20,
          phaseName: "الدفعة الأولى المعدلة",
          phaseOrder: 0,
          amount: "35000.00",
          dueDate: new Date("2026-11-15T12:00:00"),
          status: "pending",
          notes: "دفعة عادية معدلة",
          completionPercentage: 35,
        },
        {
          id: 2,
          contractId: 20,
          phaseName: "الدفعة الثانية",
          phaseOrder: 1,
          amount: "55000.00",
          dueDate: new Date("2026-12-01T12:00:00"),
          status: "pending",
          notes: "دفعة عادية",
          completionPercentage: 90,
        },
      ],
      [getTableName(payments)]: [
        {
          id: 101,
          paymentNumber: "PAY-101",
          projectId: 10,
          contractId: 20,
          changeOrderId: null,
          amount: "10000.00",
          description: "دفعة عادية مضافة",
          status: "pending",
          createdAt: new Date("2026-11-20T12:00:00"),
        },
        {
          id: 102,
          paymentNumber: "PAY-102",
          projectId: 10,
          contractId: 20,
          changeOrderId: 77,
          amount: "20000.00",
          description: "دفعة أمر تغيير",
          status: "pending",
          createdAt: new Date("2026-11-25T12:00:00"),
        },
      ],
      [getTableName(projectChangeOrders)]: [
        {
          id: 77,
          projectId: 10,
          orderNumber: "CO-001",
          amount: "20000.00",
          status: "linked_to_payment",
          paymentId: 102,
          contractPaymentId: null,
          disbursementRequestId: null,
        },
      ],
      [getTableName(disbursementRequests)]: [],
    };
  });

  it("keeps regular payment changes reflected in contracts.getById while excluding change order payments", async () => {
    const res = await contractsRouter
      .createCaller(ctx())
      .getById({ id: 20 });

    expect(res.contract.contractAmount).toBe("100000.00");
    // 2 contract payments + 1 regular manual payment = 3 (excludes change order payment id 102)
    expect(res.payments).toHaveLength(3);
    expect(res.payments.map((p: any) => p.phaseName)).toEqual([
      "الدفعة الأولى المعدلة",
      "دفعة عادية مضافة",
      "الدفعة الثانية",
    ]);
    expect(
      res.payments.some((p: any) => p.phaseName === "دفعة أمر تغيير")
    ).toBe(false);
  });

  it("syncs regular cp- payment edits to contracts_enhanced, while keeping change order payment edits & additions isolated from contracts_enhanced", async () => {
    const caller = projectsRouter.createCaller(ctx());

    // 1. تعديل دفعة أمر التغيير (manual-102) -> لا يمس contracts_enhanced
    state.records[getTableName(projectChangeOrders)][0].amount = "30000.00";
    await caller.updateUnifiedPayment({
      id: "manual-102",
      amount: 15000,
      title: "دفعة 1 أمر تغيير معدلة",
      description: "تعديل دفعة أمر التغيير",
      dateMiladi: "2026-11-26",
    });

    // 2. إضافة دفعة جديدة لأمر التغيير -> لا يمس contracts_enhanced
    await caller.createPayment({
      projectId: 10,
      contractId: 20,
      changeOrderId: 77,
      title: "دفعة 2 لأمر التغيير",
      amount: 10000,
      paymentType: "progress",
      description: "اختبار دفعة أمر تغيير",
      dateMiladi: "2026-11-27",
      items: [{ itemName: "بند أمر تغيير", quantity: 1 }],
    });

    expect(
      state.writes.filter(w => w.table === getTableName(contractsEnhanced))
    ).toEqual([]);

    // 3. تعديل دفعة عقد عادية (cp-1) -> ينعكس على contracts_enhanced كالمعتاد
    await caller.updateUnifiedPayment({
      id: "cp-1",
      amount: 35000,
      title: "الدفعة الأولى المحدثة",
      description: "تحديث دفعة عادية",
      dateMiladi: "2026-11-16",
      completionPercentage: 35,
    });

    const contractUpdates = state.writes.filter(
      w => w.table === getTableName(contractsEnhanced)
    );
    expect(contractUpdates.length).toBeGreaterThan(0);
  });
});
