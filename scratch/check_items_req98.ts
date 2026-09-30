import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam';
  const conn = await mysql.createConnection(dbUrl);

  const [rows]: any = await conn.query('SELECT programData FROM mosque_requests WHERE id = 98');
  let pData = rows[0].programData;
  if (typeof pData === 'string') pData = JSON.parse(pData);

  const [boq]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 98');
  console.log('Boq items:', boq.map((b: any) => ({ id: b.id, name: b.itemName, category: b.category, qty: b.quantity, unit: b.unit, freq: b.frequency })));

  const sedanaExec = pData.sedanaExecution || {};
  console.log('Inward items:');
  (sedanaExec.inwardOrders || []).forEach((o: any) => {
    console.log(o.orderNumber, o.createdAt, o.items);
  });

  await conn.end();
}

main().catch(console.error);
