import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

import * as schema from "../drizzle/schema";
import { is, getTableColumns, getTableName } from "drizzle-orm";
import { MySqlTable } from "drizzle-orm/mysql-core";

async function main() {
  console.log("🚀 Starting database schema sync check...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not defined");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // 1. Get all tables in DB
    const [dbNameResult] = await connection.query("SELECT DATABASE() as db");
    const currentDb = dbNameResult[0].db;
    console.log(`Connected to database: '${currentDb}'`);

    const [tablesResult] = await connection.query("SHOW TABLES");
    const dbTables = new Set(tablesResult.map((t: any) => Object.values(t)[0]));

    // 2. Fetch all column details from database
    const [columnsResult] = await connection.query(
      `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE()`
    );
    
    // Map of tableName -> Map of columnName -> Column Details
    const dbSchemaMap = new Map<string, Map<string, any>>();
    for (const row of columnsResult as any[]) {
      if (!dbSchemaMap.has(row.TABLE_NAME)) {
        dbSchemaMap.set(row.TABLE_NAME, new Map());
      }
      dbSchemaMap.get(row.TABLE_NAME)!.set(row.COLUMN_NAME, row);
    }

    const missingTables: string[] = [];
    const missingColumns: { table: string; column: string; sql: string }[] = [];
    const mismatchedColumns: { table: string; column: string; dbType: string; drizzleType: string; sql: string }[] = [];

    // 3. Loop through Drizzle Schema
    for (const [key, value] of Object.entries(schema)) {
      if (is(value, MySqlTable)) {
        const tableName = getTableName(value);
        
        // Check if table exists in DB
        if (!dbTables.has(tableName)) {
          missingTables.push(tableName);
          continue;
        }

        const columns = getTableColumns(value);
        const dbColumns = dbSchemaMap.get(tableName)!;

        for (const [colName, colObj] of Object.entries(columns)) {
          const dbColName = colObj.name;
          const drizzleSqlType = (colObj as any).getSQLType().toLowerCase();
          const isNotNull = colObj.notNull;
          const hasDefault = colObj.hasDefault;
          const autoIncrement = (colObj as any).autoIncrement;

          // Check if column exists in DB
          if (!dbColumns.has(dbColName)) {
            let colDef = drizzleSqlType;
            if (isNotNull) colDef += " NOT NULL";
            if (autoIncrement) colDef += " AUTO_INCREMENT";
            // Simple default handling
            if (hasDefault && typeof colObj.default !== "function") {
              if (typeof colObj.default === "string") {
                colDef += ` DEFAULT '${colObj.default}'`;
              } else if (typeof colObj.default === "number" || typeof colObj.default === "boolean") {
                colDef += ` DEFAULT ${colObj.default}`;
              }
            }

            missingColumns.push({
              table: tableName,
              column: dbColName,
              sql: `ALTER TABLE \`${tableName}\` ADD COLUMN \`${dbColName}\` ${colDef};`
            });
            continue;
          }

          // Check if types match
          const dbCol = dbColumns.get(dbColName);
          const dbSqlType = dbCol.COLUMN_TYPE.toLowerCase();

          // Normalize types to avoid trivial mismatches
          const normDb = normalizeType(dbSqlType);
          const normDrizzle = normalizeType(drizzleSqlType);

          if (normDb !== normDrizzle) {
            // Check if it's just a varchar length difference or similar
            let colDef = drizzleSqlType;
            if (isNotNull) colDef += " NOT NULL";
            if (autoIncrement) colDef += " AUTO_INCREMENT";

            mismatchedColumns.push({
              table: tableName,
              column: dbColName,
              dbType: dbSqlType,
              drizzleType: drizzleSqlType,
              sql: `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${dbColName}\` ${colDef};`
            });
          }
        }
      }
    }

    console.log(`\n================ SCHEMA REPORT ================`);
    console.log(`Missing tables in DB: ${missingTables.length}`);
    for (const t of missingTables) {
      console.log(`  - ${t}`);
    }

    console.log(`Missing columns in DB: ${missingColumns.length}`);
    for (const mc of missingColumns) {
      console.log(`  - Table '${mc.table}': column '${mc.column}' missing (SQL: ${mc.sql})`);
    }

    console.log(`Mismatched columns: ${mismatchedColumns.length}`);
    for (const mm of mismatchedColumns) {
      console.log(`  - Table '${mm.table}': column '${mm.column}' (DB type: '${mm.dbType}', Drizzle type: '${mm.drizzleType}') (SQL: ${mm.sql})`);
    }

    // 4. If there are changes, execute them!
    const allSql: string[] = [];
    missingColumns.forEach(mc => allSql.push(mc.sql));
    mismatchedColumns.forEach(mm => allSql.push(mm.sql));

    if (allSql.length > 0) {
      console.log("\n🛠️ Executing DDL changes to sync database...");
      for (const sqlQuery of allSql) {
        console.log(`Executing: ${sqlQuery}`);
        try {
          await connection.query(sqlQuery);
          console.log("  ✅ Success");
        } catch (err: any) {
          console.error(`  ❌ Error executing query:`, err.message);
        }
      }
      console.log("\n🎉 Database sync completed!");
    } else {
      console.log("\n✅ Database is already perfectly synchronized with drizzle/schema.ts!");
    }

  } catch (err) {
    console.error("Error running schema sync check:", err);
  } finally {
    await connection.end();
  }
}

function normalizeType(typeStr: string): string {
  let t = typeStr.trim().toLowerCase();
  // Remove display width like int(11) -> int, tinyint(1) -> tinyint
  t = t.replace(/\(\d+\)/g, "");
  // boolean or tinyint(1) -> tinyint
  if (t === "boolean" || t === "tinyint") return "tinyint";
  // double precision -> double
  if (t === "double precision") return "double";
  // In MariaDB/MySQL, JSON is often represented as longtext, text, or longtext character set utf8mb4
  if (t.includes("json") || t.includes("longtext") || t === "text") return "json_or_text";
  return t;
}

main().catch(console.error);
