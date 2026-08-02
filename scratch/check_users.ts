import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const [rows]: any = await conn.query("SELECT id, name, email, role, passwordHash FROM users WHERE email LIKE '%solayani%' OR email LIKE '%manarah%' OR name LIKE '%سلمان%'");
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
}

main().catch(console.error);
