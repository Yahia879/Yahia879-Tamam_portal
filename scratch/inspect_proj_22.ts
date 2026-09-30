import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'test_temam'
  });

  const [p]: any = await conn.query("SELECT * FROM projects WHERE id = 22");
  console.log('Project 22:', p);

  if (p.length > 0) {
    const reqId = p[0].requestId;
    console.log('Project 22 requestId:', reqId);
    if (reqId) {
      const [r]: any = await conn.query("SELECT id, requestNumber, currentStage, status, closureStatus, closureConfirmedBy, completedAt FROM mosque_requests WHERE id = ?", [reqId]);
      console.log('Linked request:', r);
    }
  }

  process.exit(0);
}

main().catch(console.error);
