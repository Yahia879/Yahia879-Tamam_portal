import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Checking and fixing missing columns in 'disbursement_requests' on the server...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined.");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const tableName = "disbursement_requests";
    const columnName = "paymentId";

    // 1. Check and add paymentId
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
      await connection.query(`ALTER TABLE \`${tableName}\` ADD \`${columnName}\` int DEFAULT NULL`);
      console.log(`✅ Column '${columnName}' added successfully to '${tableName}'!`);
    } else {
      console.log(`✨ Column '${columnName}' already exists in table '${tableName}'.`);
    }

    // 1.5. Check and add isDirect
    const [isDirectRows] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = ? 
         AND COLUMN_NAME = 'isDirect'`,
      [tableName]
    );

    if (isDirectRows.length === 0) {
      console.log(`⚠️ Column 'isDirect' is missing in table '${tableName}'. Adding it...`);
      await connection.query(`ALTER TABLE \`${tableName}\` ADD \`isDirect\` tinyint(1) NOT NULL DEFAULT 0`);
      console.log(`✅ Column 'isDirect' added successfully to '${tableName}'!`);
    } else {
      console.log(`✨ Column 'isDirect' already exists in table '${tableName}'.`);
    }

    // 2. Also ensure status column is added to quick_response_reports here, just in case they need both
    console.log("\nChecking 'quick_response_reports' for status column...");
    const [rowsStatus] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'quick_response_reports' 
         AND COLUMN_NAME = 'status'`
    );

    if (rowsStatus.length === 0) {
      console.log(`⚠️ Column 'status' is missing in 'quick_response_reports'. Adding it...`);
      await connection.query(`ALTER TABLE \`quick_response_reports\` ADD \`status\` varchar(50) DEFAULT NULL`);
      console.log(`✅ Column 'status' added successfully to 'quick_response_reports'!`);
    } else {
      console.log(`✨ Column 'status' already exists in 'quick_response_reports'.`);
    }

    console.log("\n🎉 All database columns are perfectly aligned!");
  } catch (error) {
    console.error("❌ Error during schema fix:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
