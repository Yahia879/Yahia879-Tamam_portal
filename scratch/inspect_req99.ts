import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam';
  const conn = await mysql.createConnection(dbUrl);

  const [rows]: any = await conn.query('SELECT id, requestNumber, descriptiveName, currentStage, status, mosqueId, programData FROM mosque_requests WHERE id = 99');
  if (rows.length === 0) {
    console.log('Request 99 not found');
    process.exit(1);
  }
  const r = rows[0];
  console.log('Req 99:', { id: r.id, number: r.requestNumber, stage: r.currentStage, status: r.status, mosqueId: r.mosqueId });

  let pd = r.programData;
  if (typeof pd === 'string') {
    try { pd = JSON.parse(pd); } catch (e) {}
  }
  pd = pd || {};
  console.log('programData keys:', Object.keys(pd));
  console.log('sedanaExecution:', JSON.stringify(pd.sedanaExecution || {}, null, 2));

  const [items]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 99');
  console.log('Quantity Schedules count:', items.length);
  for (const it of items) {
    console.log({
      id: it.id,
      itemName: it.itemName,
      itemDescription: it.itemDescription,
      unit: it.unit,
      quantity: it.quantity,
      category: it.category
    });
  }

  const [tracking]: any = await conn.query('SELECT * FROM request_stage_tracking WHERE requestId = 99');
  console.log('Stage Tracking:', tracking);

  await conn.end();
}
main().catch(console.error);
