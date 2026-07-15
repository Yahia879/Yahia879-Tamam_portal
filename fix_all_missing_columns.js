import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Checking and fixing all remaining missing columns on the server database...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined.");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Helper function to check and add column if missing
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
    // 1. Ensure quick_response_reports has 'status'
    console.log("\nChecking 'quick_response_reports' table...");
    await ensureColumn("quick_response_reports", "status", "varchar(50) DEFAULT NULL");

    // 2. Ensure disbursement_requests has 'paymentId' and 'isDirect'
    console.log("\nChecking 'disbursement_requests' table...");
    await ensureColumn("disbursement_requests", "paymentId", "int DEFAULT NULL");
    await ensureColumn("disbursement_requests", "isDirect", "tinyint(1) NOT NULL DEFAULT 0");

    // 3. Ensure payments has 'completionPercentage'
    console.log("\nChecking 'payments' table...");
    await ensureColumn("payments", "completionPercentage", "int DEFAULT NULL");

    console.log("\n🎉 All remaining database columns are perfectly verified and aligned!");
  } catch (error) {
    console.error("❌ Error during column alignment:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
