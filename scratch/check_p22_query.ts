import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'test_temam'
  });

  const [pList]: any = await conn.query(`
    SELECT 
      projects.id,
      projects.projectNumber,
      projects.name,
      projects.requestId,
      mosque_requests.currentStage as requestStage,
      mosque_requests.status as requestStatus,
      mosque_requests.closureStatus as requestClosureStatus
    FROM projects
    LEFT JOIN mosque_requests ON projects.requestId = mosque_requests.id
    WHERE (
      projects.requestId IS NULL OR (
        mosque_requests.currentStage != 'closed' AND
        mosque_requests.status != 'completed' AND
        (mosque_requests.closureStatus IS NULL OR mosque_requests.closureStatus != 'confirmed')
      )
    )
  `);

  console.log('Query result without closed requests count:', pList.length);
  const p22 = pList.find((p: any) => p.id === 22);
  console.log('Is project 22 in query result?', p22);

  // Now let's check ALL projects in DB and their joined mosque_requests
  const [allP]: any = await conn.query(`
    SELECT 
      projects.id,
      projects.projectNumber,
      projects.name,
      projects.requestId,
      mosque_requests.id as reqId,
      mosque_requests.requestNumber,
      mosque_requests.currentStage as requestStage,
      mosque_requests.status as requestStatus,
      mosque_requests.closureStatus as requestClosureStatus
    FROM projects
    LEFT JOIN mosque_requests ON projects.requestId = mosque_requests.id
  `);
  console.log('All projects in DB with joined request:');
  for (const item of allP) {
    console.log(`P #${item.id} (${item.name}) -> req #${item.requestId} (stage: ${item.requestStage}, status: ${item.requestStatus}, closure: ${item.requestClosureStatus})`);
  }

  process.exit(0);
}

main().catch(console.error);
