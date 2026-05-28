import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Starting verification and fix of missing database columns on the server...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in environment or .env file.");
    return;
  }

  console.log("Connecting to database...");
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
    // 1. Ensure quick_response_reports columns from migration 0005
    console.log("\nChecking 'quick_response_reports' table...");
    await ensureColumn("quick_response_reports", "technicalEvaluation", "text");
    await ensureColumn("quick_response_reports", "finalEvaluation", "text");
    await ensureColumn("quick_response_reports", "unexecutedWorks", "text");
    await ensureColumn("quick_response_reports", "technicianName", "varchar(255)");

    // 2. Ensure field_visit_reports columns from migration 0005 (just in case they are missing too)
    console.log("\nChecking 'field_visit_reports' table...");
    await ensureColumn("field_visit_reports", "mosqueCondition", "varchar(100)");
    await ensureColumn("field_visit_reports", "menPrayerLength", "decimal(10,2)");
    await ensureColumn("field_visit_reports", "menPrayerWidth", "decimal(10,2)");
    await ensureColumn("field_visit_reports", "menPrayerHeight", "decimal(10,2)");
    await ensureColumn("field_visit_reports", "womenPrayerExists", "boolean DEFAULT false");
    await ensureColumn("field_visit_reports", "womenPrayerLength", "decimal(10,2)");
    await ensureColumn("field_visit_reports", "womenPrayerWidth", "decimal(10,2)");
    await ensureColumn("field_visit_reports", "womenPrayerHeight", "decimal(10,2)");
    await ensureColumn("field_visit_reports", "requiredNeeds", "text");
    await ensureColumn("field_visit_reports", "generalDescription", "text");
    await ensureColumn("field_visit_reports", "teamMember1", "varchar(255)");
    await ensureColumn("field_visit_reports", "teamMember2", "varchar(255)");
    await ensureColumn("field_visit_reports", "teamMember3", "varchar(255)");
    await ensureColumn("field_visit_reports", "teamMember4", "varchar(255)");
    await ensureColumn("field_visit_reports", "teamMember5", "varchar(255)");

    console.log("\n🎉 Database columns are perfectly verified and aligned!");
  } catch (error) {
    console.error("❌ Error during column alignment:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
