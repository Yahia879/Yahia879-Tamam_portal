import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  const conn = await mysql.createConnection(dbUrl);

  const [rows]: any = await conn.query("SELECT id, voucherNumber FROM receipt_vouchers ORDER BY id ASC");
  console.log(`Found ${rows.length} vouchers to resequence starting from 51...`);

  const START_NUMBER = 51;
  const timestamp = Date.now();

  for (let i = 0; i < rows.length; i++) {
    await conn.query("UPDATE receipt_vouchers SET voucherNumber = ? WHERE id = ?", [`TEMP-SEQ-${rows[i].id}-${timestamp}`, rows[i].id]);
  }

  for (let i = 0; i < rows.length; i++) {
    const newNum = `REC-${i + START_NUMBER}`;
    await conn.query("UPDATE receipt_vouchers SET voucherNumber = ? WHERE id = ?", [newNum, rows[i].id]);
    console.log(`Updated voucher ID ${rows[i].id} -> ${newNum}`);
  }

  await conn.end();
  console.log("Resequencing completed successfully!");
}

main().catch(console.error);
