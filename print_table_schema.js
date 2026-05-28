import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Checking actual DB schema on the server...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined in environment or .env file.");
    return;
  }

  console.log("Connecting to:", process.env.DATABASE_URL.replace(/:[^:@/]+@/, ":****@")); // Mask password
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [dbNameResult] = await connection.query("SELECT DATABASE() as db");
    const currentDb = dbNameResult[0].db;
    console.log(`Connected to database: '${currentDb}'`);

    console.log("\n--- quick_response_reports Columns ---");
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM \`quick_response_reports\``
    );
    console.table(columns);

  } catch (error) {
    console.error("❌ Error querying schema:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
