import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam';
  const conn = await mysql.createConnection(dbUrl);

  const [rows]: any = await conn.query('SELECT id, requestNumber, programData FROM mosque_requests WHERE id = 100');
  if (rows.length === 0) {
    console.log('Request 100 not found!');
    await conn.end();
    process.exit(1);
  }

  let pd = rows[0].programData;
  if (typeof pd === 'string') {
    try { pd = JSON.parse(pd); } catch (e) {}
  }
  pd = pd || {};
  pd.sedanaExecution = pd.sedanaExecution || {};

  // Deep backdate: 180 days ago (2026-03-20) so monthly (30d), quarterly (90d), and half-yearly (180d) are ALL due (diffMs <= 0)
  const deepBackdate = '2026-03-20T10:00:00.000Z';
  const deepBackdateSimple = '2026-03-20';

  // Get items for request 100
  const [items]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 100');

  const inwardItems = items.map((it: any) => ({
    id: String(it.id),
    itemName: it.itemName,
    quantity: parseFloat(it.quantity || '6'),
    unit: it.unit || 'وحدة'
  }));

  pd.sedanaExecution.inwardOrders = [
    {
      id: 1,
      orderNumber: 'INW-REQ-100-1',
      orderDate: deepBackdateSimple,
      createdAt: deepBackdate,
      receivedBy: 'أمين المستودع',
      referenceType: 'purchase_order',
      referenceNumber: 'PO-REQ-100-1',
      supplierName: 'شركة الإمداد والتوريد الوطنية',
      notes: 'إدخال كامل الكميات المعتمدة إلى المستودع الافتراضي',
      items: inwardItems
    }
  ];
  pd.sedanaExecution.outboundOrders = [];
  pd.sedanaExecution.deliveryOrders = [];

  await conn.query('UPDATE mosque_requests SET programData = ? WHERE id = 100', [JSON.stringify(pd)]);

  // Update tracking
  await conn.query('UPDATE request_stage_tracking SET startedAt = ? WHERE requestId = 100', [deepBackdate]);

  console.log('Successfully set all item timers to 0 (isDue: true) for Request 100!');
  await conn.end();
}

main().catch(console.error);
