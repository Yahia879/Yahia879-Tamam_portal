import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function inspectVoucher18() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  const conn = await mysql.createConnection(dbUrl);
  const [rows] = await conn.query("SELECT * FROM receipt_vouchers WHERE id = 18");
  console.log("Voucher 18 data in DB:", rows);
  await conn.end();
}

inspectVoucher18().catch(console.error);
