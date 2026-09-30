import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const c = await mysql.createConnection(process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam');

  console.log('=== PROJECT 19 ===');
  const [projs]: any = await c.query('SELECT id, name, requestId, budget, actualCost, status FROM projects WHERE id = 19');
  console.log(projs[0]);

  const p = projs[0];

  console.log('\n=== QUOTATIONS FOR REQUEST', p.requestId, '===');
  const [quots]: any = await c.query('SELECT * FROM quotations WHERE requestId = ?', [p.requestId]);
  for (const q of quots) {
    console.log({
      id: q.id,
      quotationNumber: q.quotationNumber,
      supplierId: q.supplierId,
      totalAmount: q.totalAmount,
      includesTax: q.includesTax,
      taxRate: q.taxRate,
      taxAmount: q.taxAmount,
      finalAmount: q.finalAmount,
      approvedAmount: q.approvedAmount,
      status: q.status,
    });
  }

  console.log('\n=== CONTRACTS ENHANCED FOR PROJECT 19 ===');
  const [conts]: any = await c.query('SELECT * FROM contracts_enhanced WHERE projectId = 19');
  for (const row of conts) {
    console.log({
      id: row.id,
      contractNumber: row.contractNumber,
      contractTitle: row.contractTitle,
      contractAmount: row.contractAmount,
      contractAmountText: row.contractAmountText,
      managementPercentage: row.managementPercentage,
      status: row.status,
      currentStep: row.currentStep,
      paymentScheduleJson: row.paymentScheduleJson,
    });
  }

  console.log('\n=== CONTRACT PAYMENTS FOR CONTRACT', conts[0]?.id, '===');
  if (conts.length > 0) {
    const [payments]: any = await c.query('SELECT * FROM contract_payments WHERE contractId = ?', [conts[0].id]);
    console.log(payments);
  }

  console.log('\n=== DISBURSEMENT REQUESTS FOR PROJECT 19 ===');
  const [disbs]: any = await c.query('SELECT * FROM disbursement_requests WHERE projectId = 19');
  console.log(disbs);

  await c.end();
  process.exit(0);
}

main().catch(console.error);
