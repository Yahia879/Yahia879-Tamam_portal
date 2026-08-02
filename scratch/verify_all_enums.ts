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
  let checked = 0;
  let updated = 0;

  for (const [exportName, exportedItem] of Object.entries(schema)) {
    if (exportedItem && typeof exportedItem === "object" && Symbol.for("drizzle:IsDrizzleTable") in exportedItem) {
      const table = exportedItem as any;
      const tableName = table[Symbol.for("drizzle:Name")] || table._?.name;
      if (!tableName) continue;

      for (const [colKey, colObj] of Object.entries(table)) {
        const col = colObj as any;
        if (col && col.enumValues && Array.isArray(col.enumValues)) {
          const colName = col.name;
          const schemaValues: string[] = col.enumValues;
          checked++;

          const [rows] = await connection.query<any[]>(
            `SELECT COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND COLUMN_NAME = ?`,
            [tableName, colName]
          );

          if (rows.length > 0) {
            const currentColumnType: string = rows[0].COLUMN_TYPE;
            const match = currentColumnType.match(/enum\((.*)\)/i);
            if (match) {
              const dbEnumValues = match[1].split(",").map(v => v.replace(/^'|'$/g, "").trim());
              const missingInDb = schemaValues.filter(val => !dbEnumValues.includes(val));

              if (missingInDb.length > 0) {
                console.log(`⚠️ Table '${tableName}', column '${colName}' missing enum values in DB:`, missingInDb);
                const combinedEnumValues = Array.from(new Set([...dbEnumValues, ...schemaValues]));
                const enumSql = combinedEnumValues.map(v => `'${v}'`).join(", ");
                const defaultVal = col.default !== undefined ? `'${col.default}'` : `'${combinedEnumValues[0]}'`;
                
                const alterSql = `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${colName}\` ENUM(${enumSql}) DEFAULT ${defaultVal}`;
                console.log(`Executing: ${alterSql}`);
                await connection.query(alterSql);
                console.log(`✅ Updated ${tableName}.${colName} ENUM successfully!`);
                updated++;
              } else {
                console.log(`✨ Table '${tableName}', column '${colName}' is fully in sync.`);
              }
            }
          }
        }
      }
    }
  }

  console.log(`\n================ ENUM SUMMARY ================`);
  console.log(`Checked ${checked} ENUM columns across schema tables.`);
  console.log(`Updated ${updated} ENUM columns in database.`);

  await connection.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
