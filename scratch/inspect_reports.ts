import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function inspectReports() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tamamgatemanarah_portal',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  console.log("=== TABLES LIKE '%report%' ===");
  const [tables]: any = await connection.query("SHOW TABLES LIKE '%report%'");
  console.log(tables);

  try {
    const [progressRows]: any = await connection.query("SELECT id, reportNumber, title, overallProgress, createdAt FROM progress_reports LIMIT 20");
    console.log("\n=== PROGRESS REPORTS ===");
    console.log(JSON.stringify(progressRows, null, 2));
  } catch (e: any) {
    console.error("Error reading progress_reports:", e.message);
  }

  process.exit(0);
}

inspectReports().catch(console.error);
