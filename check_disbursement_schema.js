import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 Checking database schema for 'disbursement_requests' table on the server...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not defined.");
    return;
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [dbNameResult] = await connection.query("SELECT DATABASE() as db");
    console.log(`Connected to database: '${dbNameResult[0].db}'`);

    console.log("\n--- disbursement_requests Columns ---");
    const [columns] = await connection.query(`SHOW COLUMNS FROM \`disbursement_requests\``);
    console.table(columns);

  } catch (error) {
    console.error("❌ Error querying schema:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
