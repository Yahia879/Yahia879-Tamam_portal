import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Starting database schema sync check...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in .env");
    process.exit(1);
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
      console.log(`⚠️ Adding missing column '${columnName}' to table '${tableName}'...`);
      await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
      console.log(`✅ Column '${columnName}' added to '${tableName}'.`);
    } else {
      console.log(`✨ Column '${columnName}' already exists in '${tableName}'.`);
    }
  }

  async function modifyColumnIfNeeded(tableName, columnName, columnDefinition) {
    console.log(`🔄 Updating definition for '${columnName}' in '${tableName}'...`);
    try {
      await connection.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${columnName}\` ${columnDefinition}`);
      console.log(`✅ Column '${columnName}' modified in '${tableName}'.`);
    } catch (err) {
      console.error(`❌ Failed to modify '${columnName}' in '${tableName}':`, err.message);
    }
  }

  try {
    console.log("\n--- Checking disbursement_requests ---");
    await ensureColumn("disbursement_requests", "showCreatorSignature", "tinyint(1) DEFAULT 1");
    await ensureColumn("disbursement_requests", "showExecutiveDirectorSignature", "tinyint(1) DEFAULT 1");
    await modifyColumnIfNeeded(
      "disbursement_requests",
      "status",
      "enum('draft','pending','pending_executive','approved','rejected','paid') DEFAULT 'draft'"
    );

    console.log("\n--- Checking disbursement_orders ---");
    await modifyColumnIfNeeded(
      "disbursement_orders",
      "status",
      "enum('draft','pending','pending_executive','approved','rejected','executed','edited') DEFAULT 'draft'"
    );

    console.log("\n--- Checking users ---");
    await ensureColumn("users", "signatureUrl", "text DEFAULT NULL");
    await ensureColumn("users", "showSignatureInDocuments", "tinyint(1) DEFAULT 1");
    await modifyColumnIfNeeded(
      "users",
      "role",
      "enum('super_admin','system_admin','general_manager','executive_director','projects_office','field_team','quick_response','financial','project_manager','corporate_comm','service_requester') NOT NULL DEFAULT 'service_requester'"
    );

    console.log("\n--- Checking contracts_enhanced ---");
    await ensureColumn("contracts_enhanced", "currentStep", "int DEFAULT 1");

    console.log("\n--- Checking progress_reports ---");
    await ensureColumn("progress_reports", "milestones", "longtext DEFAULT NULL");

    console.log("\n--- Checking projects ---");
    await ensureColumn("projects", "plannedProgress", "int DEFAULT 0");
    await ensureColumn("projects", "milestones", "longtext DEFAULT NULL");

    console.log("\n--- Checking signatories ---");
    await ensureColumn("signatories", "userId", "int DEFAULT NULL");

    console.log("\n🎉 Database sync completed successfully!");
  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
