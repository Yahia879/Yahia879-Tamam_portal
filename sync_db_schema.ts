import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { getTableConfig, MySqlTable } from "drizzle-orm/mysql-core";
import * as schema from "./drizzle/schema";

dotenv.config();

async function syncDbSchema() {
  console.log("🚀 Starting comprehensive database schema sync against drizzle/schema.ts...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  let addedColumnsCount = 0;
  let modifiedColumnsCount = 0;
  let missingTablesCount = 0;
  let checkedTablesCount = 0;

  try {
    // 1. Fetch all tables currently existing in the database
    const [dbTableRows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`
    );
    const existingDbTables = new Set(dbTableRows.map((r) => r.TABLE_NAME));

    // 2. Iterate through all exports in schema
    for (const [exportName, exportedObj] of Object.entries(schema)) {
      if (!exportedObj || typeof exportedObj !== "object") continue;

      let tableConfig;
      try {
        tableConfig = getTableConfig(exportedObj as MySqlTable);
      } catch {
        continue; // Not a table export
      }

      if (!tableConfig || !tableConfig.name) continue;

      const tableName = tableConfig.name;
      checkedTablesCount++;

      // If table doesn't exist in DB
      if (!existingDbTables.has(tableName)) {
        console.log(`⚠️ Table '${tableName}' does not exist in database.`);
        missingTablesCount++;
        continue;
      }

      // Fetch existing columns for this table from INFORMATION_SCHEMA
      const [columnRows] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tableName]
      );

      const existingColumns = new Map<string, { type: string; dataType: string; isNullable: string }>(
        columnRows.map((r) => [
          r.COLUMN_NAME.toLowerCase(),
          { type: r.COLUMN_TYPE.toLowerCase(), dataType: r.DATA_TYPE.toLowerCase(), isNullable: r.IS_NULLABLE },
        ])
      );

      // Inspect each column in Drizzle schema
      for (const col of tableConfig.columns) {
        const colName = col.name;
        const colTypeSql = col.getSQLType();

        const existing = existingColumns.get(colName.toLowerCase());

        if (!existing) {
          console.log(`➕ Adding missing column '${colName}' (${colTypeSql}) to table '${tableName}'...`);

          let columnDef = colTypeSql;
          if (col.hasDefault && col.default !== undefined) {
            if (typeof col.default === "string" || typeof col.default === "number" || typeof col.default === "boolean") {
              columnDef += ` DEFAULT ${mysql.escape(col.default)}`;
            }
          } else if (!col.notNull) {
            columnDef += ` DEFAULT NULL`;
          }

          const alterQuery = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${columnDef};`;
          
          try {
            await connection.query(alterQuery);
            console.log(`✅ Successfully added column '${colName}' to '${tableName}'.`);
            addedColumnsCount++;
          } catch (err: any) {
            console.error(`❌ Failed to add column '${colName}' to '${tableName}': ${err.message}`);
          }
        } else {
          // Check if column type updated (e.g. varchar(255) to text)
          const targetType = colTypeSql.toLowerCase();
          if (targetType === "text" && existing.dataType === "varchar") {
            console.log(`🔄 Updating column '${colName}' type in '${tableName}' from ${existing.type} to text...`);
            try {
              await connection.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${colName}\` text NULL;`);
              console.log(`✅ Successfully updated column '${colName}' in '${tableName}'.`);
              modifiedColumnsCount++;
            } catch (err: any) {
              console.error(`❌ Failed to update column '${colName}' in '${tableName}': ${err.message}`);
            }
          }
        }
      }
    }

    console.log("\n==========================================");
    console.log(`🎉 Schema sync completed!`);
    console.log(`📋 Checked tables: ${checkedTablesCount}`);
    console.log(`📊 Added missing columns: ${addedColumnsCount}`);
    console.log(`🔄 Modified column types: ${modifiedColumnsCount}`);
    if (missingTablesCount > 0) {
      console.log(`ℹ️ Missing tables: ${missingTablesCount}`);
    }
    console.log("==========================================");

  } catch (error) {
    console.error("❌ Error during schema sync:", error);
  } finally {
    await connection.end();
  }
}

syncDbSchema();
