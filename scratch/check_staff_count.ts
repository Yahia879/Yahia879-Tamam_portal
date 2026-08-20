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
    const [rows]: any = await connection.query(`
      SELECT id, name, email, role 
      FROM \`${dbName}\`.users 
      WHERE role != 'service_requester'
      ORDER BY id ASC
    `);
    console.log(`DB: ${dbName}, Total Staff: ${rows.length}`);
  }

  process.exit(0);
}
main();
