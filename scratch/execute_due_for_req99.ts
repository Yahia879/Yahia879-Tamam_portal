import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam';
  const conn = await mysql.createConnection(dbUrl);

  const [rows]: any = await conn.query('SELECT id, programData FROM mosque_requests WHERE id = 99');
  if (rows.length === 0) {
    console.error('Request 99 not found');
    process.exit(1);
  }

  let pData = rows[0].programData;
  if (typeof pData === 'string') {
    try { pData = JSON.parse(pData); } catch (e) {}
  }
  pData = pData || {};
  pData.sedanaExecution = pData.sedanaExecution || {};

  // 35 days ago timestamp
  const backdateStr = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
  const backdateShort = backdateStr.split('T')[0];

  // 1. Inward order with stock for all 6 items
  const inwardOrders = [
    {
      id: "IN-99-1790188291984",
      orderNumber: "IN-99-01",
      orderDate: backdateShort,
      receivedBy: "يحيى (حساب لمتابعة المنصة)",
      referenceType: "purchase_order",
      referenceNumber: "PO-99-2026",
      disbursementOrderId: 165,
      disbursementOrderNumber: "DO-2026-0154",
      disbursementExecutedAt: backdateStr,
      supplierInvoiceNumber: "",
      supplierName: "مؤسسة مثلث الرواد",
      notes: "توريد كامل المواد لبنود الطلب 99",
      items: [
        {
          id: "480",
          itemName: "صابون رغوة للمغاسل",
          quantity: 6,
          unit: "عبوة"
        },
        {
          id: "481",
          itemName: "صابون سائل للأيدي",
          quantity: 6,
          unit: "جالون"
        },
        {
          id: "482",
          itemName: "عامل نظافة متفرغ للمسجد",
          quantity: 6,
          unit: "شهر"
        },
        {
          id: "483",
          itemName: "مطهر ومعقم أرضيات",
          quantity: 6,
          unit: "جالون"
        },
        {
          id: "484",
          itemName: "أجهزة تعطير ذكية",
          quantity: 6,
          unit: "جهاز"
        },
        {
          id: "485",
          itemName: "عبوات زيت عطري فاخر",
          quantity: 6,
          unit: "عبوة"
        }
      ],
      createdBy: 44,
      createdByName: "يحيى (حساب لمتابعة المنصة)",
      createdAt: backdateStr
    }
  ];

  pData.sedanaExecution.inwardOrders = inwardOrders;
  pData.sedanaExecution.outboundOrders = []; // Start fresh so auto-generation triggers batch 1 cleanly

  // 2. Update request_stage_tracking startedAt for stage 'execution'
  try {
    await conn.query(
      `UPDATE request_stage_tracking SET startedAt = ? WHERE requestId = 99 AND stageCode = 'execution'`,
      [new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)]
    );
    console.log('Stage tracking startedAt backdated for request 99');
  } catch (e) {
    console.log('Stage tracking skipped:', e);
  }

  // 3. Save updated programData
  await conn.query(
    'UPDATE mosque_requests SET programData = ? WHERE id = 99',
    [JSON.stringify(pData)]
  );

  console.log(`Successfully updated request 99 in DB: items backdated 35 days ago to ${backdateStr} with full stock.`);
  await conn.end();
}

main().catch(console.error);
