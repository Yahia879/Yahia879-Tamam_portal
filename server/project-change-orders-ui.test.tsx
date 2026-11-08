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
      projects: { getBOQ: { invalidate: vi.fn() } },
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
      "الفائض المتاح لأوامر التغيير",
      "إضافة بند لجدول الكميات",
      "اعتماد أمر التغيير للمشروع والانتقال لقسم جدول الكميات",
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain("تحديد المورد");
    for (const removed of ["نهائي غير قابل للتعديل", "معتمد في جدول الكميات - جاهز للتحويل للصندوق", "عرض البنود في قسم جدول الكميات", "الانتقال لصفحة الصندوق لتحويل المبلغ"]) expect(html).not.toContain(removed);
  });

  it("shows change orders as closed and hides creation when available surplus is zero", () => {
    state.data.funding.available = 0;
    const html = render();
    expect(html).toContain("أوامر التغيير مغلقة لعدم وجود فائض متاح للمشروع");
    expect(html).not.toContain("إضافة أمر تغيير جديد");
    expect(html).not.toContain("إضافة بند لجدول الكميات");
    expect(html).toContain("CO-2026-0001");
  });

  it("hides creation on closed projects while preserving order history", () => {
    const html = render(true);
    expect(html).not.toContain("إضافة أمر تغيير جديد");
    expect(html).toContain("CO-2026-0001");
  });
});
