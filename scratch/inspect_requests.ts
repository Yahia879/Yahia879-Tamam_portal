import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function inspect() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'tamamgatemanarah_portal'
  });

  const [reqs]: any = await connection.query(`
    SELECT id, requestNumber, currentStage, status, priority, requestTrack, technicalEvalDecision
    FROM mosque_requests
    WHERE id IN (47, 48, 49)
  `);
  console.log('Requests:');
  console.table(reqs);

  const [handover49]: any = await connection.query(`
    SELECT * FROM handovers WHERE requestId IN (47, 48, 49)
  `);
  console.log('Handovers:');
  console.table(handover49);

  const [contracts]: any = await connection.query(`
    SELECT * FROM contracts_enhanced WHERE requestId IN (47, 48, 49)
  `);
  console.log('Contracts:');
  console.table(contracts);

  process.exit(0);
}

inspect().catch(console.error);
