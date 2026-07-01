import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    return;
  }
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await connection.query("SELECT * FROM `notifications` ORDER BY `id` DESC LIMIT 10");
    console.log("Recent notifications:", rows);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

main();
