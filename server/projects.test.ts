import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { projects, projectPhases, quantitySchedules, mosqueRequests, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Projects Router", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testProjectId: number | null = null;
  let testRequestId: number | null = null;
  let testUserId: number | null = null;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      console.warn("Database not available, skipping tests");
      return;
    }

    // إنشاء مستخدم اختباري
    const [user] = await db.insert(users).values({
      email: `test-project-${Date.now()}@test.com`,
      name: "مستخدم اختبار المشاريع",
      role: "projects_office",
      status: "active",
    });
    testUserId = user.insertId;

    // إنشاء طلب اختباري
    const [request] = await db.insert(mosqueRequests).values({
      requestNumber: `TEST-PRJ-${Date.now()}`,
      userId: testUserId,
      programType: "bunyan",
      currentStage: "execution",
      status: "approved",
    });
    testRequestId = request.insertId;
  });

  afterAll(async () => {
    if (!db) return;

    // تنظيف البيانات الاختبارية
    if (testProjectId) {
      await db.delete(quantitySchedules).where(eq(quantitySchedules.projectId, testProjectId));
      await db.delete(projectPhases).where(eq(projectPhases.projectId, testProjectId));
      await db.delete(projects).where(eq(projects.id, testProjectId));
    }
    if (testRequestId) {
      await db.delete(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe("إنشاء مشروع", () => {
    it("يجب إنشاء مشروع من طلب معتمد", async () => {
      if (!db || !testRequestId) {
        console.warn("Skipping test - no database or request");
        return;
      }

      const projectNumber = `PRJ-TEST-${Date.now()}`;
      
      const [project] = await db.insert(projects).values({
        projectNumber,
        requestId: testRequestId,
        name: "مشروع بناء مسجد اختباري",
        description: "وصف المشروع الاختباري",
        status: "planning",
        budget: "500000",
      });

      testProjectId = project.insertId;

      expect(testProjectId).toBeDefined();
      expect(testProjectId).toBeGreaterThan(0);

      // التحقق من إنشاء المشروع
      const [createdProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, testProjectId));

      expect(createdProject).toBeDefined();
      expect(createdProject.projectNumber).toBe(projectNumber);
      expect(createdProject.name).toBe("مشروع بناء مسجد اختباري");
      expect(createdProject.status).toBe("planning");
    });
  });

  describe("جدول الكميات (BOQ)", () => {
    it("يجب إضافة بند في جدول الكميات", async () => {
      if (!db || !testProjectId) {
        console.warn("Skipping test - no database or project");
        return;
      }

      const [item] = await db.insert(quantitySchedules).values({
        projectId: testProjectId,
        itemName: "أعمال الخرسانة المسلحة",
        itemDescription: "خرسانة جاهزة للأساسات",
        unit: "م³",
        quantity: "150",
        unitPrice: "350",
        totalPrice: "52500",
        category: "أعمال إنشائية",
      });

      expect(item.insertId).toBeDefined();
      expect(item.insertId).toBeGreaterThan(0);

      // التحقق من إضافة البند
      const [createdItem] = await db
        .select()
        .from(quantitySchedules)
        .where(eq(quantitySchedules.id, item.insertId));

      expect(createdItem).toBeDefined();
      expect(createdItem.itemName).toBe("أعمال الخرسانة المسلحة");
      expect(createdItem.unit).toBe("م³");
      expect(createdItem.quantity).toBe("150.000");
    });

    it("يجب حساب السعر الإجمالي بشكل صحيح", async () => {
      if (!db || !testProjectId) {
        console.warn("Skipping test - no database or project");
        return;
      }

      const quantity = 100;
      const unitPrice = 250;
      const expectedTotal = quantity * unitPrice;

      const [item] = await db.insert(quantitySchedules).values({
        projectId: testProjectId,
        itemName: "أعمال البلاط",
        unit: "م²",
        quantity: quantity.toString(),
        unitPrice: unitPrice.toString(),
        totalPrice: expectedTotal.toString(),
        category: "أعمال تشطيبات",
      });

      const [createdItem] = await db
        .select()
        .from(quantitySchedules)
        .where(eq(quantitySchedules.id, item.insertId));

      expect(parseFloat(createdItem.totalPrice || "0")).toBe(expectedTotal);
    });
  });

  describe("مراحل المشروع", () => {
    it("يجب إنشاء مراحل افتراضية للمشروع", async () => {
      if (!db || !testProjectId) {
        console.warn("Skipping test - no database or project");
        return;
      }

      const defaultPhases = [
        { phaseName: "التخطيط والتصميم", phaseOrder: 1 },
        { phaseName: "التعاقد", phaseOrder: 2 },
        { phaseName: "التنفيذ", phaseOrder: 3 },
      ];

      for (const phase of defaultPhases) {
        await db.insert(projectPhases).values({
          projectId: testProjectId,
          phaseName: phase.phaseName,
          phaseOrder: phase.phaseOrder,
          status: phase.phaseOrder === 1 ? "in_progress" : "pending",
        });
      }

      const phases = await db
        .select()
        .from(projectPhases)
        .where(eq(projectPhases.projectId, testProjectId));

      expect(phases.length).toBeGreaterThanOrEqual(3);
      expect(phases[0].phaseName).toBe("التخطيط والتصميم");
      expect(phases[0].status).toBe("in_progress");
    });

    it("يجب تحديث حالة المرحلة", async () => {
      if (!db || !testProjectId) {
        console.warn("Skipping test - no database or project");
        return;
      }

      const [phases] = await db
        .select()
        .from(projectPhases)
        .where(eq(projectPhases.projectId, testProjectId))
        .limit(1);

      if (!phases) {
        console.warn("No phases found, skipping test");
        return;
      }

      await db
        .update(projectPhases)
        .set({ status: "completed", completionPercentage: 100 })
        .where(eq(projectPhases.id, phases.id));

      const [updatedPhase] = await db
        .select()
        .from(projectPhases)
        .where(eq(projectPhases.id, phases.id));

      expect(updatedPhase.status).toBe("completed");
      expect(updatedPhase.completionPercentage).toBe(100);
    });
  });

  describe("تحديث المشروع", () => {
    it("يجب تحديث نسبة الإنجاز", async () => {
      if (!db || !testProjectId) {
        console.warn("Skipping test - no database or project");
        return;
      }

      await db
        .update(projects)
        .set({ completionPercentage: 50 })
        .where(eq(projects.id, testProjectId));

      const [updatedProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, testProjectId));

      expect(updatedProject.completionPercentage).toBe(50);
    });

    it("يجب تحديث حالة المشروع", async () => {
      if (!db || !testProjectId) {
        console.warn("Skipping test - no database or project");
        return;
      }

      await db
        .update(projects)
        .set({ status: "in_progress" })
        .where(eq(projects.id, testProjectId));

      const [updatedProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, testProjectId));

      expect(updatedProject.status).toBe("in_progress");
    });
  });
});
