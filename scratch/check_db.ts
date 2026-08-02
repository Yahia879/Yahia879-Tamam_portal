import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import * as schema from "../drizzle/schema.js";

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const missingTables = [];
  const missingColumns = [];

  for (const [exportName, exportedItem] of Object.entries(schema)) {
    // Check if it's a Drizzle MySQL table object
    if (exportedItem && typeof exportedItem === "object" && "_" in exportedItem) {
      const tableConfig = (exportedItem as any)._;
      const tableName = tableConfig.name;
      if (!tableName) continue;

      // Query database for columns of this table
      const [rows] = await connection.query<any[]>(
        `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?`,
        [tableName]
      );

      if (rows.length === 0) {
        missingTables.push(tableName);
        console.log(`❌ Table missing in DB: ${tableName}`);
      } else {
        const existingCols = new Set(rows.map((r: any) => r.COLUMN_NAME));
        const schemaCols = tableConfig.columns || {};

        for (const [colKey, colObj] of Object.entries(schemaCols)) {
          const colName = (colObj as any).name;
          if (!existingCols.has(colName)) {
            missingColumns.push({ tableName, colName, colObj });
            console.log(`⚠️ Missing column: ${tableName}.${colName}`);
          }
        }
      }
    }
  }

  console.log("\n================ SUMMARY ================");
  console.log(`Missing tables: ${missingTables.length}`);
  console.log(`Missing columns: ${missingColumns.length}`);
  
  if (missingTables.length > 0) {
    console.log("Missing Tables List:", missingTables);
  }
  if (missingColumns.length > 0) {
    console.log("Missing Columns List:", missingColumns.map(c => `${c.tableName}.${c.colName}`));
  }

  await connection.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
