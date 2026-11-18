import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  data: null as any,
  error: null as any,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      projectChangeOrders: { list: { invalidate: vi.fn() } },
      projects: {
        getById: { invalidate: vi.fn() },
        getAll: { invalidate: vi.fn() },
        getBOQ: { invalidate: vi.fn() },
      },
      fund: {
        transferableProjects: { invalidate: vi.fn() },
        projectAvailability: { invalidate: vi.fn() },
      },
    }),
    categories: {
      getAllCategories: {
        useQuery: () => ({ data: [] }),
      },
    },
    projectChangeOrders: {
      list: {
        useQuery: () => ({
          data: state.data,
          error: state.error,
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      create: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      linkToPayment: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
    },
  },
}));

import ProjectChangeOrdersTab from "../client/src/components/ProjectChangeOrdersTab";

const render = (closed = false, onNavigateToBoq = vi.fn()) =>
  renderToStaticMarkup(
    <Router ssrPath="/projects/1">
      <ProjectChangeOrdersTab
        projectId={1}
        closed={closed}
        onNavigateToBoq={onNavigateToBoq}
      />
    </Router>
  );

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.error = null;
  state.data = {
    funding: {
      originalProjectCost: 25000,
      projectSurplus: 5000,
      fundSurplus: 0,
      available: 5000,
    },
    activeTotal: 5000,
    percentage: 20,
    orders: [
      {
        id: 1,
        orderNumber: "CO-2026-0001",
        title: "أعمال إضافية",
        reason: "إضافة بند للمشروع",
        amount: "5000.00",
        originalProjectCost: "25000.00",
        percentage: "20.000000",
        status: "boq_approved",
        disbursementRequestId: null,
        requestNumber: null,
        createdAt: new Date("2026-11-03"),
        items: [
          {
            name: "بند إضافي",
            unit: "بند",
            quantity: 1,
            unitPrice: 5000,
            total: 5000,
          },
        ],
      },
    ],
  };
});

describe("project change order view", () => {
  it("shows the order and financial summary without the removed labels or shortcuts", () => {
    const html = render();
    for (const text of [
      "25,000.00",
      "5,000.00",
      "20.00%",
      "بند إضافي",
      "إضافة بند لجدول الكميات",
      "اعتماد أمر التغيير للمشروع وزيادة قيمته والانتقال لقسم جدول الكميات",
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain("تحديد المورد");
    for (const removed of [
      "نهائي غير قابل للتعديل",
      "معتمد في جدول الكميات - جاهز للتحويل للصندوق",
      "عرض البنود في قسم جدول الكميات",
      "الانتقال لصفحة الصندوق لتحويل المبلغ",
    ])
      expect(html).not.toContain(removed);
  });

  it("allows creation even when surplus is zero and offers navigating to payments", () => {
    state.data.funding.available = 0;
    const html = render();
    expect(html).toContain("إضافة أمر تغيير جديد");
    expect(html).toContain("إضافة بند لجدول الكميات");
    expect(html).toContain("CO-2026-0001");
    expect(html).toContain("الانتقال لقسم الدفعات لإضافة دفعة");
  });

  it("hides creation on closed projects while preserving order history", () => {
    const html = render(true);
    expect(html).not.toContain("إضافة أمر تغيير جديد");
    expect(html).toContain("CO-2026-0001");
  });

  it("shows linked payment button when order has paymentId", () => {
    state.data.orders[0].paymentId = 42;
    state.data.orders[0].paymentNumber = "PAY-2026-0042";
    state.data.orders[0].status = "linked_to_payment";
    const html = render();
    expect(html).toContain("الدفعة المرتبطة: PAY-2026-0042");
    expect(html).toContain("مرتبط بدفعة جديدة للمشروع");
  });

  it("shows multi-payment summary and remaining balance when split across payments", () => {
    state.data.orders[0].paymentId = 42;
    state.data.orders[0].paymentsCount = 2;
    state.data.orders[0].allocatedPaymentAmount = 3000;
    state.data.orders[0].remainingPaymentAmount = 2000;
    state.data.orders[0].status = "linked_to_payment";
    const html = render();
    expect(html).toContain("الدفعات المرتبطة (2): 3,000.00 ر.س");
    expect(html).toContain("متبقي للجدولة في قسم الدفعات: 2,000.00 ر.س");
  });
});
