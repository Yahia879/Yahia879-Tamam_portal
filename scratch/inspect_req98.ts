import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam';
  const conn = await mysql.createConnection(dbUrl);

  const [rows]: any = await conn.query('SELECT id, programData FROM mosque_requests WHERE id = 98');
  if (rows.length === 0) {
    console.log('Not found');
    process.exit(1);
  }
  let pd = rows[0].programData;
  if (typeof pd === 'string') {
    try { pd = JSON.parse(pd); } catch (e) {}
  }
  const se = pd.sedanaExecution || {};
  console.log('--- INWARD ORDERS ---');
  console.log(JSON.stringify(se.inwardOrders, null, 2));
  console.log('--- OUTBOUND ORDERS ---');
  console.log(JSON.stringify(se.outboundOrders, null, 2));

  const [items]: any = await conn.query('SELECT id, itemDescription, approvedQuantity, cycleDisbursementQuantity, disbursementFrequencyDays FROM quantity_schedules WHERE requestId = 98');
  console.log('--- QUANTITY SCHEDULES ---');
  console.log(items);

  await conn.end();
}
main().catch(console.error);
