import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam');

  const [rows]: any = await conn.query('SELECT programData FROM mosque_requests WHERE id = 110');
  if (!rows || rows.length === 0) {
    console.log('Req 110 not found');
    await conn.end();
    return;
  }

  let pd = rows[0].programData;
  if (typeof pd === 'string') {
    pd = JSON.parse(pd);
  }

  // Get quantity_schedules for 110
  const [boqRows]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 110');
  console.log('Found quantity schedules:', boqRows.length);

  const backdated = '2026-08-15T09:00:00.000Z';

  // Build inward items based on quantity_schedules
  const inwardItems: any[] = [];
  if (boqRows && boqRows.length > 0) {
    for (const b of boqRows) {
      inwardItems.push({
        id: String(b.id),
        itemName: b.itemName,
        quantity: Number(b.quantity) || 50,
        unit: b.unit || 'وحدة',
      });
    }
  } else {
    const itemsSource = pd.basketItems || [];
    for (const it of itemsSource) {
      inwardItems.push({
        id: String(it.id),
        itemName: it.name || it.itemName,
        quantity: Number(it.quantity) || 50,
        unit: it.unit || 'وحدة',
      });
    }
  }

  console.log('Inward items:', inwardItems);

  if (!pd.sedanaExecution) {
    pd.sedanaExecution = {
      inwardOrders: [],
      outboundOrders: [],
      deliveryOrders: [],
    };
  }

  pd.sedanaExecution.inwardOrders = [
    {
      id: 1,
      orderNumber: 'INW-110-01',
      orderDate: '2026-08-15',
      receivedBy: 'أمين المستودع',
      referenceType: 'purchase_order',
      referenceNumber: 'PO-110-001',
      supplierName: 'شركة نظم لتقنية المعلومات',
      notes: 'إدخال رصيد مستودع معتمد للطلب 110',
      items: inwardItems,
      createdBy: 44,
      createdByName: 'يحيى (حساب لمتابعة المنصة)',
      createdAt: backdated,
    },
  ];

  await conn.query('UPDATE mosque_requests SET programData = ? WHERE id = 110', [JSON.stringify(pd)]);

  // update stage tracking for execution
  await conn.query(
    'UPDATE request_stage_tracking SET startedAt = ? WHERE requestId = 110 AND stageCode = ?',
    [new Date(backdated), 'execution']
  );

  console.log('Successfully updated req 110 with correct IDs (507, 508, 509, 510) and backdated startedAt!');
  await conn.end();
}

main().catch(console.error);
