import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not defined");
    return;
  }
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log("--- Scanning categories table ---");
  const [cats] = await connection.query("SELECT id, name, nameAr, type FROM categories WHERE nameAr LIKE '%s%' OR nameAr LIKE '%s%' OR type = 'sadad_billers'");
  console.log("Categories:", cats);

  console.log("--- Scanning category_values table ---");
  const [catVals] = await connection.query("SELECT id, valueAr, valueEn FROM category_values WHERE valueAr LIKE '%s%'");
  console.log("Category Values:", catVals);

  await connection.end();
}
main().catch(console.error);
