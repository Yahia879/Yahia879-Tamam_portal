import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam');

  const [rows]: any = await conn.query('SELECT programData FROM mosque_requests WHERE id = 107');
  if (!rows || rows.length === 0) {
    console.log('Req 107 not found');
    await conn.end();
    return;
  }

  let pd = rows[0].programData;
  if (typeof pd === 'string') {
    pd = JSON.parse(pd);
  }
  if (!pd.sedanaExecution) {
    pd.sedanaExecution = {
      inwardOrders: [],
      outboundOrders: [],
      deliveryOrders: [],
    };
  }

  const backdated = '2026-08-15T09:00:00.000Z';
  pd.sedanaExecution.inwardOrders = [
    {
      id: 1,
      orderNumber: 'INW-107-01',
      orderDate: '2026-08-15',
      receivedBy: 'أمين المستودع',
      referenceType: 'purchase_order',
      referenceNumber: 'PO-107-001',
      supplierName: 'شركة نظم لتقنية المعلومات',
      notes: 'إدخال رصيد مستودع معتمد',
      items: [
        {
          id: '500',
          itemName: 'عامل نظافة متفرغ للمسجد',
          quantity: 50,
          unit: 'شهر',
        },
        {
          id: '501',
          itemName: 'صابون سائل للأيدي',
          quantity: 50,
          unit: 'جالون',
        },
      ],
      createdBy: 44,
      createdByName: 'يحيى (حساب لمتابعة المنصة)',
      createdAt: backdated,
    },
  ];

  await conn.query('UPDATE mosque_requests SET programData = ? WHERE id = 107', [JSON.stringify(pd)]);
  await conn.query('UPDATE request_stage_tracking SET startedAt = ? WHERE requestId = 107 AND stageCode = ?', [new Date(backdated), 'execution']);

  console.log('Updated req 107 stock and timer successfully');
  await conn.end();
}

main().catch(console.error);
