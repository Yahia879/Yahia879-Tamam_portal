import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { getTableName, getTableColumns } from "drizzle-orm";
import * as schema from "../drizzle/schema.js";

dotenv.config();

async function main() {
  console.log("🔄 Starting DB sync...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is missing in environment.");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // 1. Run 0007_fresh_deadpool.sql if it exists
    const migrationPath = path.resolve("./drizzle/0007_fresh_deadpool.sql");
    if (fs.existsSync(migrationPath)) {
      console.log("📜 Applying migration 0007_fresh_deadpool.sql...");
      const sqlContent = fs.readFileSync(migrationPath, "utf-8");
      const statements = sqlContent.split("--> statement-breakpoint");

      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (!trimmed) continue;
        try {
          await connection.query(trimmed);
          console.log("✅ Executed SQL statement successfully.");
        } catch (err: any) {
          if (
            err.code === "ER_TABLE_EXISTS_ERROR" ||
            err.code === "ER_DUP_FIELDNAME" ||
            err.message?.includes("already exists")
          ) {
            console.log(`ℹ️ Already applied: ${err.message}`);
          } else {
            console.warn(`⚠️ Warning executing statement: ${err.message}`);
          }
        }
      }
    }

    // 2. Check each table in drizzle/schema.ts against MySQL
    console.log("\n🔍 Verifying all schema tables and columns...");
    let addedTables = 0;
    let addedColumns = 0;
    let verifiedTables = 0;

    for (const [key, exportedItem] of Object.entries(schema)) {
      let tableName: string;
      let columns: Record<string, any>;

      try {
        tableName = getTableName(exportedItem as any);
        if (!tableName) continue;
        columns = getTableColumns(exportedItem as any);
      } catch (e) {
        continue;
      }

      verifiedTables++;

      // Check if table exists
      const [tableRows]: any = await connection.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
      );

      if (tableRows.length === 0) {
        console.log(`⚠️ Table '${tableName}' is missing in database!`);
      } else {
        // Table exists, check missing columns
        const [colRows]: any = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [tableName]
        );
        const existingColNames = new Set(colRows.map((r: any) => r.COLUMN_NAME));

        for (const [colProp, colObj] of Object.entries(columns)) {
          const colName = colObj.name;
          if (!existingColNames.has(colName)) {
            console.log(`⚠️ Missing column '${colName}' in table '${tableName}'. Adding...`);
            
            let sqlTypeDef = "TEXT NULL";
            if (colObj.columnType === "MySqlInt") sqlTypeDef = "INT NULL";
            else if (colObj.columnType === "MySqlVarChar") sqlTypeDef = "VARCHAR(255) NULL";
            else if (colObj.columnType === "MySqlBoolean") sqlTypeDef = "TINYINT(1) NOT NULL DEFAULT 0";
            else if (colObj.columnType === "MySqlTimestamp") sqlTypeDef = "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP";
            else if (colObj.columnType === "MySqlDateTime") sqlTypeDef = "DATETIME NULL";
            else if (colObj.columnType === "MySqlJson") sqlTypeDef = "JSON NULL";
            else if (colObj.columnType === "MySqlDecimal") sqlTypeDef = "DECIMAL(10,2) NULL";

            try {
              await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${sqlTypeDef}`);
              console.log(`✅ Added column '${colName}' to '${tableName}'.`);
              addedColumns++;
            } catch (err: any) {
              console.error(`❌ Failed to add column '${colName}' to '${tableName}':`, err.message);
            }
          }
        }
      }
    }

    console.log(`\n🎉 DB Sync complete! Checked ${verifiedTables} schema tables. Added ${addedTables} tables, ${addedColumns} columns.`);
  } catch (err) {
    console.error("❌ DB sync error:", err);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
