import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users } from "../drizzle/schema";

describe("Financial Dashboard", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // إنشاء مستخدم اختبار
    const [user] = await db
      .insert(users)
      .values({
        openId: `test-financial-${Date.now()}`,
        name: "Financial Test User",
        email: `financial-test-${Date.now()}@test.com`,
        role: "system_admin",
      })
      .$returningId();
    testUserId = user.id;

    adminCaller = appRouter.createCaller({
      user: {
        id: testUserId,
        openId: `test-financial-${Date.now()}`,
        name: "Financial Test User",
        email: `financial-test-${Date.now()}@test.com`,
        role: "system_admin",
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  describe("getFinancialSummary", () => {
    it("should return financial summary structure", async () => {
      const summary = await adminCaller.disbursements.getFinancialSummary();

      expect(summary).toBeDefined();
      expect(summary).toHaveProperty("totalApproved");
      expect(summary).toHaveProperty("totalPaid");
      expect(summary).toHaveProperty("totalRemaining");
      expect(summary).toHaveProperty("paidPercentage");
      expect(summary).toHaveProperty("pendingRequests");
      expect(summary).toHaveProperty("pendingAmount");
      expect(summary).toHaveProperty("advancePayment");
      expect(summary).toHaveProperty("progressPayments");
      expect(summary).toHaveProperty("finalPayment");
      expect(summary).toHaveProperty("retentionAmount");

      expect(typeof summary.totalApproved).toBe("number");
      expect(typeof summary.totalPaid).toBe("number");
      expect(typeof summary.totalRemaining).toBe("number");
      expect(typeof summary.paidPercentage).toBe("number");
      expect(typeof summary.pendingRequests).toBe("number");
      expect(typeof summary.pendingAmount).toBe("number");
    });

    it("should calculate remaining amount correctly", async () => {
      const summary = await adminCaller.disbursements.getFinancialSummary();

      const expectedRemaining = summary.totalApproved - summary.totalPaid;
      expect(summary.totalRemaining).toBe(expectedRemaining);
    });

    it("should calculate paid percentage correctly when totalApproved > 0", async () => {
      const summary = await adminCaller.disbursements.getFinancialSummary();

      if (summary.totalApproved > 0) {
        const expectedPercentage = (summary.totalPaid / summary.totalApproved) * 100;
        expect(summary.paidPercentage).toBe(expectedPercentage);
      } else {
        expect(summary.paidPercentage).toBe(0);
      }
    });

    it("should accept optional projectId filter", async () => {
      const summary = await adminCaller.disbursements.getFinancialSummary({
        projectId: 999999, // مشروع غير موجود
      });

      expect(summary).toBeDefined();
      expect(summary.totalApproved).toBe(0);
      expect(summary.totalPaid).toBe(0);
      expect(summary.totalRemaining).toBe(0);
      expect(summary.paidPercentage).toBe(0);
      expect(summary.pendingRequests).toBe(0);
      expect(summary.pendingAmount).toBe(0);
    });
  });
});
