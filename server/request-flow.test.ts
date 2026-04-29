import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { mosqueRequests, users, mosques, fieldVisitReports, quantitySchedules, quotations } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * اختبار شامل لسير الطلب في جميع المراحل
 * 
 * هذا الاختبار يتحقق من:
 * 1. إنشاء طلب جديد
 * 2. تحويل الطلب عبر جميع المراحل (المسار القياسي)
 * 3. تحديث المسؤول الحالي في كل مرحلة
 * 4. عدم وجود أخطاء في سير الطلب
 */

describe("Request Flow - Complete Journey", () => {
  it("يجب أن يمر الطلب بجميع المراحل بنجاح", async () => {  // eslint-disable-line
    const db = await getDb();
    
    // الحصول على مستخدم مدير
    const [adminUser] = await db.select().from(users).where(eq(users.role, "super_admin")).limit(1);
    expect(adminUser).toBeDefined();
    
    // الحصول على مسجد تجريبي
    const [testMosque] = await db.select().from(mosques).limit(1);
    expect(testMosque).toBeDefined();

    // 1. إنشاء طلب جديد
    const requestNumber = `TEST-${Date.now()}`;
    await db.insert(mosqueRequests).values({
      requestNumber,
      mosqueId: testMosque.id,
      userId: adminUser.id,
      programType: "enaya",
      currentStage: "submitted",
      status: "pending",
      currentResponsible: adminUser.id,
      currentResponsibleDepartment: "مكتب المشاريع",
      programData: JSON.stringify({ description: "طلب اختبار" }),
    });

    const [newRequest] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.requestNumber, requestNumber));

    expect(newRequest).toBeDefined();
    expect(newRequest.currentStage).toBe("submitted");
    expect(newRequest.currentResponsibleDepartment).toBe("مكتب المشاريع");
    
    const testRequestId = newRequest.id;

    // 2. تحويل إلى initial_review
    await db.update(mosqueRequests).set({
      currentStage: "initial_review",
      status: "in_progress",
      currentResponsible: adminUser.id,
      currentResponsibleDepartment: "مكتب المشاريع",
    }).where(eq(mosqueRequests.id, testRequestId));

    let [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.currentStage).toBe("initial_review");
    expect(request.currentResponsibleDepartment).toBe("مكتب المشاريع");

    // 3. تحويل إلى field_visit
    await db.update(mosqueRequests).set({
      currentStage: "field_visit",
      currentResponsible: adminUser.id,
      currentResponsibleDepartment: "الفريق الميداني",
    }).where(eq(mosqueRequests.id, testRequestId));

    [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.currentStage).toBe("field_visit");
    expect(request.currentResponsibleDepartment).toBe("الفريق الميداني");

    // 4. إنشاء تقرير المعاينة الميدانية
    await db.insert(fieldVisitReports).values({
      requestId: testRequestId,
      visitedBy: adminUser.id,
      visitDate: new Date(),
      mosqueCondition: "جيدة",
      conditionRating: "good",
      requiredNeeds: "صيانة عامة",
      generalDescription: "المسجد بحاجة لصيانة بسيطة",
    });

    const [report] = await db.select().from(fieldVisitReports).where(eq(fieldVisitReports.requestId, testRequestId));
    expect(report).toBeDefined();

    // 5. تحويل إلى technical_eval
    await db.update(mosqueRequests).set({
      currentStage: "technical_eval",
      currentResponsible: adminUser.id,
      currentResponsibleDepartment: "مكتب المشاريع",
    }).where(eq(mosqueRequests.id, testRequestId));

    [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.currentStage).toBe("technical_eval");

    // 6. اتخاذ قرار التقييم الفني
    await db.update(mosqueRequests).set({
      technicalEvalDecision: "convert_to_project",
      technicalEvalJustification: "الطلب يستحق التحويل إلى مشروع",
      requestTrack: "standard",
    }).where(eq(mosqueRequests.id, testRequestId));

    [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.technicalEvalDecision).toBe("convert_to_project");

    // 7. تحويل إلى boq_preparation
    await db.update(mosqueRequests).set({
      currentStage: "boq_preparation",
      currentResponsible: adminUser.id,
      currentResponsibleDepartment: "مكتب المشاريع",
    }).where(eq(mosqueRequests.id, testRequestId));

    [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.currentStage).toBe("boq_preparation");

    // 8. إنشاء جدول الكميات
    await db.insert(quantitySchedules).values({
      requestId: testRequestId,
      itemName: "بند اختبار",
      unit: "متر",
      quantity: 100,
      unitPrice: 50,
      totalPrice: 5000,
      category: "مواد",
    });

    const [boq] = await db.select().from(quantitySchedules).where(eq(quantitySchedules.requestId, testRequestId));
    expect(boq).toBeDefined();

    // 9. تحويل إلى financial_eval
    await db.update(mosqueRequests).set({
      currentStage: "financial_eval",
      currentResponsible: adminUser.id,
      currentResponsibleDepartment: "الإدارة المالية",
    }).where(eq(mosqueRequests.id, testRequestId));

    [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.currentStage).toBe("financial_eval");
    expect(request.currentResponsibleDepartment).toBe("الإدارة المالية");

    // 10. إنشاء عرض سعر
    await db.insert(quotations).values({
      requestId: testRequestId,
      quotationNumber: `Q-${Date.now()}`,
      supplierId: 1,
      totalAmount: 5000,
      status: "pending",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const [quotation] = await db.select().from(quotations).where(eq(quotations.requestId, testRequestId));
    expect(quotation).toBeDefined();

    // 11. تحويل إلى quotation_approval
    await db.update(mosqueRequests).set({
      currentStage: "quotation_approval",
      currentResponsible: adminUser.id,
      currentResponsibleDepartment: "الإدارة المالية",
    }).where(eq(mosqueRequests.id, testRequestId));

    [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.currentStage).toBe("quotation_approval");

    // 12. اعتماد عرض السعر
    await db.update(quotations).set({
      status: "accepted",
    }).where(eq(quotations.id, quotation.id));

    // 13. تحويل إلى contracting
    await db.update(mosqueRequests).set({
      currentStage: "contracting",
      currentResponsible: adminUser.id,
      currentResponsibleDepartment: "مكتب المشاريع",
    }).where(eq(mosqueRequests.id, testRequestId));

    [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.currentStage).toBe("contracting");

    // 14. تحويل إلى execution
    await db.update(mosqueRequests).set({
      currentStage: "execution",
      currentResponsible: adminUser.id,
      currentResponsibleDepartment: "مدير المشروع",
    }).where(eq(mosqueRequests.id, testRequestId));

    [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.currentStage).toBe("execution");
    expect(request.currentResponsibleDepartment).toBe("مدير المشروع");

    // 15. تحويل إلى handover
    await db.update(mosqueRequests).set({
      currentStage: "handover",
      currentResponsible: adminUser.id,
      currentResponsibleDepartment: "مكتب المشاريع",
    }).where(eq(mosqueRequests.id, testRequestId));

    [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.currentStage).toBe("handover");

    // 16. تحويل إلى closed
    await db.update(mosqueRequests).set({
      currentStage: "closed",
      status: "completed",
      currentResponsible: adminUser.id,
      currentResponsibleDepartment: "مكتب المشاريع",
      completedAt: new Date(),
    }).where(eq(mosqueRequests.id, testRequestId));

    [request] = await db.select().from(mosqueRequests).where(eq(mosqueRequests.id, testRequestId));
    expect(request.currentStage).toBe("closed");
    expect(request.status).toBe("completed");
    expect(request.currentResponsibleDepartment).toBe("مكتب المشاريع");
    expect(request.completedAt).toBeDefined();

    console.log("✅ الطلب مر بجميع المراحل بنجاح!");
    console.log(`   - رقم الطلب: ${request.requestNumber}`);
    console.log(`   - المرحلة النهائية: ${request.currentStage}`);
    console.log(`   - الحالة: ${request.status}`);
    console.log(`   - المسؤول الحالي: ${request.currentResponsibleDepartment}`);
  });
});
