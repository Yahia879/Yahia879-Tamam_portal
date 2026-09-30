import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'test_temam'
  });

  const [c1]: any = await conn.query("DESCRIBE disbursement_requests");
  console.log('disbursement_requests columns:', c1.map((c: any) => c.Field));

  const [c2]: any = await conn.query("DESCRIBE disbursement_orders");
  console.log('disbursement_orders columns:', c2.map((c: any) => c.Field));

  process.exit(0);
}

main().catch(console.error);
