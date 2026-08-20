import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkRequests() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
  });

  for (const dbName of ['tamamgatemanarah_portal', 'test_temam']) {
    console.log(`\n--- DB [${dbName}] ---`);
    const [rows]: any = await connection.query(`
      SELECT id, requestNumber, stage, subStage, status, currentStageId, currentSubStageId, isEvaluated, satisfactionRating
      FROM \`${dbName}\`.mosque_requests
      WHERE id IN (47, 48, 49)
    `);
    console.table(rows);

    const [tracking]: any = await connection.query(`
      SELECT * FROM \`${dbName}\`.request_stage_tracking
      WHERE requestId IN (48, 49)
      ORDER BY id DESC
      LIMIT 10
    `);
    console.log('Stage Tracking:');
    console.table(tracking);
  }

  process.exit(0);
}

checkRequests().catch(console.error);
