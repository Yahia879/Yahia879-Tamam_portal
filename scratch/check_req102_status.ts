import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'test_temam'
  });

  const [r]: any = await conn.query("SELECT * FROM mosque_requests WHERE id = 102");
  console.log('Request 102 details:', r);

  const [hist]: any = await conn.query("SELECT * FROM request_history WHERE requestId = 102 ORDER BY id DESC");
  console.log('Request 102 history:', hist);

  const [p]: any = await conn.query("SELECT * FROM projects WHERE requestId = 102");
  console.log('Project for request 102:', p);

  process.exit(0);
}

main().catch(console.error);
