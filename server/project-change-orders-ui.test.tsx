import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  canCreate: true,
  data: null as any,
  error: null as any,
}));
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => state.canCreate,
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({}),
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
const render = (closed = false) =>
  renderToStaticMarkup(
    <Router ssrPath="/projects/1">
      <ProjectChangeOrdersTab projectId={1} closed={closed} />
    </Router>
  );

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.canCreate = true;
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
        status: "pending",
        disbursementRequestId: 17,
        requestNumber: "DR-2026-0001",
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
  it("shows original value, additional items, computed percentage, revised value, and the linked payment request", () => {
    const html = render();
    for (const text of [
      "25,000.00",
      "5,000.00",
      "20.00",
      "30,000.00",
      "بند إضافي",
      "بانتظار اعتماد مُعد الطلب",
      "/disbursements/requests/17",
    ])
      expect(html).toContain(text);
  });
  it("hides creation for read-only viewers", () => {
    state.canCreate = false;
    const html = render();
    expect(html).not.toContain("أمر تغيير جديد</button>");
    expect(html).toContain("CO-2026-0001");
  });
  it("disables creation when all surplus has been reserved", () => {
    state.data.funding.available = 0;
    const html = render();
    expect(html).toMatch(
      /<button[^>]*disabled[^>]*>[\s\S]*?أمر تغيير جديد<\/button>/
    );
  });
  it("hides creation on closed projects while preserving order history", () => {
    const html = render(true);
    expect(html).not.toContain("أمر تغيير جديد</button>");
    expect(html).toContain("CO-2026-0001");
    expect(html).toContain("المشروع مغلق");
  });
  it("explains a missing approved cost and disables order creation", () => {
    state.data.funding = null;
    state.data.fundingError = "يجب تحديد تكلفة المشروع المعتمدة";
    const html = render();
    expect(html).toContain(state.data.fundingError);
    expect(html).toMatch(
      /<button[^>]*disabled[^>]*>[\s\S]*?أمر تغيير جديد<\/button>/
    );
  });
});
