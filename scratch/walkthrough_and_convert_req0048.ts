import 'dotenv/config';
import { getDb } from "../server/db";
import { 
  mosqueRequests, 
  projects, 
  contractsEnhanced, 
  contractPayments, 
  finalReports,
  requestHistory,
  quotations,
  quantitySchedules,
  suppliers,
  mosques
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🚀 Starting full step-by-step project workflow conversion for REQ-2026-DAA-0048...\n");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database connection failed.");
    process.exit(1);
  }

  // 1. Fetch Request REQ-2026-DAA-0048
  const [req] = await db
    .select()
    .from(mosqueRequests)
    .where(eq(mosqueRequests.requestNumber, 'REQ-2026-DAA-0048'))
    .limit(1);

  if (!req) {
    console.error("❌ Request REQ-2026-DAA-0048 not found!");
    process.exit(1);
  }

  console.log(`📌 Found Request ID ${req.id} (${req.requestNumber})`);

  // Get mosque and supplier
  const [mosque] = await db.select().from(mosques).where(eq(mosques.id, req.mosqueId)).limit(1);
  let [supplier] = await db.select().from(suppliers).limit(1);

  // 2. Step 1: Initial Review & Field Visit
  console.log("Step 1: Initial Review & Field Visit...");
  await db.insert(requestHistory).values({
    requestId: req.id,
    userId: req.userId || 1,
    fromStage: 'submitted',
    toStage: 'initial_review',
    action: 'stage_updated',
    notes: 'تمت المراجعة الأولية للطلب واكتمال المستندات الأساسية',
  });

  await db.insert(requestHistory).values({
    requestId: req.id,
    userId: req.userId || 1,
    fromStage: 'initial_review',
    toStage: 'field_visit',
    action: 'stage_updated',
    notes: 'تم جدولة وتأكيد الزيارة الميدانية وتوثيق حالة المسجد الاحتياجية',
  });

  // 3. Step 2: Technical Evaluation (Convert to Project)
  console.log("Step 2: Technical Evaluation (Decision: Convert to Project)...");
  await db.insert(requestHistory).values({
    requestId: req.id,
    userId: req.userId || 1,
    fromStage: 'field_visit',
    toStage: 'technical_eval',
    action: 'stage_updated',
    notes: 'تم اعتماد الدراسة الفنية وتوصية اللجنة الفنية بتحويل الطلب إلى مشروع متكامل',
  });

  // 4. Step 3: BOQ Preparation & Quotations
  console.log("Step 3: BOQ & Quotations...");
  await db.insert(requestHistory).values({
    requestId: req.id,
    userId: req.userId || 1,
    fromStage: 'technical_eval',
    toStage: 'boq_preparation',
    action: 'stage_updated',
    notes: 'تم إعداد جداول الكميات والمواصفات الفنية المعتمدة للمشروع',
  });

  // Add BOQ Items
  await db.insert(quantitySchedules).values([
    {
      requestId: req.id,
      itemDescription: 'أعمال صيانة وتأهيل المنظومة الكهربائية والإنارة',
      unit: 'مقطوعية',
      quantity: '1.00',
      estimatedUnitPrice: '120000.00',
      estimatedTotalPrice: '120000.00',
    },
    {
      requestId: req.id,
      itemDescription: 'توريد وتركيب أجهزة التكييف الموفرة للطاقة',
      unit: 'مجموعة',
      quantity: '1.00',
      estimatedUnitPrice: '150000.00',
      estimatedTotalPrice: '150000.00',
    },
    {
      requestId: req.id,
      itemDescription: 'ترميم وتأهيل المرافق والسجاد',
      unit: 'مقطوعية',
      quantity: '1.00',
      estimatedUnitPrice: '80000.00',
      estimatedTotalPrice: '80000.00',
    },
  ]);

  // Add Approved Quotation
  if (supplier) {
    await db.insert(quotations).values({
      requestId: req.id,
      supplierId: supplier.id,
      quotationNumber: `QUO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      totalAmount: '350000.00',
      status: 'approved',
      notes: 'عرض السعر الفائز والمطابق للمواصفات',
    });
  }

  // 5. Step 4: Financial Approval & Contracting
  console.log("Step 4: Financial Approval & Contracting...");
  await db.insert(requestHistory).values({
    requestId: req.id,
    userId: req.userId || 1,
    fromStage: 'boq_preparation',
    toStage: 'financial_eval_and_approval',
    action: 'stage_updated',
    notes: 'تم اعتماد الميزانية المخصصة للمشروع بمبلغ 350,000 ريال',
  });

  await db.insert(requestHistory).values({
    requestId: req.id,
    userId: req.userId || 1,
    fromStage: 'financial_eval_and_approval',
    toStage: 'contracting',
    action: 'stage_updated',
    notes: 'تم إعداد صياغة العقد الموحد مع مقاول التنفيذ المعتمد',
  });

  // Create Project
  const projNum = `PRJ-2026-0048`;
  let [existingProj] = await db.select().from(projects).where(eq(projects.requestId, req.id)).limit(1);

  let projId: number;
  if (!existingProj) {
    const [newProjRes] = await db.insert(projects).values({
      projectNumber: projNum,
      name: `مشروع دعم وتأهيل ${mosque ? mosque.name : 'مسجد الدعم'}`,
      description: 'مشروع صيانة وتأهيل متكامل يشمل التكييف والكهرباء والإنارة',
      status: 'in_progress',
      contractStatus: 'completed',
      financialStatus: 'paid',
      completionPercentage: 100,
      startDate: new Date(),
      expectedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      projectManagerId: req.assignedTo || 5,
      requestId: req.id,
      totalAmount: '350000.00',
      paidAmount: '350000.00',
      remainingAmount: '0.00',
    });
    projId = Number(newProjRes.insertId);
  } else {
    projId = existingProj.id;
    await db.update(projects).set({
      name: `مشروع دعم وتأهيل ${mosque ? mosque.name : 'مسجد الدعم'}`,
      status: 'in_progress',
      contractStatus: 'completed',
      financialStatus: 'paid',
      completionPercentage: 100,
      totalAmount: '350000.00',
      paidAmount: '350000.00',
      remainingAmount: '0.00',
      updatedAt: new Date(),
    }).where(eq(projects.id, projId));
  }

  // Create Contract
  const contractNum = `CNT-2026-0048`;
  let [existingContract] = await db.select().from(contractsEnhanced).where(eq(contractsEnhanced.projectId, projId)).limit(1);
  let contractId: number;
  if (!existingContract) {
    const [newContractRes] = await db.insert(contractsEnhanced).values({
      contractNumber: contractNum,
      contractTitle: `عقد تنفيذ مشروع صيانة وتأهيل ${mosque ? mosque.name : 'مسجد الدعم'}`,
      projectId: projId,
      requestId: req.id,
      supplierId: supplier ? supplier.id : 1,
      totalValue: '350000.00',
      paidAmount: '350000.00',
      remainingAmount: '0.00',
      advancePaymentAmount: '35000.00',
      advancePaymentPercent: '10.00',
      retentionAmount: '35000.00',
      retentionPercent: '10.00',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      durationMonths: 3,
      status: 'approved',
      createdBy: req.userId || 5,
      approvedBy: 1,
      approvedAt: new Date(),
      workStartDate: new Date(),
      workEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      executionDurationDays: 90,
      warrantyPeriodMonths: 12,
      governingLaw: 'أنظمة المملكة العربية السعودية',
      disputeResolution: 'المحاكم المختصة بالمملكة',
      contractLanguage: 'العربية',
    });
    contractId = Number(newContractRes.insertId);
  } else {
    contractId = existingContract.id;
    await db.update(contractsEnhanced).set({
      status: 'approved',
      paidAmount: '350000.00',
      remainingAmount: '0.00',
      updatedAt: new Date(),
    }).where(eq(contractsEnhanced.id, contractId));
  }

  // Contract Payments
  await db.delete(contractPayments).where(eq(contractPayments.contractId, contractId));
  await db.insert(contractPayments).values([
    {
      paymentNumber: `PAY-${contractNum}-001`,
      contractId: contractId,
      projectId: projId,
      title: 'دفعة مقدمة (10%)',
      amount: '35000.00',
      dueDate: new Date(),
      status: 'paid',
      notes: 'تم سداد الدفعة المقدمة بنجاح',
    },
    {
      paymentNumber: `PAY-${contractNum}-002`,
      contractId: contractId,
      projectId: projId,
      title: 'مستخلص إنجاز ميداني (80%)',
      amount: '280000.00',
      dueDate: new Date(),
      status: 'paid',
      notes: 'تم اعتماد وصرف المستخلص بناءً على تقرير نسبة الإنجاز 100%',
    },
    {
      paymentNumber: `PAY-${contractNum}-003`,
      contractId: contractId,
      projectId: projId,
      title: 'دفعة ختامية عند التسليم الابتدائي (10%)',
      amount: '35000.00',
      dueDate: new Date(),
      status: 'paid',
      notes: 'تم تسديد الدفعة الختامية المتبقية بالكامل',
    },
  ]);

  // 6. Step 5: Execution & Final Report
  console.log("Step 5: Execution & Final Report...");
  await db.insert(requestHistory).values({
    requestId: req.id,
    userId: req.userId || 1,
    fromStage: 'contracting',
    toStage: 'execution',
    action: 'stage_updated',
    notes: 'بدء الأعمال الميدانية واكتمال أعمال التنفيذ بنسبة 100%',
  });

  // Insert/Update Final Report
  let [existingFinalReport] = await db.select().from(finalReports).where(eq(finalReports.requestId, req.id)).limit(1);
  if (!existingFinalReport) {
    await db.insert(finalReports).values({
      requestId: req.id,
      projectId: projId,
      preparedBy: req.userId || 5,
      summary: `تم الانتهاء بنجاح من كافة أعمال الصيانة والتأهيل الكهروميكانيكية لـ ${mosque ? mosque.name : 'المسجد'} وفق أعلى المعايير القياسية.`,
      achievements: '1. استبدال وتأهيل شبكة التكييف بالكامل\n2. تحديث منظومة الإنارة إلى LED موفرة\n3. فرش وتجهيز مصلى المسجد',
      challenges: 'لا يوجد، تم تنفيذ المشروع في الوقت المحدد بالكامل',
      totalCost: '350000.00',
      completionDate: new Date(),
    });
  }

  // 7. Step 6: Advance Request to Handover Stage (جاهز للإغلاق وتقييم المستفيد)
  console.log("Step 6: Advance to Handover Stage (جاهز للإغلاق وتقييم المستفيد)...");
  await db.update(mosqueRequests).set({
    currentStage: 'handover',
    status: 'in_progress',
    descriptiveName: `مشروع صيانة وتأهيل متكامل لـ ${mosque ? mosque.name : 'المسجد'}`,
    approvedBudget: '350000.00',
    requestTrack: 'standard',
    technicalEvalDecision: 'convert_to_project',
    isEvaluated: false,
    updatedAt: new Date(),
  }).where(eq(mosqueRequests.id, req.id));

  await db.insert(requestHistory).values({
    requestId: req.id,
    userId: req.userId || 1,
    fromStage: 'execution',
    toStage: 'handover',
    action: 'stage_updated',
    notes: 'تم سداد جميع المستخلصات واكتمال التنفيذ ورفع التقرير النهائي، والطلب الآن في مرحلة الاستلام قبل الإغلاق',
  });

  console.log("\n=======================================================");
  console.log("🎉 تم تنفيذ كامل الخطوات وحساب جميع الدفعات للمشروع بنجاح!");
  console.log("-------------------------------------------------------");
  console.log(`📌 الطلب REQ-2026-DAA-0048 (معرف ${req.id}):`);
  console.log(`   - اسم المشروع: مشروع صيانة وتأهيل متكامل لـ ${mosque ? mosque.name : 'المسجد'}`);
  console.log(`   - رقم المشروع: ${projNum} | رقم العقد: ${contractNum}`);
  console.log(`   - الميزانية المعتمدة: 350,000 ريال (مسددة بالكامل 100%)`);
  console.log(`   - نسبة الإنجاز الميداني: 100%`);
  console.log(`   - التقرير الختامي: مرفوع ومكتمل بالكامل`);
  console.log(`   - المرحلة الحالية: الاستلام (handover) - واصل للمرحلة الأخيرة وبانتظار الإغلاق والتقييم!`);
  console.log(`   - رابط صفحة التفاصيل للمستفيد: http://localhost:5000/requests/${req.id}`);
  console.log("=======================================================\n");
}

main();
