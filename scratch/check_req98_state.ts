import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam';
  const conn = await mysql.createConnection(dbUrl);

  const [rows]: any = await conn.query('SELECT programData FROM mosque_requests WHERE id = 98');
  let pData = rows[0].programData;
  if (typeof pData === 'string') pData = JSON.parse(pData);

  const sedanaExec = pData.sedanaExecution || {};
  console.log('Inward orders count:', (sedanaExec.inwardOrders || []).length);
  console.log('Inward dates:', (sedanaExec.inwardOrders || []).map((o: any) => o.createdAt));
  console.log('Outbound orders count:', (sedanaExec.outboundOrders || []).length);
  console.log('Outbound orders:', JSON.stringify(sedanaExec.outboundOrders || [], null, 2));

  await conn.end();
}

main().catch(console.error);
