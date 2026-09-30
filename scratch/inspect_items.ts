import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/test_temam';
  const conn = await mysql.createConnection(dbUrl);

  const [items]: any = await conn.query('SELECT * FROM quantity_schedules WHERE requestId = 98');
  console.log('--- QUANTITY SCHEDULES ---');
  for (const it of items) {
    console.log(it);
  }

  await conn.end();
}
main().catch(console.error);
