import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not defined");
    return;
  }
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [result] = await connection.query("UPDATE categories SET nameAr = 'معلومات المفوتر' WHERE name = 'sadad_billers'");
  console.log("Database update result:", result);
  await connection.end();
}
main().catch(console.error);
