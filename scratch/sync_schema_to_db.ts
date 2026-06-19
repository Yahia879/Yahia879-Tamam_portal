import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { getTableColumns, getTableName, is } from "drizzle-orm";
import { MySqlTable } from "drizzle-orm/mysql-core";

async function main() {
  const connectionString = "mysql://root:@localhost:3306/test_temam";
  try {
    const connection = await mysql.createConnection(connectionString);
    console.log("Connected to test_temam database.");
    
    // Get all tables currently in the database
    const [tablesResult]: any = await connection.query("SHOW TABLES");
    const dbTables = tablesResult.map((row: any) => Object.values(row)[0] as string);
    console.log(`Found ${dbTables.length} tables in the database.`);
    
    // Find all Drizzle tables in the schema
    const drizzleTables: Record<string, any> = {};
    for (const [key, value] of Object.entries(schema)) {
      if (value && typeof value === "object" && is(value, MySqlTable)) {
        const tableName = getTableName(value);
        drizzleTables[tableName] = value;
      }
    }
    console.log(`Found ${Object.keys(drizzleTables).length} tables defined in the schema file.`);
    
    const missingTables: string[] = [];
    const missingColumns: Array<{ table: string; column: string; def: string }> = [];
    const modifiedColumns: Array<{ table: string; column: string; dbType: string; schemaType: string }> = [];
    
    for (const [tableName, tableObj] of Object.entries(drizzleTables)) {
      if (!dbTables.includes(tableName)) {
        missingTables.push(tableName);
        continue;
      }
      
      // Get DB columns
      const [columns]: any = await connection.query(`DESCRIBE \`${tableName}\``);
      const dbColumns: Record<string, any> = {};
      for (const col of columns) {
        dbColumns[col.Field] = col;
      }
      
      // Get schema columns
      const schemaColumns = getTableColumns(tableObj);
      
      for (const [colKey, colObj] of Object.entries(schemaColumns)) {
        const colName = colObj.name;
        if (!dbColumns[colName]) {
          // Generate column definition
          let sqlDef = colObj.getSQLType();
          if (colObj.notNull) {
            sqlDef += " NOT NULL";
          } else {
            sqlDef += " NULL";
          }
          if (colObj.hasDefault && colObj.default !== undefined) {
            // simplified default representation
            if (typeof colObj.default === "string" || typeof colObj.default === "number" || typeof colObj.default === "boolean") {
              sqlDef += ` DEFAULT ${typeof colObj.default === "string" ? `'${colObj.default}'` : colObj.default}`;
            }
          }
          
          missingColumns.push({
            table: tableName,
            column: colName,
            def: sqlDef
          });
        }
      }
    }
    
    console.log("\n================ SCHEMA ALIGNMENT ANALYSIS ================\n");
    
    if (missingTables.length > 0) {
      console.log(`### Missing Tables in DB (${missingTables.length}):`);
      missingTables.forEach(t => console.log(`- ${t}`));
      console.log("");
    } else {
      console.log("✅ No missing tables.");
    }
    
    if (missingColumns.length > 0) {
      console.log(`### Missing Columns in DB (${missingColumns.length}):`);
      missingColumns.forEach(c => console.log(`- ${c.table}.${c.column}: ${c.def}`));
      console.log("");
      
      // Apply missing columns
      console.log("Applying missing columns...");
      for (const col of missingColumns) {
        try {
          console.log(`Adding column \`${col.column}\` to \`${col.table}\`...`);
          await connection.query(`ALTER TABLE \`${col.table}\` ADD COLUMN \`${col.column}\` ${col.def}`);
          console.log(`✅ Column \`${col.column}\` added to \`${col.table}\`.`);
        } catch (e: any) {
          console.error(`❌ Failed to add column \`${col.column}\` to \`${col.table}\`:`, e.message);
        }
      }
    } else {
      console.log("✅ No missing columns.");
    }
    
    await connection.end();
    console.log("\n🎉 Synchronization and alignment completed successfully!");
  } catch (err: any) {
    console.error("Error during sync:", err.message);
  }
}

main();
