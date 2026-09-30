import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam';
  const conn = await mysql.createConnection(dbUrl);

  const deepBackdate = '2026-03-20T10:00:00.000Z';
  const deepBackdateSimple = '2026-03-20';

  // ==========================================
  // 1. تنظيف وإعداد الطلب رقم 100
  // ==========================================
  console.log('--- Setting up Request 100 ---');
  const [q100Items]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 100');
  const inward100Items = q100Items.map((it: any) => ({
    id: String(it.id),
    itemName: it.itemName,
    quantity: parseFloat(it.quantity || '6'),
    unit: it.unit || 'وحدة'
  }));

  const [req100Row]: any = await conn.query('SELECT programData FROM mosque_requests WHERE id = 100');
  let pd100 = req100Row[0]?.programData;
  if (typeof pd100 === 'string') {
    try { pd100 = JSON.parse(pd100); } catch (e) {}
  }
  pd100 = pd100 || {};
  pd100.sedanaExecution = {
    inwardOrders: [{
      id: 1,
      orderNumber: 'INW-REQ-100-1',
      orderDate: deepBackdateSimple,
      createdAt: deepBackdate,
      receivedBy: 'أمين المستودع',
      referenceType: 'purchase_order',
      referenceNumber: 'PO-REQ-100-1',
      supplierName: 'شركة الإمداد والتوريد الوطنية',
      notes: 'إدخال كامل الكميات المعتمدة إلى المستودع الافتراضي',
      items: inward100Items
    }],
    outboundOrders: [], // تفريغ أوامر الإخراج التلقائية حتى ينشئها المستخدم يدوياً
    deliveryOrders: []
  };

  await conn.query('UPDATE mosque_requests SET programData = ?, currentStage = "execution", status = "in_progress" WHERE id = 100', [JSON.stringify(pd100)]);
  await conn.query('UPDATE request_stage_tracking SET startedAt = ? WHERE requestId = 100', [deepBackdate]);
  console.log('Request 100 updated: Inward full, Outbound cleared, Timers at 0.');

  // ==========================================
  // 2. إعداد الطلب رقم 101
  // ==========================================
  console.log('--- Setting up Request 101 ---');
  const [req101Row]: any = await conn.query('SELECT id, requestNumber, programData FROM mosque_requests WHERE id = 101');
  if (req101Row.length === 0) {
    console.log('Request 101 not found! Creating request 101 from request 98...');
    const [req98]: any = await conn.query('SELECT * FROM mosque_requests WHERE id = 98');
    if (req98.length > 0) {
      const r = req98[0];
      await conn.query(
        `INSERT INTO mosque_requests (id, requestNumber, mosqueId, userId, descriptiveName, programType, currentStage, status, programData, createdAt, updatedAt)
         VALUES (101, 'REQ-2026-SED-0101', ?, ?, 'تنفيذ خدمات سدانة - مسجد الهدى', 'sedana', 'execution', 'in_progress', '{}', NOW(), NOW())`,
        [r.mosqueId, r.userId]
      );
    }
  }

  // Ensure items for 101 in quantity_schedules
  const [q101Items]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 101');
  let items101 = q101Items;
  if (items101.length === 0) {
    console.log('Copying quantity schedules from request 98 to request 101...');
    const [q98]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 98');
    for (const it of q98) {
      await conn.query(
        `INSERT INTO quantity_schedules (requestId, boqCode, itemName, itemDescription, unit, quantity, category, createdAt, updatedAt)
         VALUES (101, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [it.boqCode, it.itemName, it.itemDescription, it.unit, it.quantity, it.category]
      );
    }
    const [newItems101]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 101');
    items101 = newItems101;
  }

  const inward101Items = items101.map((it: any) => ({
    id: String(it.id),
    itemName: it.itemName,
    quantity: parseFloat(it.quantity || '6'),
    unit: it.unit || 'وحدة'
  }));

  const [req101Updated]: any = await conn.query('SELECT programData FROM mosque_requests WHERE id = 101');
  let pd101 = req101Updated[0]?.programData;
  if (typeof pd101 === 'string') {
    try { pd101 = JSON.parse(pd101); } catch (e) {}
  }
  pd101 = pd101 || {};
  pd101.sedanaExecution = {
    inwardOrders: [{
      id: 1,
      orderNumber: 'INW-REQ-101-1',
      orderDate: deepBackdateSimple,
      createdAt: deepBackdate,
      receivedBy: 'أمين المستودع',
      referenceType: 'purchase_order',
      referenceNumber: 'PO-REQ-101-1',
      supplierName: 'شركة الإمداد والتوريد الوطنية',
      notes: 'إدخال كامل الكميات المعتمدة إلى المستودع الافتراضي',
      items: inward101Items
    }],
    outboundOrders: [], // لا يوجد أوامر إخراج حتى يصدرها المسؤول يدوياً
    deliveryOrders: []
  };

  await conn.query(
    'UPDATE mosque_requests SET programData = ?, currentStage = "execution", status = "in_progress" WHERE id = 101',
    [JSON.stringify(pd101)]
  );

  // Stage tracking for 101
  const [track101]: any = await conn.query('SELECT * FROM request_stage_tracking WHERE requestId = 101 AND stageCode = "execution"');
  if (track101.length > 0) {
    await conn.query('UPDATE request_stage_tracking SET startedAt = ? WHERE id = ?', [deepBackdate, track101[0].id]);
  } else {
    await conn.query(
      `INSERT INTO request_stage_tracking (requestId, stageCode, stageName, startedAt, isCurrent)
       VALUES (101, 'execution', 'مرحلة التنفيذ', ?, 1)`,
      [deepBackdate]
    );
  }

  console.log('Request 101 updated: Inward full, Outbound empty, Timers at 0.');
  await conn.end();
  process.exit(0);
}

main().catch(console.error);
