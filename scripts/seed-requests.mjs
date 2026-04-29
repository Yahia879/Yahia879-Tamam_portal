import mysql from "mysql2/promise";
import crypto from "crypto";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("📝 إنشاء الطلبات التجريبية...\n");

// الحصول على IDs المساجد
const [mosques] = await connection.execute("SELECT id, name FROM mosques LIMIT 5");
console.log("المساجد المتاحة:", mosques.map(m => `${m.name} (${m.id})`).join(", "));

// الحصول على userId (المستخدم الحالي أو أي مستخدم)
const [users] = await connection.execute("SELECT id, name FROM users LIMIT 1");
const userId = users[0]?.id || 1;
console.log(`المستخدم: ${users[0]?.name || 'غير معروف'} (${userId})\n`);

// دالة لتوليد رقم طلب
function generateRequestNumber(program) {
  const prefix = program.substring(0, 3).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${random}`;
}

// الطلبات في مراحل مختلفة
const requests = [
  // 1. طلب جديد (submitted) - برنامج بنيان
  {
    mosqueId: null,
    programType: "bunyan",
    currentStage: "submitted",
    status: "pending",
    priority: "medium",
    programData: JSON.stringify({
      projectName: "بناء مسجد جديد في حي الصفا",
      landArea: 1500,
      landOwnership: "waqf",
      landDeedNumber: "123456789",
      estimatedCapacity: 400,
      hasWomenSection: true,
      applicantName: "أحمد محمد العسيري",
      applicantPhone: "0501234567",
      applicantId: "1234567890",
      applicantRelation: "متبرع",
    }),
    estimatedCost: 2500000,
  },
  // 2. طلب في الفرز الأولي (initial_review) - برنامج عناية
  {
    mosqueId: mosques[0]?.id,
    programType: "enaya",
    currentStage: "initial_review",
    status: "under_review",
    priority: "urgent",
    programData: JSON.stringify({
      maintenanceType: "ترميم شامل",
      maintenanceDescription: "ترميم السقف والجدران وإصلاح التشققات",
      urgencyReason: "تسرب مياه الأمطار",
      applicantName: "محمد علي القحطاني",
      applicantPhone: "0559876543",
      applicantId: "0987654321",
      applicantRelation: "إمام المسجد",
    }),
    estimatedCost: 150000,
  },
  // 3. طلب في الزيارة الميدانية (field_visit) - برنامج إمداد
  {
    mosqueId: mosques[1]?.id,
    programType: "emdad",
    currentStage: "field_visit",
    status: "under_review",
    priority: "medium",
    programData: JSON.stringify({
      equipmentType: "تكييف",
      equipmentDescription: "تركيب 6 مكيفات سبليت",
      currentCondition: "لا يوجد تكييف",
      applicantName: "سعيد عبدالله الشهري",
      applicantPhone: "0545678901",
      applicantId: "5678901234",
      applicantRelation: "مؤذن المسجد",
    }),
    estimatedCost: 45000,
  },
  // 4. طلب في التقييم الفني (technical_eval) - برنامج سدانة
  {
    mosqueId: mosques[2]?.id,
    programType: "sedana",
    currentStage: "technical_eval",
    status: "under_review",
    priority: "normal",
    programData: JSON.stringify({
      serviceType: "نظافة دورية",
      serviceDescription: "خدمة نظافة يومية للمسجد",
      contractDuration: 12,
      applicantName: "خالد فهد الألمعي",
      applicantPhone: "0503333333",
      applicantId: "3333333333",
      applicantRelation: "إمام المسجد",
    }),
    estimatedCost: 36000,
  },
  // 5. طلب في التقييم المالي (financial_eval) - برنامج دعائم - مسار مشروع
  {
    mosqueId: mosques[3]?.id,
    programType: "daaem",
    currentStage: "financial_eval",
    status: "under_review",
    priority: "urgent",
    requestTrack: "standard",
    technicalEvalDecision: "convert_to_project",
    programData: JSON.stringify({
      completionPercentage: 60,
      remainingWork: "إكمال البناء الداخلي والتشطيبات",
      stoppageReason: "نفاد التمويل",
      applicantName: "عبدالرحمن سعيد البيشي",
      applicantPhone: "0504444444",
      applicantId: "4444444444",
      applicantRelation: "وكيل الوقف",
    }),
    estimatedCost: 800000,
  },
  // 6. طلب في التنفيذ (execution) - برنامج طاقة - مسار مشروع
  {
    mosqueId: mosques[4]?.id,
    programType: "taqa",
    currentStage: "execution",
    status: "in_progress",
    priority: "medium",
    requestTrack: "standard",
    technicalEvalDecision: "convert_to_project",
    programData: JSON.stringify({
      energyType: "طاقة شمسية",
      energyDescription: "تركيب ألواح شمسية لتوفير الطاقة",
      currentConsumption: 5000,
      applicantName: "فهد خالد النماصي",
      applicantPhone: "0505555555",
      applicantId: "5555555555",
      applicantRelation: "إمام المسجد",
    }),
    estimatedCost: 120000,
    approvedBudget: 120000,
  },
];

const requestIds = [];
for (const request of requests) {
  const requestNumber = generateRequestNumber(request.programType);
  const [result] = await connection.execute(
    `INSERT INTO mosque_requests (requestNumber, mosqueId, userId, programType, currentStage, status, priority, programData, estimatedCost, approvedBudget, requestTrack, technicalEvalDecision, submittedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
    [
      requestNumber,
      request.mosqueId,
      userId,
      request.programType,
      request.currentStage,
      request.status,
      request.priority,
      request.programData,
      request.estimatedCost,
      request.approvedBudget || null,
      request.requestTrack || null,
      request.technicalEvalDecision || null,
    ]
  );
  requestIds.push(result.insertId);
  console.log(`  ✅ طلب ${request.programType} - ${request.currentStage} (ID: ${result.insertId}, رقم: ${requestNumber})`);
  
  // إضافة سجل في تاريخ الطلب
  await connection.execute(
    `INSERT INTO request_history (requestId, userId, action, fromStage, toStage, notes, createdAt)
     VALUES (?, ?, 'stage_change', NULL, ?, 'تقديم الطلب', NOW())`,
    [result.insertId, userId, request.currentStage]
  );
}

console.log(`\n📝 requestIds: [${requestIds.join(", ")}]`);

await connection.end();
console.log("\n✅ تم إنشاء الطلبات التجريبية بنجاح!");
