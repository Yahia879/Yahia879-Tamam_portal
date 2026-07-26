import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import * as schema from "../drizzle/schema.js";

dotenv.config();

async function syncDb() {
  const connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl) {
    console.error("❌ DATABASE_URL is not set in .env");
    process.exit(1);
  }

  console.log("🔌 Connecting to MySQL database...");
  const connection = await mysql.createConnection(connectionUrl);

  try {
    console.log("🔍 Checking missing columns in 'projects' table...");
    
    // Specifically check plannedProgress and milestones in projects table
    const [projectCols]: any = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects'`
    );
    const existingProjectCols = projectCols.map((c: any) => c.COLUMN_NAME);

    if (!existingProjectCols.includes("plannedProgress")) {
      console.log("➕ Adding 'plannedProgress' column to 'projects'...");
      await connection.query("ALTER TABLE `projects` ADD COLUMN `plannedProgress` int DEFAULT 0");
      console.log("✅ Added 'plannedProgress'.");
    } else {
      console.log("✔️ 'plannedProgress' already exists.");
    }

    if (!existingProjectCols.includes("milestones")) {
      console.log("➕ Adding 'milestones' column to 'projects'...");
      await connection.query("ALTER TABLE `projects` ADD COLUMN `milestones` longtext");
      console.log("✅ Added 'milestones'.");
    } else {
      console.log("✔️ 'milestones' already exists.");
    }

    // Now let's check all tables exported from schema
    console.log("\n📊 Inspecting schema exported tables...");
    
    for (const [key, exportVal] of Object.entries(schema)) {
      if (exportVal && typeof exportVal === "object" && "_" in exportVal && "name" in (exportVal as any)._) {
        const tableObj = exportVal as any;
        const tableName = tableObj._.name;
        const columns = tableObj._.columns;

        // Check if table exists
        const [tables]: any = await connection.query(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [tableName]
        );

        if (tables.length === 0) {
          console.log(`⚠️ Table '${tableName}' does not exist in DB! Skipping full table create (run migration if needed).`);
          continue;
        }

        // Get existing columns
        const [dbCols]: any = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [tableName]
        );
        const existingColNames = new Set(dbCols.map((c: any) => c.COLUMN_NAME));

        for (const [colKey, colObj] of Object.entries(columns) as any) {
          const colName = colObj.name;
          if (!existingColNames.has(colName)) {
            console.log(`⚠️ Missing column '${colName}' in table '${tableName}'. Attempting auto-add...`);
            let colType = "varchar(255)";
            const dataType = colObj.dataType;

            if (dataType === "number") colType = "int";
            else if (dataType === "string") colType = colObj.columnType === "MySqlLongText" ? "longtext" : "text";
            else if (dataType === "boolean") colType = "tinyint(1)";
            else if (dataType === "date") colType = "datetime";
            else if (dataType === "json") colType = "json";

            try {
              await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${colType}`);
              console.log(`✅ Successfully added column '${colName}' to '${tableName}'.`);
            } catch (err: any) {
              console.error(`❌ Failed to add column '${colName}' to '${tableName}':`, err.message);
            }
          }
        }
      }
    }

    console.log("\n🎉 Database sync check completed successfully!");
  } catch (error) {
    console.error("❌ Error syncing database:", error);
  } finally {
    await connection.end();
  }
}

syncDb();
