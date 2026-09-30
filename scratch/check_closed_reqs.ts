import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'test_temam'
  });

  const [closedReqs]: any = await conn.query(`
    SELECT id, requestNumber, currentStage, status, closureStatus 
    FROM mosque_requests 
    WHERE currentStage = 'closed' OR status = 'completed' OR closureStatus = 'confirmed'
    LIMIT 10
  `);
  console.log('Closed requests sample:', closedReqs);

  const [projReqs]: any = await conn.query(`
    SELECT p.id as projectId, p.name, p.requestId, r.currentStage, r.status, r.closureStatus
    FROM projects p
    LEFT JOIN mosque_requests r ON p.requestId = r.id
    WHERE r.currentStage = 'closed' OR r.status = 'completed' OR r.closureStatus = 'confirmed'
    LIMIT 10
  `);
  console.log('Projects with closed requests:', projReqs);

  const [donReqs]: any = await conn.query(`
    SELECT d.id, d.title, d.requestId, r.currentStage, r.status, r.closureStatus
    FROM donation_opportunities d
    LEFT JOIN mosque_requests r ON d.requestId = r.id
    WHERE r.currentStage = 'closed' OR r.status = 'completed' OR r.closureStatus = 'confirmed'
    LIMIT 10
  `);
  console.log('Donation opportunities with closed requests:', donReqs);

  process.exit(0);
}

main().catch(console.error);
