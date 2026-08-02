import dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";
import { getTableName, getTableColumns, is } from "drizzle-orm";
import { MySqlTable } from "drizzle-orm/mysql-core";
import * as schema from "../drizzle/schema";

async function main() {
  console.log("🔍 Checking database tables and columns against drizzle/schema.ts...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set.");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [dbRes]: any = await connection.query("SELECT DATABASE() as db");
    const currentDb = dbRes[0].db;
    console.log(` Connected to MySQL DB: [${currentDb}]`);

    // Fetch existing tables
    const [tableRows]: any = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [currentDb]
    );
    const existingTables = new Set(tableRows.map((r: any) => r.TABLE_NAME));

    // Fetch existing columns
    const [columnRows]: any = await connection.query(
      `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
       FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ?`,
      [currentDb]
    );

    const existingColumns = new Map<string, Set<string>>();
    for (const r of columnRows) {
      if (!existingColumns.has(r.TABLE_NAME)) {
        existingColumns.set(r.TABLE_NAME, new Set());
      }
      existingColumns.get(r.TABLE_NAME)!.add(r.COLUMN_NAME);
    }

    let missingTablesCount = 0;
    let missingColumnsCount = 0;
    let addedColumnsCount = 0;

    const schemaTables: { tableName: string; tableObj: MySqlTable }[] = [];

    for (const key of Object.keys(schema)) {
      const exportItem = (schema as any)[key];
      if (exportItem && is(exportItem, MySqlTable)) {
        const tableName = getTableName(exportItem);
        schemaTables.push({ tableName, tableObj: exportItem });
      }
    }

    console.log(`Found ${schemaTables.length} tables defined in drizzle/schema.ts.\n`);

    for (const { tableName, tableObj } of schemaTables) {
      if (!existingTables.has(tableName)) {
        console.log(`❌ Missing table in DB: [${tableName}]`);
        missingTablesCount++;
        continue;
      }

      const columns = getTableColumns(tableObj);
      const existingColsInTable = existingColumns.get(tableName) || new Set();

      for (const [colKey, colObj] of Object.entries(columns)) {
        const colName = colObj.name;
        if (!existingColsInTable.has(colName)) {
          missingColumnsCount++;
          console.log(`⚠️ Missing column in [${tableName}]: '${colName}' (type: ${colObj.dataType}, columnType: ${colObj.getSQLType()})`);

          // Determine SQL type for column addition
          let sqlType = colObj.getSQLType();
          let nullability = colObj.notNull ? "NOT NULL" : "NULL";
          let defaultValue = "";

          if (colObj.hasDefault) {
            if (colObj.default !== undefined) {
              if (typeof colObj.default === "boolean") {
                defaultValue = `DEFAULT ${colObj.default ? 1 : 0}`;
              } else if (typeof colObj.default === "number") {
                defaultValue = `DEFAULT ${colObj.default}`;
              } else if (typeof colObj.default === "string") {
                defaultValue = `DEFAULT '${colObj.default}'`;
              }
            }
          }

          if (colObj.dataType === "boolean") {
            sqlType = "tinyint(1)";
            if (colObj.default !== undefined) {
              defaultValue = `DEFAULT ${colObj.default ? 1 : 0}`;
            }
          }

          const alterQuery = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${sqlType} ${nullability} ${defaultValue}`.trim();
          console.log(`   Executing: ${alterQuery}`);

          try {
            await connection.query(alterQuery);
            console.log(`   ✅ Successfully added column '${colName}' to [${tableName}]`);
            addedColumnsCount++;
          } catch (err: any) {
            console.error(`   ❌ Failed to add column '${colName}' to [${tableName}]:`, err.message);
          }
        }
      }
    }

    console.log("\n================ SUMMARY ================");
    console.log(`Total Tables in Schema: ${schemaTables.length}`);
    console.log(`Missing Tables: ${missingTablesCount}`);
    console.log(`Missing Columns Found: ${missingColumnsCount}`);
    console.log(`Columns Added Successfully: ${addedColumnsCount}`);
    console.log("=========================================\n");

  } catch (error) {
    console.error("❌ Execution Error:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
