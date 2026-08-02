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
  let checkedEnums = 0;
  let updatedEnums = 0;

  for (const [exportName, exportedItem] of Object.entries(schema)) {
    if (exportedItem && typeof exportedItem === "object" && "_" in exportedItem && (exportedItem as any)._.name) {
      const tableConfig = (exportedItem as any)._;
      const tableName = tableConfig.name;
      const columns = tableConfig.columns || {};

      for (const [colKey, colObj] of Object.entries(columns)) {
        const col = colObj as any;
        // Drizzle Enum column identification
        const enumValues = col.enumValues || col.config?.enumValues;
        if (enumValues && Array.isArray(enumValues)) {
          const colName = col.name;
          const schemaValues: string[] = enumValues;
          checkedEnums++;

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
                console.log(`⚠️ Table '${tableName}', column '${colName}' missing enum values:`, missingInDb);
                const combinedEnumValues = Array.from(new Set([...dbEnumValues, ...schemaValues]));
                const enumSql = combinedEnumValues.map(v => `'${v}'`).join(", ");
                const defaultVal = col.default !== undefined ? `'${col.default}'` : dbEnumValues[0] ? `'${dbEnumValues[0]}'` : "NULL";
                
                const alterSql = `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${colName}\` ENUM(${enumSql}) DEFAULT ${defaultVal}`;
                console.log(`Executing: ${alterSql}`);
                await connection.query(alterSql);
                console.log(`✅ Updated ${tableName}.${colName} ENUM successfully!`);
                updatedEnums++;
              }
            }
          }
        }
      }
    }
  }

  console.log(`\nChecked ${checkedEnums} ENUM columns. Updated ${updatedEnums} columns.`);
  await connection.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
