import dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set in .env");
    process.exit(1);
  }

  try {
    const connection = await mysql.createConnection(connectionString);
    const [rows]: any = await connection.execute("DESCRIBE suppliers");
    console.log("================ SUPPLIERS TABLE COLUMNS ================");
    for (const row of rows) {
      console.log(`${row.Field}: ${row.Type} (Null: ${row.Null}, Default: ${row.Default})`);
    }
    await connection.end();
  } catch (err: any) {
    console.error("Error executing query:", err.message);
  }
}

main();
