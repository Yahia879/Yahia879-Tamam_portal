import mysql from "mysql2/promise";
import crypto from "crypto";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("💰 إنشاء طلبات وأوامر الصرف...\n");

// الحصول على العقود النشطة
const [contracts] = await connection.execute(
  "SELECT ce.id, ce.contractNumber, ce.contractAmount, ce.secondPartyName, ce.secondPartyIban, ce.secondPartyBankName, ce.projectId FROM contracts_enhanced ce WHERE ce.status IN ('active', 'approved')"
);
console.log("العقود المتاحة:", contracts.map(c => `${c.contractNumber} (${c.id})`).join(", "));

// الحصول على الدفعات
const [payments] = await connection.execute(
  "SELECT cp.id, cp.contractId, cp.phaseName, cp.amount, cp.status FROM contract_payments cp WHERE cp.status = 'pending'"
);
console.log("الدفعات المعلقة:", payments.length);

// الحصول على المستخدم
const [users] = await connection.execute("SELECT id FROM users LIMIT 1");
const userId = users[0]?.id || 1;

// دالة لتوليد رقم طلب صرف
function generateDisbursementRequestNumber() {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DR-2026-${random}`;
}

// دالة لتوليد رقم أمر صرف
function generateDisbursementOrderNumber() {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `DO-2026-${random}`;
}

const disbursementRequestIds = [];
const disbursementOrderIds = [];

for (const contract of contracts) {
  // الحصول على الدفعات لهذا العقد
  const contractPayments = payments.filter(p => p.contractId === contract.id);
  
  if (contractPayments.length === 0) continue;
  
  // إنشاء طلب صرف للدفعة الأولى
  const firstPayment = contractPayments[0];
  const requestNumber = generateDisbursementRequestNumber();
  
  const [requestResult] = await connection.execute(
    `INSERT INTO disbursement_requests (
      requestNumber, contractId, projectId, paymentId, amount, description, justification,
      beneficiaryName, beneficiaryBank, beneficiaryIban, status, requestedBy, requestedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
    [
      requestNumber,
      contract.id,
      contract.projectId,
      firstPayment.id,
      firstPayment.amount,
      `طلب صرف ${firstPayment.phaseName} للعقد ${contract.contractNumber}`,
      `صرف الدفعة المستحقة حسب جدول الدفعات المعتمد`,
      contract.secondPartyName,
      contract.secondPartyBankName || 'البنك الأهلي',
      contract.secondPartyIban || 'SA1234567890123456789012',
      'approved', // طلب معتمد
      userId,
    ]
  );
  disbursementRequestIds.push(requestResult.insertId);
  console.log(`  ✅ طلب صرف: ${requestNumber} - ${firstPayment.amount} ريال (ID: ${requestResult.insertId})`);

  // إنشاء أمر صرف للطلب المعتمد
  const orderNumber = generateDisbursementOrderNumber();
  
  const [orderResult] = await connection.execute(
    `INSERT INTO disbursement_orders (
      orderNumber, disbursementRequestId, amount, paymentMethod,
      beneficiaryName, beneficiaryBank, beneficiaryIban, status,
      createdBy, approvedBy, approvedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
    [
      orderNumber,
      requestResult.insertId,
      firstPayment.amount,
      'bank_transfer',
      contract.secondPartyName,
      contract.secondPartyBankName || 'البنك الأهلي',
      contract.secondPartyIban || 'SA1234567890123456789012',
      'pending', // أمر قيد الانتظار
      userId,
      userId,
    ]
  );
  disbursementOrderIds.push(orderResult.insertId);
  console.log(`  ✅ أمر صرف: ${orderNumber} (ID: ${orderResult.insertId})`);
}

console.log(`\n📝 disbursementRequestIds: [${disbursementRequestIds.join(", ")}]`);
console.log(`📝 disbursementOrderIds: [${disbursementOrderIds.join(", ")}]`);

await connection.end();
console.log("\n✅ تم إنشاء طلبات وأوامر الصرف بنجاح!");
