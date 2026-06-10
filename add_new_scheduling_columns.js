import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Checking and adding new scheduling columns to mosque_requests...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined.");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  async function ensureColumn(tableName, columnName, columnDefinition) {
    const [rows] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ? 
         AND COLUMN_NAME = ?`,
      [tableName, columnName]
    );

    if (rows.length === 0) {
      console.log(`⚠️ Column '${columnName}' is missing in table '${tableName}'. Adding it...`);
      await connection.query(`ALTER TABLE \`${tableName}\` ADD \`${columnName}\` ${columnDefinition}`);
      console.log(`✅ Column '${columnName}' added successfully to '${tableName}'.`);
    } else {
      console.log(`✨ Column '${columnName}' already exists in table '${tableName}'.`);
    }
  }

  try {
    await ensureColumn("mosque_requests", "quickResponseScheduledDate", "datetime DEFAULT NULL");
    await ensureColumn("mosque_requests", "quickResponseScheduledTime", "varchar(10) DEFAULT NULL");
    await ensureColumn("mosque_requests", "finalReportScheduledDate", "datetime DEFAULT NULL");
    await ensureColumn("mosque_requests", "finalReportScheduledTime", "varchar(10) DEFAULT NULL");

    console.log("\n🎉 All new scheduling columns have been successfully verified/added!");
  } catch (error) {
    console.error("❌ Error during column addition:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
