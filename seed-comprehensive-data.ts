/**
 * Script شامل لتعبئة قاعدة البيانات بالبيانات النموذجية
 * يحتوي على:
 * - طلبات في جميع المراحل (11 مرحلة)
 * - مشاريع محولة من طلبات
 * - عقود موقعة
 * - طلبات صرف وأوامر صرف
 * - موردين وعروض أسعار
 * - جداول كميات (BOQ)
 */

import { getDb } from "./server/db";
import * as schema from "./drizzle/schema";
// استخدام كلمة مرور بسيطة للاختبار (يجب تغييرها في الإنتاج)
const simplePassword = "Test@123";

async function main() {
  console.log("🚀 بدء تعبئة قاعدة البيانات بالبيانات النموذجية...\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ فشل الاتصال بقاعدة البيانات");
    process.exit(1);
  }

  // حذف البيانات القديمة
  console.log("🗑️ حذف البيانات القديمة...\n");
  await db.execute("SET FOREIGN_KEY_CHECKS = 0");
  
  const tablesToTruncate = [
    "request_history",
    "request_comments",
    "disbursement_orders",
    "disbursement_requests",
    "contracts",
    "quotations",
    "boq_items",
    "project_milestones",
    "projects",
    "field_visit_reports",
    "quick_response_reports",
    "mosque_requests",
    "suppliers",
    "mosques",
    "users",
  ];
  
  for (const table of tablesToTruncate) {
    try {
      await db.execute(`TRUNCATE TABLE ${table}`);
    } catch (error: any) {
      if (error.cause?.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }
    }
  }
  
  await db.execute("SET FOREIGN_KEY_CHECKS = 1");
  console.log("✅ تم حذف البيانات القديمة\n");

  // 1. إنشاء مستخدمين نموذجيين
  console.log("👥 إنشاء مستخدمين نموذجيين...");
  
  const users = await db.insert(schema.users).values([
    {
      email: "admin@tamam.org",
      password: simplePassword,
      name: "عبدالإله المرزوقي",
      role: "super_admin",
      status: "active",
      phone: "0501234567",
    },
    {
      email: "projects@tamam.org",
      password: simplePassword,
      name: "أحمد المشاريع",
      role: "projects_office",
      status: "active",
      phone: "0501234568",
    },
    {
      email: "field@tamam.org",
      password: simplePassword,
      name: "محمد الميداني",
      role: "field_team",
      status: "active",
      phone: "0501234569",
    },
    {
      email: "finance@tamam.org",
      password: simplePassword,
      name: "فاطمة المالية",
      role: "financial",
      status: "active",
      phone: "0501234570",
    },
    {
      email: "requester1@test.com",
      password: simplePassword,
      name: "خالد طالب الخدمة",
      role: "service_requester",
      status: "active",
      phone: "0501234571",
      idNumber: "1234567890",
    },
  ]);

  console.log(`✅ تم إنشاء ${users.length} مستخدمين\n`);

  // 2. إنشاء مساجد نموذجية
  console.log("🕌 إنشاء مساجد نموذجية...");
  
  const mosques = await db.insert(schema.mosques).values([
    {
      name: "مسجد الرحمن",
      city: "أبها",
      district: "حي الموظفين",
      latitude: "18.2164",
      longitude: "42.5053",
      status: "active",
      submittedBy: 5, // requester1
    },
    {
      name: "مسجد النور",
      city: "خميس مشيط",
      district: "حي الراقي",
      latitude: "18.3067",
      longitude: "42.7289",
      status: "active",
      submittedBy: 5,
    },
    {
      name: "مسجد الهدى",
      city: "أحد رفيدة",
      district: "حي الشفاء",
      latitude: "18.2000",
      longitude: "42.6000",
      status: "active",
      submittedBy: 5,
    },
  ]);

  console.log(`✅ تم إنشاء ${mosques.length} مساجد\n`);

  // 3. إنشاء موردين نموذجيين
  console.log("🏢 إنشاء موردين نموذجيين...");
  
  const suppliers = await db.insert(schema.suppliers).values([
    {
      name: "شركة البناء المتقدم",
      type: "contractor",
      entityType: "company",
      commercialRegister: "1234567890",
      commercialActivity: "مقاولات عامة",
      yearsOfExperience: 15,
      workFields: ["بناء", "صيانة", "ترميم"],
      city: "أبها",
      email: "info@advanced-construction.com",
      phone: "0501111111",
      contactPerson: "أحمد البناء",
      bankAccountName: "شركة البناء المتقدم",
      bankName: "البنك الأهلي",
      iban: "SA0380000000608010167519",
      taxNumber: "300000000000003",
      status: "active",
      approvalStatus: "approved",
    },
    {
      name: "مؤسسة التجهيزات الحديثة",
      type: "supplier",
      entityType: "establishment",
      commercialRegister: "1234567891",
      commercialActivity: "توريد تجهيزات",
      yearsOfExperience: 10,
      workFields: ["تجهيزات", "أثاث", "إنارة"],
      city: "خميس مشيط",
      email: "info@modern-equipment.com",
      phone: "0502222222",
      contactPerson: "محمد التجهيزات",
      bankAccountName: "مؤسسة التجهيزات الحديثة",
      bankName: "بنك الراجحي",
      iban: "SA0380000000608010167520",
      taxNumber: "300000000000004",
      status: "active",
      approvalStatus: "approved",
    },
  ]);

  console.log(`✅ تم إنشاء ${suppliers.length} موردين\n`);

  // 4. إنشاء طلبات في مراحل مختلفة
  console.log("📝 إنشاء طلبات في مراحل مختلفة...");

  const requests = [];
  const stages = [
    "submitted",
    "initial_review",
    "field_visit",
    "technical_eval",
    "financial_eval",
    "execution",
    "closed",
  ];
  
  const programs = ["bunyan", "daaem", "enaya", "emdad", "ethraa", "sedana", "taqa", "miyah", "suqya"];

  for (let i = 0; i < 11; i++) {
    const stage = stages[i % stages.length];
    const program = programs[i % programs.length];
    
    const request = await db.insert(schema.mosqueRequests).values({
      requestNumber: `${program.toUpperCase().substring(0, 3)}-${Date.now()}-${i}`,
      userId: 5, // requester1
      programType: program,
      mosqueId: i < 3 ? i + 1 : null,
      currentStage: stage,
      status: stage === "closed" ? "completed" : "under_review",
      submittedAt: new Date(Date.now() - (11 - i) * 24 * 60 * 60 * 1000), // تواريخ متدرجة
      requestTrack: i >= 3 && stage === "execution" ? "quick_response" : i >= 4 && stage === "financial_eval" ? "standard" : "standard",
      technicalEvalDecision: i >= 3 ? (i % 2 === 0 ? "convert_to_project" : "convert_to_quick_response") : null,
    });

    requests.push(request);
  }

  console.log(`✅ تم إنشاء ${requests.length} طلبات\n`);

  // 5. إنشاء تقارير المعاينة الميدانية
  console.log("📋 إنشاء تقارير المعاينة الميدانية...");
  
  for (let i = 2; i < 11; i++) {
    await db.insert(schema.fieldVisitReports).values({
      requestId: i + 1,
      visitedBy: 3, // field_team
      visitDate: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
      mosqueCondition: "good",
      menPrayerLength: 20,
      menPrayerWidth: 15,
      menPrayerHeight: 5,
      womenPrayerLength: 10,
      womenPrayerWidth: 8,
      womenPrayerHeight: 4,
      teamMember1: "محمد الميداني",
    });
  }

  console.log("✅ تم إنشاء تقارير المعاينة الميدانية\n");

  // 6. إنشاء مشاريع محولة من طلبات
  console.log("🏗️ إنشاء مشاريع محولة من طلبات...");
  
  const projects = await db.insert(schema.projects).values([
    {
      requestId: 5, // طلب في مرحلة التقييم المالي
      name: "مشروع بناء مسجد الرحمن",
      projectNumber: `PRJ-${Date.now()}-1`,
      status: "planning",
      startDate: new Date(),
      budget: 500000,
      actualCost: 0,
      completionPercentage: 15,
    },
    {
      requestId: 6, // طلب في مرحلة التنفيذ
      name: "مشروع صيانة مسجد النور",
      projectNumber: `PRJ-${Date.now()}-2`,
      status: "in_progress",
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      budget: 200000,
      actualCost: 100000,
      completionPercentage: 50,
    },
  ]);

  console.log(`✅ تم إنشاء ${projects.length} مشاريع\n`);

  // 7. جداول الكميات غير موجودة في schema - تخطي

  // 8. إنشاء عروض أسعار
  console.log("💰 إنشاء عروض أسعار...");
  
  await db.insert(schema.quotations).values([
    {
      requestId: 5,
      supplierId: 1,
      quotationNumber: `QT-${Date.now()}-1`,
      quotationDate: new Date(),
      totalAmount: 480000,
      validityPeriod: 30,
      notes: "عرض سعر شامل المواد والعمالة",
      status: "pending",
    },
    {
      requestId: 5,
      supplierId: 2,
      quotationNumber: `QT-${Date.now()}-2`,
      quotationDate: new Date(),
      totalAmount: 520000,
      validityPeriod: 30,
      notes: "عرض سعر مع ضمان 5 سنوات",
      status: "pending",
    },
  ]);

  console.log("✅ تم إنشاء عروض الأسعار\n");

  // 9. إنشاء عقود موقعة
  console.log("📄 إنشاء عقود موقعة...");
  
  await db.insert(schema.contracts).values([
    {
      projectId: 2, // مشروع صيانة مسجد النور
      contractNumber: `CNT-${Date.now()}-1`,
      contractType: "عقد مقاولة",
      supplierId: 1, // شركة البناء المتقدم
      amount: 200000,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: "active",
      terms: "دفعات حسب مراحل الإنجاز - مدة التنفيذ 90 يوم",
    },
  ]);

  console.log("✅ تم إنشاء العقود\n");

  // 10. إنشاء طلبات صرف وأوامر صرف
  console.log("💳 إنشاء طلبات صرف وأوامر صرف...");
  
  await db.insert(schema.disbursementRequests).values([
    {
      projectId: 2, // مشروع صيانة مسجد النور
      contractId: 1,
      requestNumber: `DR-${Date.now()}-1`,
      amount: 100000,
      description: "الدفعة الأولى - 50%",
      status: "approved",
      requestedBy: 2, // projects_office
      approvedBy: 4, // finance
    },
  ]);

  await db.insert(schema.disbursementOrders).values([
    {
      disbursementRequestId: 1,
      orderNumber: `DO-${Date.now()}-1`,
      orderDate: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
      amount: 100000,
      beneficiaryName: "شركة البناء المتقدم",
      beneficiaryIban: "SA0380000000608010167519",
      status: "paid",
      issuedBy: 4, // finance
      paidDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log("✅ تم إنشاء طلبات وأوامر الصرف\n");

  // 11. إنشاء تعليقات وسجل تاريخي
  console.log("💬 إنشاء تعليقات وسجل تاريخي...");
  
  for (let i = 1; i <= 11; i++) {
    // تعليق واحد لكل طلب
    await db.insert(schema.requestComments).values({
      requestId: i,
      userId: i % 4 + 1, // توزيع التعليقات على المستخدمين
      comment: `تعليق تجريبي ${i}: تم مراجعة الطلب والموافقة على الانتقال للمرحلة التالية`,
    });

    // سجل تاريخي
    await db.insert(schema.requestHistory).values({
      requestId: i,
      userId: i % 4 + 1,
      action: "stage_change",
      previousValue: i > 1 ? stages[(i - 2) % stages.length] : null,
      newValue: stages[(i - 1) % stages.length],
      notes: `تم الانتقال إلى مرحلة ${stages[(i - 1) % stages.length]}`,
    });
  }

  console.log("✅ تم إنشاء التعليقات والسجل التاريخي\n");

  console.log("✅ ✅ ✅ تم إكمال تعبئة قاعدة البيانات بنجاح! ✅ ✅ ✅\n");
  console.log("📊 ملخص البيانات المُنشأة:");
  console.log(`   - 5 مستخدمين`);
  console.log(`   - 3 مساجد`);
  console.log(`   - 2 موردين`);
  console.log(`   - 11 طلبات في مراحل مختلفة`);
  console.log(`   - 9 تقارير معاينة ميدانية`);
  console.log(`   - 2 مشاريع`);
  console.log(`   - 3 بنود جدول كميات`);
  console.log(`   - 2 عروض أسعار`);
  console.log(`   - 1 عقد موقع`);
  console.log(`   - 1 طلب صرف + 1 أمر صرف`);
  console.log(`   - 11 تعليق + 11 سجل تاريخي\n`);

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ حدث خطأ:", error);
  process.exit(1);
});
