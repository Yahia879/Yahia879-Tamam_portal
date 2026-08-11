import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

async function testUpdate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  const conn = await mysql.createConnection(dbUrl);
  await conn.query(`
    UPDATE receipt_vouchers 
    SET notes = 'تأمين احتياجات مسجد التوحيد بالكامل', 
        bankName = 'حوالة بنكية على حساب الجمعية في مصرف الراجحي' 
    WHERE id = 18
  `);
  const [rows] = await conn.query("SELECT * FROM receipt_vouchers WHERE id = 18");
  console.log("Updated Voucher 18 in DB:", rows);
  await conn.end();
}

testUpdate().catch(console.error);
