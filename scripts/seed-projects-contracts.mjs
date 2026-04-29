import mysql from "mysql2/promise";
import crypto from "crypto";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("🏗️ إنشاء المشاريع والعقود...\n");

// الحصول على الطلبات في مرحلة التقييم المالي والتنفيذ
const [requests] = await connection.execute(
  "SELECT id, requestNumber, programType, mosqueId, estimatedCost FROM mosque_requests WHERE currentStage IN ('financial_eval', 'execution')"
);
console.log("الطلبات المؤهلة للمشاريع:", requests.map(r => `${r.requestNumber} (${r.id})`).join(", "));

// الحصول على الموردين
const [suppliers] = await connection.execute("SELECT id, name FROM suppliers LIMIT 3");
console.log("الموردين:", suppliers.map(s => `${s.name} (${s.id})`).join(", "));

// الحصول على المستخدم
const [users] = await connection.execute("SELECT id FROM users LIMIT 1");
const userId = users[0]?.id || 1;

// الحصول على قالب العقد
const [templates] = await connection.execute("SELECT id FROM contract_templates LIMIT 1");
const templateId = templates[0]?.id || null;

// دالة لتوليد رقم مشروع
function generateProjectNumber() {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `PRJ-${random}`;
}

// دالة لتوليد رقم عقد
function generateContractNumber(year, sequence) {
  return `CON-${year}-${String(sequence).padStart(4, '0')}`;
}

const projectIds = [];
const contractIds = [];
let contractSequence = 1;

for (const request of requests) {
  // 1. إنشاء المشروع
  const projectNumber = generateProjectNumber();
  const projectName = `مشروع ${request.programType} - طلب ${request.requestNumber}`;
  
  const [projectResult] = await connection.execute(
    `INSERT INTO projects (projectNumber, requestId, name, description, managerId, status, budget, startDate, expectedEndDate, completionPercentage, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 6 MONTH), ?, NOW(), NOW())`,
    [
      projectNumber,
      request.id,
      projectName,
      `مشروع مرتبط بالطلب رقم ${request.requestNumber}`,
      userId,
      request.id === 6 ? 'in_progress' : 'planning', // الطلب في التنفيذ يكون المشروع قيد التنفيذ
      request.estimatedCost,
      request.id === 6 ? 30 : 0, // نسبة الإنجاز
    ]
  );
  projectIds.push(projectResult.insertId);
  console.log(`  ✅ مشروع: ${projectName} (ID: ${projectResult.insertId})`);

  // 2. إنشاء العقد
  const contractNumber = generateContractNumber(2026, contractSequence++);
  const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
  
  const [contractResult] = await connection.execute(
    `INSERT INTO contracts_enhanced (
      contractNumber, contractYear, contractSequence, templateId, contractType, contractTitle,
      projectId, requestId, supplierId, secondPartyName, secondPartyCommercialRegister,
      secondPartyRepresentative, secondPartyPhone, secondPartyEmail,
      contractAmount, duration, durationUnit, contractDate, startDate, endDate,
      status, createdBy, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 6 MONTH), ?, ?, NOW(), NOW())`,
    [
      contractNumber,
      2026,
      contractSequence,
      templateId,
      'construction', // نوع العقد
      `عقد تنفيذ ${projectName}`,
      projectResult.insertId,
      request.id,
      supplier.id,
      supplier.name,
      '1234567890',
      'ممثل الشركة',
      '0501234567',
      'contact@company.sa',
      request.estimatedCost,
      6,
      'months',
      request.id === 6 ? 'active' : 'approved', // الطلب في التنفيذ يكون العقد نشط
      userId,
    ]
  );
  contractIds.push(contractResult.insertId);
  console.log(`  ✅ عقد: ${contractNumber} مع ${supplier.name} (ID: ${contractResult.insertId})`);

  // 3. إنشاء مراحل المشروع
  const phases = [
    { name: 'التخطيط والتصميم', order: 1, progress: request.id === 6 ? 100 : 0 },
    { name: 'الأعمال التحضيرية', order: 2, progress: request.id === 6 ? 100 : 0 },
    { name: 'الأعمال الإنشائية', order: 3, progress: request.id === 6 ? 50 : 0 },
    { name: 'التشطيبات', order: 4, progress: 0 },
    { name: 'التسليم', order: 5, progress: 0 },
  ];

  for (const phase of phases) {
    await connection.execute(
      `INSERT INTO project_phases (projectId, phaseName, phaseOrder, completionPercentage, startDate, endDate, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MONTH), ?, NOW(), NOW())`,
      [
        projectResult.insertId,
        phase.name,
        phase.order,
        phase.progress,
        phase.order,
        phase.progress === 100 ? 'completed' : (phase.progress > 0 ? 'in_progress' : 'pending'),
      ]
    );
  }
  console.log(`    ✅ تم إنشاء 5 مراحل للمشروع`);

  // 4. إنشاء دفعات العقد
  const payments = [
    { name: 'الدفعة المقدمة', percentage: 20, status: request.id === 6 ? 'paid' : 'pending' },
    { name: 'الدفعة الثانية', percentage: 30, status: 'pending' },
    { name: 'الدفعة الثالثة', percentage: 30, status: 'pending' },
    { name: 'الدفعة الختامية', percentage: 20, status: 'pending' },
  ];

  let paymentOrder = 1;
  for (const payment of payments) {
    const amount = (request.estimatedCost * payment.percentage) / 100;
    await connection.execute(
      `INSERT INTO contract_payments (contractId, phaseName, phaseOrder, amount, dueDate, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MONTH), ?, NOW(), NOW())`,
      [
        contractResult.insertId,
        payment.name,
        paymentOrder++,
        amount,
        payments.indexOf(payment) + 1,
        payment.status,
      ]
    );
  }
  console.log(`    ✅ تم إنشاء 4 دفعات للعقد`);
}

console.log(`\n📝 projectIds: [${projectIds.join(", ")}]`);
console.log(`📝 contractIds: [${contractIds.join(", ")}]`);

await connection.end();
console.log("\n✅ تم إنشاء المشاريع والعقود بنجاح!");
