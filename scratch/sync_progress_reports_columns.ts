import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const dbName = process.env.DB_NAME || 'temam';
  console.log(`Connecting to database ${dbName}...`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT) || 3306,
    database: dbName,
  });

  console.log("Syncing progress_reports database columns...");

  async function ensureColumn(tableName: string, columnName: string, columnDefinition: string) {
    const [rows]: any = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = ? 
         AND COLUMN_NAME = ?`,
      [dbName, tableName, columnName]
    );

    if (rows.length === 0) {
      console.log(`Adding column ${columnName} to ${tableName}...`);
      await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
      console.log(`Column ${columnName} added successfully.`);
    } else {
      console.log(`Column ${columnName} already exists in ${tableName}.`);
    }
  }

  // Update status enum
  try {
    await connection.query(`
      ALTER TABLE \`progress_reports\` 
      MODIFY COLUMN \`status\` ENUM('draft', 'submitted', 'pending', 'pending_executive', 'reviewed', 'approved', 'rejected') DEFAULT 'draft'
    `);
    console.log("Updated progress_reports.status ENUM values successfully.");
  } catch (err: any) {
    console.error("Error modifying status ENUM:", err.message);
  }

  await ensureColumn("progress_reports", "managerApprovedBy", "int DEFAULT NULL");
  await ensureColumn("progress_reports", "managerApprovedAt", "datetime DEFAULT NULL");
  await ensureColumn("progress_reports", "approvedBy", "int DEFAULT NULL");
  await ensureColumn("progress_reports", "approvedAt", "datetime DEFAULT NULL");
  await ensureColumn("progress_reports", "approvalNotes", "text DEFAULT NULL");
  await ensureColumn("progress_reports", "rejectedBy", "int DEFAULT NULL");
  await ensureColumn("progress_reports", "rejectedAt", "datetime DEFAULT NULL");
  await ensureColumn("progress_reports", "rejectionReason", "text DEFAULT NULL");
  await ensureColumn("progress_reports", "isException", "tinyint(1) DEFAULT 0");
  await ensureColumn("progress_reports", "exceptionApprovedBy", "int DEFAULT NULL");
  await ensureColumn("progress_reports", "creatorSignatureName", "text DEFAULT NULL");
  await ensureColumn("progress_reports", "creatorSignatureDepartment", "text DEFAULT NULL");
  await ensureColumn("progress_reports", "creatorSignatureUrl", "text DEFAULT NULL");
  await ensureColumn("progress_reports", "showCreatorSignature", "tinyint(1) DEFAULT 1");
  await ensureColumn("progress_reports", "showExecutiveDirectorSignature", "tinyint(1) DEFAULT 1");

  console.log("All progress_reports column updates completed.");
  await connection.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
