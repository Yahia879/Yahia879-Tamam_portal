import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam';
  const conn = await mysql.createConnection(dbUrl);
  
  const [rows] = await conn.query('SELECT programData FROM mosque_requests WHERE id = 98');
  const req = (rows as any[])[0];
  let pd = req.programData;
  while (typeof pd === 'string') { try { pd = JSON.parse(pd); } catch { break; } }
  
  const exec = pd?.sedanaExecution || {};
  console.log('Inward Orders:', JSON.stringify(exec.inwardOrders, null, 2)?.slice(0, 2000));
  console.log('sedanaProcurement:', JSON.stringify(pd?.sedanaProcurement, null, 2)?.slice(0, 1500));
  
  await conn.end();
  process.exit(0);
}
main();
