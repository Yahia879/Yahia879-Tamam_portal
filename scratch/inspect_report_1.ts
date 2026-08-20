import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function inspectReport1() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tamamgatemanarah_portal',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  const [rows]: any = await connection.query("SELECT * FROM progress_reports WHERE id = 1");
  console.log("=== FULL REPORT 1 ===");
  console.log(rows[0]);

  if (rows[0]) {
    const [projs]: any = await connection.query("SELECT * FROM projects WHERE id = ?", [rows[0].projectId]);
    console.log("=== PROJECT ===");
    console.log(projs[0]);
  }

  process.exit(0);
}

inspectReport1().catch(console.error);
