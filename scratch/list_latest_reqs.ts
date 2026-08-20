import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
  });

  for (const dbName of ['tamamgatemanarah_portal', 'test_temam']) {
    console.log(`\n--- DB [${dbName}] Requests ---`);
    const [rows]: any = await connection.query(`
      SELECT id, requestNumber, currentStage, status, requestTrack, createdAt
      FROM \`${dbName}\`.mosque_requests
      ORDER BY id DESC
      LIMIT 10
    `);
    console.table(rows);
  }

  process.exit(0);
}
main();
