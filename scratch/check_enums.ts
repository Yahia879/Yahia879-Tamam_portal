import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  const tablesToCheck = ["disbursement_requests", "disbursement_orders"];
  
  for (const tableName of tablesToCheck) {
    const [rows] = await connection.query<any[]>(
      `SELECT COLUMN_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = 'status'`,
      [tableName]
    );

    if (rows.length > 0) {
      console.log(`Current ENUM for ${tableName}.status: ${rows[0].COLUMN_TYPE}`);
      const currentType = rows[0].COLUMN_TYPE;
      if (!currentType.includes("pending_executive")) {
        console.log(`Adding 'pending_executive' to ${tableName}.status ENUM...`);
        let newEnum = "";
        if (tableName === "disbursement_requests") {
          newEnum = "ENUM('draft', 'pending', 'pending_executive', 'approved', 'rejected', 'paid')";
        } else if (tableName === "disbursement_orders") {
          newEnum = "ENUM('draft', 'pending', 'pending_executive', 'approved', 'rejected', 'executed')";
        }
        await connection.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`status\` ${newEnum} DEFAULT 'draft'`);
        console.log(`✅ Updated ${tableName}.status ENUM successfully!`);
      } else {
        console.log(`✨ ${tableName}.status already contains 'pending_executive'`);
      }
    } else {
      console.log(`Table ${tableName} or status column not found!`);
    }
  }

  await connection.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
