import 'dotenv/config';
import mysql from 'mysql2/promise';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set");
    return;
  }
  const connection = await mysql.createConnection(dbUrl);
  try {
    console.log("Checking structure of contracts_enhanced...");
    const [rows] = await connection.query("DESCRIBE contracts_enhanced");
    console.log("Columns in contracts_enhanced:");
    console.table(rows);
  } catch (err) {
    console.error("Error running SQL:", err);
  } finally {
    await connection.end();
  }
}

main();
