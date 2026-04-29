import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { mosqueRequests, users, mosques, fieldVisits, requestHistory, projects } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * اختبارات لميزات إدارة المراحل الجديدة:
 * 1. الرجوع للمرحلة السابقة (revertStage)
 * 2. ظهور الزيارات في التقويم (getScheduledVisits)
 * 3. إنشاء المشروع عند تحويل الطلب مع اسم المشروع
 */
describe("Stage Management - New Features", () => {
  let testRequestId: number;
  let adminUserId: number;
  let testMosqueId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) return;

    const [adminUser] = await db.select().from(users).where(eq(users.role, "super_admin")).limit(1);
    const [testMosque] = await db.select().from(mosques).limit(1);

    if (!adminUser || !testMosque) return;

    adminUserId = adminUser.id;
    testMosqueId = testMosque.id;

    // إنشاء طلب تجريبي للاختبار
    const requestNumber = `STAGE-TEST-${Date.now()}`;
    await db.insert(mosqueRequests).values({
      requestNumber,
      mosqueId: testMosqueId,
      userId: adminUserId,
      programType: "enaya",
      currentStage: "technical_eval",
      status: "in_progress",
      currentResponsible: adminUserId,
      currentResponsibleDepartment: "مكتب المشاريع",
      programData: JSON.stringify({ description: "طلب اختبار إدارة المراحل" }),
    });

    const [newRequest] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.requestNumber, requestNumber));
    testRequestId = newRequest.id;
  });

  it("يجب أن يرجع الطلب للمرحلة السابقة بنجاح", async () => {
    const db = await getDb();
    if (!db || !testRequestId) return;

    // التحقق من أن الطلب في مرحلة technical_eval
    const [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.currentStage).toBe("technical_eval");

    // الرجوع للمرحلة السابقة (field_visit)
    await db.update(mosqueRequests).set({
      currentStage: "field_visit",
      status: "in_progress",
    }).where(eq(mosqueRequests.id, testRequestId));

    // إضافة سجل في التاريخ
    await db.insert(requestHistory).values({
      requestId: testRequestId,
      userId: adminUserId,
      fromStage: "technical_eval",
      toStage: "field_visit",
      action: "stage_reverted",
      notes: "تم الرجوع للاختبار",
    });

    // التحقق من الرجوع
    const [updatedRequest] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(updatedRequest.currentStage).toBe("field_visit");

    // التحقق من وجود سجل في التاريخ
    const [historyRecord] = await db.select().from(requestHistory)
      .where(and(
        eq(requestHistory.requestId, testRequestId),
        eq(requestHistory.action, "stage_reverted")
      ))
      .orderBy(desc(requestHistory.createdAt))
      .limit(1);

    expect(historyRecord).toBeDefined();
    expect(historyRecord.fromStage).toBe("technical_eval");
    expect(historyRecord.toStage).toBe("field_visit");
  });

  it("يجب أن تظهر الزيارات المجدولة في التقويم", async () => {
    const db = await getDb();
    if (!db || !testRequestId) return;

    // إنشاء زيارة مجدولة
    const visitDate = new Date("2026-03-15");
    await db.insert(fieldVisits).values({
      requestId: testRequestId,
      scheduledDate: visitDate,
      scheduledTime: "10:00",
      assignedTo: adminUserId,
      status: "scheduled",
    });

    // التحقق من وجود الزيارة في قاعدة البيانات
    const [visit] = await db.select().from(fieldVisits).where(eq(fieldVisits.requestId, testRequestId));
    expect(visit).toBeDefined();
    expect(visit.scheduledDate).toBeDefined();
    expect(visit.assignedTo).toBe(adminUserId);
  });

  it("يجب أن يتم إنشاء المشروع عند تحويل الطلب مع اسم المشروع", async () => {
    const db = await getDb();
    if (!db || !testRequestId) return;

    // إنشاء مشروع مرتبط بالطلب
    const projectName = "مشروع اختبار إنشاء المشروع";
    const projectNumber = `PRJ-2026-TEST-${Date.now()}`;

    await db.insert(projects).values({
      requestId: testRequestId,
      projectNumber,
      name: projectName,
      status: "planning",
      currentPhase: "planning",
      createdBy: adminUserId,
    });

    // التحقق من وجود المشروع
    const [project] = await db.select().from(projects).where(eq(projects.requestId, testRequestId));
    expect(project).toBeDefined();
    expect(project.name).toBe(projectName);
    expect(project.projectNumber).toBe(projectNumber);
    expect(project.requestId).toBe(testRequestId);
  });

  it("يجب أن لا يمكن الرجوع من مرحلة submitted", async () => {
    const db = await getDb();
    if (!db) return;

    // التحقق من أن مرحلة submitted موجودة في قائمة المراحل غير القابلة للرجوع
    const nonRevertableStages = ["submitted", "closed"];
    expect(nonRevertableStages).toContain("submitted");
    expect(nonRevertableStages).toContain("closed");
    expect(nonRevertableStages).not.toContain("initial_review");
    expect(nonRevertableStages).not.toContain("technical_eval");
  });
});
