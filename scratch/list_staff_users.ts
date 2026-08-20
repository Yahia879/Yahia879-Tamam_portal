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
    console.log(`\n--- DB [${dbName}] Staff Users ---`);
    const [rows]: any = await connection.query(`
      SELECT id, name, email, role, status, createdAt 
      FROM \`${dbName}\`.users 
      WHERE role != 'service_requester'
      ORDER BY id ASC
    `);
    console.log(rows);
  }

  process.exit(0);
}

main().catch(console.error);
