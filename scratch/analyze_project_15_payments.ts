import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const conn = await mysql.createConnection('mysql://root:@localhost:3306/test_temam');
  
  // 1. Contract payments for project 15
  const [contractPayments]: any = await conn.query(
    'SELECT * FROM contract_payments WHERE contractId IN (SELECT id FROM contracts_enhanced WHERE projectId = 15) ORDER BY phaseOrder ASC, id ASC'
  );

  // 2. Manual payments for project 15
  const [manualPayments]: any = await conn.query('SELECT * FROM payments WHERE projectId = 15');

  // 3. Disbursement requests for project 15
  const [disbs]: any = await conn.query('SELECT * FROM disbursement_requests WHERE projectId = 15 OR contractId = 13');

  // 4. Disbursement orders for those requests
  const disbIds = disbs.map((d: any) => d.id);
  const [orders]: any = disbIds.length ? await conn.query('SELECT * FROM disbursement_orders WHERE disbursementRequestId IN (?)', [disbIds]) : [[]];

  // 5. Progress reports for project 15
  const [reports]: any = await conn.query('SELECT id, reportNumber, title, status, workSummary FROM progress_reports WHERE projectId = 15');

  console.log('Contract Payments Count:', contractPayments.length);
  console.log('Manual Payments Count:', manualPayments.length);
  console.log('Disbursement Requests Count:', disbs.length);
  console.log('Disbursement Orders Count:', orders.length);

  for (const cp of contractPayments) {
    const isAdvance = cp.phaseOrder === 0 || (cp.phaseName && (cp.phaseName.includes('مقدمة') || cp.phaseName.includes('المقدمة')));
    const disbsForPayment = disbs.filter((d: any) => 
      (d.contractPaymentId === cp.id) ||
      (isAdvance && (d.paymentType === 'advance' || d.isAdvancePayment))
    );
    const disbIdsForPayment = disbsForPayment.map((d: any) => d.id);
    const ordersForPayment = orders.filter((o: any) => disbIdsForPayment.includes(o.disbursementRequestId));
    const executedOrders = ordersForPayment.filter((o: any) => o.status === 'executed');

    const agreedAmount = parseFloat(String(cp.amount || '0'));
    let paidAmount = 0;
    if (executedOrders.length > 0) {
      paidAmount = executedOrders.reduce((sum: number, o: any) => sum + parseFloat(String(o.amount || '0')), 0);
    } else if (cp.status === 'paid') {
      paidAmount = agreedAmount;
    } else if (disbsForPayment.some((d: any) => d.status === 'paid')) {
      paidAmount = disbsForPayment
        .filter((d: any) => d.status === 'paid')
        .reduce((sum: number, d: any) => sum + parseFloat(String(d.amount || '0')), 0);
    }

    const isFullyPaid = cp.status === 'paid' || (paidAmount >= agreedAmount && agreedAmount > 0);
    const isPartiallyPaid = !isFullyPaid && paidAmount > 0;

    let computedStatus = 'pending';
    if (isFullyPaid) {
      computedStatus = 'paid';
    } else if (isPartiallyPaid) {
      computedStatus = 'partially_paid';
    } else if (ordersForPayment.some((o: any) => o.status === 'approved') || disbsForPayment.some((d: any) => d.status === 'approved' || d.status === 'pending' || d.status === 'pending_executive') || cp.status === 'due') {
      computedStatus = 'due';
    } else {
      computedStatus = 'pending';
    }

    console.log('\n======================================================');
    console.log(`🔹 الدفعة: ${cp.phaseName} (ID: ${cp.id}, Order: ${cp.phaseOrder})`);
    console.log(`   - المبلغ: ${cp.amount} ر.س`);
    console.log(`   - الحالة في جدول الدفعات: ${cp.status}`);
    console.log(`   - الحالة المحسوبة في واجهة المشروع: ${computedStatus}`);
    console.log(`   - المدفوع فعلياً: ${paidAmount} ر.س`);
    console.log(`   - طلبات الصرف المرتبطة (${disbsForPayment.length}):`, disbsForPayment.map((d: any) => `${d.requestNumber} [حالة: ${d.status}, مبلغ: ${d.amount}]`));
    console.log(`   - أوامر الصرف المرتبطة (${ordersForPayment.length}):`, ordersForPayment.map((o: any) => `${o.orderNumber} [حالة: ${o.status}, مبلغ: ${o.amount}, تم التنفيذ: ${o.executedAt}]`));
  }

  // Also check if manual payments exist
  if (manualPayments.length > 0) {
    console.log('\n--- Manual Payments ---');
    console.log(manualPayments);
  }

  await conn.end();
}

main().catch(console.error);
