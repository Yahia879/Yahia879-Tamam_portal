import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam';
  const conn = await mysql.createConnection(dbUrl);

  const [rows]: any = await conn.query('SELECT id, requestNumber, descriptiveName, currentStage, status, mosqueId, programData FROM mosque_requests WHERE id = 100');
  if (rows.length === 0) {
    console.log('Request 100 not found in database!');
    // List recent requests
    const [recent]: any = await conn.query('SELECT id, requestNumber, currentStage, programType FROM mosque_requests ORDER BY id DESC LIMIT 10');
    console.log('Recent requests:', recent);
    await conn.end();
    process.exit(1);
  }

  const req = rows[0];
  console.log('Request 100 info:', { id: req.id, requestNumber: req.requestNumber, stage: req.currentStage });

  let pd = req.programData;
  if (typeof pd === 'string') {
    try { pd = JSON.parse(pd); } catch (e) {}
  }
  pd = pd || {};

  // Get items from quantity_schedules
  let [items]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 100');
  console.log(`Found ${items.length} items in quantity_schedules for request 100.`);

  // If no items in quantity_schedules, check if we should copy from request 98 or 99 or basket
  if (items.length === 0) {
    console.log('No quantity schedules found for 100. Checking other requests or programData...');
    const [q98]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 98');
    if (q98.length > 0) {
      console.log(`Copying ${q98.length} items from request 98 to request 100...`);
      for (const it of q98) {
        await conn.query(
          `INSERT INTO quantity_schedules (requestId, boqCode, itemName, itemDescription, unit, quantity, category, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [100, it.boqCode, it.itemName, it.itemDescription, it.unit, it.quantity, it.category]
        );
      }
      const [newItems]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 100');
      items = newItems;
    }
  }

  // Ensure request is in execution stage
  await conn.query(`UPDATE mosque_requests SET currentStage = 'execution', status = 'in_progress' WHERE id = 100`);

  // Backdate date: 40 days ago
  const backdatedDate = '2026-08-14T10:00:00.000Z';
  const backdatedDateSimple = '2026-08-14';

  // Build Inward Order items with full approved quantities
  const inwardItems = items.map((it: any) => ({
    id: String(it.id),
    itemName: it.itemName,
    quantity: parseFloat(it.quantity || '6'),
    unit: it.unit || 'وحدة'
  }));

  const inwardOrder = {
    id: 1,
    orderNumber: 'INW-REQ-100-1',
    orderDate: backdatedDateSimple,
    createdAt: backdatedDate,
    receivedBy: 'أمين المستودع',
    referenceType: 'purchase_order',
    referenceNumber: 'PO-REQ-100-1',
    supplierName: 'شركة الإمداد والتوريد الوطنية',
    notes: 'إدخال كامل الكميات المعتمدة إلى المستودع الافتراضي',
    items: inwardItems
  };

  pd.sedanaExecution = pd.sedanaExecution || {};
  pd.sedanaExecution.inwardOrders = [inwardOrder];
  pd.sedanaExecution.outboundOrders = [];
  pd.sedanaExecution.deliveryOrders = [];

  await conn.query('UPDATE mosque_requests SET programData = ? WHERE id = 100', [JSON.stringify(pd)]);

  // Update or insert request_stage_tracking for execution stage
  const [tracking]: any = await conn.query('SELECT * FROM request_stage_tracking WHERE requestId = 100 AND stageCode = ?', ['execution']);
  if (tracking.length > 0) {
    await conn.query('UPDATE request_stage_tracking SET startedAt = ? WHERE id = ?', [backdatedDate, tracking[0].id]);
  } else {
    await conn.query(
      `INSERT INTO request_stage_tracking (requestId, stageCode, stageName, startedAt, isCurrent)
       VALUES (?, 'execution', 'مرحلة التنفيذ', ?, 1)`,
      [100, backdatedDate]
    );
  }

  console.log('Successfully filled warehouse and backdated timing for Request 100!');
  await conn.end();
}

main().catch(console.error);
