import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'test_temam'
  });

  // Query projects excluding closed requests
  const [activeProjects]: any = await conn.query(`
    SELECT p.id, p.name, p.requestId, r.requestNumber, r.currentStage, r.status as reqStatus, r.closureStatus
    FROM projects p
    LEFT JOIN mosque_requests r ON p.requestId = r.id
    WHERE p.requestId IS NULL OR (
      r.currentStage != 'closed' AND r.status != 'completed' AND (r.closureStatus IS NULL OR r.closureStatus != 'confirmed')
    )
  `);
  console.log('Active projects count:', activeProjects.length);
  console.log('Project 19 included?', activeProjects.some((p: any) => p.id === 19));

  // Query donation opportunities excluding closed requests
  const [activeOpps]: any = await conn.query(`
    SELECT d.id, d.title, d.requestId, r.requestNumber, r.currentStage, r.status as reqStatus, r.closureStatus
    FROM donation_opportunities d
    LEFT JOIN mosque_requests r ON d.requestId = r.id
    WHERE d.status = 'active' AND (
      d.requestId IS NULL OR (
        r.currentStage != 'closed' AND r.status != 'completed' AND (r.closureStatus IS NULL OR r.closureStatus != 'confirmed')
      )
    )
  `);
  console.log('Active donation opps count:', activeOpps.length);
  console.log('Opp 4 included?', activeOpps.some((o: any) => o.id === 4));
  console.log('Opp 7 included?', activeOpps.some((o: any) => o.id === 7));

  process.exit(0);
}

main().catch(console.error);
