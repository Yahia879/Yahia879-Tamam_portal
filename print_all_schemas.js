import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Inspecting database structure on the server for all 3 tables...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in environment.");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  async function printTableSchema(tableName) {
    console.log(`\n===========================================`);
    console.log(`📋 Columns structure for table: '${tableName}'`);
    console.log(`===========================================`);
    try {
      const [columns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
      console.table(columns.map(c => ({
        Field: c.Field,
        Type: c.Type,
        Null: c.Null,
        Key: c.Key,
        Default: c.Default,
        Extra: c.Extra
      })));
    } catch (error) {
      console.error(`❌ Error reading schema for table '${tableName}':`, error.message);
    }
  }

  try {
    const [dbNameResult] = await connection.query("SELECT DATABASE() as db");
    console.log(`Connected successfully to database: '${dbNameResult[0].db}'`);

    // Print schemas of all three tables
    await printTableSchema("quick_response_reports");
    await printTableSchema("disbursement_requests");
    await printTableSchema("payments");

  } catch (error) {
    console.error("❌ Database connection error:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
