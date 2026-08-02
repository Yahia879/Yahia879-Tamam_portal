import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import * as schema from "../drizzle/schema.ts";
import { getTableColumns } from "drizzle-orm";

dotenv.config();

async function main() {
  console.log("🔍 Checking all schema tables and columns against database...");
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL missing");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  let totalTables = 0;
  let missingColumnsCount = 0;

  for (const [key, value] of Object.entries(schema)) {
    // Check if value is a drizzle table
    if (value && typeof value === 'object' && Symbol.for('drizzle:IsDrizzleTable') in value) {
      totalTables++;
      const tableName = value[Symbol.for('drizzle:Name')];
      const columns = getTableColumns(value);

      const [dbColumnsRows] = await connection.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = ?`,
        [tableName]
      );

      const dbColumnNames = new Set(dbColumnsRows.map((r) => r.COLUMN_NAME));

      for (const colName of Object.keys(columns)) {
        const dbName = columns[colName].name;
        if (!dbColumnNames.has(dbName)) {
          console.log(`❌ Missing column in DB: table '${tableName}', column '${dbName}'`);
          missingColumnsCount++;
        }
      }
    }
  }

  console.log(`\nVerified ${totalTables} tables.`);
  if (missingColumnsCount === 0) {
    console.log("✅ All tables and columns in drizzle/schema.ts exist in your database!");
  } else {
    console.log(`⚠️ Found ${missingColumnsCount} missing columns!`);
  }

  await connection.end();
}

main().catch(console.error);
