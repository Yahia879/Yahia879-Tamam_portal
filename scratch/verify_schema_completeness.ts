import * as dotenv from "dotenv";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { getTableColumns } from "drizzle-orm";

dotenv.config();

async function checkSchema(dbName: string) {
  console.log(`\n======================================================`);
  console.log(`Checking schema for database: ${dbName}`);
  console.log(`======================================================`);

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: dbName,
  });

  try {
    const [tables]: any = await connection.query("SHOW TABLES");
    const tableNames = tables.map((t: any) => Object.values(t)[0]);
    console.log(`Total tables in ${dbName}: ${tableNames.length}`);

    // Check each schema table
    for (const [key, val] of Object.entries(schema)) {
      if (typeof val === "object" && val !== null && (val as any)[Symbol.for("drizzle:Name")]) {
        const tableName = (val as any)[Symbol.for("drizzle:Name")];
        if (!tableNames.includes(tableName)) {
          console.warn(`⚠️ Table missing in ${dbName}: ${tableName}`);
          continue;
        }

        // Compare columns
        const [cols]: any = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
        const dbColNames = cols.map((c: any) => c.Field);
        
        try {
          const drizzleCols = Object.keys(getTableColumns(val as any));
          for (const dCol of drizzleCols) {
            // In mysql, drizzle column name might be snake_case or camelCase depending on definition
            const colObj = (val as any)[dCol];
            const actualName = colObj?.name || dCol;
            if (!dbColNames.includes(actualName)) {
              console.warn(`⚠️ Column missing in ${dbName}.${tableName}: ${actualName} (defined in schema as ${dCol})`);
            }
          }
        } catch (e) {
          // ignore if getTableColumns fails for some reason
        }
      }
    }

    console.log(`Finished table and column check for ${dbName}.`);
  } finally {
    await connection.end();
  }
}

async function main() {
  await checkSchema("test_temam");
  await checkSchema("tamamgatemanarah_portal");
}

main().catch(console.error);
